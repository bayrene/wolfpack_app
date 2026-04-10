import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'mealops.db');
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');

const insert = sqlite.prepare(`
  INSERT INTO happy_hour_deals (restaurant, address, phone, day_of_week, start_time, end_time, deals, drink_specials, food_specials, distance, website, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// M Resort - $5 drink deals
insert.run(
  'M Resort - M Bar',
  '12300 Las Vegas Blvd S, Henderson, NV 89044',
  '(702) 797-1000',
  'Everyday',
  '17:00',
  '19:00',
  '$5 select spirits (straight, rocks, or cocktails) at M Bar, Vue Bar, Knight Time Hockey Bar & AMP\'D | Half off appetizers | Wine bottles always 1/3 off at Hostile Grape',
  '$5 select spirits (straight, rocks, cocktails) all day at bars | HH wine & beer specials 5-7PM',
  'Half off appetizers during HH | Wine bottles 1/3 off at Hostile Grape (160 by-the-glass)',
  8.5,
  'themresort.com',
  'Four-Star resort. $5 drinks available all day at M Bar, Vue Bar, Knight Time Hockey Bar, AMP\'D. Hostile Grape wine bar. Studio B Buffet. Spa, pool, live concerts.'
);

// Update Citrus Grill to include hookah details
sqlite.prepare(`
  UPDATE happy_hour_deals
  SET deals = ?,
      drink_specials = ?,
      food_specials = ?,
      notes = ?,
      start_time = ?,
      end_time = ?
  WHERE restaurant LIKE '%Citrus%'
`).run(
  '$8 cocktails, beer & wine specials | Happy hour hookah specials | Light bites at HH pricing',
  '$8 cocktails, beer & wine specials',
  'Light bites at HH pricing | Happy hour hookah deals available',
  'Mediterranean cuisine + hookah lounge. Happy hour hookah specials available Mon-Fri. DJ nights, trivia nights, 21+ venue.',
  '16:00',
  '19:00'
);

console.log('✅ Added M Resort, updated Citrus Grill hookah info');

sqlite.close();
