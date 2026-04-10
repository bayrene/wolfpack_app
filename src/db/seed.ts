import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'mealops.db');
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

const db = drizzle(sqlite, { schema });

// Run migration SQL directly (skip if tables already exist)
const migrationsDir = path.join(process.cwd(), 'drizzle');
const sqlFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
for (const file of sqlFiles) {
  const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
  const statements = sqlContent.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    // Convert CREATE TABLE to CREATE TABLE IF NOT EXISTS
    const safeStmt = stmt.replace(/CREATE TABLE(?! IF NOT EXISTS)/g, 'CREATE TABLE IF NOT EXISTS')
                         .replace(/CREATE UNIQUE INDEX(?! IF NOT EXISTS)/g, 'CREATE UNIQUE INDEX IF NOT EXISTS');
    try {
      sqlite.exec(safeStmt);
    } catch (e: unknown) {
      // Skip duplicate column / already exists errors (from re-running migrations)
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('duplicate column') || msg.includes('already exists')) {
        continue;
      }
      throw e;
    }
  }
}

console.log('✅ Migrations applied');

// Clear existing data (idempotent)
sqlite.exec('DELETE FROM daily_log');
sqlite.exec('DELETE FROM smoking_log');
sqlite.exec('DELETE FROM strains');
sqlite.exec('DELETE FROM medical_records');
sqlite.exec('DELETE FROM pain_log');
sqlite.exec('DELETE FROM exercise_log');
sqlite.exec('DELETE FROM exercises');
sqlite.exec('DELETE FROM date_nights');
sqlite.exec('DELETE FROM vet_visits');
sqlite.exec('DELETE FROM dogs');
sqlite.exec('DELETE FROM gum_health_log');
sqlite.exec('DELETE FROM dental_checkups');
sqlite.exec('DELETE FROM dental_log');
sqlite.exec('DELETE FROM dental_products');
sqlite.exec('DELETE FROM hair_inspo');
sqlite.exec('DELETE FROM hair_health_log');
sqlite.exec('DELETE FROM haircuts');
sqlite.exec('DELETE FROM supplement_log');
sqlite.exec('DELETE FROM supplements');
sqlite.exec('DELETE FROM price_history');
sqlite.exec('DELETE FROM grocery_items');
sqlite.exec('DELETE FROM grocery_lists');
sqlite.exec('DELETE FROM freezer_inventory');
sqlite.exec('DELETE FROM prep_sessions');
sqlite.exec('DELETE FROM meal_log');
sqlite.exec('DELETE FROM recipe_ingredients');
sqlite.exec('DELETE FROM recipes');
sqlite.exec('DELETE FROM ingredients');

// ==================== INGREDIENTS ====================
// USDA standard reference values

const ingredientData: schema.NewIngredient[] = [
  // PROTEINS
  {
    name: 'Large Eggs',
    defaultUnit: 'each',
    caloriesPerUnit: 72,
    proteinPerUnit: 6.3,
    carbsPerUnit: 0.4,
    fatPerUnit: 4.8,
    fiberPerUnit: 0,
    sugarPerUnit: 0.2,
    sodiumPerUnit: 71,
    vitaminAPerUnit: 80,
    vitaminCPerUnit: 0,
    vitaminDPerUnit: 1.1,
    vitaminB12PerUnit: 0.6,
    ironPerUnit: 0.9,
    zincPerUnit: 0.6,
    calciumPerUnit: 28,
    magnesiumPerUnit: 6,
    potassiumPerUnit: 69,
    category: 'protein',
    avgPrice: 4.50,
    purchaseUnit: '18 count',
    storePreference: 'Walmart',
  },
  {
    name: 'Breakfast Sausage (Ground)',
    defaultUnit: 'lb',
    caloriesPerUnit: 1188,
    proteinPerUnit: 53.8,
    carbsPerUnit: 0,
    fatPerUnit: 106.7,
    fiberPerUnit: 0,
    sugarPerUnit: 0,
    sodiumPerUnit: 1860,
    category: 'protein',
    avgPrice: 4.29,
    purchaseUnit: '1 lb roll',
    storePreference: 'Walmart',
  },
  {
    name: 'Bone-in Chicken Thighs (Skin-on)',
    defaultUnit: 'lb',
    caloriesPerUnit: 960,
    proteinPerUnit: 80,
    carbsPerUnit: 0,
    fatPerUnit: 68,
    fiberPerUnit: 0,
    sugarPerUnit: 0,
    sodiumPerUnit: 340,
    vitaminAPerUnit: 22,
    vitaminB12PerUnit: 2.4,
    ironPerUnit: 5,
    zincPerUnit: 9,
    potassiumPerUnit: 1000,
    magnesiumPerUnit: 95,
    category: 'protein',
    avgPrice: 1.49,
    purchaseUnit: 'per lb',
    storePreference: 'Walmart',
  },
  {
    name: 'Ground Beef (80/20)',
    defaultUnit: 'lb',
    caloriesPerUnit: 1152,
    proteinPerUnit: 77.0,
    carbsPerUnit: 0,
    fatPerUnit: 92.0,
    fiberPerUnit: 0,
    sugarPerUnit: 0,
    sodiumPerUnit: 300,
    vitaminB12PerUnit: 10.8,
    ironPerUnit: 9.9,
    zincPerUnit: 22.5,
    potassiumPerUnit: 1360,
    magnesiumPerUnit: 81,
    category: 'protein',
    avgPrice: 5.49,
    purchaseUnit: 'per lb',
    storePreference: 'Walmart',
  },
  // DAIRY
  {
    name: 'Shredded Cheddar Cheese',
    defaultUnit: 'cup',
    caloriesPerUnit: 455,
    proteinPerUnit: 28.1,
    carbsPerUnit: 1.4,
    fatPerUnit: 37.5,
    fiberPerUnit: 0,
    sugarPerUnit: 0.5,
    sodiumPerUnit: 702,
    category: 'dairy',
    avgPrice: 3.98,
    purchaseUnit: '8 oz bag',
    storePreference: 'Walmart',
  },
  {
    name: 'Shredded Mexican Blend Cheese',
    defaultUnit: 'cup',
    caloriesPerUnit: 440,
    proteinPerUnit: 28,
    carbsPerUnit: 2,
    fatPerUnit: 36,
    fiberPerUnit: 0,
    sugarPerUnit: 0.5,
    sodiumPerUnit: 680,
    category: 'dairy',
    avgPrice: 3.98,
    purchaseUnit: '8 oz bag',
    storePreference: 'Walmart',
  },
  // GRAINS
  {
    name: 'Frozen Diced Hash Browns',
    defaultUnit: 'cup',
    caloriesPerUnit: 140,
    proteinPerUnit: 2,
    carbsPerUnit: 22,
    fatPerUnit: 5,
    fiberPerUnit: 2,
    sugarPerUnit: 0,
    sodiumPerUnit: 30,
    category: 'grain',
    avgPrice: 3.48,
    purchaseUnit: '30 oz bag',
    storePreference: 'Walmart',
  },
  {
    name: 'Large Flour Tortillas (10-inch)',
    defaultUnit: 'each',
    caloriesPerUnit: 290,
    proteinPerUnit: 7,
    carbsPerUnit: 48,
    fatPerUnit: 8,
    fiberPerUnit: 2,
    sugarPerUnit: 2,
    sodiumPerUnit: 580,
    category: 'grain',
    avgPrice: 4.28,
    purchaseUnit: '10 count pack',
    storePreference: 'Walmart',
  },
  {
    name: 'Long Grain White Rice (Dry)',
    defaultUnit: 'cup',
    caloriesPerUnit: 675,
    proteinPerUnit: 13.2,
    carbsPerUnit: 148,
    fatPerUnit: 1.2,
    fiberPerUnit: 1.8,
    sugarPerUnit: 0.2,
    sodiumPerUnit: 9,
    category: 'grain',
    avgPrice: 4.98,
    purchaseUnit: '5 lb bag',
    storePreference: 'Walmart',
  },
  // VEGETABLES
  {
    name: 'Frozen Broccoli',
    defaultUnit: 'oz',
    caloriesPerUnit: 8,
    proteinPerUnit: 0.7,
    carbsPerUnit: 1.3,
    fatPerUnit: 0.1,
    fiberPerUnit: 0.6,
    sugarPerUnit: 0.3,
    sodiumPerUnit: 6,
    vitaminAPerUnit: 17,
    vitaminCPerUnit: 25,
    calciumPerUnit: 13,
    ironPerUnit: 0.2,
    potassiumPerUnit: 90,
    magnesiumPerUnit: 6,
    category: 'vegetable',
    avgPrice: 2.48,
    purchaseUnit: '32 oz bag',
    storePreference: 'Walmart',
  },
  // CANNED
  {
    name: 'Black Beans (15 oz can)',
    defaultUnit: 'can',
    caloriesPerUnit: 385,
    proteinPerUnit: 25,
    carbsPerUnit: 70,
    fatPerUnit: 1.5,
    fiberPerUnit: 25,
    sugarPerUnit: 1,
    sodiumPerUnit: 960,
    ironPerUnit: 5.3,
    magnesiumPerUnit: 105,
    potassiumPerUnit: 900,
    zincPerUnit: 2.9,
    calciumPerUnit: 66,
    category: 'protein',
    avgPrice: 0.98,
    purchaseUnit: '15 oz can',
    storePreference: 'Walmart',
  },
  {
    name: 'Salsa',
    defaultUnit: 'cup',
    caloriesPerUnit: 70,
    proteinPerUnit: 3.5,
    carbsPerUnit: 14,
    fatPerUnit: 0,
    fiberPerUnit: 3.5,
    sugarPerUnit: 8,
    sodiumPerUnit: 1260,
    category: 'condiment',
    avgPrice: 3.28,
    purchaseUnit: '24 oz jar',
    storePreference: 'Walmart',
  },
  // CONDIMENTS & SPICES
  {
    name: 'Olive Oil',
    defaultUnit: 'tbsp',
    caloriesPerUnit: 119,
    proteinPerUnit: 0,
    carbsPerUnit: 0,
    fatPerUnit: 13.5,
    fiberPerUnit: 0,
    sugarPerUnit: 0,
    sodiumPerUnit: 0,
    category: 'condiment',
    avgPrice: 5.98,
    purchaseUnit: '16 oz bottle',
    storePreference: 'Walmart',
  },
  {
    name: 'Soy Sauce',
    defaultUnit: 'tbsp',
    caloriesPerUnit: 8.5,
    proteinPerUnit: 1.3,
    carbsPerUnit: 0.8,
    fatPerUnit: 0,
    fiberPerUnit: 0.1,
    sugarPerUnit: 0,
    sodiumPerUnit: 879,
    category: 'condiment',
    avgPrice: 2.48,
    purchaseUnit: '15 oz bottle',
    storePreference: 'Walmart',
  },
  {
    name: 'Taco Seasoning Packet',
    defaultUnit: 'each',
    caloriesPerUnit: 60,
    proteinPerUnit: 1,
    carbsPerUnit: 12,
    fatPerUnit: 1,
    fiberPerUnit: 1,
    sugarPerUnit: 2,
    sodiumPerUnit: 1200,
    category: 'spice',
    avgPrice: 0.78,
    purchaseUnit: '1 oz packet',
    storePreference: 'Walmart',
  },
  // SPICES (per tsp unless noted)
  {
    name: 'Salt',
    defaultUnit: 'tsp',
    caloriesPerUnit: 0,
    proteinPerUnit: 0,
    carbsPerUnit: 0,
    fatPerUnit: 0,
    fiberPerUnit: 0,
    sugarPerUnit: 0,
    sodiumPerUnit: 2325,
    category: 'spice',
    avgPrice: 1.28,
    purchaseUnit: '26 oz container',
    storePreference: 'Walmart',
  },
  {
    name: 'Black Pepper',
    defaultUnit: 'tsp',
    caloriesPerUnit: 6,
    proteinPerUnit: 0.2,
    carbsPerUnit: 1.5,
    fatPerUnit: 0.1,
    fiberPerUnit: 0.6,
    sugarPerUnit: 0,
    sodiumPerUnit: 0.5,
    category: 'spice',
    avgPrice: 3.48,
    purchaseUnit: '3 oz container',
    storePreference: 'Walmart',
  },
  {
    name: 'Garlic Powder',
    defaultUnit: 'tsp',
    caloriesPerUnit: 10,
    proteinPerUnit: 0.5,
    carbsPerUnit: 2,
    fatPerUnit: 0,
    fiberPerUnit: 0.3,
    sugarPerUnit: 0.2,
    sodiumPerUnit: 2,
    category: 'spice',
    avgPrice: 2.48,
    purchaseUnit: '3.12 oz container',
    storePreference: 'Walmart',
  },
  {
    name: 'Cumin',
    defaultUnit: 'tsp',
    caloriesPerUnit: 8,
    proteinPerUnit: 0.4,
    carbsPerUnit: 0.9,
    fatPerUnit: 0.5,
    fiberPerUnit: 0.2,
    sugarPerUnit: 0.1,
    sodiumPerUnit: 4,
    category: 'spice',
    avgPrice: 2.98,
    purchaseUnit: '1.5 oz container',
    storePreference: 'Walmart',
  },
  {
    name: 'Chili Powder',
    defaultUnit: 'tsp',
    caloriesPerUnit: 8,
    proteinPerUnit: 0.4,
    carbsPerUnit: 1.3,
    fatPerUnit: 0.4,
    fiberPerUnit: 0.9,
    sugarPerUnit: 0.2,
    sodiumPerUnit: 26,
    category: 'spice',
    avgPrice: 2.48,
    purchaseUnit: '2.5 oz container',
    storePreference: 'Walmart',
  },
  {
    name: 'Paprika',
    defaultUnit: 'tsp',
    caloriesPerUnit: 6,
    proteinPerUnit: 0.3,
    carbsPerUnit: 1.2,
    fatPerUnit: 0.3,
    fiberPerUnit: 0.7,
    sugarPerUnit: 0.3,
    sodiumPerUnit: 1,
    category: 'spice',
    avgPrice: 2.48,
    purchaseUnit: '2.12 oz container',
    storePreference: 'Walmart',
  },
  {
    name: 'Water',
    defaultUnit: 'cup',
    caloriesPerUnit: 0,
    proteinPerUnit: 0,
    carbsPerUnit: 0,
    fatPerUnit: 0,
    fiberPerUnit: 0,
    sugarPerUnit: 0,
    sodiumPerUnit: 0,
    category: 'other',
  },
  // COMMON EXTRAS (from spec)
  {
    name: 'Greek Yogurt',
    defaultUnit: 'cup',
    caloriesPerUnit: 150,
    proteinPerUnit: 20,
    carbsPerUnit: 9,
    fatPerUnit: 4,
    fiberPerUnit: 0,
    sugarPerUnit: 7,
    sodiumPerUnit: 68,
    calciumPerUnit: 200,
    vitaminB12PerUnit: 1.3,
    potassiumPerUnit: 240,
    magnesiumPerUnit: 22,
    zincPerUnit: 1.0,
    category: 'dairy',
    avgPrice: 4.98,
    purchaseUnit: '32 oz tub',
    storePreference: 'Walmart',
  },
  {
    name: 'Peanut Butter',
    defaultUnit: 'tbsp',
    caloriesPerUnit: 94,
    proteinPerUnit: 4,
    carbsPerUnit: 3,
    fatPerUnit: 8,
    fiberPerUnit: 1,
    sugarPerUnit: 1.5,
    sodiumPerUnit: 73,
    category: 'protein',
    avgPrice: 3.48,
    purchaseUnit: '16 oz jar',
    storePreference: 'Walmart',
  },
  {
    name: 'String Cheese',
    defaultUnit: 'each',
    caloriesPerUnit: 80,
    proteinPerUnit: 7,
    carbsPerUnit: 1,
    fatPerUnit: 5,
    fiberPerUnit: 0,
    sugarPerUnit: 0,
    sodiumPerUnit: 200,
    category: 'dairy',
    avgPrice: 4.98,
    purchaseUnit: '12 pack',
    storePreference: 'Walmart',
  },
  {
    name: 'Whole Wheat Bread',
    defaultUnit: 'each',
    caloriesPerUnit: 80,
    proteinPerUnit: 4,
    carbsPerUnit: 14,
    fatPerUnit: 1,
    fiberPerUnit: 2,
    sugarPerUnit: 2,
    sodiumPerUnit: 130,
    category: 'grain',
    avgPrice: 2.98,
    purchaseUnit: 'loaf (20 slices)',
    storePreference: 'Walmart',
  },
  {
    name: 'Banana',
    defaultUnit: 'each',
    caloriesPerUnit: 105,
    proteinPerUnit: 1.3,
    carbsPerUnit: 27,
    fatPerUnit: 0.4,
    fiberPerUnit: 3.1,
    sugarPerUnit: 14.4,
    sodiumPerUnit: 1,
    vitaminCPerUnit: 10.3,
    potassiumPerUnit: 422,
    magnesiumPerUnit: 32,
    category: 'fruit',
    avgPrice: 0.25,
    purchaseUnit: 'each',
    storePreference: 'Walmart',
  },
  // Cooked rice for beef burritos
  {
    name: 'Cooked White Rice',
    defaultUnit: 'cup',
    caloriesPerUnit: 205,
    proteinPerUnit: 4.3,
    carbsPerUnit: 44.5,
    fatPerUnit: 0.4,
    fiberPerUnit: 0.6,
    sugarPerUnit: 0,
    sodiumPerUnit: 2,
    category: 'grain',
  },

  // ==================== BRANDED PROTEIN & SMOOTHIE INGREDIENTS ====================

  // PROTEIN POWDERS
  {
    name: 'Optimum Nutrition Gold Standard Whey (Vanilla)',
    defaultUnit: 'each', // 1 scoop (31g)
    caloriesPerUnit: 120,
    proteinPerUnit: 24,
    carbsPerUnit: 3,
    fatPerUnit: 1.5,
    fiberPerUnit: 0,
    sugarPerUnit: 1,
    sodiumPerUnit: 130,
    calciumPerUnit: 130,
    ironPerUnit: 0.5,
    potassiumPerUnit: 160,
    category: 'protein',
    avgPrice: 32.99,
    purchaseUnit: '2 lb tub (29 servings)',
    storePreference: 'Costco',
  },
  {
    name: 'Optimum Nutrition Gold Standard Whey (Chocolate)',
    defaultUnit: 'each', // 1 scoop (31g)
    caloriesPerUnit: 120,
    proteinPerUnit: 24,
    carbsPerUnit: 3,
    fatPerUnit: 1,
    fiberPerUnit: 1,
    sugarPerUnit: 1,
    sodiumPerUnit: 160,
    calciumPerUnit: 130,
    ironPerUnit: 0.5,
    potassiumPerUnit: 160,
    category: 'protein',
    avgPrice: 32.99,
    purchaseUnit: '2 lb tub (29 servings)',
    storePreference: 'Costco',
  },
  {
    name: 'Orgain Organic Protein Powder (Vanilla)',
    defaultUnit: 'each', // 1 scoop (46g)
    caloriesPerUnit: 150,
    proteinPerUnit: 21,
    carbsPerUnit: 15,
    fatPerUnit: 4,
    fiberPerUnit: 2,
    sugarPerUnit: 0,
    sodiumPerUnit: 290,
    category: 'protein',
    avgPrice: 27.99,
    purchaseUnit: '2.03 lb tub (20 servings)',
    storePreference: 'Costco',
  },
  {
    name: 'Dymatize ISO100 Whey (Fruity Pebbles)',
    defaultUnit: 'each', // 1 scoop (32g)
    caloriesPerUnit: 120,
    proteinPerUnit: 25,
    carbsPerUnit: 2,
    fatPerUnit: 0.5,
    fiberPerUnit: 0,
    sugarPerUnit: 1,
    sodiumPerUnit: 160,
    category: 'protein',
    avgPrice: 34.99,
    purchaseUnit: '1.6 lb tub (25 servings)',
    storePreference: 'Amazon',
  },

  // HIGH-PROTEIN GREEK YOGURTS (specific brands)
  {
    name: 'Fage Total 0% Greek Yogurt',
    defaultUnit: 'cup',
    caloriesPerUnit: 90,
    proteinPerUnit: 18,
    carbsPerUnit: 5,
    fatPerUnit: 0,
    fiberPerUnit: 0,
    sugarPerUnit: 5,
    sodiumPerUnit: 65,
    calciumPerUnit: 187,
    potassiumPerUnit: 240,
    vitaminB12PerUnit: 1.3,
    magnesiumPerUnit: 18,
    category: 'dairy',
    avgPrice: 5.49,
    purchaseUnit: '35.3 oz tub',
    storePreference: 'Costco',
  },
  {
    name: 'Chobani Complete Greek Yogurt (Vanilla)',
    defaultUnit: 'each', // 1 container (5.3 oz)
    caloriesPerUnit: 110,
    proteinPerUnit: 15,
    carbsPerUnit: 11,
    fatPerUnit: 2,
    fiberPerUnit: 3,
    sugarPerUnit: 5,
    sodiumPerUnit: 85,
    category: 'dairy',
    avgPrice: 1.79,
    purchaseUnit: '5.3 oz cup',
    storePreference: 'Walmart',
  },
  {
    name: 'Oikos Pro Greek Yogurt (Vanilla)',
    defaultUnit: 'each', // 1 container (5.3 oz)
    caloriesPerUnit: 150,
    proteinPerUnit: 25,
    carbsPerUnit: 10,
    fatPerUnit: 2.5,
    fiberPerUnit: 0,
    sugarPerUnit: 7,
    sodiumPerUnit: 100,
    category: 'dairy',
    avgPrice: 1.69,
    purchaseUnit: '5.3 oz cup',
    storePreference: 'Walmart',
  },
  {
    name: 'Two Good Greek Yogurt (Vanilla)',
    defaultUnit: 'each', // 1 container (5.3 oz)
    caloriesPerUnit: 80,
    proteinPerUnit: 12,
    carbsPerUnit: 3,
    fatPerUnit: 2,
    fiberPerUnit: 0,
    sugarPerUnit: 2,
    sodiumPerUnit: 40,
    category: 'dairy',
    avgPrice: 1.49,
    purchaseUnit: '5.3 oz cup',
    storePreference: 'Walmart',
  },

  // DAVE'S KILLER BREAD
  {
    name: "Dave's Killer Bread Everything Bagel",
    defaultUnit: 'each', // 1 bagel (95g)
    caloriesPerUnit: 270,
    proteinPerUnit: 14,
    carbsPerUnit: 44,
    fatPerUnit: 5,
    fiberPerUnit: 5,
    sugarPerUnit: 5,
    sodiumPerUnit: 420,
    ironPerUnit: 2.7,
    calciumPerUnit: 30,
    magnesiumPerUnit: 40,
    potassiumPerUnit: 120,
    zincPerUnit: 1.5,
    category: 'grain',
    avgPrice: 6.49,
    purchaseUnit: 'bag (5 bagels)',
    storePreference: 'Walmart',
  },
  {
    name: "Dave's Killer Bread Plain Awesome Bagel",
    defaultUnit: 'each', // 1 bagel (95g)
    caloriesPerUnit: 260,
    proteinPerUnit: 14,
    carbsPerUnit: 44,
    fatPerUnit: 4,
    fiberPerUnit: 5,
    sugarPerUnit: 5,
    sodiumPerUnit: 380,
    ironPerUnit: 2.7,
    calciumPerUnit: 30,
    magnesiumPerUnit: 40,
    potassiumPerUnit: 120,
    zincPerUnit: 1.5,
    category: 'grain',
    avgPrice: 6.49,
    purchaseUnit: 'bag (5 bagels)',
    storePreference: 'Walmart',
  },

  // SMOOTHIE INGREDIENTS
  {
    name: 'Frozen Mixed Berries',
    defaultUnit: 'cup',
    caloriesPerUnit: 70,
    proteinPerUnit: 1,
    carbsPerUnit: 17,
    fatPerUnit: 0.5,
    fiberPerUnit: 4,
    sugarPerUnit: 12,
    sodiumPerUnit: 1,
    category: 'fruit',
    avgPrice: 4.98,
    purchaseUnit: '48 oz bag',
    storePreference: 'Costco',
  },
  {
    name: 'Frozen Strawberries',
    defaultUnit: 'cup',
    caloriesPerUnit: 50,
    proteinPerUnit: 1,
    carbsPerUnit: 12,
    fatPerUnit: 0.5,
    fiberPerUnit: 3,
    sugarPerUnit: 7,
    sodiumPerUnit: 2,
    category: 'fruit',
    avgPrice: 3.98,
    purchaseUnit: '32 oz bag',
    storePreference: 'Walmart',
  },
  {
    name: 'Frozen Mango Chunks',
    defaultUnit: 'cup',
    caloriesPerUnit: 100,
    proteinPerUnit: 1,
    carbsPerUnit: 25,
    fatPerUnit: 0.5,
    fiberPerUnit: 2.5,
    sugarPerUnit: 22,
    sodiumPerUnit: 2,
    category: 'fruit',
    avgPrice: 4.48,
    purchaseUnit: '32 oz bag',
    storePreference: 'Walmart',
  },
  {
    name: 'Baby Spinach',
    defaultUnit: 'cup',
    caloriesPerUnit: 7,
    proteinPerUnit: 0.9,
    carbsPerUnit: 1.1,
    fatPerUnit: 0.1,
    fiberPerUnit: 0.7,
    sugarPerUnit: 0.1,
    sodiumPerUnit: 24,
    vitaminAPerUnit: 573,
    vitaminCPerUnit: 4.9,
    ironPerUnit: 3.7,
    calciumPerUnit: 245,
    magnesiumPerUnit: 157,
    potassiumPerUnit: 540,
    category: 'vegetable',
    avgPrice: 3.48,
    purchaseUnit: '5 oz container',
    storePreference: 'Walmart',
  },
  {
    name: 'Unsweetened Almond Milk',
    defaultUnit: 'cup',
    caloriesPerUnit: 30,
    proteinPerUnit: 1,
    carbsPerUnit: 1,
    fatPerUnit: 2.5,
    fiberPerUnit: 0,
    sugarPerUnit: 0,
    sodiumPerUnit: 170,
    category: 'dairy',
    avgPrice: 3.28,
    purchaseUnit: '64 oz carton',
    storePreference: 'Walmart',
  },
  {
    name: 'Fairlife Whole Milk',
    defaultUnit: 'cup',
    caloriesPerUnit: 150,
    proteinPerUnit: 13,
    carbsPerUnit: 13,
    fatPerUnit: 8,
    fiberPerUnit: 0,
    sugarPerUnit: 6,
    sodiumPerUnit: 125,
    calciumPerUnit: 380,
    vitaminDPerUnit: 5,
    vitaminAPerUnit: 150,
    potassiumPerUnit: 470,
    vitaminB12PerUnit: 2.1,
    category: 'dairy',
    avgPrice: 5.49,
    purchaseUnit: '52 oz bottle',
    storePreference: 'Walmart',
  },
  {
    name: 'Honey',
    defaultUnit: 'tbsp',
    caloriesPerUnit: 64,
    proteinPerUnit: 0.1,
    carbsPerUnit: 17.3,
    fatPerUnit: 0,
    fiberPerUnit: 0,
    sugarPerUnit: 17.2,
    sodiumPerUnit: 1,
    category: 'condiment',
    avgPrice: 6.98,
    purchaseUnit: '16 oz bottle',
    storePreference: 'Costco',
  },
  {
    name: 'Old Fashioned Oats',
    defaultUnit: 'cup',
    caloriesPerUnit: 300,
    proteinPerUnit: 10,
    carbsPerUnit: 54,
    fatPerUnit: 5,
    fiberPerUnit: 8,
    sugarPerUnit: 1,
    sodiumPerUnit: 0,
    category: 'grain',
    avgPrice: 4.28,
    purchaseUnit: '42 oz canister',
    storePreference: 'Walmart',
  },
  {
    name: 'Avocado',
    defaultUnit: 'each', // 1/2 avocado for recipes
    caloriesPerUnit: 240,
    proteinPerUnit: 3,
    carbsPerUnit: 13,
    fatPerUnit: 22,
    fiberPerUnit: 10,
    sugarPerUnit: 1,
    sodiumPerUnit: 11,
    category: 'fruit',
    avgPrice: 1.25,
    purchaseUnit: 'each',
    storePreference: 'Walmart',
  },
  {
    name: 'Cream Cheese',
    defaultUnit: 'tbsp', // 1 tbsp = ~14.5g
    caloriesPerUnit: 50,
    proteinPerUnit: 1,
    carbsPerUnit: 0.8,
    fatPerUnit: 5,
    fiberPerUnit: 0,
    sugarPerUnit: 0.5,
    sodiumPerUnit: 47,
    category: 'dairy',
    avgPrice: 2.98,
    purchaseUnit: '8 oz block',
    storePreference: 'Walmart',
  },
  {
    name: 'Chia Seeds',
    defaultUnit: 'tbsp',
    caloriesPerUnit: 60,
    proteinPerUnit: 2,
    carbsPerUnit: 5,
    fatPerUnit: 3.5,
    fiberPerUnit: 4,
    sugarPerUnit: 0,
    sodiumPerUnit: 1,
    category: 'other',
    avgPrice: 7.98,
    purchaseUnit: '15 oz bag',
    storePreference: 'Costco',
  },
  {
    name: 'Ground Turkey (93/7)',
    defaultUnit: 'lb',
    caloriesPerUnit: 752,
    proteinPerUnit: 104,
    carbsPerUnit: 0,
    fatPerUnit: 36,
    fiberPerUnit: 0,
    sugarPerUnit: 0,
    sodiumPerUnit: 320,
    category: 'protein',
    avgPrice: 5.28,
    purchaseUnit: 'per lb',
    storePreference: 'Walmart',
  },
];

// Insert ingredients
const insertedIngredients: Map<string, number> = new Map();

for (const ing of ingredientData) {
  const result = db.insert(schema.ingredients).values(ing).returning({ id: schema.ingredients.id }).get();
  insertedIngredients.set(ing.name, result.id);
}

console.log(`✅ Inserted ${insertedIngredients.size} ingredients`);

function getIngId(name: string): number {
  const id = insertedIngredients.get(name);
  if (!id) throw new Error(`Ingredient not found: ${name}`);
  return id;
}

// ==================== RECIPES ====================

// Recipe 1: Freezer Breakfast Burritos
const recipe1 = db.insert(schema.recipes).values({
  name: 'Freezer Breakfast Burritos',
  description: 'The ultimate batch-cook breakfast. Make 14 burritos in under 40 minutes, freeze them, and have a hot breakfast ready in 2.5 minutes every morning. Crispy sausage, fluffy eggs, melty cheese, and golden hash browns.',
  category: 'breakfast',
  prepTimeMinutes: 15,
  cookTimeMinutes: 20,
  servings: 14,
  freezerFriendly: true,
  freezerLifeDays: 90,
  fridgeLifeDays: 5,
  costPerServing: 0.80,
  difficulty: 'beginner',
  instructions: JSON.stringify([
    {
      step: 1,
      title: 'Cook the sausage',
      description: 'Put the pan on medium heat (turn the dial to about 5 out of 10). Add the entire roll of breakfast sausage. Use a spatula to break it into small crumbles — press and chop like you\'re mashing it up. Keep stirring and breaking it up for about 8 minutes. You\'re done when there\'s absolutely no pink left — it should all be brown. Move the cooked sausage to a plate lined with a paper towel. LEAVE THE GREASE IN THE PAN — don\'t clean it.',
      timer_seconds: 480,
      tip: 'The grease is flavor — you cook the hash browns in it next. Don\'t wipe the pan.',
    },
    {
      step: 2,
      title: 'Cook the hash browns',
      description: 'Same pan, same grease from the sausage. Dump the frozen hash browns right in. Spread them out flat with the spatula. Here\'s the key: DON\'T TOUCH THEM for 3 full minutes. Let them sit and get crispy on the bottom. Then stir them around, spread flat again, and cook 4 more minutes until they\'re golden and a little crispy.',
      timer_seconds: 420,
      tip: 'Resist the urge to stir early. The crispy bits are the best part.',
    },
    {
      step: 3,
      title: 'Scramble the eggs',
      description: 'Crack all 18 eggs into a big bowl. Add the salt, pepper, and garlic powder. Whisk with a fork until the yolks and whites are totally mixed (should be uniform yellow, no streaks). Put a pan on medium-low heat (dial at about 3-4 out of 10). If the sausage pan is dry, add a small pat of butter. Pour the eggs in. Wait 30 seconds without touching them. Then gently push the edges toward the center with a spatula. Wait 20 seconds, push again. Keep doing this for about 4 minutes. Pull them OFF the heat when they still look slightly wet.',
      timer_seconds: 240,
      tip: 'Pull them off slightly wet — the residual heat in the pan finishes cooking them. Overcooked eggs are rubbery.',
    },
    {
      step: 4,
      title: 'Mix the filling',
      description: 'Put the sausage back in the pan with the eggs and hash browns. Add all the shredded cheddar cheese. Stir everything together gently until the cheese starts to melt. Then STOP — let this cool for at least 10 minutes. Set a timer.',
      timer_seconds: 600,
      tip: 'Hot filling = soggy tortilla. Patience pays off here. Go clean up while you wait.',
    },
    {
      step: 5,
      title: 'Assemble the burritos',
      description: 'Lay out a tortilla flat. Scoop about 1/2 cup of filling (a big serving spoon\'s worth) onto the bottom third of the tortilla. Don\'t overfill — leave at least 2 inches on the sides. Fold the bottom edge up over the filling. Fold both sides in toward the center. Then roll away from you, keeping it tight. Repeat for all 14 tortillas.',
    },
    {
      step: 6,
      title: 'Wrap and freeze',
      description: 'Tear off a piece of aluminum foil big enough to wrap one burrito. Place the burrito on the foil, seam-side down. Wrap it snugly. Put wrapped burritos into gallon-size freezer bags — about 7 per bag. Squeeze out as much air as you can before sealing. Write today\'s date on the bag with a marker. Good for 3 months in the freezer.',
    },
    {
      step: 7,
      title: 'How to reheat (every morning)',
      description: 'Take one burrito out of the freezer. Remove the foil completely. Wrap it in a slightly damp paper towel (run a paper towel under the faucet, wring it out). Microwave for 1 minute 30 seconds. Flip it over. Microwave another 1 minute. Let it sit for 30 seconds before eating (it\'s lava inside). If it\'s still cold in the middle, do another 30 seconds.',
      timer_seconds: 180,
    },
  ]),
  notes: 'This is THE recipe that makes meal prep worth it. 14 breakfasts done in 35 minutes. Keep 5 in the fridge for the week, freeze the rest.',
}).returning({ id: schema.recipes.id }).get();

// Recipe 1 ingredients
const recipe1Ingredients = [
  { recipeId: recipe1.id, ingredientId: getIngId('Large Eggs'), amount: 18, unit: 'each' },
  { recipeId: recipe1.id, ingredientId: getIngId('Breakfast Sausage (Ground)'), amount: 1, unit: 'lb' },
  { recipeId: recipe1.id, ingredientId: getIngId('Shredded Cheddar Cheese'), amount: 2, unit: 'cup' },
  { recipeId: recipe1.id, ingredientId: getIngId('Frozen Diced Hash Browns'), amount: 3, unit: 'cup' },
  { recipeId: recipe1.id, ingredientId: getIngId('Large Flour Tortillas (10-inch)'), amount: 14, unit: 'each' },
  { recipeId: recipe1.id, ingredientId: getIngId('Salt'), amount: 0.5, unit: 'tsp' },
  { recipeId: recipe1.id, ingredientId: getIngId('Black Pepper'), amount: 0.5, unit: 'tsp' },
  { recipeId: recipe1.id, ingredientId: getIngId('Garlic Powder'), amount: 0.5, unit: 'tsp' },
];

for (const ri of recipe1Ingredients) {
  db.insert(schema.recipeIngredients).values(ri).run();
}

// Recipe 2: Sheet Pan Chicken & Rice Bowls
const recipe2 = db.insert(schema.recipes).values({
  name: 'Sheet Pan Chicken & Rice Bowls',
  description: 'Dead simple: season chicken, bake it, shred it, put it on rice with broccoli. 10 lunches from one sheet pan. The spice rub makes it taste like you know what you\'re doing.',
  category: 'lunch',
  prepTimeMinutes: 10,
  cookTimeMinutes: 35,
  servings: 10,
  freezerFriendly: true,
  freezerLifeDays: 90,
  fridgeLifeDays: 5,
  costPerServing: 1.80,
  difficulty: 'beginner',
  instructions: JSON.stringify([
    {
      step: 1,
      title: 'Preheat the oven',
      description: 'Turn your oven to 425°F (that\'s the "425" mark on the dial — most ovens go up to 500). Pull out a sheet pan (the big flat baking tray). Tear off a piece of aluminum foil big enough to cover it and press the foil down on the pan. This means zero cleanup later. Lay the chicken thighs on the pan skin-side UP. Don\'t let them overlap — they need space to crisp up.',
    },
    {
      step: 2,
      title: 'Make the spice rub and season',
      description: 'In a small bowl, mix together: garlic powder, cumin, chili powder, paprika, salt, and pepper. Stir with a spoon until combined. Drizzle the olive oil all over the chicken pieces. Then sprinkle the spice mixture evenly on top of each piece. You don\'t need to rub it in — just get good coverage.',
    },
    {
      step: 3,
      title: 'Bake the chicken',
      description: 'Put the sheet pan in the oven. Set a timer for 35 minutes. Do NOT open the oven door during this time — every time you open it, you lose heat and the skin won\'t crisp. After 35 minutes, the skin should be golden brown. Check doneness: cut into the thickest piece at the thickest part. The meat should be white all the way through with clear juices, no pink at all. If you have a meat thermometer, it should read 165°F.',
      timer_seconds: 2100,
      tip: 'If you don\'t have a thermometer, cut the thickest piece in half — absolutely no pink = done. When in doubt, give it 5 more minutes.',
    },
    {
      step: 4,
      title: 'Cook the rice',
      description: 'While the chicken bakes, start the rice. Put 4 cups of dry rice in a large pot. Add 8 cups of water and a pinch of salt. Put it on the stove on HIGH heat. Watch it — when it starts bubbling aggressively (boiling), immediately turn the heat to LOW (dial at about 2 out of 10). Put the lid on the pot. Set a timer for 18 minutes. Do NOT lift the lid, do NOT stir. After 18 minutes, turn off the heat completely but leave the lid on for 5 more minutes. Then fluff with a fork.',
      timer_seconds: 1380,
      tip: 'The lid stays ON the entire time. Lifting it lets out steam and messes up the texture. Trust the process.',
    },
    {
      step: 5,
      title: 'Cook the broccoli',
      description: 'Easiest option: microwave the frozen broccoli right in the bag (open one corner for steam). About 5 minutes on high. Or if you have a second sheet pan, spread broccoli on it, drizzle with a little olive oil and salt, and put it in the oven for the last 15 minutes of the chicken cook time.',
      timer_seconds: 300,
    },
    {
      step: 6,
      title: 'Shred the chicken',
      description: 'Take the chicken out of the oven. LET IT REST for 10 minutes — this is important, it lets the juices redistribute so it stays moist. After resting, remove and discard the skin (just peel it off with your fingers or a fork). Pull the meat off the bones — it should come off easily. Use two forks to shred it: hold it with one fork, pull with the other. Optional: toss the shredded chicken with soy sauce for extra flavor.',
      timer_seconds: 600,
    },
    {
      step: 7,
      title: 'Portion into containers',
      description: 'Get 10 meal prep containers ready. In each container, put: 3/4 cup of rice (pack it into a measuring cup then dump it), about 5-6 oz of shredded chicken (roughly a large handful), and a portion of broccoli. Put 5 containers in the fridge for this week\'s lunches. Let the other 5 cool completely (leave lids off for 30 min), then freeze them.',
    },
  ]),
  notes: 'Flavor swap ideas — Taco style: heavy on cumin + chili powder, squeeze lime on top. Asian style: soy sauce + ground ginger + sesame oil drizzle. Italian: Italian seasoning + lemon juice. BBQ: pour BBQ sauce on the chicken before baking.',
}).returning({ id: schema.recipes.id }).get();

const recipe2Ingredients = [
  { recipeId: recipe2.id, ingredientId: getIngId('Bone-in Chicken Thighs (Skin-on)'), amount: 5, unit: 'lb' },
  { recipeId: recipe2.id, ingredientId: getIngId('Long Grain White Rice (Dry)'), amount: 4, unit: 'cup' },
  { recipeId: recipe2.id, ingredientId: getIngId('Olive Oil'), amount: 2, unit: 'tbsp' },
  { recipeId: recipe2.id, ingredientId: getIngId('Garlic Powder'), amount: 2, unit: 'tsp' },
  { recipeId: recipe2.id, ingredientId: getIngId('Cumin'), amount: 2, unit: 'tsp' },
  { recipeId: recipe2.id, ingredientId: getIngId('Chili Powder'), amount: 1, unit: 'tsp' },
  { recipeId: recipe2.id, ingredientId: getIngId('Paprika'), amount: 1, unit: 'tsp' },
  { recipeId: recipe2.id, ingredientId: getIngId('Salt'), amount: 2, unit: 'tsp' },
  { recipeId: recipe2.id, ingredientId: getIngId('Black Pepper'), amount: 1, unit: 'tsp' },
  { recipeId: recipe2.id, ingredientId: getIngId('Frozen Broccoli'), amount: 32, unit: 'oz' },
  { recipeId: recipe2.id, ingredientId: getIngId('Soy Sauce'), amount: 2, unit: 'tbsp' },
];

for (const ri of recipe2Ingredients) {
  db.insert(schema.recipeIngredients).values(ri).run();
}

// Recipe 3: Beef & Bean Freezer Burritos
const recipe3 = db.insert(schema.recipes).values({
  name: 'Beef & Bean Freezer Burritos',
  description: 'Cheap, filling, high-protein dinner burritos. 10 burritos in 25 minutes. The taco seasoning does all the flavor work for you.',
  category: 'dinner',
  prepTimeMinutes: 10,
  cookTimeMinutes: 15,
  servings: 10,
  freezerFriendly: true,
  freezerLifeDays: 90,
  fridgeLifeDays: 5,
  costPerServing: 1.50,
  difficulty: 'beginner',
  instructions: JSON.stringify([
    {
      step: 1,
      title: 'Brown the beef',
      description: 'Put a large skillet or pan on the stove at medium-high heat (dial at about 7 out of 10). Add all 3 pounds of ground beef. Using a spatula, break the meat into small pieces — press down, chop, stir, repeat. Cook for about 10 minutes, stirring every minute or so. It\'s done when there\'s absolutely no pink left — all brown. Now you need to drain the grease: carefully tilt the pan and spoon the liquid grease into an empty can or jar. NEVER pour grease down the sink drain — it solidifies and clogs pipes.',
      timer_seconds: 600,
      tip: 'Keep an empty can by the stove for grease. Let it solidify in the can, then throw the whole can in the trash.',
    },
    {
      step: 2,
      title: 'Add seasoning',
      description: 'With the beef back on medium heat, tear open both taco seasoning packets and dump them in. Add 1/2 cup of water. Stir everything together. Cook for about 2 minutes — the liquid will reduce and turn into a thick, flavorful paste coating all the meat.',
      timer_seconds: 120,
    },
    {
      step: 3,
      title: 'Add beans, salsa, and rice',
      description: 'Open all 3 cans of beans. Drain the liquid from each can into the sink and give them a quick rinse under running water (this removes the starchy liquid and reduces sodium). Dump the drained beans into the pan. Add the salsa. If using rice, add that too. Stir everything together and cook for 3 minutes until heated through. Then turn off the heat and let it cool for at least 10 minutes.',
      timer_seconds: 600,
      tip: 'The cooling step is important — hot filling makes soggy tortillas. Use this time to set up your wrapping station.',
    },
    {
      step: 4,
      title: 'Assemble the burritos',
      description: 'Lay out a tortilla flat on the counter. Spoon about 1/2 cup of the meat and bean mixture onto the bottom third of the tortilla. Sprinkle a pinch of shredded cheese on top. Fold the bottom edge up over the filling. Fold both sides in. Roll it away from you, keeping it snug. Wrap in aluminum foil. Repeat for all 10 tortillas.',
    },
    {
      step: 5,
      title: 'Freeze and reheat instructions',
      description: 'Put 5 burritos in one gallon freezer bag and 5 in another. Squeeze out as much air as possible and seal. Write today\'s date on the bags. Good for 3 months in the freezer. To REHEAT FROM FROZEN: Remove foil, wrap in a damp paper towel. Microwave 2 minutes, flip it over, microwave 1 more minute. Let sit 30 seconds. For a crispy burrito: remove foil, bake at 375°F for 20 minutes, flipping halfway.',
      timer_seconds: 180,
    },
  ]),
  notes: 'Homemade taco seasoning (cheaper and no weird additives): Mix 2 tbsp chili powder, 1 tbsp cumin, 1 tsp each of garlic powder, onion powder, and paprika, 1/2 tsp salt, 1/4 tsp cayenne. That replaces both packets.',
}).returning({ id: schema.recipes.id }).get();

const recipe3Ingredients = [
  { recipeId: recipe3.id, ingredientId: getIngId('Ground Beef (80/20)'), amount: 3, unit: 'lb' },
  { recipeId: recipe3.id, ingredientId: getIngId('Black Beans (15 oz can)'), amount: 3, unit: 'can' },
  { recipeId: recipe3.id, ingredientId: getIngId('Large Flour Tortillas (10-inch)'), amount: 10, unit: 'each' },
  { recipeId: recipe3.id, ingredientId: getIngId('Shredded Mexican Blend Cheese'), amount: 2, unit: 'cup' },
  { recipeId: recipe3.id, ingredientId: getIngId('Salsa'), amount: 1, unit: 'cup' },
  { recipeId: recipe3.id, ingredientId: getIngId('Taco Seasoning Packet'), amount: 2, unit: 'each' },
  { recipeId: recipe3.id, ingredientId: getIngId('Water'), amount: 0.5, unit: 'cup' },
  { recipeId: recipe3.id, ingredientId: getIngId('Cooked White Rice'), amount: 2, unit: 'cup' },
];

for (const ri of recipe3Ingredients) {
  db.insert(schema.recipeIngredients).values(ri).run();
}

// ==================== SMOOTHIE & BREAKFAST RECIPES ====================

// Recipe 4: Berry Protein Power Smoothie
const recipe4 = db.insert(schema.recipes).values({
  name: 'Berry Protein Power Smoothie',
  description: 'A thick, berry-loaded protein smoothie that tastes like a milkshake but hits 31g protein. Uses ON Gold Standard whey. Blend and go — 2 minutes flat.',
  category: 'breakfast',
  prepTimeMinutes: 2,
  cookTimeMinutes: 0,
  servings: 1,
  freezerFriendly: false,
  fridgeLifeDays: 0,
  costPerServing: 2.75,
  difficulty: 'beginner',
  instructions: JSON.stringify([
    {
      step: 1,
      title: 'Add liquids first',
      description: 'Pour 1 cup of unsweetened almond milk into your blender. Always add liquid first — it helps the blades spin without jamming. If you want it creamier, use Fairlife milk instead (adds 13g protein).',
      tip: 'Liquid ALWAYS goes in first. Frozen stuff on top. This prevents the blender from getting stuck.',
    },
    {
      step: 2,
      title: 'Add protein powder and peanut butter',
      description: 'Add 1 scoop of Optimum Nutrition Gold Standard Whey (Vanilla) and 1 tablespoon of peanut butter. The peanut butter adds healthy fats that keep you full longer and makes it taste amazing.',
      tip: 'ON Gold Standard mixes cleaner than most powders — no chalky texture. Vanilla works best with berries.',
    },
    {
      step: 3,
      title: 'Add frozen fruit and spinach',
      description: 'Dump in 1 cup of frozen mixed berries and 1 cup of baby spinach. The spinach is invisible once blended — you won\'t taste it at all, but it adds vitamins and fiber. Frozen fruit works better than fresh — it makes the smoothie thick and cold without needing ice.',
      tip: 'Don\'t skip the spinach. Seriously — you cannot taste it. It just turns the smoothie a slightly darker purple.',
    },
    {
      step: 4,
      title: 'Blend until smooth',
      description: 'Put the lid on tight. Blend on high for 30-45 seconds until completely smooth. If it\'s too thick, add a splash more almond milk. If too thin, add a few more frozen berries. Pour into a tall glass or take-along cup.',
      timer_seconds: 45,
    },
  ]),
  notes: 'Brand recs: ON Gold Standard Vanilla is the best-tasting vanilla whey under $35. Kirkland (Costco) frozen berries are the best value — $10 for 4 lbs. For peanut butter, Jif Natural or Smucker\'s Natural — check the label, should just be "peanuts, salt."',
}).returning({ id: schema.recipes.id }).get();

for (const ri of [
  { recipeId: recipe4.id, ingredientId: getIngId('Unsweetened Almond Milk'), amount: 1, unit: 'cup' },
  { recipeId: recipe4.id, ingredientId: getIngId('Optimum Nutrition Gold Standard Whey (Vanilla)'), amount: 1, unit: 'each' },
  { recipeId: recipe4.id, ingredientId: getIngId('Peanut Butter'), amount: 1, unit: 'tbsp' },
  { recipeId: recipe4.id, ingredientId: getIngId('Frozen Mixed Berries'), amount: 1, unit: 'cup' },
  { recipeId: recipe4.id, ingredientId: getIngId('Baby Spinach'), amount: 1, unit: 'cup' },
]) {
  db.insert(schema.recipeIngredients).values(ri).run();
}

// Recipe 5: Chocolate PB Protein Shake
const recipe5 = db.insert(schema.recipes).values({
  name: 'Chocolate PB Protein Shake',
  description: 'Tastes like a Reese\'s milkshake, packs 41g protein. This is the one that makes hitting your macros feel like cheating. Uses Fairlife milk for extra protein.',
  category: 'snack',
  prepTimeMinutes: 2,
  cookTimeMinutes: 0,
  servings: 1,
  freezerFriendly: false,
  fridgeLifeDays: 0,
  costPerServing: 3.20,
  difficulty: 'beginner',
  instructions: JSON.stringify([
    {
      step: 1,
      title: 'Add milk first',
      description: 'Pour 1 cup of Fairlife Whole Milk into the blender. Fairlife is ultra-filtered — 13g protein per cup vs 8g in regular milk, and it\'s lactose-free. This is the secret weapon for hitting protein goals.',
      tip: 'Fairlife is worth the premium. 50% more protein than regular milk. Costco often has it cheapest.',
    },
    {
      step: 2,
      title: 'Add chocolate protein and peanut butter',
      description: 'Add 1 scoop of ON Gold Standard Whey (Double Rich Chocolate) and 2 tablespoons of peanut butter. Two tablespoons — be generous, this is what makes it taste like dessert.',
    },
    {
      step: 3,
      title: 'Add banana and blend',
      description: 'Break a banana into chunks and toss them in. For an even thicker, colder shake, use a frozen banana (peel and freeze ripe bananas ahead of time). Blend on high for 30-45 seconds.',
      timer_seconds: 45,
      tip: 'Freeze ripe bananas: peel them, break in half, store in a freezer bag. Always have frozen bananas ready for smoothies.',
    },
  ]),
  notes: 'This is 562 cal and 41g protein — a real meal. If you need fewer calories, use almond milk instead of Fairlife and cut to 1 tbsp peanut butter. For even MORE protein, swap to Dymatize ISO100 (25g per scoop).',
}).returning({ id: schema.recipes.id }).get();

for (const ri of [
  { recipeId: recipe5.id, ingredientId: getIngId('Fairlife Whole Milk'), amount: 1, unit: 'cup' },
  { recipeId: recipe5.id, ingredientId: getIngId('Optimum Nutrition Gold Standard Whey (Chocolate)'), amount: 1, unit: 'each' },
  { recipeId: recipe5.id, ingredientId: getIngId('Peanut Butter'), amount: 2, unit: 'tbsp' },
  { recipeId: recipe5.id, ingredientId: getIngId('Banana'), amount: 1, unit: 'each' },
]) {
  db.insert(schema.recipeIngredients).values(ri).run();
}

// Recipe 6: Tropical Mango Protein Smoothie
const recipe6 = db.insert(schema.recipes).values({
  name: 'Tropical Mango Protein Smoothie',
  description: 'Light, tropical, refreshing. Uses Orgain plant-based protein for a cleaner ingredient list. Great if whey upsets your stomach.',
  category: 'breakfast',
  prepTimeMinutes: 2,
  cookTimeMinutes: 0,
  servings: 1,
  freezerFriendly: false,
  fridgeLifeDays: 0,
  costPerServing: 2.90,
  difficulty: 'beginner',
  instructions: JSON.stringify([
    {
      step: 1,
      title: 'Liquid base',
      description: 'Pour 1 cup of unsweetened almond milk into the blender.',
    },
    {
      step: 2,
      title: 'Add protein and extras',
      description: 'Add 1 scoop of Orgain Organic Protein (Vanilla Bean), 1 tablespoon of chia seeds, and 1 tablespoon of honey. The chia seeds add omega-3s and help keep you full. The honey adds natural sweetness that pairs perfectly with mango.',
      tip: 'Orgain is plant-based (pea + rice protein). No bloating like some whey can cause. The vanilla flavor works great with tropical fruit.',
    },
    {
      step: 3,
      title: 'Add frozen fruit and spinach',
      description: 'Add 1 cup of frozen mango chunks and 1 cup of baby spinach. Frozen mango gives it that thick, creamy tropical texture.',
    },
    {
      step: 4,
      title: 'Blend and serve',
      description: 'Blend on high for 45 seconds until smooth and creamy. It should be bright orange-yellow. Pour into a glass.',
      timer_seconds: 45,
    },
  ]),
  notes: 'Brand recs: Orgain from Costco is the best deal (~$1.40/serving). For chia seeds, Nutiva or BetterBody Foods. Frozen mango from Costco (4 lb bag) is unbeatable value.',
}).returning({ id: schema.recipes.id }).get();

for (const ri of [
  { recipeId: recipe6.id, ingredientId: getIngId('Unsweetened Almond Milk'), amount: 1, unit: 'cup' },
  { recipeId: recipe6.id, ingredientId: getIngId('Orgain Organic Protein Powder (Vanilla)'), amount: 1, unit: 'each' },
  { recipeId: recipe6.id, ingredientId: getIngId('Chia Seeds'), amount: 1, unit: 'tbsp' },
  { recipeId: recipe6.id, ingredientId: getIngId('Honey'), amount: 1, unit: 'tbsp' },
  { recipeId: recipe6.id, ingredientId: getIngId('Frozen Mango Chunks'), amount: 1, unit: 'cup' },
  { recipeId: recipe6.id, ingredientId: getIngId('Baby Spinach'), amount: 1, unit: 'cup' },
]) {
  db.insert(schema.recipeIngredients).values(ri).run();
}

// Recipe 7: High Protein Strawberry Oat Smoothie
const recipe7 = db.insert(schema.recipes).values({
  name: 'High Protein Strawberry Oat Smoothie',
  description: 'The "meal replacement" smoothie — 49g protein from Greek yogurt + whey + oats. Thick, filling, keeps you full for 4-5 hours. This one replaces breakfast AND hits your macros hard.',
  category: 'breakfast',
  prepTimeMinutes: 3,
  cookTimeMinutes: 0,
  servings: 1,
  freezerFriendly: false,
  fridgeLifeDays: 0,
  costPerServing: 3.10,
  difficulty: 'beginner',
  instructions: JSON.stringify([
    {
      step: 1,
      title: 'Add liquid and yogurt',
      description: 'Pour 1 cup of unsweetened almond milk into the blender. Add 1 cup of Fage Total 0% Greek Yogurt. Fage is the move — 18g protein per cup, thick and creamy, no weird aftertaste.',
      tip: 'Fage 0% has the best protein-to-calorie ratio of any Greek yogurt. The big tub at Costco ($5.49 for 35 oz) is the best deal.',
    },
    {
      step: 2,
      title: 'Add protein powder and oats',
      description: 'Add 1 scoop of ON Gold Standard Whey (Vanilla) and 1/2 cup of old fashioned oats. The oats make this thick and give you slow-burning carbs for sustained energy. They blend smooth — you won\'t get chunks.',
      tip: 'Don\'t use quick oats — old fashioned oats blend better and have more fiber.',
    },
    {
      step: 3,
      title: 'Add frozen strawberries and blend',
      description: 'Add 1 cup of frozen strawberries. Blend on high for 45-60 seconds until completely smooth. This will be THICK — almost like a bowl. Add more almond milk if you want it thinner.',
      timer_seconds: 60,
    },
  ]),
  notes: 'This is the king of protein smoothies: 49g protein in one glass. Perfect for post-workout or as a meal replacement. Greek yogurt brands ranked by protein: Fage 0% (18g/cup) > Oikos Pro (25g/5.3oz cup) > Chobani Complete (15g/5.3oz cup) > Two Good (12g/5.3oz cup).',
}).returning({ id: schema.recipes.id }).get();

for (const ri of [
  { recipeId: recipe7.id, ingredientId: getIngId('Unsweetened Almond Milk'), amount: 1, unit: 'cup' },
  { recipeId: recipe7.id, ingredientId: getIngId('Fage Total 0% Greek Yogurt'), amount: 1, unit: 'cup' },
  { recipeId: recipe7.id, ingredientId: getIngId('Optimum Nutrition Gold Standard Whey (Vanilla)'), amount: 1, unit: 'each' },
  { recipeId: recipe7.id, ingredientId: getIngId('Old Fashioned Oats'), amount: 0.5, unit: 'cup' },
  { recipeId: recipe7.id, ingredientId: getIngId('Frozen Strawberries'), amount: 1, unit: 'cup' },
]) {
  db.insert(schema.recipeIngredients).values(ri).run();
}

// Recipe 8: Dave's Bagel Protein Breakfast
const recipe8 = db.insert(schema.recipes).values({
  name: "Dave's High Protein Bagel Breakfast",
  description: "Your go-to Dave's Killer Bread bagel loaded with protein. Cream cheese + eggs + turkey or just cream cheese and yogurt on the side. 35-40g protein depending on setup.",
  category: 'breakfast',
  prepTimeMinutes: 5,
  cookTimeMinutes: 5,
  servings: 1,
  freezerFriendly: false,
  fridgeLifeDays: 0,
  costPerServing: 2.80,
  difficulty: 'beginner',
  instructions: JSON.stringify([
    {
      step: 1,
      title: 'Toast the bagel',
      description: "Slice your Dave's Killer Bread Everything Bagel in half. Pop both halves in the toaster on medium-high setting. Dave's bagels are dense — they need a solid toast, about 3-4 minutes. If you don't have a toaster, broil in the oven for 2 minutes per side.",
      timer_seconds: 210,
      tip: "Dave's Everything Bagels have 14g protein per bagel — that's more than 2 eggs. The whole grain + seed combo is why.",
    },
    {
      step: 2,
      title: 'Scramble eggs while bagel toasts',
      description: 'Crack 2 eggs into a bowl, add a pinch of salt and pepper, whisk with a fork. Pan on medium-low (dial at 3-4). Add a tiny bit of butter. Pour eggs in, wait 20 seconds, gently push edges in. Repeat until barely set — about 2 minutes. Remove from heat.',
      timer_seconds: 120,
    },
    {
      step: 3,
      title: 'Assemble',
      description: "Spread 2 tablespoons of cream cheese on one or both halves of the toasted bagel. Stack the scrambled eggs on top. This gives you about 35g protein total. Eat an Oikos Pro or Chobani Complete yogurt on the side for an extra 15-25g protein bump.",
      tip: "For max protein: bagel (14g) + 2 eggs (12g) + Oikos Pro on the side (25g) = 51g protein for breakfast. That's over a third of your daily target.",
    },
  ]),
  notes: "Dave's Killer Bread bagels are available at Walmart, Target, and Costco. The Everything flavor has the best macros. Buy 2-3 bags and freeze the extras — they toast perfectly from frozen, just add 30 seconds. Always keep Oikos Pro or Fage yogurt stocked for easy protein sides.",
}).returning({ id: schema.recipes.id }).get();

for (const ri of [
  { recipeId: recipe8.id, ingredientId: getIngId("Dave's Killer Bread Everything Bagel"), amount: 1, unit: 'each' },
  { recipeId: recipe8.id, ingredientId: getIngId('Large Eggs'), amount: 2, unit: 'each' },
  { recipeId: recipe8.id, ingredientId: getIngId('Cream Cheese'), amount: 2, unit: 'tbsp' },
]) {
  db.insert(schema.recipeIngredients).values(ri).run();
}

// Recipe 9: Greek Yogurt Protein Bowl
const recipe9 = db.insert(schema.recipes).values({
  name: 'Greek Yogurt Protein Bowl',
  description: 'A thick, loaded yogurt bowl that hits 40+ grams of protein. Takes 2 minutes to assemble. This is your go-to snack or light meal when you need protein fast.',
  category: 'snack',
  prepTimeMinutes: 2,
  cookTimeMinutes: 0,
  servings: 1,
  freezerFriendly: false,
  fridgeLifeDays: 0,
  costPerServing: 2.50,
  difficulty: 'beginner',
  instructions: JSON.stringify([
    {
      step: 1,
      title: 'Base layer',
      description: 'Scoop 1 cup of Fage Total 0% Greek Yogurt into a bowl. This is your protein foundation — 18g right here.',
      tip: 'Fage 0% is the best plain Greek yogurt. Thicker than Chobani, less sour than store brand. The 35oz tub at Costco is the move.',
    },
    {
      step: 2,
      title: 'Add protein boost',
      description: 'Sprinkle 1/4 cup of old fashioned oats on top (uncooked — they soften in the yogurt). Add 1 tablespoon of peanut butter in a dollop. Add 1 tablespoon of honey drizzled on top.',
    },
    {
      step: 3,
      title: 'Add fruit and finish',
      description: 'Slice half a banana on top. Or use thawed frozen berries. Sprinkle 1 tablespoon of chia seeds over everything. Eat immediately — the oats will soften within a few minutes and give it a great texture.',
      tip: 'For even MORE protein, mix a half-scoop of vanilla whey into the yogurt before adding toppings. Adds 12g protein.',
    },
  ]),
  notes: 'Greek yogurt quality ranking (tried them all): Fage 0% (best texture, highest protein) > Oikos Pro (most protein per container, good flavor) > Chobani Complete (added fiber, vitamins) > Two Good (lowest sugar, lighter). Buy whichever is on sale — they\'re all good.',
}).returning({ id: schema.recipes.id }).get();

for (const ri of [
  { recipeId: recipe9.id, ingredientId: getIngId('Fage Total 0% Greek Yogurt'), amount: 1, unit: 'cup' },
  { recipeId: recipe9.id, ingredientId: getIngId('Old Fashioned Oats'), amount: 0.25, unit: 'cup' },
  { recipeId: recipe9.id, ingredientId: getIngId('Peanut Butter'), amount: 1, unit: 'tbsp' },
  { recipeId: recipe9.id, ingredientId: getIngId('Honey'), amount: 1, unit: 'tbsp' },
  { recipeId: recipe9.id, ingredientId: getIngId('Banana'), amount: 0.5, unit: 'each' },
  { recipeId: recipe9.id, ingredientId: getIngId('Chia Seeds'), amount: 1, unit: 'tbsp' },
]) {
  db.insert(schema.recipeIngredients).values(ri).run();
}

// ==================== SEED PRICE HISTORY ====================

const today = new Date().toISOString().split('T')[0];
const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];

const priceEntries = [
  { ingredientId: getIngId('Optimum Nutrition Gold Standard Whey (Vanilla)'), price: 32.99, store: 'Costco', date: lastWeek, unitPurchased: '2 lb tub', qualityRating: 5, notes: 'Best vanilla whey for the price' },
  { ingredientId: getIngId('Optimum Nutrition Gold Standard Whey (Vanilla)'), price: 35.99, store: 'Walmart', date: twoWeeksAgo, unitPurchased: '2 lb tub', qualityRating: 5, notes: 'More expensive here — buy at Costco' },
  { ingredientId: getIngId('Optimum Nutrition Gold Standard Whey (Chocolate)'), price: 32.99, store: 'Costco', date: lastWeek, unitPurchased: '2 lb tub', qualityRating: 5 },
  { ingredientId: getIngId('Fage Total 0% Greek Yogurt'), price: 5.49, store: 'Costco', date: lastWeek, unitPurchased: '35.3 oz tub', qualityRating: 5, notes: 'Best Greek yogurt. Period.' },
  { ingredientId: getIngId('Fage Total 0% Greek Yogurt'), price: 6.29, store: 'Walmart', date: twoWeeksAgo, unitPurchased: '35.3 oz tub', qualityRating: 5 },
  { ingredientId: getIngId("Dave's Killer Bread Everything Bagel"), price: 6.49, store: 'Walmart', date: lastWeek, unitPurchased: 'bag (5 bagels)', qualityRating: 5, notes: 'Best high-protein bagel on the market' },
  { ingredientId: getIngId("Dave's Killer Bread Everything Bagel"), price: 5.99, store: 'Costco', date: twoWeeksAgo, unitPurchased: '2-pack (10 bagels)', qualityRating: 5, notes: 'Better deal at Costco — 2 bags' },
  { ingredientId: getIngId('Oikos Pro Greek Yogurt (Vanilla)'), price: 1.69, store: 'Walmart', date: lastWeek, unitPurchased: '5.3 oz cup', qualityRating: 4, notes: '25g protein per cup — insane' },
  { ingredientId: getIngId('Ground Beef (80/20)'), price: 5.49, store: 'Walmart', date: lastWeek, unitPurchased: 'per lb', qualityRating: 4 },
  { ingredientId: getIngId('Ground Beef (80/20)'), price: 4.99, store: 'WinCo', date: twoWeeksAgo, unitPurchased: 'per lb', qualityRating: 4, notes: 'Slightly cheaper here' },
  { ingredientId: getIngId('Ground Beef (80/20)'), price: 4.49, store: 'Costco', date: today, unitPurchased: '4 lb pack', qualityRating: 5, notes: 'Best quality and price for bulk' },
  { ingredientId: getIngId('Fairlife Whole Milk'), price: 5.49, store: 'Walmart', date: lastWeek, unitPurchased: '52 oz bottle', qualityRating: 5, notes: '13g protein per cup, lactose-free' },
  { ingredientId: getIngId('Frozen Mixed Berries'), price: 9.99, store: 'Costco', date: lastWeek, unitPurchased: '4 lb bag', qualityRating: 5, notes: 'Kirkland brand — best frozen fruit deal' },
  { ingredientId: getIngId('Frozen Mixed Berries'), price: 4.98, store: 'Walmart', date: twoWeeksAgo, unitPurchased: '48 oz bag', qualityRating: 3, notes: 'Great Value brand — decent quality' },
];

for (const entry of priceEntries) {
  db.insert(schema.priceHistory).values(entry).run();
}

// ==================== SUPPLEMENTS ====================

const supp1 = db.insert(schema.supplements).values({
  name: 'DS-01 Daily Synbiotic',
  brand: 'Seed',
  description: 'Probiotic + Prebiotic Supplement',
  form: 'capsule',
  defaultDose: 2,
  doseUnit: 'capsules',
  servingInfo: '2 capsules = 1 daily dose. Start with 1 capsule for the first 3 days.',
  benefits: JSON.stringify([
    'Gut health & digestion',
    'Gut barrier integrity',
    'Microbiome diversity',
    'Nutrient absorption',
    'Immune support',
    'Skin health',
  ]),
  contents: JSON.stringify([
    { name: '24-Strain Probiotic Blend', detail: 'Bifidobacterium longum SD-BB536-JP, B. breve SD-BR3-IT, Lactiplantibacillus plantarum SD-LP1-IT, Lacticaseibacillus rhamnosus SD-LR6-IT, L. rhamnosus HRVD113-US, B. infantis SD-M63-JP, B. lactis SD-BS5-IT, B. lactis HRVD524-US, Lactobacillus crispatus SD-LCR01-IT, Lacticaseibacillus casei HRVD300-US, B. breve HRVD521-US, B. longum HRVD90b-US, B. lactis SD-150-BE, Limosilactobacillus fermentum SD-LF8-IT, Lacticaseibacillus rhamnosus SD-GG-BE, Limosilactobacillus reuteri SD-RD830-FR, B. adolescentis SD-BA5-IT, L. reuteri SD-LRE2-IT, Ligilactobacillus salivarius SD-LS1-IT, B. lactis SD-CECT8145-SP, B. longum SD-CECT7347-SP, Lacticaseibacillus casei SD-CECT9104-SP, Lactiplantibacillus plantarum SD-LPLDL-UK, B. lactis SD-MB2409-IT' },
    { name: 'MAPP Prebiotic', detail: 'Indian Pomegranate [rind + arils] (Punica granatum) — polyphenolic + phenolic bioactives' },
  ]),
  bestTimeToTake: 'Take 2 capsules at once, daily. Best taken on an empty stomach. No refrigeration necessary.',
  warnings: 'May cause bloating or gas in the first week as your gut adjusts. Start with 1 capsule. Taking on an empty stomach right before bed can cause nausea — take earlier in the day or with food.',
  avgPrice: 49.99,
  purchaseUnit: '60 capsules (30-day supply)',
  storePreference: 'seed.com',
}).returning({ id: schema.supplements.id }).get();

const supp2 = db.insert(schema.supplements).values({
  name: 'Grass Fed Beef Liver',
  brand: 'Wholesale Wellness',
  description: 'Organ Meat Supplement',
  form: 'capsule',
  defaultDose: 5,
  doseUnit: 'capsules',
  servingInfo: 'Suggested use: 4-6 capsules daily. 4 capsules = 3,000mg desiccated beef liver.',
  benefits: JSON.stringify([
    'Natural vitamin A (retinol)',
    'Vitamin B12 & B complex',
    'Bioavailable iron',
    'CoQ10',
    'Copper & folate',
    'Overall energy & vitality',
  ]),
  contents: JSON.stringify([
    { name: 'Desiccated Beef Liver', amount: '3,000 mg (per 4 caps)', detail: '100% Grass-Fed, Pasture-Raised New Zealand Cattle' },
    { name: 'Vitamin A (Retinol)', detail: 'Naturally occurring — most bioavailable form' },
    { name: 'Vitamin B12', detail: 'Naturally occurring — critical for energy & nervous system' },
    { name: 'Iron (Heme)', detail: 'Naturally occurring — 5x more absorbable than plant iron' },
    { name: 'CoQ10', detail: 'Naturally occurring — supports heart & cellular energy' },
    { name: 'Folate', detail: 'Naturally occurring — methylated form, not synthetic folic acid' },
    { name: 'Copper', detail: 'Naturally occurring — supports iron metabolism' },
    { name: 'Riboflavin (B2)', detail: 'Naturally occurring' },
    { name: 'Choline', detail: 'Naturally occurring — supports liver & brain function' },
  ]),
  bestTimeToTake: 'Take 4-6 capsules with a meal, ideally breakfast or lunch. Iron and B vitamins absorb better with food.',
  warnings: 'Contains high vitamin A — do not exceed recommended dose. If you eat liver regularly, adjust capsule count down. Sourced from grass-fed, pasture-raised cattle.',
  avgPrice: 26.99,
  purchaseUnit: '180 capsules (45-day supply)',
  storePreference: 'Amazon',
}).returning({ id: schema.supplements.id }).get();

const supp3 = db.insert(schema.supplements).values({
  name: 'L-Glutamine',
  brand: 'Nutricost',
  description: 'Amino Acid — Gut & Recovery',
  form: 'capsule',
  defaultDose: 1,
  doseUnit: 'capsules',
  servingInfo: 'Suggested use: Take 1 capsule 1-3 times daily with 8-12 oz of water.',
  benefits: JSON.stringify([
    'Gut lining repair',
    'Muscle recovery',
    'Immune system support',
    'Reduces sugar cravings',
    'Post-workout recovery',
  ]),
  contents: JSON.stringify([
    { name: 'L-Glutamine', amount: '800 mg per capsule', detail: 'Free-form amino acid — most abundant amino acid in the body' },
  ]),
  bestTimeToTake: 'Take 1 capsule 1-3 times daily with 8-12 oz of water. Can take post-workout or morning on empty stomach for gut health.',
  warnings: 'Generally very well tolerated. Take with plenty of water.',
  avgPrice: 22.95,
  purchaseUnit: '120 capsules',
  storePreference: 'Amazon',
}).returning({ id: schema.supplements.id }).get();

const supp4 = db.insert(schema.supplements).values({
  name: 'Primal Multi',
  brand: 'Designs for Health',
  description: 'Ancestral Diet Multivitamin/Mineral',
  form: 'capsule',
  defaultDose: 4,
  doseUnit: 'capsules',
  servingInfo: '4 capsules = 1 serving. 120 capsules per container (30 servings).',
  benefits: JSON.stringify([
    'Complete multivitamin',
    'B-complex (methylated)',
    'Chelated minerals',
    'Antioxidant support',
    'Ancestral diet formula',
  ]),
  contents: JSON.stringify([
    { name: 'Vitamin A', amount: '1500 mcg RAE', detail: 'as Carotenoids and Palmitate — 167% DV' },
    { name: 'Vitamin C', amount: '400 mg', detail: 'as Ascorbic Acid and Acerola — 444% DV' },
    { name: 'Vitamin D3', amount: '50 mcg (2000 IU)', detail: 'as Cholecalciferol — 250% DV' },
    { name: 'Vitamin K', amount: '450 mcg', detail: 'as K1 Phytonadione and K2 Menaquinone-4 — 375% DV' },
    { name: 'Thiamin (B1)', amount: '2.4 mg', detail: 'as Thiamin HCl — 200% DV' },
    { name: 'Riboflavin (B2)', amount: '4.2 mg', detail: 'as Riboflavin-5-Phosphate — 323% DV' },
    { name: 'Niacin (B3)', amount: '60 mg NE', detail: 'as Niacinamide and Niacin — 375% DV' },
    { name: 'Vitamin B6', amount: '6.7 mg', detail: 'as Pyridoxal-5-Phosphate — 394% DV' },
    { name: 'Folate', amount: '680 mcg DFE', detail: 'as Quatrefolic\u00ae (6S)-5-methyltetrahydrofolate — 170% DV' },
    { name: 'Vitamin B12', amount: '200 mcg', detail: 'as Methylcobalamin — 8333% DV' },
    { name: 'Biotin', amount: '100 mcg', detail: 'as d-Biotin — 333% DV' },
    { name: 'Pantothenic Acid', amount: '5 mg', detail: 'as d-Calcium Pantothenate — 100% DV' },
    { name: 'Calcium', amount: '50 mg', detail: 'as d-Calcium Malate — 4% DV' },
    { name: 'Magnesium', amount: '150 mg', detail: 'as di-Magnesium Malate — 36% DV' },
    { name: 'Zinc', amount: '15 mg', detail: 'as Zinc Bisglycinate Chelate — 136% DV' },
    { name: 'Selenium', amount: '100 mcg', detail: 'SelenoExcell\u00ae — 182% DV' },
    { name: 'Copper', amount: '1 mg', detail: 'as TRAACS\u00ae Copper Bisglycinate Chelate — 111% DV' },
    { name: 'Manganese', amount: '1 mg', detail: 'as TRAACS\u00ae Manganese Bisglycinate Chelate — 43% DV' },
    { name: 'Chromium', amount: '200 mcg', detail: 'as TRAACS\u00ae Chromium Nicotinate Glycinate Chelate — 571% DV' },
    { name: 'Molybdenum', amount: '100 mcg', detail: 'as TRAACS\u00ae Molybdenum Glycinate Chelate — 222% DV' },
    { name: 'Wild Blueberry Blend', amount: '100 mg', detail: 'Canadian wild blueberries' },
    { name: 'Muscadine Grape Powder', amount: '100 mg', detail: 'Vitis rotundifolia — skin and seeds' },
    { name: 'Citrus Bioflavonoids', amount: '100 mg' },
    { name: 'Broccoli Blend', amount: '50 mg', detail: 'Broccoli Powder Extract + Mustard Powder (TrueBroc\u00ae)' },
    { name: 'Quercetin', amount: '50 mg' },
    { name: 'Vitamin E (DeltaGold\u00ae)', amount: '25 mg', detail: 'Delta and gamma tocotrienols from annatto' },
    { name: 'Trans Resveratrol (Veri-te\u2122)', amount: '10 mg' },
    { name: 'Pantethine (Pantesin\u00ae)', amount: '5 mg' },
    { name: 'Lutein Esters', amount: '3 mg' },
    { name: 'Lycopene', amount: '3 mg' },
    { name: 'Boron', amount: '1 mg', detail: 'as Bororganic Glycine' },
    { name: 'Benfotiamine', amount: '1 mg' },
  ]),
  bestTimeToTake: 'Take 4 capsules daily with a meal.',
  warnings: 'For professional use only. Contains no gluten.',
  avgPrice: 62.00,
  purchaseUnit: '120 capsules (30-day supply)',
  storePreference: 'designsforhealth.com',
}).returning({ id: schema.supplements.id }).get();

// Seed some example supplement logs — all on PAST dates so today starts clean
const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];
const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];

const supplementLogs = [
  {
    supplementId: supp1.id,
    date: threeDaysAgo,
    time: '22:30',
    dose: 2,
    person: 'me' as const,
    situation: 'before_bed' as const,
    sideEffects: 'Upset stomach / nausea about 30 min after taking. Felt queasy for about an hour.',
    effectivenessRating: 2,
    notes: 'Took on empty stomach right before bed — bad idea. Need to take earlier with food.',
  },
  {
    supplementId: supp1.id,
    date: twoDaysAgo,
    time: '08:15',
    dose: 2,
    person: 'me' as const,
    situation: 'with_meal' as const,
    sideEffects: null,
    effectivenessRating: 4,
    notes: 'Took with breakfast bagel — no issues this time. Much better.',
  },
  {
    supplementId: supp2.id,
    date: twoDaysAgo,
    time: '08:15',
    dose: 4,
    person: 'me' as const,
    situation: 'with_meal' as const,
    sideEffects: null,
    effectivenessRating: 4,
    notes: 'Took with breakfast. No taste, easy to swallow.',
  },
  {
    supplementId: supp3.id,
    date: twoDaysAgo,
    time: '07:00',
    dose: 1,
    person: 'me' as const,
    situation: 'empty_stomach' as const,
    sideEffects: null,
    effectivenessRating: 4,
    notes: 'Mixed into water first thing. No taste at all.',
  },
];

for (const log of supplementLogs) {
  db.insert(schema.supplementLog).values(log).run();
}

console.log('✅ Inserted 4 supplements with example logs');

// Create a default grocery list
db.insert(schema.groceryLists).values({ name: 'Weekly Groceries' }).run();

// ==================== DAILY LOG (STEPS) ====================
function getDateDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

const stepData = [
  { date: getDateDaysAgo(6), steps: 4200, person: 'me' as const },
  { date: getDateDaysAgo(5), steps: 6800, person: 'me' as const },
  { date: getDateDaysAgo(4), steps: 3100, person: 'me' as const },
  { date: getDateDaysAgo(3), steps: 8500, person: 'me' as const },
  { date: getDateDaysAgo(2), steps: 7200, person: 'me' as const },
  { date: getDateDaysAgo(1), steps: 5400, person: 'me' as const },
  { date: today, steps: 2800, person: 'me' as const },
];

for (const entry of stepData) {
  db.insert(schema.dailyLog).values(entry).run();
}

console.log('✅ Inserted 7 days of step data');

// ==================== DENTAL PRODUCTS ====================
const dentalProductData = [
  {
    name: 'Oral-B iO Series 15',
    brand: 'Oral-B',
    category: 'toothbrush' as const,
    model: 'iO Series 15',
    price: 249.99,
    purchaseDate: getDateDaysAgo(90),
    replacementFrequencyDays: 90,
    notes: 'Electric toothbrush — replace brush head every 3 months',
  },
  {
    name: 'Waterpik Aquarius',
    brand: 'Waterpik',
    category: 'water_flosser' as const,
    model: 'WP-660',
    price: 69.99,
    purchaseDate: getDateDaysAgo(180),
    notes: 'Water flosser — use daily after brushing',
  },
  {
    name: 'DenTek Complete Clean Floss Picks',
    brand: 'DenTek',
    category: 'floss_pick' as const,
    price: 4.99,
    purchaseDate: getDateDaysAgo(30),
    notes: 'Flossing picks — for on the go or quick floss',
  },
  {
    name: 'Crest 3D White Strips',
    brand: 'Crest',
    category: 'whitener' as const,
    model: 'Professional Effects',
    price: 45.99,
    purchaseDate: getDateDaysAgo(60),
    notes: 'Teeth whitening strips — want to get back on this routine',
  },
  {
    name: 'Sensodyne Pronamel Toothpaste',
    brand: 'Sensodyne',
    category: 'toothpaste' as const,
    model: 'Pronamel Gentle Whitening',
    price: 6.99,
    purchaseDate: getDateDaysAgo(14),
    replacementFrequencyDays: 45,
  },
];

for (const prod of dentalProductData) {
  db.insert(schema.dentalProducts).values(prod).run();
}

console.log('✅ Inserted 5 dental products');

// ==================== DOGS ====================
const rocky = db.insert(schema.dogs).values({
  name: 'Rocky',
  notes: 'The OG. Loyal and protective.',
}).returning({ id: schema.dogs.id }).get();

const cookie = db.insert(schema.dogs).values({
  name: 'Cookie',
  notes: 'Sweet and playful.',
}).returning({ id: schema.dogs.id }).get();

const blu = db.insert(schema.dogs).values({
  name: 'Blu',
  notes: 'The youngest. Full of energy.',
}).returning({ id: schema.dogs.id }).get();

console.log('✅ Inserted 3 dogs (Rocky, Cookie, Blu)');

// ==================== EXERCISES ====================
// Starter exercises targeting cervical & lumbar lordosis restoration, neck/shoulder/low back pain

const exerciseData: schema.NewExercise[] = [
  {
    name: 'Chin Tucks',
    category: 'posture',
    targetArea: 'neck',
    purpose: 'Restore cervical lordosis and strengthen deep neck flexors',
    instructions: 'Sit or stand tall. Pull your chin straight back (make a double chin). Hold 5 seconds, release. Repeat 10-15 times.',
    duration: '3 min',
    difficulty: 'beginner',
    favorite: true,
  },
  {
    name: 'Cervical Retraction with Extension',
    category: 'posture',
    targetArea: 'neck',
    purpose: 'Rebuild cervical curve — combines retraction with gentle extension',
    instructions: 'Do a chin tuck, then gently tilt your head back looking at the ceiling while maintaining the tuck. Hold 3 seconds. Return to neutral. Repeat 10 times.',
    duration: '3 min',
    difficulty: 'beginner',
    favorite: true,
  },
  {
    name: 'Cat-Cow Stretch',
    category: 'yoga',
    targetArea: 'full_spine',
    purpose: 'Mobilize the entire spine, restore natural curves',
    instructions: 'On all fours, inhale and arch your back (cow — belly drops, head up). Exhale and round your back (cat — belly in, chin to chest). Flow slowly 10-15 reps.',
    duration: '3 min',
    difficulty: 'beginner',
    favorite: true,
  },
  {
    name: 'McKenzie Press-Up (Prone Extension)',
    category: 'stretch',
    targetArea: 'lower_back',
    purpose: 'Restore lumbar lordosis and relieve disc pressure',
    instructions: 'Lie face down, hands under shoulders. Press up straightening arms while keeping hips on the floor. Hold 2-3 seconds at top, lower slowly. Repeat 10 times.',
    duration: '3 min',
    difficulty: 'beginner',
    favorite: true,
  },
  {
    name: 'Thoracic Extension over Foam Roller',
    category: 'mobility',
    targetArea: 'upper_back',
    purpose: 'Open thoracic spine, counteract forward posture',
    instructions: 'Place foam roller under upper back. Support head with hands. Gently extend back over roller. Hold 5 seconds. Move roller up/down to target different segments. 2-3 min total.',
    duration: '3 min',
    difficulty: 'beginner',
  },
  {
    name: 'Child\'s Pose',
    category: 'yoga',
    targetArea: 'full_spine',
    purpose: 'Gentle spinal decompression and low back stretch',
    instructions: 'Kneel, sit back on heels, reach arms forward on the floor. Walk hands to one side for lateral stretch. Hold 30-60 seconds each side.',
    duration: '2 min',
    difficulty: 'beginner',
  },
  {
    name: 'Pelvic Tilts',
    category: 'pilates',
    targetArea: 'lower_back',
    purpose: 'Activate core, improve lumbar awareness and control',
    instructions: 'Lie on back, knees bent, feet flat. Gently flatten lower back to floor (posterior tilt), then arch slightly (anterior tilt). Alternate slowly 15-20 reps.',
    duration: '3 min',
    difficulty: 'beginner',
  },
  {
    name: 'Dead Bug',
    category: 'pilates',
    targetArea: 'core',
    purpose: 'Core stability without spinal compression — protects low back',
    instructions: 'Lie on back, arms up to ceiling, knees at 90°. Slowly extend opposite arm and leg toward floor while keeping back flat. Alternate sides 10 reps each.',
    duration: '4 min',
    difficulty: 'intermediate',
    favorite: true,
  },
  {
    name: 'Bird Dog',
    category: 'strength',
    targetArea: 'core',
    purpose: 'Spinal stabilization and coordination',
    instructions: 'On all fours, extend right arm and left leg simultaneously. Keep hips level and core tight. Hold 3-5 seconds. Alternate sides 10 reps each.',
    duration: '4 min',
    difficulty: 'beginner',
  },
  {
    name: 'Supine Cervical Towel Roll',
    category: 'posture',
    targetArea: 'neck',
    purpose: 'Passively restore cervical lordosis curve',
    instructions: 'Roll a small towel to 2-3 inch diameter. Lie on back with towel under the curve of your neck. Relax completely for 5-10 minutes. Can do 2-3x daily.',
    duration: '10 min',
    difficulty: 'beginner',
    favorite: true,
  },
  {
    name: 'Wall Angels',
    category: 'mobility',
    targetArea: 'shoulders',
    purpose: 'Improve shoulder mobility and thoracic extension',
    instructions: 'Stand with back flat against wall. Arms at 90° (goalpost). Slowly slide arms up and down the wall keeping contact. 10-15 reps.',
    duration: '3 min',
    difficulty: 'beginner',
  },
  {
    name: 'Doorway Pec Stretch',
    category: 'stretch',
    targetArea: 'shoulders',
    purpose: 'Open chest, counteract rounded shoulders from sitting',
    instructions: 'Stand in doorway, forearms on frame at 90°. Step forward until you feel a stretch across chest. Hold 30 seconds. Repeat 3 times.',
    duration: '2 min',
    difficulty: 'beginner',
  },
  {
    name: 'Sphinx Pose',
    category: 'yoga',
    targetArea: 'lower_back',
    purpose: 'Gentle lumbar extension — rebuilds lordosis',
    instructions: 'Lie face down, prop up on forearms with elbows under shoulders. Gently press chest forward and up. Hold 30-60 seconds. Repeat 3 times.',
    duration: '3 min',
    difficulty: 'beginner',
  },
  {
    name: 'Seated Levator Scapulae Stretch',
    category: 'stretch',
    targetArea: 'neck',
    purpose: 'Release tight neck/shoulder muscles from computer work',
    instructions: 'Sit tall. Turn head 45° to one side, gently pull head down toward armpit with same-side hand. Hold 30 seconds each side. Repeat 2-3 times.',
    duration: '3 min',
    difficulty: 'beginner',
  },
  {
    name: 'Diaphragmatic Breathing',
    category: 'breathing',
    targetArea: 'core',
    purpose: 'Reduce tension, activate deep core stabilizers, improve posture',
    instructions: 'Lie on back, knees bent. Place one hand on chest, one on belly. Breathe in through nose letting belly rise (chest stays still). Exhale slowly. 10 breaths.',
    duration: '5 min',
    difficulty: 'beginner',
  },
];

for (const ex of exerciseData) {
  db.insert(schema.exercises).values(ex).run();
}

console.log(`✅ Inserted ${exerciseData.length} exercises`);

console.log('✅ Inserted 9 recipes with ingredients');
console.log(`✅ Inserted ${priceEntries.length} price history entries`);
console.log('✅ Created default grocery list');
console.log('🎉 Seed complete!');

sqlite.close();
