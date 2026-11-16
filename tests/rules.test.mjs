// Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkMedications, warningsForNew, findDrug, isActive, dailyMg, addDays, sortForSlot, useText, endDate } from '../js/rules.js';
import { toDraft, parseModelText } from '../js/extract.js';
import { demoMeds, SAMPLE_LABELS, DEMO_PROFILE } from '../js/samples.js';

const TODAY = '2026-11-13';
const fromSample = (id) => ({ ...toDraft(SAMPLE_LABELS.find((s) => s.id === id).raw), id: `new-${id}`, startDate: TODAY });
const types = (ws) => ws.map((w) => w.type).sort();

test('brand names map to the right generic', () => {
  assert.equal(findDrug('PANADOL 500MG TABLET'), 'paracetamol');
  assert.equal(findDrug('Nurofen (Ibuprofen) 400mg'), 'ibuprofen');
  assert.equal(findDrug('Arcoxia 90mg'), 'etoricoxib');
  assert.equal(findDrug('Klacid 500mg'), 'clarithromycin');
  assert.equal(findDrug('Some Unknown Herbal Tea'), null);
  assert.equal(findDrug(''), null);
});

test('Mr Lim demo list starts with no high-level warnings', () => {
  const ws = checkMedications(demoMeds(TODAY), TODAY);
  assert.deepEqual(ws.filter((w) => w.level === 'high'), []);
});

test('Panadol from GP is caught as a duplicate of hospital paracetamol, with total over max', () => {
  const ws = warningsForNew(fromSample('panadol'), demoMeds(TODAY), TODAY);
  const dup = ws.find((w) => w.type === 'duplicate');
  assert.ok(dup, 'expected a duplicate warning');
  assert.equal(dup.level, 'high');
  assert.match(dup.detail, /6,000 mg/);
  assert.match(dup.detail, /4,000 mg/);
});

test('Nurofen is flagged as a second NSAID alongside Arcoxia', () => {
  const ws = warningsForNew(fromSample('nurofen'), demoMeds(TODAY), TODAY);
  assert.ok(ws.some((w) => w.type === 'same-class' && w.id === 'class:nsaid'));
});

test('Klacid triggers interactions with atorvastatin and amlodipine', () => {
  const ws = warningsForNew(fromSample('klacid'), demoMeds(TODAY), TODAY);
  const titles = ws.map((w) => w.title).join(' | ');
  assert.match(titles, /Atorvastatin/);
  assert.match(titles, /Amlodipine/);
  assert.deepEqual(types(ws), ['interaction', 'interaction']);
});

test('Clarityne adds no warnings (no false alarms on a clean medicine)', () => {
  assert.deepEqual(warningsForNew(fromSample('clarityne'), demoMeds(TODAY), TODAY), []);
});

test('unknown medicines are reported as not checked, never silently passed', () => {
  const herbal = { id: 'h', labelName: 'Herbal Cough Syrup', generic: null, slots: ['night'], startDate: TODAY, durationDays: null };
  const ws = checkMedications([herbal], TODAY);
  assert.equal(ws.length, 1);
  assert.equal(ws[0].type, 'unknown');
});

test('finished courses are not checked', () => {
  const old = { ...fromSample('panadol'), startDate: addDays(TODAY, -30) };
  assert.equal(isActive(old, TODAY), false);
  const ws = checkMedications([...demoMeds(TODAY), old], TODAY);
  assert.ok(!ws.some((w) => w.type === 'duplicate'));
});

test('warfarin + ibuprofen is a high bleeding-risk interaction', () => {
  const meds = [
    { id: 'a', labelName: 'Warfarin 3mg', generic: 'warfarin', slots: ['night'], startDate: TODAY },
    { id: 'b', labelName: 'Brufen 400mg', generic: 'ibuprofen', slots: ['morning'], startDate: TODAY },
  ];
  const ws = checkMedications(meds, TODAY);
  assert.ok(ws.some((w) => w.type === 'interaction' && w.level === 'high' && /Bleeding/.test(w.title)));
});

test('daily mg uses max-per-day for "when needed" medicines and skips liquids', () => {
  assert.equal(dailyMg({ strengthMg: 400, doseQty: 1, doseUnit: 'tablet', asNeeded: true, maxPerDay: 3 }), 1200);
  assert.equal(dailyMg({ strengthMg: 500, doseQty: 2, doseUnit: 'tablet', slots: ['morning', 'night'] }), 2000);
  assert.equal(dailyMg({ strengthMg: 120, doseQty: 5, doseUnit: 'ml', slots: ['morning'] }), null);
});

test('scan results: default time-of-day guesses and handwritten fields are marked for the patient to check', () => {
  const panadol = toDraft(SAMPLE_LABELS[0].raw);
  assert.deepEqual(panadol.slots, ['morning', 'afternoon', 'night']);
  assert.ok(panadol.uncertain.includes('slots'));
  const nurofen = toDraft(SAMPLE_LABELS[1].raw);
  assert.ok(nurofen.uncertain.includes('maxPerDay'));
  assert.equal(nurofen.asNeeded, true);
  // "when needed" medicines still get time slots so they appear (as optional) in the daily list
  assert.deepEqual(nurofen.slots, ['morning', 'afternoon', 'night']);
  assert.ok(nurofen.uncertain.includes('slots'));
});

test('model replies wrapped in code fences still parse', () => {
  const raw = parseModelText('```json\n{"label_name":"Panadol","strength_mg":500}\n```');
  assert.equal(raw.label_name, 'Panadol');
});

// ---- v2: allergies, conditions, course types, ordering ----

test('Augmentin is flagged for Mr Lim, who is allergic to penicillin', () => {
  const ws = warningsForNew(fromSample('augmentin'), demoMeds(TODAY), TODAY, DEMO_PROFILE);
  const a = ws.find((w) => w.type === 'allergy');
  assert.ok(a, 'expected an allergy warning');
  assert.equal(a.level, 'high');
  assert.match(a.advice, /Do not take/);
});

test('no allergy warning when the profile has no allergies', () => {
  const ws = warningsForNew(fromSample('augmentin'), demoMeds(TODAY), TODAY, {});
  assert.ok(!ws.some((w) => w.type === 'allergy'));
});

test('typed-in allergies are matched by brand or by group word; unknown ones are reported', () => {
  const bactrim = { id: 'b', labelName: 'Bactrim DS', generic: 'cotrimoxazole', slots: ['morning'], startDate: TODAY };
  const amox = { id: 'a', labelName: 'Amoxil 500mg', generic: 'amoxicillin', slots: ['morning'], startDate: TODAY };
  const ws = checkMedications([bactrim, amox], TODAY, { allergyOther: 'bactrim, Penicillin, mango' });
  assert.equal(ws.filter((w) => w.type === 'allergy').length, 2);
  assert.ok(ws.some((w) => w.type === 'unknown' && /mango/.test(w.title)));
});

test('G6PD deficiency flags co-trimoxazole and Chuen Lin', () => {
  const meds = [
    { id: 'b', labelName: 'Bactrim', generic: 'cotrimoxazole', slots: ['morning'], startDate: TODAY },
    { id: 'c', labelName: 'Chuen Lin pills', generic: findDrug('Chuen Lin pills'), slots: ['night'], startDate: TODAY },
  ];
  const ws = checkMedications(meds, TODAY, { conditions: ['g6pd'] }).filter((w) => w.type === 'condition');
  assert.equal(ws.length, 2);
  assert.ok(ws.every((w) => w.level === 'high'));
});

test('pregnancy flags NSAIDs and statins but not paracetamol', () => {
  const meds = demoMeds(TODAY); // has paracetamol, etoricoxib (NSAID), atorvastatin (statin)
  const ws = checkMedications(meds, TODAY, { conditions: ['pregnant'] }).filter((w) => w.type === 'condition');
  const flagged = ws.flatMap((w) => w.medIds).sort();
  assert.deepEqual(flagged, ['m3', 'm5']);
});

test('course types: "until supply runs out" has no end date; "set days" does', () => {
  const nurofen = toDraft(SAMPLE_LABELS[1].raw);
  assert.equal(nurofen.courseType, 'quantity');
  assert.equal(nurofen.quantity, 10);
  assert.equal(endDate({ ...nurofen, startDate: TODAY }), null);
  const panadol = toDraft(SAMPLE_LABELS[0].raw);
  assert.equal(panadol.courseType, 'days');
  assert.equal(endDate({ ...panadol, startDate: TODAY }), addDays(TODAY, 4));
  const klacid = toDraft(SAMPLE_LABELS[2].raw);
  assert.equal(klacid.finishCourse, true);
  assert.equal(panadol.finishCourse, false);
});

test('each time slot is ordered before food -> anytime -> with food -> after food, optional last within a group', () => {
  const m = (id, food, asNeeded = false) => ({ id, food, asNeeded });
  const order = sortForSlot([m('a', 'after', true), m('b', 'after'), m('c', 'any'), m('d', 'before'), m('e', 'with')]).map((x) => x.id);
  assert.deepEqual(order, ['d', 'c', 'e', 'b', 'a']);
});

test('plain-language use: label purpose first, then our list', () => {
  assert.equal(useText({ purpose: 'Knee pain', generic: 'paracetamol' }), 'Knee pain');
  assert.equal(useText({ purpose: '', generic: 'omeprazole' }), 'Gastric / protect stomach');
  assert.equal(useText({ purpose: '', generic: null }), '');
  assert.equal(useText({ purpose: 'For fever / pain', generic: 'paracetamol' }), 'Fever / pain');
});
