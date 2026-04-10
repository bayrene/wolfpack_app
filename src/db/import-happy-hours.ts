import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'mealops.db');
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');

// Clear existing
sqlite.exec('DELETE FROM happy_hour_deals');

const insert = sqlite.prepare(`
  INSERT INTO happy_hour_deals (restaurant, address, phone, day_of_week, start_time, end_time, deals, drink_specials, food_specials, distance, website, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const deals = [
  {
    name: 'Distill - Inspirada',
    address: '2293 Via Inspirada, Henderson, NV 89044',
    phone: '(702) 531-6444',
    days: 'Mon-Fri', start: '15:00', end: '18:00',
    deals: '$4 well spirits, house wines & domestic pints | $5 select starters & shareables (quesadilla, mashed potato bites, pretzel bites, avocado egg rolls, buffalo cauliflower, cheese curds)',
    drinks: '$4 well spirits, house wines & domestic pints',
    food: '$5 select starters & shareables (quesadilla, mashed potato bites, pretzel bites, avocado egg rolls, buffalo cauliflower, cheese curds)',
    dist: 0.3,
    website: 'distillbar.com',
    notes: '24/7 kitchen, gaming, kids eat free promo, live music nights, all-day breakfast',
  },
  {
    name: 'WSKY Bar + Grill - Inspirada',
    address: '3231 Bicentennial Pkwy, Henderson, NV 89044',
    phone: '(702) 637-3150',
    days: 'Everyday', start: '16:00', end: '19:00',
    deals: '50% OFF: Draft beers, house wine, premium spirits (Titos, Bacardi, Jack Daniels, Teremana, Tanqueray, Buffalo Trace), Agave Margarita, Blood Orange Martini, Ranch Water, Tennessee Mule | WSKY Poppers, Pot Stickers, Lettuce Wraps, Spinach Artichoke Dip, Pretzel Bites, Cheese Curds, Bruschetta, Flatbreads',
    drinks: '50% OFF draft beers, house wine, premium spirits, signature cocktails',
    food: 'WSKY Poppers, Pot Stickers, Lettuce Wraps, Spinach Artichoke Dip, Pretzel Bites, Cheese Curds, Bruschetta, Flatbreads',
    dist: 1.2,
    website: 'wskybarandgrill.com',
    notes: 'Voted Best HH 2024 & 2025, 24hr gaming, patio w/ valley views, dog-friendly. Reverse HH: 11 PM-2 AM Sun-Thu',
  },
  {
    name: 'Eureka! Henderson',
    address: '3354 St Rose Pkwy, Henderson, NV 89052',
    phone: '(725) 240-0499',
    days: 'Mon-Fri', start: '15:00', end: '18:00',
    deals: '~$6 rotating drafts, ~$8 house wine, ~$8.50 house spirits & signature cocktails | ~$7 fried pickles, ~$8 nachos/mac n cheese balls/truffle cheese fries, ~$13 Eureka American Burger',
    drinks: '~$6 rotating drafts, ~$8 house wine, ~$8.50 house spirits & signature cocktails',
    food: '~$7 fried pickles, ~$8 nachos/mac n cheese balls/truffle cheese fries, ~$13 Eureka American Burger',
    dist: 2.5,
    website: 'eurekarestaurantgroup.com/locations/henderson',
    notes: '40+ craft beers, 40+ whiskeys, dog-friendly patio, upscale casual. Late Night HH: 9 PM-Close daily',
  },
  {
    name: 'Chicken N Pickle - Henderson',
    address: '3381 St Rose Pkwy, Henderson, NV 89052',
    phone: '(725) 291-2670',
    days: 'Mon-Fri', start: '15:00', end: '18:00',
    deals: '$2 off draft beer, crafted cocktails, sangria & wine; $6 margaritas | Specials rotate - check in-house | Game day: wear team gear = 4 wings for $4 + $4 domestic draft',
    drinks: '$2 off draft beer, crafted cocktails, sangria & wine; $6 margaritas',
    food: 'Specials rotate - check in-house. Game day: 4 wings $4 + $4 domestic draft',
    dist: 2.7,
    website: 'chickennpickle.com/location/henderson',
    notes: '3-acre complex, pickleball courts, cornhole, dog park, rooftop patio, family-friendly',
  },
  {
    name: "Hussong's Mexican Cantina",
    address: '3440 St Rose Pkwy Unit 1, Henderson, NV 89052',
    phone: '(702) 844-8333',
    days: 'Mon-Fri', start: '15:00', end: '18:00',
    deals: '$4 draft beers, $6 margaritas & select cocktails, $8 signature drinks | ~$4 tacos, ~$8 bites (Diablo Shrimp, Birria mini tacos) | Half-Price Tequila Tuesdays',
    drinks: '$4 draft beers, $6 margaritas & select cocktails, $8 signature drinks',
    food: '~$4 tacos, ~$8 bites (Diablo Shrimp, Birria mini tacos). Half-Price Tequila Tuesdays',
    dist: 2.8,
    website: 'hussongshenderson.com',
    notes: 'Birthplace of the Original Margarita (1941), live mariachi, cantina vibe',
  },
  {
    name: 'Citrus Grill & Lounge',
    address: '3440 St Rose Pkwy Ste 7, Henderson, NV 89052',
    phone: '(702) 640-0011',
    days: 'Mon-Fri', start: '15:00', end: '18:00',
    deals: '$8 cocktails, beer & wine specials | Light bites at HH pricing | Happy hour hookah deals | 21+ venue',
    drinks: '$8 cocktails, beer & wine specials',
    food: 'Light bites at HH pricing. Happy hour hookah deals',
    dist: 2.8,
    website: 'citrusgrillandlounge.com',
    notes: 'Mediterranean cuisine + hookah lounge, DJ nights, trivia nights, 21+',
  },
  {
    name: "Anthony's Bar at M Resort",
    address: '12300 S Las Vegas Blvd, Henderson, NV 89044',
    phone: '(702) 797-1000',
    days: 'Everyday', start: '17:00', end: '19:00',
    deals: 'Specials vary by outlet | Half off appetizers | Wine bottles always 1/3 off',
    drinks: 'Specials vary by outlet',
    food: 'Half off appetizers. Wine bottles always 1/3 off',
    dist: 3.0,
    website: 'themresort.com',
    notes: 'Four-Star resort, Hostile Grape wine bar (160 by-the-glass), Studio B Buffet, spa, pool, live concerts',
  },
  {
    name: "Lexie's Bistro",
    address: '3610 Sunridge Heights Pkwy Ste 100, Henderson, NV 89052',
    phone: '(702) 444-0391',
    days: 'Mon-Fri', start: '15:00', end: '17:00',
    deals: '$5 drafts, rotating $5 cocktails, $8 house wine | $10 Caprese or Cheeseburger Sliders, $12 Prosciutto or Short Rib Sliders | Pizza + bottle of wine $32 (all day Mon-Thu)',
    drinks: '$5 drafts, rotating $5 cocktails, $8 house wine',
    food: '$10 Caprese or Cheeseburger Sliders, $12 Prosciutto or Short Rib Sliders. Pizza + wine bottle $32 Mon-Thu',
    dist: 3.5,
    website: 'lexiesbistro.com',
    notes: 'Upscale Italian-American, poolside patio at Ilumina, live music Fri/Sat, private dining',
  },
  {
    name: 'Rustic House - Silverado Ranch',
    address: '9821 S Eastern Ave Unit B, Las Vegas, NV 89183',
    phone: '(702) 603-0252',
    days: 'Everyday', start: '11:00', end: '18:00',
    deals: 'Drink specials vary | HH food specials $4-$9 | Thursday rib special ($18 half rack), Steak & Lobster deals rotating',
    drinks: 'Drink specials vary',
    food: 'HH food specials $4-$9. Thursday rib special ($18 half rack), Steak & Lobster deals',
    dist: 4.0,
    website: 'rustichouselv.com',
    notes: 'Non-smoking, family-friendly gaming tavern, EPIC projectors & TVs, 24/7 kitchen',
  },
  {
    name: 'AyAyAy! Mexican Cuisine',
    address: '1570 Horizon Ridge Pkwy #120, Henderson, NV 89012',
    phone: '(725) 205-2691',
    days: 'Mon-Fri', start: '14:00', end: '17:00',
    deals: 'Cocktail specials (details in-house) | ~8 item HH menu, shareable bites | Taco & Tequila Tuesdays, Bottomless Mimosas (Fri 11-2, Sat 10-2)',
    drinks: 'Cocktail specials (details in-house)',
    food: '~8 item HH menu, shareable bites. Taco & Tequila Tuesdays, Bottomless Mimosas',
    dist: 5.5,
    website: 'ayayaymexicancuisinelv.com',
    notes: 'Authentic upscale Mexican, tableside guacamole, trendy decor, dog-friendly patio',
  },
];

for (const d of deals) {
  insert.run(d.name, d.address, d.phone, d.days, d.start, d.end, d.deals, d.drinks, d.food, d.dist, d.website, d.notes);
}

console.log(`✅ Inserted ${deals.length} happy hour deals`);
sqlite.close();
