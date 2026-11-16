import { SLOTS, FOOD_LABELS, FOOD_ORDER, DRUGS, ADVICE, ALLERGY_GROUPS, CONDITIONS, checkMedications, warningsForNew, isActive, endDate, toISODate, findDrug, drugName, dailyMg, sortForSlot, useText, defaultSlots } from './rules.js';
import { DEFAULT_MODEL, extractFromImage, toDraft } from './extract.js';
import { DEMO_PROFILE, demoMeds, SAMPLE_LABELS } from './samples.js';

// ---------- state & storage ----------
const STORE_KEY = 'medmerge:v1';
const today = () => toISODate(new Date());

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    if (s && Array.isArray(s.meds)) {
      // Fill in fields added in later versions.
      s.profile = { allergies: [], allergyOther: '', conditions: [], ...s.profile };
      return s;
    }
  } catch { /* storage unavailable or corrupt */ }
  return freshDemo();
}
function freshDemo() {
  return { profile: { ...DEMO_PROFILE }, meds: demoMeds(today()), taken: {}, settings: { apiKey: '', model: DEFAULT_MODEL } };
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

let state = load();
let draft = null; // medicine being confirmed on the Add screen
let addStage = 'choose'; // choose | reading | confirm
let scanImage = null; // data URL of the label being confirmed
let scanError = '';
let toast = '';

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// ---------- formatting helpers ----------
const SOURCES = ['Hospital', 'Polyclinic', 'GP', 'Pharmacy', 'Other'];
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
function fmtDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' });
}
function fmtTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit' });
}
function doseText(m) {
  const amount = m.doseUnit === 'ml' ? `${m.doseQty} ml` : `${m.doseQty} ${m.doseUnit}${m.doseQty === 1 ? '' : 's'}`;
  return m.strengthMg ? `${amount} · ${m.strengthMg} mg each` : amount;
}
function howText(m) {
  const names = SLOTS.filter((s) => m.slots.includes(s.key)).map((s) => s.label);
  if (m.asNeeded) return `Only if needed${m.maxPerDay ? `, max ${m.maxPerDay} times a day` : ''}${names.length ? ` (${names.join(', ')})` : ''}`;
  return names.length ? names.join(', ') : 'Time not set';
}
/** How many doses of this medicine have been ticked, on all days or on one day. */
function takenCount(medId, day) {
  const days = day ? [state.taken[day] || {}] : Object.values(state.taken);
  return days.reduce((n, d) => n + Object.entries(d).filter(([k, v]) => v && k.startsWith(`${medId}|`)).length, 0);
}
function remaining(m) {
  if (!m.quantity) return null;
  return Math.max(0, m.quantity - takenCount(m.id) * (m.doseQty || 1));
}
function courseText(m) {
  if (m.courseType === 'quantity') {
    const left = remaining(m);
    return left == null ? 'Until supply runs out' : left === 0 ? 'Supply used up' : `Until supply runs out · about ${left} left`;
  }
  const end = endDate(m);
  if (!end) return 'Ongoing';
  return end < today() ? `Ended ${fmtDate(end)}` : `Until ${fmtDate(end)}`;
}
const allergyList = (p) => [...(p.allergies || []).map((k) => ALLERGY_GROUPS[k]?.label).filter(Boolean), ...String(p.allergyOther || '').split(/[,;]+/).map((x) => x.trim()).filter(Boolean)];
const conditionList = (p) => (p.conditions || []).map((k) => CONDITIONS[k]?.label).filter(Boolean);
const checks = () => checkMedications(state.meds, today(), state.profile);
const sourceTag = (m) => `<span class="tag src-${esc(m.source.toLowerCase())}">${esc(m.source)}</span>`;
const foodTag = (m) => `<span class="tag food-${esc(m.food)}">${esc(FOOD_LABELS[m.food] || '')}</span>`;
const levelIcon = { high: '⚠️', medium: '⚠️', info: 'ℹ️' };

function warningCard(w) {
  return `<div class="warn warn-${w.level}">
    <div class="warn-title">${levelIcon[w.level]} ${esc(w.title)}</div>
    <div class="warn-detail">${esc(w.detail)}</div>
    ${w.level !== 'info' ? `<div class="warn-advice">${esc(w.advice || ADVICE)}</div>` : ''}
  </div>`;
}

// ---------- screens ----------
function screenToday() {
  const t = today();
  const active = state.meds.filter((m) => isActive(m, t));
  const taken = state.taken[t] || {};
  const warnings = checks().filter((w) => w.level !== 'info');
  const flagged = new Set(warnings.filter((w) => w.level === 'high').flatMap((w) => w.medIds));

  const now = new Date();
  const nowHM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const slotsWithMeds = SLOTS.map((s) => ({ ...s, meds: sortForSlot(active.filter((m) => m.slots.includes(s.key))) })).filter((s) => s.meds.length);
  // "Next up" only counts medicines that must be taken; "only if needed" ones are optional.
  const nextSlot = slotsWithMeds.find((s) => s.meds.some((m) => !m.asNeeded && !taken[`${m.id}|${s.key}`]));

  let banner;
  if (!active.some((m) => !m.asNeeded)) banner = `<div class="next done">No daily medicines today.</div>`;
  else if (!nextSlot) banner = `<div class="next done">✅ All daily medicines done for today</div>`;
  else {
    const left = nextSlot.meds.filter((m) => !m.asNeeded && !taken[`${m.id}|${nextSlot.key}`]);
    const due = nowHM >= nextSlot.time;
    banner = `<div class="next ${due ? 'due' : ''}">
      <div class="next-label">${due ? 'Take now' : `Next at ${fmtTime(nextSlot.time)}`}</div>
      <div class="next-what">${esc(nextSlot.label)}: ${plural(left.length, 'medicine')}</div>
    </div>`;
  }

  const row = (m, slot) => {
    const k = `${m.id}|${slot}`;
    const isTaken = !!taken[k];
    const used = m.asNeeded ? takenCount(m.id, t) : 0;
    const maxed = m.asNeeded && m.maxPerDay && used >= m.maxPerDay && !isTaken;
    const use = useText(m);
    return `<button class="dose ${isTaken ? 'taken' : ''} ${m.asNeeded ? 'optional' : ''} ${maxed ? 'maxed' : ''} ${flagged.has(m.id) ? 'flag' : ''}"
        data-toggle="${esc(k)}" aria-pressed="${isTaken}" ${maxed ? 'disabled' : ''}>
      <span class="check" aria-hidden="true">${isTaken ? '✓' : ''}</span>
      <span class="dose-body">
        ${m.asNeeded ? `<span class="optional-tag">Only if needed</span>` : ''}
        <span class="dose-name">${esc(m.labelName)}</span>
        ${use ? `<span class="dose-use">For: ${esc(use)}</span>` : ''}
        <span class="dose-amount">${esc(doseText(m))}</span>
        ${m.asNeeded && m.maxPerDay ? `<span class="dose-count">${maxed ? 'Max for today reached' : `Taken ${used} of max ${m.maxPerDay} today`}</span>` : ''}
        ${m.finishCourse ? `<span class="dose-note">Finish the whole course</span>` : ''}
        ${flagged.has(m.id) ? `<span class="dose-flag">⚠️ Check with your pharmacist first (see My meds)</span>` : ''}
        <span class="tags">${sourceTag(m)}</span>
      </span>
    </button>`;
  };

  const sections = slotsWithMeds.map((s) => {
    const groups = FOOD_ORDER.map((f) => ({ f, meds: s.meds.filter((m) => m.food === f) })).filter((g) => g.meds.length);
    return `<section class="slot">
      <h2>${esc(s.label)} <span class="slot-time">${fmtTime(s.time)}</span></h2>
      ${groups.map((g, i) => `
        <div class="food-step food-step-${esc(g.f)}"><span class="step-num">${i + 1}</span>${esc(FOOD_LABELS[g.f])}</div>
        ${g.meds.map((m) => row(m, s.key)).join('')}`).join('')}
    </section>`;
  }).join('');

  return `
    <header class="page-head">
      <p class="muted">${new Date().toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      <h1>Today</h1>
    </header>
    ${banner}
    ${warnings.length ? `<a class="warn-link" href="#meds">⚠️ ${plural(warnings.length, 'thing')} to check with your pharmacist →</a>` : ''}
    ${sections}`;
}

function screenMeds() {
  const t = today();
  const warnings = checks();
  const flagged = new Set(warnings.filter((w) => w.level !== 'info').flatMap((w) => w.medIds));
  const active = state.meds.filter((m) => isActive(m, t));
  const past = state.meds.filter((m) => !isActive(m, t));

  const groups = SOURCES.map((src) => ({ src, meds: active.filter((m) => m.source === src) })).filter((g) => g.meds.length);
  const card = (m) => `
    <div class="med ${flagged.has(m.id) ? 'flagged' : ''}">
      <div class="med-top">
        <div>
          <div class="med-name">${flagged.has(m.id) ? '⚠️ ' : ''}${esc(m.labelName)}</div>
          <div class="muted small">${m.generic ? esc(drugName(m.generic)) : 'Not in our checking list'}${useText(m) ? ` · For: ${esc(useText(m))}` : ''}</div>
        </div>
        <button class="link danger" data-remove="${esc(m.id)}">Remove</button>
      </div>
      <div class="med-meta">${esc(doseText(m))}</div>
      <div class="med-meta">${esc(howText(m))} · ${foodTag(m)}</div>
      <div class="med-meta muted small">${esc(m.sourceName || m.source)} · ${esc(courseText(m))}${m.finishCourse ? ' · Finish the whole course' : ''}</div>
    </div>`;

  return `
    <header class="page-head"><h1>My medicines</h1>
      <p class="muted">${plural(active.length, 'medicine')} from ${plural(groups.length, 'place')}</p></header>
    ${warnings.length ? `<section><h2>Things to check</h2>${warnings.map(warningCard).join('')}</section>`
      : `<div class="ok">✅ No clashes found in our checking list.</div>`}
    ${groups.map((g) => `<section><h2>${esc(g.src)}</h2>${g.meds.map(card).join('')}</section>`).join('')}
    ${!active.length ? `<p class="muted">No medicines yet. <a href="#add">Add one</a>.</p>` : ''}
    ${past.length ? `<details class="past"><summary>Finished courses (${past.length})</summary>${past.map(card).join('')}</details>` : ''}
    <p class="disclaimer">Checks use a small example rule list for this prototype. They do not cover every medicine or clash.</p>`;
}

function screenAdd() {
  if (addStage === 'reading') {
    return `<header class="page-head"><h1>Reading label…</h1></header>
      ${scanImage ? `<img class="label-preview" src="${scanImage}" alt="Medicine label being read">` : ''}
      <div class="spinner" role="status">Reading the label</div>`;
  }
  if (addStage === 'confirm' && draft) return screenConfirm();

  const live = !!state.settings.apiKey;
  return `
    <header class="page-head"><h1>Add a medicine</h1>
      <p class="muted">Take a photo of the label on the medicine packet.</p></header>
    ${scanError ? `<div class="warn warn-high">${esc(scanError)}</div>` : ''}
    <label class="big-btn ${live ? '' : 'disabled'}">
      📷 Scan a label
      <input type="file" accept="image/*" capture="environment" id="photo" ${live ? '' : 'disabled'} hidden>
    </label>
    ${live ? '' : `<p class="muted small">Live scanning needs an API key in <a href="#settings">Settings</a>. Try a sample label below instead.</p>`}
    <h2>Try a sample label</h2>
    <p class="muted small">Fictional labels: Mr Lim's GP visit today for a cough and fever, plus one from a different clinic.</p>
    <div class="samples">
      ${SAMPLE_LABELS.map((s) => `<button class="sample" data-sample="${esc(s.id)}">
        <img src="${esc(s.image)}" alt="${esc(s.caption)} label"><span>${esc(s.caption)}</span></button>`).join('')}
    </div>
    <button class="link" id="manual">Or type it in yourself</button>`;
}

function field(name, labelText, inner) {
  const aliases = { course: ['course', 'durationDays', 'quantity'] };
  const unsure = (aliases[name] || [name]).some((n) => draft.uncertain.includes(n));
  return `<div class="field ${unsure ? 'unsure' : ''}">
    <label>${esc(labelText)}${unsure ? ' <span class="unsure-tag">Please check</span>' : ''}</label>${inner}</div>`;
}

function screenConfirm() {
  const d = draft;
  const preview = warningsForNew(d, state.meds, today(), state.profile);
  const opt = (val, cur, text) => `<option value="${esc(val)}" ${val === cur ? 'selected' : ''}>${esc(text)}</option>`;
  return `
    <header class="page-head"><h1>Check the details</h1>
      <p class="muted">We read this from the label. Fix anything that is wrong before saving.</p></header>
    ${scanImage ? `<img class="label-preview" src="${scanImage}" alt="Medicine label">` : ''}
    <div id="preview-warnings">${preview.length ? `<h2>Before you save</h2>${preview.map(warningCard).join('')}` : `<div class="ok">✅ No clashes found with your other medicines.</div>`}</div>
    <form id="confirm" autocomplete="off">
      ${field('labelName', 'Medicine name (as on label)', `<input name="labelName" value="${esc(d.labelName)}" required>`)}
      ${field('generic', 'Recognised as', `<select name="generic">${opt('', d.generic || '', 'Not in our list (won’t be checked)')}${Object.entries(DRUGS).map(([k, v]) => opt(k, d.generic || '', v.name)).join('')}</select>`)}
      <div class="row">
        ${field('strengthMg', 'Strength (mg)', `<input name="strengthMg" type="number" min="0" step="any" value="${d.strengthMg ?? ''}">`)}
        ${field('doseQty', 'Amount each time', `<input name="doseQty" type="number" min="0" step="any" value="${d.doseQty ?? ''}">`)}
        ${field('doseUnit', 'Unit', `<select name="doseUnit">${['tablet', 'capsule', 'ml', 'sachet', 'puff', 'drop', 'other'].map((u) => opt(u, d.doseUnit, u)).join('')}</select>`)}
      </div>
      ${field('asNeeded', 'Type', `<div class="seg">
        <label><input type="radio" name="asNeeded" value="no" ${!d.asNeeded ? 'checked' : ''}> Every day</label>
        <label><input type="radio" name="asNeeded" value="yes" ${d.asNeeded ? 'checked' : ''}> Only when needed</label></div>`)}
      ${d.asNeeded ? field('maxPerDay', 'Maximum times a day', `<input name="maxPerDay" type="number" min="1" value="${d.maxPerDay ?? ''}">`) : ''}
      ${field('slots', d.asNeeded ? 'Times it may be taken (shown as optional in your daily list)' : 'When to take',
        `<div class="seg">${SLOTS.map((s) => `<label><input type="checkbox" name="slots" value="${s.key}" ${d.slots.includes(s.key) ? 'checked' : ''}> ${s.label}</label>`).join('')}</div>`)}
      ${field('food', 'Food', `<select name="food">${FOOD_ORDER.map((k) => opt(k, d.food, FOOD_LABELS[k])).join('')}</select>`)}
      ${field('course', 'How long to take it', `<div class="seg">
          <label><input type="radio" name="courseType" value="ongoing" ${d.courseType === 'ongoing' ? 'checked' : ''}> Ongoing</label>
          <label><input type="radio" name="courseType" value="days" ${d.courseType === 'days' ? 'checked' : ''}> Set number of days</label>
          <label><input type="radio" name="courseType" value="quantity" ${d.courseType === 'quantity' ? 'checked' : ''}> Until this supply runs out</label>
        </div>
        ${d.courseType === 'days' ? `<div class="sub-input"><input name="durationDays" type="number" min="1" value="${d.durationDays ?? ''}" aria-label="Number of days"> days <span class="muted small">(e.g. antibiotics, eye drops, creams)</span></div>` : ''}
        ${d.courseType === 'quantity' ? `<div class="sub-input"><input name="quantity" type="number" min="1" value="${d.quantity ?? ''}" aria-label="Amount supplied"> ${esc(d.doseUnit)}s supplied <span class="muted small">(e.g. painkillers you stop when better)</span></div>` : ''}`)}
      ${field('finishCourse', 'Finish the whole course?', `<label class="check-line"><input type="checkbox" name="finishCourse" ${d.finishCourse ? 'checked' : ''}> Yes, the label says to complete the course (e.g. antibiotics)</label>`)}
      <div class="row">
        ${field('source', 'From', `<select name="source">${SOURCES.map((s) => opt(s, d.source, s)).join('')}</select>`)}
        ${field('sourceName', 'Clinic / hospital name', `<input name="sourceName" value="${esc(d.sourceName)}">`)}
      </div>
      ${field('purpose', 'What it is for', `<input name="purpose" value="${esc(d.purpose)}">`)}
      <div class="actions">
        <button type="button" class="btn secondary" id="cancel">Cancel</button>
        <button type="submit" class="btn primary">Save to my list</button>
      </div>
    </form>`;
}

function screenDoctor() {
  const t = today();
  const active = state.meds.filter((m) => isActive(m, t));
  const warnings = checks();
  const p = state.profile;
  return `
    <div class="doctor">
      <header class="page-head">
        <h1>Medication summary</h1>
        <p><strong>${esc(p.name)}</strong>${p.age ? `, ${esc(p.age)} years` : ''}</p>
        <p class="muted small">Patient-kept list as of ${fmtDate(t)}. Please confirm with the patient.</p>
      </header>
      <div class="allergy-box">
        <div><strong>Allergies:</strong> ${esc(allergyList(p).join('; ') || 'None recorded')}</div>
        <div><strong>Conditions:</strong> ${esc(conditionList(p).join('; ') || 'None recorded')}</div>
      </div>
      <table>
        <thead><tr><th>Medicine</th><th>Dose</th><th>How taken</th><th>From</th><th>Course</th></tr></thead>
        <tbody>${active.map((m) => `<tr>
          <td><strong>${esc(m.generic ? drugName(m.generic) : m.labelName)}</strong><br><span class="muted small">${esc(m.labelName)}</span></td>
          <td>${esc(doseText(m))}${dailyMg(m) ? `<br><span class="muted small">up to ${dailyMg(m).toLocaleString('en-US')} mg/day</span>` : ''}</td>
          <td>${esc(howText(m))}<br><span class="muted small">${esc(FOOD_LABELS[m.food])}</span></td>
          <td>${esc(m.sourceName || m.source)}<br><span class="muted small">${esc(m.source)}</span></td>
          <td>${esc(courseText(m))}<br><span class="muted small">from ${fmtDate(m.startDate)}</span></td>
        </tr>`).join('')}</tbody>
      </table>
      <h2>Flags for review</h2>
      ${warnings.length ? `<ul class="flags">${warnings.map((w) => `<li><strong>${esc(w.title)}.</strong> ${esc(w.detail)}</li>`).join('')}</ul>` : '<p>None from the example rule set.</p>'}
      <p class="disclaimer">Generated by MedMerge, a prototype. Flags come from a small example rule set and are not a complete interaction check.</p>
      <button class="btn primary no-print" id="print">Print / save as PDF</button>
    </div>`;
}

function screenSettings() {
  const s = state.settings;
  return `
    <header class="page-head"><h1>Settings</h1></header>
    <form id="settings">
      <div class="field"><label>Name</label><input name="name" value="${esc(state.profile.name)}"></div>
      <div class="field"><label>Age</label><input name="age" type="number" value="${esc(state.profile.age)}"></div>
      <h2>Allergies</h2>
      <p class="muted small">New medicines are checked against these. Add anything you have reacted to before.</p>
      <div class="checklist">${Object.entries(ALLERGY_GROUPS).map(([k, g]) => `<label class="check-line"><input type="checkbox" name="allergies" value="${k}" ${state.profile.allergies.includes(k) ? 'checked' : ''}> ${esc(g.label)}</label>`).join('')}</div>
      <div class="field"><label>Other allergies (separate with commas)</label><input name="allergyOther" value="${esc(state.profile.allergyOther)}" placeholder="e.g. Bactrim, cephalexin"></div>
      <h2>Health conditions</h2>
      <p class="muted small">Some medicines are unsafe with these conditions.</p>
      <div class="checklist">${Object.entries(CONDITIONS).map(([k, c]) => `<label class="check-line"><input type="checkbox" name="conditions" value="${k}" ${state.profile.conditions.includes(k) ? 'checked' : ''}> ${esc(c.label)}</label>`).join('')}</div>
      <h2>Live label scanning</h2>
      <p class="muted small">Uses the Claude API to read label photos. Your key is stored only in this browser. Prototype only: a real app would keep the key on a server.</p>
      <div class="field"><label>Anthropic API key</label><input name="apiKey" type="password" value="${esc(s.apiKey)}" placeholder="sk-ant-..."></div>
      <div class="field"><label>Model</label><input name="model" value="${esc(s.model || DEFAULT_MODEL)}"></div>
      <button class="btn primary" type="submit">Save settings</button>
    </form>
    <h2>Demo</h2>
    <div class="actions">
      <button class="btn secondary" id="reset-demo">Reset to Mr Lim demo</button>
      <button class="btn secondary" id="clear-all">Start empty</button>
    </div>
    <p class="disclaimer">All demo people, clinics and labels are fictional. Don't enter real patient data into this prototype.</p>`;
}

// ---------- rendering & routing ----------
const ROUTES = { today: screenToday, meds: screenMeds, add: screenAdd, doctor: screenDoctor, settings: screenSettings };
const route = () => (location.hash.slice(1) in ROUTES ? location.hash.slice(1) : 'today');

function render() {
  const r = route();
  $('#app').innerHTML = ROUTES[r]();
  document.querySelectorAll('nav a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${r}`));
  $('#toast').textContent = toast;
  $('#toast').classList.toggle('show', !!toast);
  if (toast) setTimeout(() => { toast = ''; $('#toast').classList.remove('show'); }, 4000);
}

window.addEventListener('hashchange', () => {
  if (route() !== 'add') { addStage = 'choose'; draft = null; scanImage = null; scanError = ''; }
  render();
  window.scrollTo(0, 0);
});

// ---------- image handling ----------
/** Load any image (photo or SVG), downscale, and return JPEG base64 for the API. */
function imageToJpeg(src, maxSide = 1568) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
      const w = Math.round((img.naturalWidth || 1200) * scale);
      const h = Math.round((img.naturalHeight || 800) * scale);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      const url = c.toDataURL('image/jpeg', 0.9);
      resolve({ dataUrl: url, base64: url.split(',')[1] });
    };
    img.onerror = () => reject(new Error('Could not open that image.'));
    img.src = src;
  });
}

function startDraft(raw, via) {
  draft = { ...toDraft(raw), id: uid(), startDate: today(), addedVia: via };
  addStage = 'confirm';
  render();
}

async function scanLive(fileOrUrl) {
  scanError = '';
  addStage = 'reading';
  const src = typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl);
  try {
    const { dataUrl, base64 } = await imageToJpeg(src);
    scanImage = dataUrl;
    render();
    const raw = await extractFromImage({ apiKey: state.settings.apiKey, model: state.settings.model, base64, mediaType: 'image/jpeg' });
    startDraft(raw, 'scan-live');
  } catch (e) {
    scanError = e.message || 'Scan failed.';
    addStage = 'choose';
    scanImage = null;
    render();
  }
}

function scanSample(id) {
  const s = SAMPLE_LABELS.find((x) => x.id === id);
  scanImage = s.image;
  // With an API key, really read the sample image; otherwise use the pre-recorded result.
  if (state.settings.apiKey) return scanLive(s.image);
  addStage = 'reading';
  render();
  setTimeout(() => startDraft(s.raw, 'scan-demo'), 900);
}

// Read the confirm form into the draft (keeps edits when the form re-renders).
function readForm(form) {
  const f = new FormData(form);
  const num = (k) => (f.get(k) === '' || f.get(k) == null ? null : Number(f.get(k)));
  const labelName = f.get('labelName').trim();
  let generic = f.get('generic') || null;
  // If the user renamed the medicine and left "Recognised as" alone, re-detect it.
  if (labelName !== draft.labelName && generic === draft.generic) generic = findDrug(labelName) || generic;
  const has = (k) => !!form.querySelector(`[name=${k}]`); // some inputs only exist for certain choices
  Object.assign(draft, {
    labelName, generic,
    strengthMg: num('strengthMg'), doseQty: num('doseQty') ?? 1, doseUnit: f.get('doseUnit'),
    asNeeded: f.get('asNeeded') === 'yes',
    slots: f.getAll('slots'),
    maxPerDay: has('maxPerDay') ? num('maxPerDay') : draft.maxPerDay,
    food: f.get('food'),
    courseType: f.get('courseType') || 'ongoing',
    durationDays: has('durationDays') ? num('durationDays') : draft.durationDays,
    quantity: has('quantity') ? num('quantity') : draft.quantity,
    finishCourse: f.has('finishCourse'),
    source: f.get('source'), sourceName: f.get('sourceName').trim(), purpose: f.get('purpose').trim(),
  });
}

// ---------- events ----------
document.addEventListener('click', (e) => {
  const t = e.target.closest('button, a');
  if (!t) return;

  if (t.dataset.toggle) {
    if (t.disabled) return;
    const day = (state.taken[today()] ||= {});
    day[t.dataset.toggle] = !day[t.dataset.toggle];
    save(); render();
  } else if (t.dataset.sample) {
    scanSample(t.dataset.sample);
  } else if (t.id === 'manual') {
    scanImage = null;
    draft = { id: uid(), labelName: '', generic: null, strengthMg: null, doseQty: 1, doseUnit: 'tablet', slots: ['morning'], asNeeded: false, maxPerDay: null, food: 'after', courseType: 'ongoing', durationDays: null, quantity: null, finishCourse: false, purpose: '', source: 'GP', sourceName: '', uncertain: [], startDate: today(), addedVia: 'manual' };
    addStage = 'confirm'; render();
  } else if (t.id === 'cancel') {
    addStage = 'choose'; draft = null; scanImage = null; render();
  } else if (t.dataset.remove) {
    // Two-tap confirm instead of a blocking dialog.
    if (t.dataset.armed) {
      state.meds = state.meds.filter((m) => m.id !== t.dataset.remove);
      save(); toast = 'Medicine removed'; render();
    } else {
      t.dataset.armed = '1'; t.textContent = 'Tap again to remove';
    }
  } else if (t.id === 'print') {
    window.print();
  } else if (t.id === 'reset-demo') {
    const settings = state.settings;
    state = { ...freshDemo(), settings }; save(); toast = 'Demo reset'; location.hash = '#today'; render();
  } else if (t.id === 'clear-all') {
    state = { profile: { name: 'Me', age: '', allergies: [], allergyOther: '', conditions: [] }, meds: [], taken: {}, settings: state.settings }; save(); toast = 'Started empty'; location.hash = '#today'; render();
  }
});

document.addEventListener('change', (e) => {
  if (e.target.id === 'photo' && e.target.files[0]) { scanLive(e.target.files[0]); return; }
  const form = e.target.closest('#confirm');
  if (!form) return;
  readForm(form);
  // Keep the "Recognised as" dropdown in sync when the name was re-detected.
  if (form.elements.generic) form.elements.generic.value = draft.generic || '';
  // Structural changes (every day <-> when needed) need a re-render; otherwise just refresh the warnings.
  if (e.target.name === 'asNeeded' || e.target.name === 'courseType') {
    if (e.target.name === 'asNeeded' && !draft.slots.length) draft.slots = draft.asNeeded ? defaultSlots(draft.maxPerDay || 3) : ['morning'];
    render();
  } else {
    const preview = warningsForNew(draft, state.meds, today(), state.profile);
    $('#preview-warnings').innerHTML = preview.length ? `<h2>Before you save</h2>${preview.map(warningCard).join('')}` : `<div class="ok">✅ No clashes found with your other medicines.</div>`;
  }
});

document.addEventListener('submit', (e) => {
  e.preventDefault();
  if (e.target.id === 'confirm') {
    readForm(e.target);
    if (!draft.slots.length) { toast = 'Choose at least one time of day'; render(); return; }
    if (draft.courseType === 'days' && !draft.durationDays) { toast = 'Enter the number of days, or choose Ongoing'; render(); return; }
    const { uncertain, ...med } = draft;
    if (med.courseType !== 'days') med.durationDays = null;
    if (!med.asNeeded) med.maxPerDay = null;
    state.meds.push(med);
    const n = warningsForNew(med, state.meds.filter((m) => m.id !== med.id), today(), state.profile).filter((w) => w.level !== 'info').length;
    save();
    toast = n ? `Added. ${plural(n, 'thing')} to check with your pharmacist.` : 'Added to your list.';
    draft = null; addStage = 'choose'; scanImage = null;
    location.hash = '#meds';
    render();
  } else if (e.target.id === 'settings') {
    const f = new FormData(e.target);
    state.profile = { name: f.get('name').trim() || 'Me', age: f.get('age'), allergies: f.getAll('allergies'), allergyOther: f.get('allergyOther').trim(), conditions: f.getAll('conditions') };
    state.settings = { apiKey: f.get('apiKey').trim(), model: f.get('model').trim() || DEFAULT_MODEL };
    save(); toast = 'Settings saved'; render();
  }
});

render();
