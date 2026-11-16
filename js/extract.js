// Label reading with a vision model (Claude API).
// The AI only TRANSCRIBES the label. It never decides whether medicines are safe
// together: that is done by the fixed rules in rules.js. The patient confirms
// every field before anything is saved.

import { findDrug, defaultSlots } from './rules.js';

export const DEFAULT_MODEL = 'claude-sonnet-5-5';

export const EXTRACTION_PROMPT = `You are reading a photo of a pharmacy medication label (Singapore style).
Transcribe ONLY what is written on the label. Do not guess or add medical knowledge.
If something is not on the label or you cannot read it, use null and list the field in "uncertain_fields".

Return ONLY a JSON object, no other text:
{
  "is_medication_label": true/false,
  "label_name": "medicine name exactly as printed, including brand in brackets if shown",
  "generic_name": "generic/active ingredient if printed on the label, else null",
  "strength_mg": number or null,
  "dose_qty": number or null,           // e.g. 2 for "take 2 tablets"
  "dose_unit": "tablet" | "capsule" | "ml" | "sachet" | "puff" | "drop" | "other" | null,
  "times_per_day": number or null,
  "time_of_day": array of "morning" | "afternoon" | "evening" | "night", only if the label names times (e.g. "at night", "in the morning"), else [],
  "as_needed": true/false,              // "when necessary", "PRN", "if needed"
  "max_per_day": number or null,        // only if the label states a maximum
  "food": "before" | "after" | "with" | "any" | null,
  "duration_days": number or null,      // only if a course length is printed
  "quantity": number or null,           // amount supplied, e.g. 30 for "Qty: 30 TAB"
  "must_finish_course": true/false,     // only true if the label says to complete/finish the course
  "purpose": "what it is for, if printed (e.g. 'for pain'), else null",
  "source_type": "Hospital" | "Polyclinic" | "GP" | "Pharmacy" | "Other" | null,
  "source_name": "clinic/hospital/pharmacy name if printed, else null",
  "uncertain_fields": ["field names you were unsure about, including handwritten parts"]
}`;

/** Build the Messages API request body. Shared by the browser app and the eval script. */
export function buildRequest(base64, mediaType, model = DEFAULT_MODEL) {
  return {
    model,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: EXTRACTION_PROMPT },
        ],
      },
    ],
  };
}

/** Parse the model's text reply into JSON (tolerates code fences / stray text). */
export function parseModelText(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('The scan did not return readable data.');
  return JSON.parse(text.slice(start, end + 1));
}

const FIELD_MAP = {
  label_name: 'labelName', generic_name: 'generic', strength_mg: 'strengthMg', dose_qty: 'doseQty', dose_unit: 'doseUnit',
  times_per_day: 'slots', time_of_day: 'slots', as_needed: 'asNeeded', max_per_day: 'maxPerDay', food: 'food',
  duration_days: 'durationDays', quantity: 'quantity', must_finish_course: 'finishCourse', purpose: 'purpose', source_type: 'source', source_name: 'sourceName',
};

/** Turn raw extraction JSON into a draft medicine for the confirm screen. */
export function toDraft(raw) {
  const num = (v) => (typeof v === 'number' && isFinite(v) ? v : null);
  const timesPerDay = num(raw.times_per_day);
  const named = Array.isArray(raw.time_of_day) ? raw.time_of_day.filter((s) => ['morning', 'afternoon', 'evening', 'night'].includes(s)) : [];
  const asNeeded = !!raw.as_needed;
  // "When needed" medicines still get time slots, so they show up in the day's checklist as optional.
  const slots = named.length ? named
    : asNeeded ? (defaultSlots(num(raw.max_per_day)).length ? defaultSlots(num(raw.max_per_day)) : ['morning', 'afternoon', 'night'])
    : defaultSlots(timesPerDay);

  const uncertain = new Set((raw.uncertain_fields || []).map((f) => FIELD_MAP[f] || f));
  // Things a patient must look at even if the model was confident.
  if (named.length === 0 && (asNeeded || timesPerDay > 1)) uncertain.add('slots'); // times of day were our default guess
  if (!raw.food) uncertain.add('food');

  const generic = findDrug(raw.label_name) || findDrug(raw.generic_name);
  const durationDays = num(raw.duration_days);
  const quantity = num(raw.quantity);
  // Course length: printed days win; otherwise a supply that is used "when needed" lasts until it runs out.
  const courseType = durationDays ? 'days' : asNeeded && quantity ? 'quantity' : 'ongoing';

  return {
    labelName: raw.label_name || '',
    generic,
    strengthMg: num(raw.strength_mg),
    doseQty: num(raw.dose_qty) ?? 1,
    doseUnit: raw.dose_unit || 'tablet',
    slots,
    asNeeded,
    maxPerDay: num(raw.max_per_day),
    food: raw.food || 'any',
    courseType,
    durationDays: courseType === 'days' ? durationDays : null,
    quantity,
    finishCourse: !!raw.must_finish_course,
    purpose: raw.purpose || '',
    source: raw.source_type || 'Other',
    sourceName: raw.source_name || '',
    uncertain: [...uncertain],
  };
}

/** Call the Claude API directly from the browser (prototype only: the key stays on this device). */
export async function extractFromImage({ apiKey, model, base64, mediaType }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(buildRequest(base64, mediaType, model || DEFAULT_MODEL)),
  });
  if (!res.ok) {
    let msg = `Scan failed (${res.status}).`;
    try { msg += ' ' + ((await res.json()).error?.message || ''); } catch { /* ignore */ }
    throw new Error(msg.trim());
  }
  const data = await res.json();
  const text = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
  const raw = parseModelText(text);
  if (raw.is_medication_label === false) throw new Error('This does not look like a medicine label. Try another photo.');
  return raw;
}
