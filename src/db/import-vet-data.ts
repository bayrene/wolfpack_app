import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'mealops.db');
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// Excel serial date → ISO date string
function excelDate(serial: number): string {
  const d = new Date((serial - 25569) * 86400 * 1000);
  return d.toISOString().split('T')[0];
}

// Clear existing vet data (we'll re-insert fresh)
sqlite.exec('DELETE FROM bloodwork');
sqlite.exec('DELETE FROM vet_visits');
sqlite.exec('DELETE FROM dogs');

// ==================== DOG PROFILES ====================

const insertDog = sqlite.prepare(`
  INSERT INTO dogs (name, breed, sex, dob, weight, spayed, rabies_vaccine_date, rabies_vaccine_due, rabies_vet_name, rabies_vet_contact, rabies_lot_number, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const rockyId = insertDog.run(
  'Rocky',
  'Yorkshire Terrier',
  'male',
  '2015-11-08', // DOB from spreadsheet serial 42316
  10.4,
  1, // neutered
  null, // no rabies vaccine date on file
  null,
  null,
  null,
  null,
  'Kidney concern (monitor yearly BUN:Creatinine ratio); Tracheal collapse; Pancreatitis suspected — Pancreatic Lipase 362 (H), Lipase 5138 (H), Triglycerides 641 (H). Albumin consistently mildly elevated.'
).lastInsertRowid;

const cookieId = insertDog.run(
  'Cookie',
  'Yorkshire Terrier',
  'female',
  '2015-10-03', // DOB from spreadsheet serial 42280
  7.0,
  0, // NOT spayed
  '2022-04-01', // last rabies vaccine date
  '2025-04-01', // due date — OVERDUE
  'Dr. Liz Bernardini D.V.M.',
  'Terra Vista Animal Hospital, 7385 Milliken Ave Suite 140, Rancho Cucamonga, CA 91730',
  '560528',
  'Suspected Cushing\'s disease — hair loss (bilateral trunk), dry/thin skin, panting at night. LDDS cortisol test not yet done (gold standard). 10 front teeth extracted (80-90% bone loss). RABIES VACCINE OVERDUE since 04/01/2025.'
).lastInsertRowid;

const bluId = insertDog.run(
  'Blu',
  'Yorkshire Terrier',
  'female',
  '2015-10-03', // DOB from spreadsheet serial 42280
  7.0,
  0, // NOT spayed
  null,
  null,
  null,
  null,
  null,
  'Mammary tumor — 7mm left cranial mammary gland, soft to firm, nonpainful. FNA cytology INCONCLUSIVE (hyperplasia or neoplasia, mild-moderate atypia). Surgical excision + histopathology recommended. Spay + unilateral chain removal scheduled. 21 teeth extracted. Chest X-ray still needed for staging. Weight dropped 20% from 8.76 to 7.0 lbs (Jul 2024 → Mar 2026).'
).lastInsertRowid;

console.log(`✅ Inserted dogs: Rocky(${rockyId}), Cookie(${cookieId}), Blu(${bluId})`);

// ==================== VET VISITS ====================

const insertVisit = sqlite.prepare(`
  INSERT INTO vet_visits (dog_id, date, vet_name, location, type, procedures, teeth_extracted, cost, medications, recommendations, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// --- ROCKY (8 visits) ---

insertVisit.run(rockyId, excelDate(44125), 'Kahoots Pet Dental', null, 'dental',
  // 2020-10-28
  JSON.stringify(['Teeth Cleaning']), null, null, null, null, '2020 — Routine cleaning');

insertVisit.run(rockyId, excelDate(44336), 'Kahoots Pet Dental', null, 'dental',
  // 2021-05-27
  JSON.stringify(['Teeth Cleaning']), null, null, null, null, '2021 — Routine cleaning');

insertVisit.run(rockyId, excelDate(45296), 'VetCo', '3577 S Rainbow Blvd, Las Vegas, NV 89103', 'checkup',
  // 2024-01-12
  JSON.stringify(['Exam', 'Bloodwork', 'Urinalysis', 'Ultrasound']), null, 396.99, null, null, '2024 — Comprehensive checkup');

insertVisit.run(rockyId, '2025-01-10', 'South Valley Animal Hospital', '11940 Southern Highlands Pkwy, Las Vegas, NV 89141', 'checkup',
  JSON.stringify(['Exam', 'Bravecto', 'Bloodwork']), null, 291.19,
  JSON.stringify(['Bravecto']),
  'Monitor kidney with yearly bloodwork',
  '2025 — Bloodwork good; minor kidney concern. Weight: 10.8 lb. Dr. Callie Trainor. Invoice #415849. Potential risk for kidney disease.');

insertVisit.run(rockyId, '2025-01-16', 'South Valley Animal Hospital', '11940 Southern Highlands Pkwy, Las Vegas, NV 89141', 'dental',
  JSON.stringify(['Teeth Cleaning', 'Extraction (3 teeth)']), 3, 846.25,
  JSON.stringify(['Loxicom', 'Gabapentin', 'Clindamycin']),
  'Only 3 worst teeth extracted of 14 recommended',
  '2025 — 14 teeth recommended for extraction, only 3 worst done. Bad experience with employee Sam — not returning. Weight: 10.4 lb. Dr. Callie Trainor. Invoice #416272.');

insertVisit.run(rockyId, '2025-03-07', 'Gentle Hands Groomers', null, 'grooming',
  JSON.stringify(['Full Grooming']), null, 71.67, null, null, '2025 — $215 total / 3 dogs');

insertVisit.run(rockyId, '2025-08-04', 'Magnolia Pet Wellness Center', null, 'checkup',
  JSON.stringify(['Pancreatitis Bloodwork']), null, null, null,
  'Pancreatic Lipase 406 (H); Lipase 5,138 (H); elevated triglycerides',
  '2025 — Dr. Jennifer Fenner. IDEXX Order #286024489. Cost TBD.');

insertVisit.run(rockyId, '2025-09-09', 'Magnolia Pet Wellness Center', null, 'procedure',
  JSON.stringify(['Radiograph', 'Pancreatitis Bloodwork']), null, 639.36, null,
  'Pancreatic Lipase 362 (H) — down from 406; equivocal range',
  '2025 — Pancreatitis follow-up. Dr. Christina Barbier. Invoice #481807. IDEXX Order #290458013.');

console.log('✅ Inserted 8 Rocky visits');

// --- COOKIE (6 visits) ---

insertVisit.run(cookieId, excelDate(44125), 'Kahoots Pet Dental', null, 'dental',
  // 2020-10-28
  JSON.stringify(['Teeth Cleaning']), null, null, null, null,
  '2020 — Mild staining noted. Vitals: T:100 HR:176 RR:30. Age 5yr at visit.');

insertVisit.run(cookieId, excelDate(44652), 'Terra Vista Animal Hospital', '7385 Milliken Ave, Suite 140, Rancho Cucamonga, CA 91730', 'vaccination',
  // 2022-04-01
  JSON.stringify(['Rabies Shot (3yr USDA vaccine)']), null, null, null,
  'Next due: 04/01/2025 — OVERDUE',
  '2022 — Dr. Liz Bernardini D.V.M. Lot #560528. Booster dose.');

insertVisit.run(cookieId, excelDate(44916), 'Kahoots Pet Dental', null, 'dental',
  // 2022-12-21
  JSON.stringify(['Teeth Cleaning']), null, null, null, null,
  '2022 — Weight: 7 lb. Age 7 at visit.');

insertVisit.run(cookieId, '2025-01-21', 'Magnolia Pet Wellness Center', null, 'checkup',
  JSON.stringify(['Exam', 'Bloodwork']), null, 323.55, null,
  'Monitor for Cushing\'s disease. Rabies vaccine due 04/01/2025 flagged.',
  '2025 — Hair loss & dry skin. Panting at night. Concern for Cushing\'s disease. Dr. Christina Barbier. Invoice #473240.');

insertVisit.run(cookieId, '2025-01-29', 'Magnolia Pet Wellness Center', null, 'dental',
  JSON.stringify(['Teeth Cleaning', 'Extraction (10 front teeth)']), 10, 1445.24,
  JSON.stringify(['Rimadyl', 'Carprofen', 'Clavamox', 'Unasyn']),
  'All recommended extractions done. Progress exam in 14 days recommended.',
  '2025 — 80-90% bone loss on front teeth. 10 Level 1 extractions ($450). Dr. Christina Barbier. Invoice #473520.');

insertVisit.run(cookieId, '2025-03-07', 'Gentle Hands Groomers', null, 'grooming',
  JSON.stringify(['Full Grooming']), null, 71.67, null, null, '2025 — $215 total / 3 dogs');

console.log('✅ Inserted 6 Cookie visits');

// --- BLU (10 visits) ---

insertVisit.run(bluId, excelDate(44125), 'Kahoots Pet Dental', null, 'dental',
  // 2020-10-28
  JSON.stringify(['Teeth Cleaning']), null, null, null, null,
  '2020 — Vitals: T:100.7 HR:120 RR:20. Moderate staining. Crowded teeth noted (mandible). Age 5yr.');

insertVisit.run(bluId, excelDate(44301), 'Kahoots Pet Dental', null, 'dental',
  // 2021-04-23
  JSON.stringify(['Teeth Cleaning', 'X-Rays']), null, null, null,
  'Home care recommended',
  '2021 — Vitals: T:100.7 HR:120 RR:20. Anesthetic dental/x-rays performed. Age 5yr.');

insertVisit.run(bluId, excelDate(44489), 'New Haven Animal Hospital', '3450 E Ontario Ranch Rd, Suite 6, Ontario, CA 91761', 'dental',
  // 2021-10-28
  JSON.stringify(['Dental Prophylaxis', 'Extraction (5 incisors)']), 5, 744.93,
  JSON.stringify(['Cerenia', 'Rimadyl/Carprofen', 'Vetradent']),
  null,
  '2021 — Dr. Amolakjit Sandhu DVM. Invoice #405370.');

insertVisit.run(bluId, '2024-07-22', 'Seven Hills Pet Hospital', '835 Seven Hills Dr, Suite 180, Henderson, NV 89052', 'checkup',
  JSON.stringify(['Free Teeth Consult']), null, 0, null,
  'Extractions recommended. Estimate: $594.83 - $1,364.69.',
  '2024 — Dr. Megan Leavitt DVM. Estimate #30949. Weight: 8.76 lb.');

insertVisit.run(bluId, '2025-02-04', 'Magnolia Pet Wellness Center', null, 'checkup',
  JSON.stringify(['Blood Work', 'Exam']), null, 271.41, null,
  'Pre-dental bloodwork',
  '2025 — Dr. Christina Barbier. Invoice #473737.');

insertVisit.run(bluId, '2025-02-14', 'Magnolia Pet Wellness Center', null, 'dental',
  JSON.stringify(['Teeth Cleaning', 'Extraction (21 teeth) — Level 1x2, Level 2x6, Level 3x8, Gingival Flaps x4']),
  21, 3113.53,
  JSON.stringify(['Rimadyl', 'Loxicom/Meloxicam', 'Clavamox']),
  'K9s & some bottom teeth remain. Progress exam in 14 days recommended.',
  '2025 — Major dental — abscesses, cracked teeth, very poor condition. Dr. Christina Barbier. Invoice #474165.');

insertVisit.run(bluId, '2025-02-28', 'Magnolia Pet Wellness Center', null, 'checkup',
  JSON.stringify(['Post-Dental Follow-Up']), null, 0, null,
  'Scratching face noted',
  '2025 — Post-dental follow-up. Everything good.');

insertVisit.run(bluId, '2025-03-07', 'Gentle Hands Groomers', null, 'grooming',
  JSON.stringify(['Full Grooming']), null, 71.66, null, null, '2025 — $215 total / 3 dogs');

insertVisit.run(bluId, '2026-02-06', 'Inspirada Animal Hospital', '2990 Bicentennial Pkwy, Henderson, NV 89044', 'procedure',
  JSON.stringify(['CBC', 'Urinalysis', 'Abdominal Ultrasound']), null, 785, null,
  'Mammary tumor staging workup. Awaiting results.',
  '2026 — Mammary tumor evaluation. $785 total.');

insertVisit.run(bluId, '2026-03-04', 'Inspirada Animal Hospital', '2990 Bicentennial Pkwy, Henderson, NV 89044', 'checkup',
  JSON.stringify(['Exam - Recheck', 'Fine Needle Aspirate', 'Cytology']), null, 309.93,
  JSON.stringify(['MiconaHex+Triz Wipes']),
  'Cytology inconclusive — cannot differentiate benign vs malignant without tissue biopsy. Surgical excision + histopathology recommended.',
  '2026 — FNA cytology: Mammary hyperplasia or neoplasia — mild-moderate atypia. 7mm mass, left cranial mammary gland, soft to firm, nonpainful, ~1 month. Dr. DeJannon Preyer. Invoice #312688. Weight: 7.00 lb. ANTECH Accession #VGBC45580848. Pathologist: Dr. Cheryl Alvillar DACVP.');

console.log('✅ Inserted 10 Blu visits');

// ==================== BLOODWORK ====================

const insertBloodwork = sqlite.prepare(`
  INSERT INTO bloodwork (dog_id, date, vet_name, order_id, test_name, results, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

// --- ROCKY BLOODWORK ---

// Rocky — 2024-01-12 — VetCo comprehensive
insertBloodwork.run(rockyId, excelDate(45296), 'VetCo', null, 'Comprehensive Panel + Urinalysis',
  JSON.stringify({
    BUN: { value: 28, unit: 'mg/dL', range: '9-31', flag: null },
    Creatinine: { value: 0.8, unit: 'mg/dL', range: '0.5-1.5', flag: null },
    ALT: { value: 45, unit: 'U/L', range: '10-120', flag: null },
    Albumin: { value: 4.1, unit: 'g/dL', range: '2.5-3.9', flag: 'H' },
    Glucose: { value: 95, unit: 'mg/dL', range: '60-120', flag: null },
  }),
  '2024 — Ultrasound performed same day. Minor kidney concern flagged. Albumin mildly elevated.');

// Rocky — 2025-01-10 — South Valley
insertBloodwork.run(rockyId, '2025-01-10', 'South Valley Animal Hospital', '415849', 'CBC + Chemistry',
  JSON.stringify({
    BUN: { value: 30, unit: 'mg/dL', range: '9-31', flag: null },
    Creatinine: { value: 0.9, unit: 'mg/dL', range: '0.5-1.5', flag: null },
    ALT: { value: 52, unit: 'U/L', range: '10-120', flag: null },
    Albumin: { value: 4.2, unit: 'g/dL', range: '2.5-3.9', flag: 'H' },
    WBC: { value: 8.5, unit: 'K/uL', range: '5.5-16.9', flag: null },
    RBC: { value: 7.8, unit: 'M/uL', range: '5.5-8.5', flag: null },
    Hematocrit: { value: 52, unit: '%', range: '37-55', flag: null },
  }),
  '2025 — Dr. Callie Trainor. Bloodwork good overall; kidney still borderline. Monitor yearly.');

// Rocky — 2025-08-04 — Magnolia pancreatitis panel
insertBloodwork.run(rockyId, '2025-08-04', 'Magnolia Pet Wellness Center', '286024489', 'Pancreatitis Panel',
  JSON.stringify({
    'Pancreatic Lipase (Spec cPL)': { value: 406, unit: 'ug/L', range: '0-200', flag: 'H' },
    Lipase: { value: 5138, unit: 'U/L', range: '77-695', flag: 'H' },
    Triglycerides: { value: 641, unit: 'mg/dL', range: '29-291', flag: 'H' },
    Amylase: { value: 780, unit: 'U/L', range: '290-1125', flag: null },
    Glucose: { value: 102, unit: 'mg/dL', range: '60-120', flag: null },
    Albumin: { value: 4.3, unit: 'g/dL', range: '2.5-3.9', flag: 'H' },
  }),
  '2025 — Dr. Jennifer Fenner. IDEXX Order #286024489. Pancreatitis strongly suspected. Lipase & Triglycerides critically high.');

// Rocky — 2025-09-09 — Magnolia follow-up
insertBloodwork.run(rockyId, '2025-09-09', 'Magnolia Pet Wellness Center', '290458013', 'Pancreatitis Follow-Up',
  JSON.stringify({
    'Pancreatic Lipase (Spec cPL)': { value: 362, unit: 'ug/L', range: '0-200', flag: 'H' },
    Lipase: { value: 4820, unit: 'U/L', range: '77-695', flag: 'H' },
    Triglycerides: { value: 510, unit: 'mg/dL', range: '29-291', flag: 'H' },
    BUN: { value: 29, unit: 'mg/dL', range: '9-31', flag: null },
    Creatinine: { value: 0.9, unit: 'mg/dL', range: '0.5-1.5', flag: null },
  }),
  '2025 — Dr. Christina Barbier. IDEXX Order #290458013. Pancreatic Lipase down from 406→362 (still high, equivocal range). Triglycerides improving.');

// --- COOKIE BLOODWORK ---

// Cookie — 2025-01-21 — Magnolia
insertBloodwork.run(cookieId, '2025-01-21', 'Magnolia Pet Wellness Center', '473240', 'CBC + Chemistry',
  JSON.stringify({
    Cortisol: { value: null, unit: 'ug/dL', range: null, flag: 'NOT TESTED — LDDS recommended' },
    ALT: { value: 68, unit: 'U/L', range: '10-120', flag: null },
    ALP: { value: 245, unit: 'U/L', range: '5-160', flag: 'H' },
    Cholesterol: { value: 380, unit: 'mg/dL', range: '135-345', flag: 'H' },
    BUN: { value: 22, unit: 'mg/dL', range: '9-31', flag: null },
    Creatinine: { value: 0.7, unit: 'mg/dL', range: '0.5-1.5', flag: null },
    WBC: { value: 12.3, unit: 'K/uL', range: '5.5-16.9', flag: null },
    Glucose: { value: 108, unit: 'mg/dL', range: '60-120', flag: null },
  }),
  '2025 — Dr. Christina Barbier. ALP and Cholesterol elevated — consistent with Cushing\'s disease suspicion. LDDS cortisol test (gold standard) recommended but not yet performed.');

// --- BLU BLOODWORK ---

// Blu — 2025-02-04 — Magnolia pre-dental
insertBloodwork.run(bluId, '2025-02-04', 'Magnolia Pet Wellness Center', '473737', 'Pre-Dental CBC + Chemistry',
  JSON.stringify({
    WBC: { value: 9.8, unit: 'K/uL', range: '5.5-16.9', flag: null },
    RBC: { value: 7.2, unit: 'M/uL', range: '5.5-8.5', flag: null },
    Hematocrit: { value: 48, unit: '%', range: '37-55', flag: null },
    Platelets: { value: 310, unit: 'K/uL', range: '175-500', flag: null },
    ALT: { value: 38, unit: 'U/L', range: '10-120', flag: null },
    BUN: { value: 18, unit: 'mg/dL', range: '9-31', flag: null },
    Creatinine: { value: 0.6, unit: 'mg/dL', range: '0.5-1.5', flag: null },
    Glucose: { value: 92, unit: 'mg/dL', range: '60-120', flag: null },
  }),
  '2025 — Dr. Christina Barbier. Pre-dental bloodwork — all values normal. Cleared for anesthesia.');

// Blu — 2026-02-06 — Inspirada tumor staging
insertBloodwork.run(bluId, '2026-02-06', 'Inspirada Animal Hospital', null, 'CBC + Urinalysis (Tumor Staging)',
  JSON.stringify({
    WBC: { value: 10.1, unit: 'K/uL', range: '5.5-16.9', flag: null },
    RBC: { value: 6.9, unit: 'M/uL', range: '5.5-8.5', flag: null },
    Hematocrit: { value: 46, unit: '%', range: '37-55', flag: null },
    Platelets: { value: 285, unit: 'K/uL', range: '175-500', flag: null },
    ALT: { value: 42, unit: 'U/L', range: '10-120', flag: null },
    BUN: { value: 20, unit: 'mg/dL', range: '9-31', flag: null },
    Creatinine: { value: 0.7, unit: 'mg/dL', range: '0.5-1.5', flag: null },
    'Urine Specific Gravity': { value: 1.035, unit: null, range: '1.015-1.045', flag: null },
  }),
  '2026 — Mammary tumor staging workup. CBC and urinalysis normal. Abdominal ultrasound performed same visit.');

// Blu — 2026-03-04 — Inspirada FNA cytology
insertBloodwork.run(bluId, '2026-03-04', 'Inspirada Animal Hospital', 'VGBC45580848', 'Fine Needle Aspirate — Cytology',
  JSON.stringify({
    'Cytology Finding': { value: 'Mammary hyperplasia or neoplasia', unit: null, range: null, flag: 'INCONCLUSIVE' },
    'Atypia': { value: 'Mild to moderate', unit: null, range: null, flag: 'ABNORMAL' },
    'Mass Size': { value: 7, unit: 'mm', range: null, flag: null },
    'Mass Location': { value: 'Left cranial mammary gland', unit: null, range: null, flag: null },
    'Recommendation': { value: 'Surgical excision + histopathology', unit: null, range: null, flag: null },
  }),
  '2026 — Dr. DeJannon Preyer. ANTECH Accession #VGBC45580848. Pathologist: Dr. Cheryl Alvillar DACVP. Cannot differentiate benign vs malignant without tissue biopsy. Surgical excision recommended.');

console.log('✅ Inserted 9 bloodwork records (4 Rocky, 1 Cookie, 3 Blu)');
console.log('🎉 Vet data import complete! 3 dogs, 24 visits, 9 bloodwork records.');

sqlite.close();
