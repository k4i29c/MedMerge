// Safety rules for MedMerge.
//
// Deliberately rule-based, NOT AI: medication warnings must be predictable,
// testable and explainable. This is a small EXAMPLE rule set for the prototype
// and is nowhere near complete. Unknown medicines are reported as "not checked"
// rather than silently treated as safe.

export const SLOTS = [
  { key: 'morning', label: 'Morning', time: '08:00' },
  { key: 'afternoon', label: 'Afternoon', time: '13:00' },
  { key: 'evening', label: 'Evening', time: '18:00' },
  { key: 'night', label: 'Night', time: '21:00' },
];

export const FOOD_LABELS = {
  before: 'Before food',
  any: 'With or without food',
  with: 'With food',
  after: 'After food',
};
// Order a patient actually takes things around a meal: before eating -> anytime -> with/after eating.
export const FOOD_ORDER = ['before', 'any', 'with', 'after'];

/** Sort medicines for one time slot: by food timing, then daily medicines before "only if needed". */
export function sortForSlot(meds) {
  return [...meds].sort((a, b) =>
    FOOD_ORDER.indexOf(a.food) - FOOD_ORDER.indexOf(b.food) || Number(!!a.asNeeded) - Number(!!b.asNeeded));
}

// generic key -> info. `use` is a plain-language "what it's for". `classes` drive the rules.
export const DRUGS = {
  paracetamol: { name: 'Paracetamol', use: 'Pain / fever', brands: ['panadol', 'calpol', 'tylenol', 'acetaminophen', 'uphamol'], classes: ['analgesic'], maxDailyMg: 4000 },
  ibuprofen: { name: 'Ibuprofen', use: 'Pain / swelling', brands: ['nurofen', 'brufen', 'advil'], classes: ['nsaid'] },
  etoricoxib: { name: 'Etoricoxib', use: 'Pain / swelling', brands: ['arcoxia'], classes: ['nsaid'] },
  celecoxib: { name: 'Celecoxib', use: 'Pain / swelling', brands: ['celebrex'], classes: ['nsaid'] },
  naproxen: { name: 'Naproxen', use: 'Pain / swelling', brands: ['naprosyn', 'synflex'], classes: ['nsaid'] },
  diclofenac: { name: 'Diclofenac', use: 'Pain / swelling', brands: ['voltaren', 'cataflam'], classes: ['nsaid'] },
  mefenamic_acid: { name: 'Mefenamic acid', use: 'Pain / period pain', brands: ['ponstan'], classes: ['nsaid'] },
  aspirin: { name: 'Aspirin', use: 'Prevent blood clots (heart)', brands: ['cardiprin', 'aspilets', 'bayer aspirin'], classes: ['antiplatelet'] },
  clopidogrel: { name: 'Clopidogrel', use: 'Prevent blood clots (heart)', brands: ['plavix'], classes: ['antiplatelet'] },
  warfarin: { name: 'Warfarin', use: 'Blood thinner', brands: ['coumadin', 'marevan'], classes: ['anticoagulant'] },
  metformin: { name: 'Metformin', use: 'Diabetes (blood sugar)', brands: ['glucophage'], classes: ['antidiabetic'] },
  amlodipine: { name: 'Amlodipine', use: 'Blood pressure', brands: ['norvasc'], classes: ['calcium_channel_blocker'] },
  nifedipine: { name: 'Nifedipine', use: 'Blood pressure', brands: ['adalat'], classes: ['calcium_channel_blocker'] },
  lisinopril: { name: 'Lisinopril', use: 'Blood pressure', brands: ['zestril'], classes: ['ace_inhibitor'] },
  enalapril: { name: 'Enalapril', use: 'Blood pressure', brands: ['renitec'], classes: ['ace_inhibitor'] },
  losartan: { name: 'Losartan', use: 'Blood pressure', brands: ['cozaar'], classes: ['arb'] },
  valsartan: { name: 'Valsartan', use: 'Blood pressure', brands: ['diovan'], classes: ['arb'] },
  atorvastatin: { name: 'Atorvastatin', use: 'Cholesterol', brands: ['lipitor'], classes: ['statin'] },
  simvastatin: { name: 'Simvastatin', use: 'Cholesterol', brands: ['zocor'], classes: ['statin'] },
  rosuvastatin: { name: 'Rosuvastatin', use: 'Cholesterol', brands: ['crestor'], classes: ['statin'] },
  clarithromycin: { name: 'Clarithromycin', use: 'Antibiotic (infection)', brands: ['klacid'], classes: ['macrolide'] },
  erythromycin: { name: 'Erythromycin', use: 'Antibiotic (infection)', brands: ['erythrocin'], classes: ['macrolide'] },
  amoxicillin: { name: 'Amoxicillin', use: 'Antibiotic (infection)', brands: ['amoxil', 'augmentin', 'amoxiclav'], classes: ['penicillin'] },
  cotrimoxazole: { name: 'Co-trimoxazole', use: 'Antibiotic (infection)', brands: ['bactrim', 'sulfamethoxazole'], classes: ['sulfonamide'] },
  nitrofurantoin: { name: 'Nitrofurantoin', use: 'Antibiotic (urine infection)', brands: ['macrodantin'], classes: [] },
  dapsone: { name: 'Dapsone', use: 'Skin / infection', brands: [], classes: [] },
  primaquine: { name: 'Primaquine', use: 'Malaria', brands: [], classes: [] },
  coptis: { name: 'Chuen Lin (Coptis, herbal)', use: 'Traditional herbal remedy', brands: ['chuen lin', 'huang lian'], classes: [] },
  omeprazole: { name: 'Omeprazole', use: 'Gastric / protect stomach', brands: ['losec'], classes: ['ppi'] },
  esomeprazole: { name: 'Esomeprazole', use: 'Gastric / protect stomach', brands: ['nexium'], classes: ['ppi'] },
  loratadine: { name: 'Loratadine', use: 'Allergy / runny nose', brands: ['clarityne', 'claritin'], classes: ['antihistamine'] },
  cetirizine: { name: 'Cetirizine', use: 'Allergy / runny nose', brands: ['zyrtec'], classes: ['antihistamine'] },
  chlorpheniramine: { name: 'Chlorpheniramine', use: 'Allergy / runny nose (drowsy)', brands: ['piriton'], classes: ['antihistamine', 'sedating'] },
  diphenhydramine: { name: 'Diphenhydramine', use: 'Allergy / sleep (drowsy)', brands: ['benadryl'], classes: ['antihistamine', 'sedating'] },
  codeine: { name: 'Codeine', use: 'Cough / pain', brands: [], classes: ['opioid', 'sedating'] },
  tramadol: { name: 'Tramadol', use: 'Strong pain', brands: ['tramal'], classes: ['opioid', 'sedating'] },
};

// ---- Patient allergies and conditions (set in Settings) ----
export const ALLERGY_GROUPS = {
  penicillin: { label: 'Penicillins (e.g. amoxicillin, Augmentin)', match: ['c:penicillin'] },
  nsaid: { label: 'Aspirin / NSAID painkillers (e.g. ibuprofen, Arcoxia)', match: ['c:nsaid', 'g:aspirin'] },
  sulfa: { label: 'Sulfa antibiotics (e.g. Bactrim)', match: ['c:sulfonamide'] },
  macrolide: { label: 'Macrolide antibiotics (e.g. Klacid)', match: ['c:macrolide'] },
  paracetamol: { label: 'Paracetamol', match: ['g:paracetamol'] },
  opioid: { label: 'Opioids (e.g. codeine, tramadol)', match: ['c:opioid'] },
};
// Words a patient might type in "other allergies" that mean a whole group.
const ALLERGY_WORDS = { penicillin: 'penicillin', sulfa: 'sulfa', sulpha: 'sulfa', nsaid: 'nsaid', aspirin: 'nsaid', opioid: 'opioid', morphine: 'opioid' };

export const CONDITIONS = {
  g6pd: { label: 'G6PD deficiency', rules: [
    { match: ['c:sulfonamide', 'g:nitrofurantoin', 'g:dapsone', 'g:primaquine', 'g:coptis'], level: 'high', detail: 'This can break down red blood cells (haemolysis) in people with G6PD deficiency.' },
  ] },
  pregnant: { label: 'Pregnant', rules: [
    { match: ['c:nsaid'], level: 'high', detail: 'NSAID painkillers are usually avoided in pregnancy, especially from 20 weeks.' },
    { match: ['c:statin'], level: 'high', detail: 'Cholesterol medicines (statins) are usually stopped during pregnancy.' },
    { match: ['c:ace_inhibitor', 'c:arb'], level: 'high', detail: 'This type of blood-pressure medicine can harm the unborn baby and is usually avoided in pregnancy.' },
    { match: ['g:warfarin'], level: 'high', detail: 'Warfarin can harm the unborn baby; another blood thinner is usually used in pregnancy.' },
  ] },
  breastfeeding: { label: 'Breastfeeding', rules: [
    { match: ['g:codeine'], level: 'high', detail: 'Codeine passes into breast milk and can cause dangerous drowsiness in babies.' },
    { match: ['g:tramadol'], level: 'medium', detail: 'Tramadol passes into breast milk and is generally not recommended while breastfeeding.' },
  ] },
  kidney: { label: 'Kidney disease', rules: [
    { match: ['c:nsaid'], level: 'high', detail: 'NSAID painkillers can make kidney function worse.' },
    { match: ['g:metformin'], level: 'medium', detail: 'The safe dose of metformin depends on how well the kidneys work.' },
  ] },
  liver: { label: 'Liver disease', rules: [
    { match: ['g:paracetamol'], level: 'medium', detail: 'People with liver disease often need a lower daily maximum of paracetamol.' },
  ] },
  ulcer: { label: 'Stomach ulcer or past stomach bleeding', rules: [
    { match: ['c:nsaid', 'g:aspirin'], level: 'high', detail: 'This can cause stomach bleeding, especially after a past ulcer or bleed.' },
    { match: ['c:anticoagulant'], level: 'medium', detail: 'Blood thinners raise bleeding risk after a past stomach bleed.' },
  ] },
  asthma: { label: 'Asthma', rules: [
    { match: ['c:nsaid', 'g:aspirin'], level: 'medium', detail: 'In some people with asthma, aspirin and NSAID painkillers can trigger an attack.' },
  ] },
};

// Classes where taking two DIFFERENT drugs of the same type is worth flagging.
const SAME_CLASS_RULES = {
  nsaid: {
    level: 'high',
    title: 'Two anti-inflammatory painkillers (NSAIDs)',
    detail: 'Taking two NSAIDs together raises the risk of stomach bleeding and kidney problems, without much extra pain relief.',
  },
  statin: { level: 'medium', title: 'Two cholesterol medicines (statins)', detail: 'Two statins are rarely meant to be taken together.' },
  ppi: { level: 'medium', title: 'Two stomach-acid medicines', detail: 'Two medicines of this type are rarely needed together.' },
  antihistamine: { level: 'medium', title: 'Two allergy medicines (antihistamines)', detail: 'Doubling up can add drowsiness and side effects.' },
  anticoagulant: { level: 'high', title: 'Two blood thinners', detail: 'Two anticoagulants together greatly raise bleeding risk.' },
};

// Pairwise interaction rules. `a` and `b` match a generic ("g:warfarin") or a class ("c:nsaid").
export const INTERACTIONS = [
  { a: 'g:warfarin', b: 'c:nsaid', level: 'high', title: 'Bleeding risk', detail: 'NSAID painkillers taken with warfarin raise the risk of serious bleeding.' },
  { a: 'g:warfarin', b: 'c:antiplatelet', level: 'high', title: 'Bleeding risk', detail: 'Warfarin with an antiplatelet medicine raises the risk of bleeding.' },
  { a: 'c:antiplatelet', b: 'c:nsaid', level: 'medium', title: 'Stomach bleeding risk', detail: 'An NSAID with an antiplatelet medicine raises the risk of stomach bleeding; ibuprofen can also weaken aspirin\'s heart protection.' },
  { a: 'c:macrolide', b: 'g:simvastatin', level: 'high', title: 'Muscle damage risk', detail: 'This antibiotic can raise simvastatin to harmful levels. The two are usually not taken together.' },
  { a: 'g:clarithromycin', b: 'g:atorvastatin', level: 'medium', title: 'Muscle side-effect risk', detail: 'Clarithromycin can raise atorvastatin levels, increasing the chance of muscle pain or damage. Doctors sometimes pause the statin during the antibiotic course.' },
  { a: 'g:clarithromycin', b: 'c:calcium_channel_blocker', level: 'medium', title: 'Low blood pressure risk', detail: 'Clarithromycin can raise the level of this blood-pressure medicine, which may cause dizziness, low blood pressure or ankle swelling, especially in older adults.' },
  { a: 'c:nsaid', b: 'c:ace_inhibitor', level: 'medium', title: 'Kidney and blood pressure', detail: 'NSAIDs can weaken this blood-pressure medicine and strain the kidneys.' },
  { a: 'c:nsaid', b: 'c:arb', level: 'medium', title: 'Kidney and blood pressure', detail: 'NSAIDs can weaken this blood-pressure medicine and strain the kidneys.' },
  { a: 'g:clopidogrel', b: 'g:omeprazole', level: 'medium', title: 'May weaken clopidogrel', detail: 'Omeprazole can reduce how well clopidogrel works.' },
  { a: 'c:opioid', b: 'g:chlorpheniramine', level: 'medium', title: 'Extra drowsiness', detail: 'Both cause drowsiness; together they can affect breathing and raise fall risk.' },
  { a: 'c:opioid', b: 'g:diphenhydramine', level: 'medium', title: 'Extra drowsiness', detail: 'Both cause drowsiness; together they can affect breathing and raise fall risk.' },
];

export const ADVICE = 'Do not stop or change any medicine on your own. Show this to your pharmacist or doctor.';
const ALLERGY_ADVICE = 'Do not take this until a doctor or pharmacist has checked it.';
const CONDITION_ADVICE = 'Check with your doctor or pharmacist before taking this.';

const norm = (s) => ` ${String(s || '').toLowerCase().replace(/[^a-z]+/g, ' ').trim()} `;

/** Map label text (brand or generic) to a generic key, or null if not in our list. */
export function findDrug(text) {
  const t = norm(text);
  if (!t.trim()) return null;
  for (const [key, d] of Object.entries(DRUGS)) {
    const names = [key.replace(/_/g, ' '), d.name.toLowerCase(), ...d.brands];
    if (names.some((n) => t.includes(norm(n)))) return key;
  }
  return null;
}

export function drugName(key) {
  return DRUGS[key]?.name || null;
}

// ---- dates ----
export function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  return toISODate(new Date(y, m - 1, d + n));
}

export function endDate(med) {
  if (!med.durationDays || (med.courseType && med.courseType !== 'days')) return null;
  return addDays(med.startDate, med.durationDays - 1);
}

export function isActive(med, todayISO) {
  if (med.startDate && todayISO < med.startDate) return false;
  const end = endDate(med);
  return !end || todayISO <= end;
}

/** Most mg the label allows per day, or null if we can't work it out safely. */
export function dailyMg(med) {
  if (!med.strengthMg || !med.doseQty) return null;
  if (!['tablet', 'capsule'].includes(med.doseUnit)) return null;
  const timesPerDay = med.asNeeded ? med.maxPerDay : (med.slots || []).length;
  if (!timesPerDay) return null;
  return med.strengthMg * med.doseQty * timesPerDay;
}

function matches(spec, med) {
  const [kind, val] = spec.split(':');
  if (!med.generic) return false;
  if (kind === 'g') return med.generic === val;
  return (DRUGS[med.generic]?.classes || []).includes(val);
}

const label = (m) => `${m.labelName}${m.sourceName ? ` (${m.sourceName})` : ''}`;
const fmt = (n) => n.toLocaleString('en-US');

/**
 * Check a list of medicines. Only active medicines are checked.
 * Returns warnings: { id, level: 'high'|'medium'|'info', type, medIds, title, detail }
 */
export function checkMedications(meds, todayISO, profile = {}) {
  const active = meds.filter((m) => isActive(m, todayISO));
  const warnings = [];

  // 1. Same medicine from more than one place (or entered twice).
  const byGeneric = {};
  for (const m of active) if (m.generic) (byGeneric[m.generic] ||= []).push(m);
  for (const [g, group] of Object.entries(byGeneric)) {
    const max = DRUGS[g].maxDailyMg;
    const total = group.reduce((s, m) => s + (dailyMg(m) || 0), 0);
    const allKnown = group.every((m) => dailyMg(m) != null);
    if (group.length > 1) {
      let detail = `${group.map(label).join(' and ')} contain the same medicine: ${DRUGS[g].name}.`;
      if (max && allKnown) {
        detail += ` Together the labels add up to as much as ${fmt(total)} mg a day.`;
        if (total > max) detail += ` The usual adult maximum is ${fmt(max)} mg a day (often lower for older adults).`;
      }
      warnings.push({ id: `dup:${g}`, level: 'high', type: 'duplicate', medIds: group.map((m) => m.id), title: `Same medicine twice: ${DRUGS[g].name}`, detail });
    } else if (max && allKnown && total > max) {
      warnings.push({ id: `max:${g}`, level: 'high', type: 'max-dose', medIds: [group[0].id], title: `High daily amount: ${DRUGS[g].name}`, detail: `This label allows up to ${fmt(total)} mg a day. The usual adult maximum is ${fmt(max)} mg.` });
    }
  }

  // 2. Different medicines of the same type.
  for (const [cls, rule] of Object.entries(SAME_CLASS_RULES)) {
    const group = active.filter((m) => m.generic && DRUGS[m.generic].classes.includes(cls));
    const generics = new Set(group.map((m) => m.generic));
    if (generics.size > 1) {
      warnings.push({ id: `class:${cls}`, level: rule.level, type: 'same-class', medIds: group.map((m) => m.id), title: rule.title, detail: `${group.map(label).join(' and ')}. ${rule.detail}` });
    }
  }

  // 3. Known interactions between pairs.
  const seen = new Set();
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const x = active[i];
      const y = active[j];
      if (!x.generic || !y.generic || x.generic === y.generic) continue;
      for (const r of INTERACTIONS) {
        const hit = (matches(r.a, x) && matches(r.b, y)) || (matches(r.a, y) && matches(r.b, x));
        if (!hit) continue;
        const key = `ix:${[x.generic, y.generic].sort().join('+')}:${r.title}`;
        if (seen.has(key)) continue;
        seen.add(key);
        warnings.push({ id: key, level: r.level, type: 'interaction', medIds: [x.id, y.id], title: `${r.title}: ${DRUGS[x.generic].name} + ${DRUGS[y.generic].name}`, detail: r.detail });
      }
    }
  }

  // 4. Allergies.
  const allergySpecs = [];
  for (const key of profile.allergies || []) {
    if (ALLERGY_GROUPS[key]) allergySpecs.push({ label: ALLERGY_GROUPS[key].label, match: ALLERGY_GROUPS[key].match });
  }
  const unreadable = [];
  for (const item of String(profile.allergyOther || '').split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean)) {
    const g = findDrug(item);
    const word = Object.keys(ALLERGY_WORDS).find((w) => norm(item).includes(norm(w)));
    if (g) allergySpecs.push({ label: item, match: [`g:${g}`] });
    else if (word) allergySpecs.push({ label: item, match: ALLERGY_GROUPS[ALLERGY_WORDS[word]].match });
    else unreadable.push(item);
  }
  for (const m of active) {
    const hit = allergySpecs.find((a) => a.match.some((spec) => matches(spec, m)));
    if (hit) {
      warnings.push({ id: `allergy:${m.id}`, level: 'high', type: 'allergy', medIds: [m.id], title: `Allergy: ${m.labelName}`, detail: `${label(m)} contains ${DRUGS[m.generic].name}. Your allergy list includes: ${hit.label}.`, advice: ALLERGY_ADVICE });
    }
  }
  for (const item of unreadable) {
    warnings.push({ id: `allergy-unread:${item}`, level: 'info', type: 'unknown', medIds: [], title: `Allergy not checked: ${item}`, detail: 'We could not match this allergy to our medicine list, so new medicines are not checked against it. Always tell your doctor and pharmacist.' });
  }

  // 5. Conditions (G6PD, pregnancy, ...).
  for (const c of profile.conditions || []) {
    const cond = CONDITIONS[c];
    if (!cond) continue;
    for (const m of active) {
      const rule = cond.rules.find((r) => r.match.some((spec) => matches(spec, m)));
      if (rule) warnings.push({ id: `cond:${c}:${m.id}`, level: rule.level, type: 'condition', medIds: [m.id], title: `${cond.label}: ${m.labelName}`, detail: rule.detail, advice: CONDITION_ADVICE });
    }
  }

  // 6. Medicines we could not check.
  for (const m of active) {
    if (!m.generic) {
      warnings.push({ id: `unknown:${m.id}`, level: 'info', type: 'unknown', medIds: [m.id], title: `Not checked: ${m.labelName}`, detail: 'This medicine is not in our list, so it was not checked for clashes. Ask your pharmacist to check it.' });
    }
  }

  const order = { high: 0, medium: 1, info: 2 };
  return warnings.sort((a, b) => order[a.level] - order[b.level]);
}

/** Warnings that a new (not yet saved) medicine would cause. */
export function warningsForNew(candidate, existing, todayISO, profile = {}) {
  return checkMedications([...existing, candidate], todayISO, profile).filter((w) => w.medIds.includes(candidate.id));
}

/** Default time slots for "N times a day". */
export function defaultSlots(timesPerDay) {
  return { 1: ['morning'], 2: ['morning', 'night'], 3: ['morning', 'afternoon', 'night'], 4: ['morning', 'afternoon', 'evening', 'night'] }[timesPerDay] || [];
}

/** Plain-language "what it's for": the label's own words first, then our drug list. */
export function useText(med) {
  // Labels often say "For fever / pain"; we already show "For:", so drop the repeated word.
  const purpose = String(med.purpose || '').trim().replace(/^for\s+/i, '');
  const text = purpose || DRUGS[med.generic]?.use || '';
  return text ? text[0].toUpperCase() + text.slice(1) : '';
}
