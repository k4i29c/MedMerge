// Scanner accuracy check: runs the SAME prompt the app uses on every label image in
// eval/labels/ and compares the key fields against eval/expected.json.
//
// Run:  ANTHROPIC_API_KEY=sk-ant-... npm run eval
// Add your own test labels: put the photo in eval/labels/ and add an entry to expected.json.

import { readFileSync, readdirSync } from 'node:fs';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRequest, parseModelText, toDraft, DEFAULT_MODEL } from '../js/extract.js';

const here = dirname(fileURLToPath(import.meta.url));
const apiKey = process.env.ANTHROPIC_API_KEY;
const model = process.env.MODEL || DEFAULT_MODEL;
if (!apiKey) { console.error('Set ANTHROPIC_API_KEY first.'); process.exit(1); }

const expected = JSON.parse(readFileSync(join(here, 'expected.json'), 'utf8'));
const FIELDS = ['generic', 'strengthMg', 'doseQty', 'slots', 'asNeeded', 'maxPerDay', 'food', 'durationDays', 'quantity', 'finishCourse', 'source'];
const MEDIA = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

const same = (a, b) => JSON.stringify(Array.isArray(a) ? [...a].sort() : a) === JSON.stringify(Array.isArray(b) ? [...b].sort() : b);

let fieldsRight = 0, fieldsTotal = 0, labelsPerfect = 0;
const rows = [];

for (const file of readdirSync(join(here, 'labels')).filter((f) => MEDIA[extname(f).toLowerCase()])) {
  const exp = expected[file];
  if (!exp) { console.warn(`skip ${file}: no entry in expected.json`); continue; }
  const base64 = readFileSync(join(here, 'labels', file)).toString('base64');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(buildRequest(base64, MEDIA[extname(file).toLowerCase()], model)),
  });
  if (!res.ok) { console.error(file, res.status, await res.text()); continue; }
  const data = await res.json();
  const draft = toDraft(parseModelText(data.content.map((c) => c.text || '').join('\n')));

  const wrong = FIELDS.filter((f) => f in exp && !same(draft[f], exp[f]));
  const checked = FIELDS.filter((f) => f in exp).length;
  fieldsRight += checked - wrong.length;
  fieldsTotal += checked;
  if (!wrong.length) labelsPerfect++;
  const flaggedWrong = wrong.filter((f) => draft.uncertain.includes(f));
  rows.push({ file, ok: `${checked - wrong.length}/${checked}`, wrong: wrong.map((f) => `${f}: got ${JSON.stringify(draft[f])}, want ${JSON.stringify(exp[f])}`).join('; ') || '-', 'wrong but flagged "please check"': flaggedWrong.join(', ') || '-' });
}

console.table(rows);
console.log(`\nModel: ${model}`);
console.log(`Labels fully correct: ${labelsPerfect}/${rows.length}`);
console.log(`Fields correct: ${fieldsRight}/${fieldsTotal} (${((100 * fieldsRight) / (fieldsTotal || 1)).toFixed(0)}%)`);
