// Demo data. Everything here is FICTIONAL: the patient, clinics and labels are made up.
import { addDays } from './rules.js';

export const DEMO_PROFILE = { name: 'Mr Lim Boon Huat', age: 68, allergies: ['penicillin'], allergyOther: '', conditions: [] };

/** Mr Lim's existing medicines, dated relative to today so the demo always works. */
export function demoMeds(todayISO) {
  const discharged = addDays(todayISO, -5);
  const polyStart = addDays(todayISO, -200);
  const base = { addedVia: 'demo', uncertain: [], quantity: null, finishCourse: false };
  return [
    { ...base, id: 'm1', labelName: 'Metformin 500mg', generic: 'metformin', strengthMg: 500, doseQty: 1, doseUnit: 'tablet', slots: ['morning', 'night'], asNeeded: false, maxPerDay: null, food: 'after', startDate: polyStart, courseType: 'ongoing', durationDays: null, purpose: 'Diabetes', source: 'Polyclinic', sourceName: 'Bukit Rimba Polyclinic' },
    { ...base, id: 'm2', labelName: 'Amlodipine 5mg', generic: 'amlodipine', strengthMg: 5, doseQty: 1, doseUnit: 'tablet', slots: ['morning'], asNeeded: false, maxPerDay: null, food: 'any', startDate: polyStart, courseType: 'ongoing', durationDays: null, purpose: 'High blood pressure', source: 'Polyclinic', sourceName: 'Bukit Rimba Polyclinic' },
    { ...base, id: 'm3', labelName: 'Atorvastatin 20mg', generic: 'atorvastatin', strengthMg: 20, doseQty: 1, doseUnit: 'tablet', slots: ['night'], asNeeded: false, maxPerDay: null, food: 'any', startDate: polyStart, courseType: 'ongoing', durationDays: null, purpose: 'Cholesterol', source: 'Polyclinic', sourceName: 'Bukit Rimba Polyclinic' },
    { ...base, id: 'm4', labelName: 'Paracetamol 500mg', generic: 'paracetamol', strengthMg: 500, doseQty: 2, doseUnit: 'tablet', slots: ['morning', 'afternoon', 'night'], asNeeded: false, maxPerDay: null, food: 'after', startDate: discharged, courseType: 'days', durationDays: 14, purpose: 'Knee pain after surgery', source: 'Hospital', sourceName: 'Northview General Hospital' },
    { ...base, id: 'm5', labelName: 'Arcoxia (Etoricoxib) 90mg', generic: 'etoricoxib', strengthMg: 90, doseQty: 1, doseUnit: 'tablet', slots: ['morning'], asNeeded: false, maxPerDay: null, food: 'after', startDate: discharged, courseType: 'days', durationDays: 14, purpose: 'Knee pain and swelling', source: 'Hospital', sourceName: 'Northview General Hospital' },
    { ...base, id: 'm6', labelName: 'Omeprazole 20mg', generic: 'omeprazole', strengthMg: 20, doseQty: 1, doseUnit: 'capsule', slots: ['morning'], asNeeded: false, maxPerDay: null, food: 'before', startDate: discharged, courseType: 'days', durationDays: 14, purpose: 'Protect stomach', source: 'Hospital', sourceName: 'Northview General Hospital' },
  ];
}

// Sample labels from a GP visit for a cough and fever. `raw` is the pre-recorded scan
// result in the exact format the AI returns, so demo mode runs the same code path as live scans.
export const SAMPLE_LABELS = [
  {
    id: 'panadol',
    image: 'samples/label-panadol.svg',
    caption: 'GP: Panadol',
    raw: {
      is_medication_label: true, label_name: 'Panadol 500mg Tablet', generic_name: 'Paracetamol', strength_mg: 500, dose_qty: 2, dose_unit: 'tablet',
      times_per_day: 3, time_of_day: [], as_needed: false, max_per_day: null, food: 'after', duration_days: 5, quantity: 30, must_finish_course: false, purpose: 'For fever / pain',
      source_type: 'GP', source_name: 'Sunrise Family Clinic', uncertain_fields: [],
    },
  },
  {
    id: 'nurofen',
    image: 'samples/label-nurofen.svg',
    caption: 'GP: Nurofen',
    raw: {
      is_medication_label: true, label_name: 'Nurofen (Ibuprofen) 400mg Tablet', generic_name: 'Ibuprofen', strength_mg: 400, dose_qty: 1, dose_unit: 'tablet',
      times_per_day: null, time_of_day: [], as_needed: true, max_per_day: 3, food: 'after', duration_days: null, quantity: 10, must_finish_course: false, purpose: 'For pain when necessary',
      source_type: 'GP', source_name: 'Sunrise Family Clinic', uncertain_fields: ['max_per_day'],
    },
  },
  {
    id: 'klacid',
    image: 'samples/label-klacid.svg',
    caption: 'GP: Klacid',
    raw: {
      is_medication_label: true, label_name: 'Klacid (Clarithromycin) 500mg Tablet', generic_name: 'Clarithromycin', strength_mg: 500, dose_qty: 1, dose_unit: 'tablet',
      times_per_day: 2, time_of_day: [], as_needed: false, max_per_day: null, food: 'any', duration_days: 7, quantity: 14, must_finish_course: true, purpose: 'Antibiotic for chest infection',
      source_type: 'GP', source_name: 'Sunrise Family Clinic', uncertain_fields: [],
    },
  },
  {
    id: 'clarityne',
    image: 'samples/label-clarityne.svg',
    caption: 'GP: Clarityne',
    raw: {
      is_medication_label: true, label_name: 'Clarityne (Loratadine) 10mg Tablet', generic_name: 'Loratadine', strength_mg: 10, dose_qty: 1, dose_unit: 'tablet',
      times_per_day: 1, time_of_day: ['morning'], as_needed: false, max_per_day: null, food: 'any', duration_days: 5, quantity: 5, must_finish_course: false, purpose: 'For runny nose',
      source_type: 'GP', source_name: 'Sunrise Family Clinic', uncertain_fields: [],
    },
  },
  {
    id: 'augmentin',
    image: 'samples/label-augmentin.svg',
    caption: 'Other clinic: Augmentin',
    raw: {
      is_medication_label: true, label_name: 'Augmentin 625mg Tablet', generic_name: 'Amoxicillin / Clavulanic acid', strength_mg: 625, dose_qty: 1, dose_unit: 'tablet',
      times_per_day: 2, time_of_day: [], as_needed: false, max_per_day: null, food: 'after', duration_days: 5, quantity: 10, must_finish_course: true, purpose: 'Antibiotic for throat infection',
      source_type: 'GP', source_name: 'Eastpoint Medical Clinic', uncertain_fields: [],
    },
  },
];
