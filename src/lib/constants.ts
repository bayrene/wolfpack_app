// ==================== USER PROFILE ====================
export const USER_PROFILE = {
  name: 'Rene',
  dob: '1993-03-14',           // March 14, 1993
  heightIn: 69,                // 5'9"
  weightLbs: 150,
  sex: 'male' as const,
};

// ==================== NUTRITION TARGETS ====================
export const DEFAULT_TARGETS = {
  calories: 2000,
  protein: 150,
  carbs: 200,
  fat: 65,
  fiber: 30,
};

export const FAST_FOOD_WEEKLY_BASELINE = 350;

// Optimal targets for adult male (33 yrs) — research/functional medicine backed
// RDA = minimum deficiency prevention. Optimal = tissue saturation / peak function.
export const MICRO_TARGETS = {
  vitaminA: 900,    // mcg RAE  — RDA = optimal; UL 3000 mcg, excess is toxic
  vitaminC: 500,    // mg       — RDA 90 mg; Linus Pauling Institute optimal: 400–500 mg
  vitaminD: 50,     // mcg      — RDA 15 mcg (600 IU); optimal serum 40–60 ng/mL ≈ 2000 IU (50 mcg)
  vitaminB12: 10,   // mcg      — RDA 2.4 mcg; optimal neurological function: 6–10 mcg
  iron: 8,          // mg       — RDA = optimal for males; excess iron is oxidative
  zinc: 15,         // mg       — RDA 11 mg; functional optimal: 15–25 mg (UL 40 mg)
  calcium: 1000,    // mg       — RDA = optimal; excess supplemental Ca linked to CV risk
  magnesium: 500,   // mg       — RDA 420 mg; ~70% Americans deficient; optimal: 500–600 mg
  potassium: 4700,  // mg       — AI 3400 mg; cardiovascular optimal (DASH level): 4700 mg
};

export const STEPS_TARGET = 10000;

export const WATER_TARGET = 128; // oz (1 gallon)

export const COFFEE_LIMIT = 4; // max recommended cups per day (~400mg caffeine)
export const CAFFEINE_PER_CUP = 95; // mg per 8oz black coffee

export const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: '#E07A3A',
  lunch: '#2A9D8F',
  dinner: '#7C3AED',
  snack: '#6B7280',
};

export const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  easy: 'Easy',
  medium: 'Medium',
};

export const CATEGORY_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export const INGREDIENT_CATEGORIES = [
  'protein',
  'grain',
  'dairy',
  'vegetable',
  'fruit',
  'condiment',
  'spice',
  'other',
] as const;

export const UNITS = [
  'oz', 'lb', 'g', 'kg', 'cup', 'tbsp', 'tsp', 'ml', 'l', 'each', 'can', 'bag',
] as const;
