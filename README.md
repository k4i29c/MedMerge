# MedMerge

**One medication list for patients who get medicines from many places.**

Older patients often take medicines from a hospital (after surgery), a polyclinic (chronic conditions), a GP (acute illness) and the pharmacy. No single list shows all of them together, so:

- doctors can prescribe something that duplicates or clashes with what the patient already takes, and
- patients who are unwell or confused lose track of what to take when, and whether it is before or after food.

MedMerge is a prototype that lets the **patient** scan each medicine label, confirm what was read, and keep one combined list that **flags duplicates and known clashes** and turns everything into a **simple daily schedule**. A one-page **summary for the doctor** can be shown or printed at any clinic.

> ⚠️ Prototype with **fictional data only** (Mr Lim, the clinics and labels are made up). Clash checks use a small example rule set and are not a complete interaction check. Not medical advice.

## Demo flow

1. **Today**: Mr Lim (68) sees what to take now. Each time of day is ordered the way he'd actually take things: **① before food → ② with or without food → ③ after food**. Every medicine shows what it's for in plain words ("For: Gastric / protect stomach"). "Only if needed" medicines appear in the same list as optional (dashed) items, with a *Taken 1 of max 3 today* counter that locks once the daily maximum is reached.
2. **Add**: he scans the label from today's GP visit (try the sample labels). The app shows what it read and highlights fields to double-check.
3. Scanning **Panadol** triggers: *"Same medicine twice: Paracetamol. Together the labels add up to as much as 6,000 mg a day. The usual adult maximum is 4,000 mg."* This appears **before** he saves.
4. **My meds**: one list grouped by Hospital / Polyclinic / GP, with flags.
5. **For doctor**: a printable summary with all medicines, sources, daily amounts and flags.

Other samples: **Nurofen** (a second NSAID alongside the hospital's Arcoxia; a "when needed" medicine whose course is *until this supply runs out*), **Klacid** (clashes with his statin and blood-pressure medicine; *finish the whole course*), **Augmentin** from a different clinic (Mr Lim is **allergic to penicillin**: flagged before saving) and **Clarityne** (no warnings, to show it doesn't cry wolf).

**Settings** holds the patient's **allergies** (common groups, plus free text such as "Bactrim") and **conditions** (G6PD deficiency, pregnancy, breastfeeding, kidney disease, liver disease, stomach ulcer, asthma). Every medicine is checked against them, and they appear at the top of the doctor summary.

## Design decisions

| Decision | Why |
|---|---|
| **AI only reads the label; fixed rules decide warnings** | Reading messy labels is what vision models do well. Safety logic must be predictable, testable and explainable, so it is rule-based (`js/rules.js`) and unit-tested. |
| **Patient confirms every scan** | The AI's output is a suggestion. Uncertain fields (handwriting, guessed times of day, missing food instruction) are highlighted "Please check". |
| **Unknown medicines are reported as "Not checked"** | Silence would wrongly suggest "safe". The same goes for typed allergies we can't match (e.g. "mango"). |
| **Daily list ordered by food timing** | A patient works through a time slot in the order they eat: before-food pills first, after-food pills last. |
| **"Only if needed" medicines live in the time slots, as optional** | Many acute medicines are optional. Showing them alongside the daily ones lets the patient decide at that moment, and the max-per-day lock stops accidental over-use. |
| **Three course types: ongoing / set number of days / until supply runs out** | Antibiotics, eye drops and creams run for set days; painkillers are stopped when better. "Finish the whole course" is shown only when the label says so. |
| **The app never tells anyone to stop or change a medicine** | Every warning points to the pharmacist or doctor. |
| **Demo mode works without an API key** | Reviewers can try it instantly. Sample labels use pre-recorded scan results that run through the same code path as live scans. |
| **No login or backend; data stays in the browser** | Keeps the prototype focused on the core workflow. |

**Deliberately left out:** pill photos, home stock tracking, caregiver accounts, push notifications, translations, NEHR/HealthHub integration, and children's weight-based dosing.

## Run it

No build step. Any static server works:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

(Opening `index.html` directly from disk will not work because the app uses ES modules.)

**Live label scanning (optional):** open *Settings*, paste an Anthropic API key, then use *Scan a label* with a phone photo. The key is stored only in your browser. This is fine for a prototype; a real app would call the API from a server.

## Tests and scanner accuracy check

```bash
npm test                                   # rule tests (no dependencies needed)
ANTHROPIC_API_KEY=sk-ant-... npm run eval  # scanner accuracy on eval/labels vs eval/expected.json
```

To test more labels, add photos to `eval/labels/` and their correct values to `eval/expected.json`.

## Project structure

```
index.html, styles.css   UI shell and styles (mobile-first, large text)
js/app.js                screens, state (localStorage), events
js/rules.js              drug list, duplicate / same-type / interaction / allergy / condition rules, schedule helpers
js/extract.js            label-reading prompt + Claude API call + normalising the result
js/samples.js            fictional demo patient and pre-recorded sample scans
samples/                 fictional label images (generated by scripts/make_labels.py)
tests/                   unit tests for the safety rules and scan normalisation
eval/                    scanner accuracy script and expected values
docs/screenshots/        screenshots for the write-up
```

## Deploy (GitHub Pages)

Push to GitHub → *Settings → Pages* → Source: *Deploy from a branch* → `main` / root. The app will be at `https://<username>.github.io/<repo>/`.
