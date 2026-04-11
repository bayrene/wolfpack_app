import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const recipes = sqliteTable('recipes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category', { enum: ['breakfast', 'lunch', 'dinner', 'snack'] }).notNull(),
  prepTimeMinutes: integer('prep_time_minutes'),
  cookTimeMinutes: integer('cook_time_minutes'),
  servings: integer('servings').default(1),
  freezerFriendly: integer('freezer_friendly', { mode: 'boolean' }).default(false),
  freezerLifeDays: integer('freezer_life_days'),
  fridgeLifeDays: integer('fridge_life_days').default(5),
  costPerServing: real('cost_per_serving'),
  difficulty: text('difficulty', { enum: ['beginner', 'easy', 'medium'] }),
  instructions: text('instructions'), // JSON stringified array of step objects
  notes: text('notes'),
  imageUrl: text('image_url'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

export const ingredients = sqliteTable('ingredients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  defaultUnit: text('default_unit', {
    enum: ['oz', 'lb', 'g', 'kg', 'cup', 'tbsp', 'tsp', 'ml', 'l', 'each', 'can', 'bag'],
  }).notNull(),
  caloriesPerUnit: real('calories_per_unit').notNull(),
  proteinPerUnit: real('protein_per_unit').notNull(),
  carbsPerUnit: real('carbs_per_unit').notNull(),
  fatPerUnit: real('fat_per_unit').notNull(),
  fiberPerUnit: real('fiber_per_unit').notNull(),
  sugarPerUnit: real('sugar_per_unit').default(0),
  sodiumPerUnit: real('sodium_per_unit').default(0),
  vitaminAPerUnit: real('vitamin_a_per_unit').default(0),   // mcg RAE
  vitaminCPerUnit: real('vitamin_c_per_unit').default(0),   // mg
  vitaminDPerUnit: real('vitamin_d_per_unit').default(0),   // mcg
  vitaminB12PerUnit: real('vitamin_b12_per_unit').default(0), // mcg
  ironPerUnit: real('iron_per_unit').default(0),            // mg
  zincPerUnit: real('zinc_per_unit').default(0),            // mg
  calciumPerUnit: real('calcium_per_unit').default(0),      // mg
  magnesiumPerUnit: real('magnesium_per_unit').default(0),  // mg
  potassiumPerUnit: real('potassium_per_unit').default(0),  // mg
  category: text('category', {
    enum: ['protein', 'grain', 'dairy', 'vegetable', 'fruit', 'condiment', 'spice', 'other'],
  }).notNull(),
  avgPrice: real('avg_price'),
  purchaseUnit: text('purchase_unit'),
  storePreference: text('store_preference'),
});

export const recipeIngredients = sqliteTable('recipe_ingredients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  recipeId: integer('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  ingredientId: integer('ingredient_id').notNull().references(() => ingredients.id),
  amount: real('amount').notNull(),
  unit: text('unit').notNull(),
});

export const mealLog = sqliteTable('meal_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  mealType: text('meal_type', { enum: ['breakfast', 'lunch', 'dinner', 'snack'] }).notNull(),
  person: text('person', { enum: ['me', 'wife', 'both'] }).notNull(),
  recipeId: integer('recipe_id').references(() => recipes.id),
  servingsConsumed: real('servings_consumed').default(1),
  customName: text('custom_name'),
  customCalories: real('custom_calories'),
  customProtein: real('custom_protein'),
  customCarbs: real('custom_carbs'),
  customFat: real('custom_fat'),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const prepSessions = sqliteTable('prep_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  recipesPrepped: text('recipes_prepped'), // JSON stringified array
  totalCost: real('total_cost'),
  totalTimeMinutes: integer('total_time_minutes'),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const freezerInventory = sqliteTable('freezer_inventory', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  recipeId: integer('recipe_id').notNull().references(() => recipes.id),
  quantity: integer('quantity').notNull(),
  dateFrozen: text('date_frozen').notNull(),
  expiryDate: text('expiry_date').notNull(),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const groceryLists = sqliteTable('grocery_lists', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').default('Weekly Groceries'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const groceryItems = sqliteTable('grocery_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  listId: integer('list_id').notNull().references(() => groceryLists.id, { onDelete: 'cascade' }),
  ingredientId: integer('ingredient_id').references(() => ingredients.id),
  name: text('name').notNull(),
  amount: real('amount'),
  unit: text('unit'),
  estimatedCost: real('estimated_cost'),
  store: text('store'),
  checked: integer('checked', { mode: 'boolean' }).default(false),
  sortOrder: integer('sort_order').default(0),
});

export const priceHistory = sqliteTable('price_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ingredientId: integer('ingredient_id').notNull().references(() => ingredients.id, { onDelete: 'cascade' }),
  price: real('price').notNull(),
  store: text('store').notNull(),
  date: text('date').notNull(), // ISO date
  unitPurchased: text('unit_purchased'), // e.g., "5 lb bag", "32 oz tub"
  qualityRating: integer('quality_rating'), // 1-5 stars
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const supplements = sqliteTable('supplements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  brand: text('brand').notNull(),
  form: text('form', { enum: ['capsule', 'powder', 'tablet', 'liquid', 'softgel', 'gummy'] }).notNull(),
  defaultDose: real('default_dose').notNull(), // e.g., 2
  doseUnit: text('dose_unit').notNull(), // e.g., "capsules", "scoops", "mg"
  servingInfo: text('serving_info'), // e.g., "2 capsules = 1 serving"
  description: text('description'), // tagline, e.g. "Probiotic + Prebiotic Supplement"
  benefits: text('benefits'), // JSON array of strings
  contents: text('contents'), // JSON array of { name: string, amount?: string, detail?: string }
  bestTimeToTake: text('best_time_to_take'), // e.g., "morning with food"
  warnings: text('warnings'), // e.g., "may cause upset stomach on empty stomach"
  avgPrice: real('avg_price'),
  purchaseUnit: text('purchase_unit'), // e.g., "60 capsules"
  storePreference: text('store_preference'),
  active: integer('active', { mode: 'boolean' }).default(true),
  // Nutrition per single dose unit (e.g., per 1 capsule)
  // JSON: { calories, protein, carbs, fat, vitaminA, vitaminC, vitaminD, vitaminB12, iron, zinc, calcium, magnesium, potassium }
  nutritionPerDose: text('nutrition_per_dose'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const supplementLog = sqliteTable('supplement_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  supplementId: integer('supplement_id').notNull().references(() => supplements.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), // ISO date
  time: text('time').notNull(), // HH:MM format
  dose: real('dose').notNull(), // how many capsules/scoops/etc taken
  person: text('person', { enum: ['me', 'wife'] }).notNull(),
  situation: text('situation', { enum: ['empty_stomach', 'with_food', 'with_meal', 'before_bed', 'post_workout', 'other'] }).notNull(),
  sideEffects: text('side_effects'), // free text — "upset stomach", "headache", etc.
  effectivenessRating: integer('effectiveness_rating'), // 1-5 how you felt
  notes: text('notes'), // any additional context
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const dailyLog = sqliteTable('daily_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  steps: integer('steps').default(0),
  waterOz: integer('water_oz').default(0),
  coffee: integer('coffee').default(0), // number of cups of black coffee
  weightLbs: real('weight_lbs'), // from Apple Health / manual
  restingHeartRate: integer('resting_heart_rate'), // bpm from Apple Health
  caffeineMg: integer('caffeine_mg'), // mg from Apple Health
  workoutMinutes: integer('workout_minutes'), // active workout time in minutes
  person: text('person', { enum: ['me', 'wife'] }).notNull(),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const haircuts = sqliteTable('haircuts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(), // ISO date
  location: text('location').notNull(), // barber shop name
  barberName: text('barber_name'), // optional barber name
  price: real('price').notNull(),
  tip: real('tip').default(0),
  style: text('style'), // e.g. "low fade", "mid fade + lineup"
  notes: text('notes'),
  photo: text('photo'), // base64 data URL of the haircut result
  rating: integer('rating'), // 1-5 how happy with the cut
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const hairHealthLog = sqliteTable('hair_health_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(), // ISO date
  photo: text('photo'), // base64 data URL — front, top, sides, etc.
  photoAngle: text('photo_angle', { enum: ['front', 'top', 'left_side', 'right_side', 'back', 'close_up', 'other'] }).default('front'),
  category: text('category', { enum: ['general', 'receding', 'thinning', 'white_hair', 'bald_spot', 'growth', 'treatment'] }).notNull(),
  severity: integer('severity'), // 1-5 scale (1=minimal, 5=significant)
  notes: text('notes'), // "found 3 white hairs near temple", "stress bald spot getting smaller", etc.
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const hairInspo = sqliteTable('hair_inspo', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  photo: text('photo').notNull(), // base64 data URL
  title: text('title'), // e.g. "Low fade + textured top"
  tags: text('tags'), // JSON array of strings, e.g. ["fade", "short", "textured"]
  source: text('source'), // "Instagram", "Pinterest", URL, etc.
  notes: text('notes'), // "show barber this angle", "ask for #2 on sides"
  favorite: integer('favorite', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// ==================== DENTAL / TEETH ====================

export const dentalProducts = sqliteTable('dental_products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(), // e.g. "Oral-B iO Series 15"
  brand: text('brand').notNull(), // e.g. "Oral-B"
  category: text('category', {
    enum: ['toothbrush', 'toothpaste', 'water_flosser', 'floss_pick', 'whitener', 'mouthwash', 'other'],
  }).notNull(),
  model: text('model'), // e.g. "iO Series 15"
  price: real('price'), // purchase price
  purchaseDate: text('purchase_date'), // ISO date
  replacementFrequencyDays: integer('replacement_frequency_days'), // e.g. 90 for brush heads
  notes: text('notes'),
  active: integer('active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const dentalLog = sqliteTable('dental_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(), // ISO date
  time: text('time').notNull(), // HH:MM
  activity: text('activity', {
    enum: ['brush', 'water_flosser', 'floss_pick', 'whitener', 'mouthwash'],
  }).notNull(),
  duration: integer('duration'), // seconds
  productId: integer('product_id').references(() => dentalProducts.id),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const dentalCheckups = sqliteTable('dental_checkups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(), // ISO date
  dentistName: text('dentist_name'),
  location: text('location'),
  type: text('type', { enum: ['cleaning', 'exam', 'procedure', 'emergency', 'other'] }).notNull(),
  cost: real('cost'),
  insuranceCovered: real('insurance_covered'),
  notes: text('notes'),
  nextAppointment: text('next_appointment'), // ISO date
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const gumHealthLog = sqliteTable('gum_health_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(), // ISO date
  checkupId: integer('checkup_id').references(() => dentalCheckups.id),
  // Pocket depth measurements stored as JSON: { "1": [3,2,3], "2": [2,2,3], ... }
  // Keys = tooth numbers (1-32), values = array of probing depths (up to 6 sites per tooth)
  measurements: text('measurements'), // JSON
  overallScore: integer('overall_score'), // 1-5 (1=excellent, 5=severe disease)
  bleedingOnProbing: integer('bleeding_on_probing', { mode: 'boolean' }).default(false),
  recession: text('recession'), // JSON: { "tooth#": mm } notable recession areas
  notes: text('notes'), // "dentist said gums improving", "bleeding at #14, #15"
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const dentalDocuments = sqliteTable('dental_documents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  checkupId: integer('checkup_id').references(() => dentalCheckups.id, { onDelete: 'set null' }),
  date: text('date').notNull(), // ISO date
  name: text('name').notNull(), // "X-ray results", "Treatment plan"
  fileType: text('file_type').notNull(), // "pdf", "image/jpeg", etc
  fileData: text('file_data').notNull(), // base64 data URL
  fileSize: integer('file_size'), // bytes
  category: text('category', {
    enum: ['xray', 'treatment_plan', 'invoice', 'insurance', 'lab_results', 'referral', 'other'],
  }).default('other'),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const dentalContacts = sqliteTable('dental_contacts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(), // office name
  type: text('type', {
    enum: ['general', 'orthodontist', 'oral_surgeon', 'periodontist', 'endodontist', 'pediatric', 'cosmetic'],
  }).notNull(),
  address: text('address'),
  phone: text('phone'),
  website: text('website'),
  doctors: text('doctors'), // JSON array of doctor names
  insurance: text('insurance'), // accepted insurance plans
  notes: text('notes'),
  favorite: integer('favorite', { mode: 'boolean' }).default(false),
  lastVisited: text('last_visited'), // ISO date
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// ==================== PETS / VET ====================

export const dogs = sqliteTable('dogs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  breed: text('breed'),
  sex: text('sex', { enum: ['male', 'female'] }),
  dob: text('dob'), // ISO date
  weight: real('weight'), // lbs
  photo: text('photo'), // base64 data URL
  spayed: integer('spayed', { mode: 'boolean' }).default(false), // spayed/neutered
  spayDate: text('spay_date'), // ISO date
  akcCert: text('akc_cert'), // AKC registration number or note
  microchipId: text('microchip_id'),
  rabiesVaccineDate: text('rabies_vaccine_date'), // ISO date of last rabies shot
  rabiesVaccineDue: text('rabies_vaccine_due'), // ISO date when next due
  rabiesVetName: text('rabies_vet_name'), // vet who administered
  rabiesVetContact: text('rabies_vet_contact'), // vet phone/address
  rabiesLotNumber: text('rabies_lot_number'), // vaccine lot #
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const bloodwork = sqliteTable('bloodwork', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  dogId: integer('dog_id').notNull().references(() => dogs.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), // ISO date
  vetName: text('vet_name'),
  orderId: text('order_id'), // IDEXX order #, etc.
  testName: text('test_name').notNull(), // "CBC", "Comprehensive Panel", etc.
  results: text('results'), // JSON object of { marker: { value, unit, range, flag } }
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const vetVisits = sqliteTable('vet_visits', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  dogId: integer('dog_id').notNull().references(() => dogs.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), // ISO date
  vetName: text('vet_name'),
  location: text('location'),
  type: text('type', { enum: ['checkup', 'vaccination', 'dental', 'procedure', 'emergency', 'grooming', 'other'] }).notNull(),
  procedures: text('procedures'), // JSON array of strings — e.g. ["teeth extraction x3", "blood work"]
  teethExtracted: integer('teeth_extracted'), // number of teeth extracted if dental
  cost: real('cost'),
  insuranceCovered: real('insurance_covered'),
  receipt: text('receipt'), // base64 data URL of receipt image/PDF
  lineItems: text('line_items'), // JSON array of { description: string, amount: number }
  medications: text('medications'), // JSON array — prescribed meds
  recommendations: text('recommendations'), // vet's advice
  nextAppointment: text('next_appointment'), // ISO date
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const vetContacts = sqliteTable('vet_contacts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type', { enum: ['vet', 'groomer', 'specialist', 'emergency'] }).notNull(),
  address: text('address'),
  phone: text('phone'),
  website: text('website'),
  doctors: text('doctors'), // JSON array of doctor names
  notes: text('notes'),
  favorite: integer('favorite', { mode: 'boolean' }).default(false),
  lastVisited: text('last_visited'), // ISO date
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// ==================== DATE NIGHTS ====================

export const dateNights = sqliteTable('date_nights', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(), // e.g. "Sushi & Movie Night"
  date: text('date'), // ISO date — planned date
  time: text('time'), // HH:MM
  location: text('location'), // restaurant, venue, etc.
  category: text('category', { enum: ['dinner', 'movie', 'activity', 'outdoor', 'home', 'travel', 'event', 'other'] }).notNull(),
  description: text('description'), // what are we doing?
  estimatedCost: real('estimated_cost'),
  actualCost: real('actual_cost'),
  deals: text('deals'), // coupons, groupon, happy hour, etc.
  reservationInfo: text('reservation_info'), // confirmation #, time, party size
  status: text('status', { enum: ['idea', 'planned', 'booked', 'completed', 'cancelled'] }).default('idea'),
  rating: integer('rating'), // 1-5 after completing
  distance: real('distance'), // miles from home
  photos: text('photos'), // JSON array of base64 data URLs
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const dateItineraryItems = sqliteTable('date_itinerary_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  dateNightId: integer('date_night_id').notNull().references(() => dateNights.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),
  type: text('type', {
    enum: ['flight', 'car_rental', 'hotel', 'restaurant', 'activity', 'show', 'bar', 'spa', 'shopping', 'transport', 'checkout', 'other'],
  }).notNull(),
  title: text('title').notNull(), // "Spirit Airlines to LAX"
  date: text('date'), // ISO date — for multi-day itineraries
  startTime: text('start_time'), // HH:MM
  endTime: text('end_time'), // HH:MM
  location: text('location'), // address or venue
  provider: text('provider'), // airline, hotel chain, rental company
  confirmationNumber: text('confirmation_number'),
  cost: real('cost'),
  details: text('details'), // JSON for type-specific data
  notes: text('notes'),
  status: text('status', { enum: ['pending', 'confirmed', 'completed', 'cancelled'] }).default('pending'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// ==================== HAPPY HOUR DEALS ====================

export const happyHourDeals = sqliteTable('happy_hour_deals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  restaurant: text('restaurant').notNull(),
  address: text('address'),
  distance: real('distance'), // miles from home
  dayOfWeek: text('day_of_week'), // "Mon-Fri", "Tue,Thu", "Everyday", etc.
  startTime: text('start_time'), // "15:00"
  endTime: text('end_time'), // "18:00"
  deals: text('deals').notNull(), // what's on special
  drinkSpecials: text('drink_specials'),
  foodSpecials: text('food_specials'),
  rating: integer('rating'), // 1-5
  favorite: integer('favorite', { mode: 'boolean' }).default(false),
  website: text('website'),
  phone: text('phone'),
  notes: text('notes'),
  lastVisited: text('last_visited'), // ISO date
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// ==================== EXERCISE / REHAB ====================

export const exercises = sqliteTable('exercises', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(), // e.g. "Cat-Cow Stretch"
  category: text('category', {
    enum: ['pilates', 'yoga', 'stretch', 'strength', 'mobility', 'posture', 'breathing', 'other'],
  }).notNull(),
  targetArea: text('target_area', {
    enum: ['neck', 'upper_back', 'lower_back', 'shoulders', 'full_spine', 'core', 'hips', 'full_body', 'other'],
  }).notNull(),
  purpose: text('purpose'), // "restore cervical lordosis", "decompress lumbar spine", etc.
  instructions: text('instructions'), // step-by-step how to do it
  duration: text('duration'), // "30 seconds", "10 reps x 3 sets"
  difficulty: text('difficulty', { enum: ['beginner', 'intermediate', 'advanced'] }).default('beginner'),
  videoUrl: text('video_url'), // YouTube or reference link
  photo: text('photo'), // base64 data URL of form
  notes: text('notes'),
  favorite: integer('favorite', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const exerciseLog = sqliteTable('exercise_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(), // ISO date
  exerciseId: integer('exercise_id').references(() => exercises.id, { onDelete: 'set null' }),
  customName: text('custom_name'), // if not from exercise library
  category: text('category'), // duplicate for quick display when exercise deleted
  targetArea: text('target_area'),
  duration: integer('duration'), // actual seconds spent
  sets: integer('sets'),
  reps: integer('reps'),
  painBefore: integer('pain_before'), // 1-10 scale
  painAfter: integer('pain_after'), // 1-10 scale
  feltGood: integer('felt_good', { mode: 'boolean' }).default(false),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const painLog = sqliteTable('pain_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(), // ISO date
  time: text('time'), // HH:MM
  area: text('area', {
    enum: ['neck', 'upper_back', 'lower_back', 'shoulders', 'left_shoulder', 'right_shoulder', 'hips', 'other'],
  }).notNull(),
  severity: integer('severity').notNull(), // 1-10
  type: text('type', { enum: ['ache', 'sharp', 'stiffness', 'burning', 'radiating', 'tingling', 'other'] }),
  trigger: text('trigger'), // "sitting too long", "slept wrong", "after workout"
  relief: text('relief'), // "stretching", "heat pad", "ibuprofen"
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const medicalRecords = sqliteTable('medical_records', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(), // ISO date
  type: text('type', { enum: ['mri', 'xray', 'ct_scan', 'report', 'referral', 'other'] }).notNull(),
  title: text('title').notNull(), // "Cervical MRI", "Lumbar X-Ray"
  provider: text('provider'), // doctor/facility
  findings: text('findings'), // summary of results
  file: text('file'), // base64 data URL (PDF or image)
  fileName: text('file_name'),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// ==================== REP COUNTERS (Pushups, Pull-ups, etc.) ====================

export const repCounters = sqliteTable('rep_counters', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(), // ISO date
  time: text('time'), // HH:MM
  exerciseType: text('exercise_type', { enum: ['pushups', 'pullups'] }).notNull(),
  reps: integer('reps').notNull(),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// ==================== USER SETTINGS ====================

export const userSettings = sqliteTable('user_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // Profile
  name: text('name').default('Rene'),
  dob: text('dob').default('1993-03-14'),
  heightIn: integer('height_in').default(69),    // 5'9"
  weightLbs: real('weight_lbs').default(150),
  sex: text('sex', { enum: ['male', 'female'] }).default('male'),
  // Macro targets
  caloriesTarget: integer('calories_target').default(2000),
  proteinTarget: integer('protein_target').default(150),
  carbsTarget: integer('carbs_target').default(200),
  fatTarget: integer('fat_target').default(65),
  fiberTarget: integer('fiber_target').default(30),
  sugarTarget: integer('sugar_target').default(50),
  // Micro targets (optimal levels)
  vitaminATarget: real('vitamin_a_target').default(900),
  vitaminCTarget: real('vitamin_c_target').default(500),
  vitaminDTarget: real('vitamin_d_target').default(50),
  vitaminB12Target: real('vitamin_b12_target').default(10),
  ironTarget: real('iron_target').default(8),
  zincTarget: real('zinc_target').default(15),
  calciumTarget: real('calcium_target').default(1000),
  magnesiumTarget: real('magnesium_target').default(500),
  potassiumTarget: real('potassium_target').default(4700),
  // Cost comparison
  fastFoodWeeklyBaseline: integer('fast_food_weekly_baseline').default(350),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// ==================== SMOKING TRACKER ====================

export const smokingLog = sqliteTable('smoking_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(), // ISO date
  time: text('time'), // HH:MM
  type: text('type', { enum: ['hookah', 'cannabis'] }).notNull(),
  // Cannabis-specific
  strainId: integer('strain_id').references(() => strains.id, { onDelete: 'set null' }),
  feeling: text('feeling'), // how it made you feel — free text
  // General
  duration: integer('duration').default(60), // minutes — hookah defaults 60
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const strains = sqliteTable('strains', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(), // "Blue Dream", "GG4", etc.
  brand: text('brand'), // dispensary or grower brand
  type: text('type', { enum: ['indica', 'sativa', 'hybrid', 'other'] }),
  thcContent: text('thc_content'), // "23%"
  terpenes: text('terpenes'), // JSON: [{ name: string, amount: string }] e.g. [{ name: "Limonene", amount: "11.47 mg/g" }]
  price: real('price'), // what you paid
  rating: integer('rating'), // 1–5 stars
  notes: text('notes'),
  favorite: integer('favorite', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// ==================== SKIN TRACKER ====================

export const skinSettings = sqliteTable('skin_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  startDate: text('start_date').notNull(),
  longestStreak: integer('longest_streak').default(0),
});

export const skinDayLogs = sqliteTable('skin_day_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull().unique(),
  logData: text('log_data').notNull(), // JSON-serialized DayLog
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

export const skinProducts = sqliteTable('skin_products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  localId: text('local_id'), // for migration from localStorage
  name: text('name').notNull(),
  brand: text('brand').notNull().default(''),
  type: text('type').notNull().default('other'),
  whenToUse: text('when_to_use').notNull().default('morning'),
  instructions: text('instructions').notNull().default(''),
  ingredients: text('ingredients'),
  active: integer('active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const skinProductUsage = sqliteTable('skin_product_usage', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').references(() => skinProducts.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  time: text('time').notNull().default('morning'),
  notes: text('notes').default(''),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export type SkinSettingsRow = typeof skinSettings.$inferSelect;
export type SkinDayLogRow = typeof skinDayLogs.$inferSelect;
export type SkinProductRow = typeof skinProducts.$inferSelect;
export type SkinProductUsageRow = typeof skinProductUsage.$inferSelect;

// Type exports
export type SmokingLogEntry = typeof smokingLog.$inferSelect;
export type NewSmokingLogEntry = typeof smokingLog.$inferInsert;
export type Strain = typeof strains.$inferSelect;
export type NewStrain = typeof strains.$inferInsert;
export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;
export type ExerciseLogEntry = typeof exerciseLog.$inferSelect;
export type NewExerciseLogEntry = typeof exerciseLog.$inferInsert;
export type PainLogEntry = typeof painLog.$inferSelect;
export type NewPainLogEntry = typeof painLog.$inferInsert;
export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type NewMedicalRecord = typeof medicalRecords.$inferInsert;
export type RepCounter = typeof repCounters.$inferSelect;
export type NewRepCounter = typeof repCounters.$inferInsert;
export type Dog = typeof dogs.$inferSelect;
export type NewDog = typeof dogs.$inferInsert;
export type VetVisit = typeof vetVisits.$inferSelect;
export type NewVetVisit = typeof vetVisits.$inferInsert;
export type Bloodwork = typeof bloodwork.$inferSelect;
export type NewBloodwork = typeof bloodwork.$inferInsert;
export type DateNight = typeof dateNights.$inferSelect;
export type NewDateNight = typeof dateNights.$inferInsert;
export type DateItineraryItem = typeof dateItineraryItems.$inferSelect;
export type NewDateItineraryItem = typeof dateItineraryItems.$inferInsert;
export type HappyHourDeal = typeof happyHourDeals.$inferSelect;
export type NewHappyHourDeal = typeof happyHourDeals.$inferInsert;
export type DentalProduct = typeof dentalProducts.$inferSelect;
export type NewDentalProduct = typeof dentalProducts.$inferInsert;
export type DentalLogEntry = typeof dentalLog.$inferSelect;
export type NewDentalLogEntry = typeof dentalLog.$inferInsert;
export type DentalCheckup = typeof dentalCheckups.$inferSelect;
export type NewDentalCheckup = typeof dentalCheckups.$inferInsert;
export type GumHealthEntry = typeof gumHealthLog.$inferSelect;
export type NewGumHealthEntry = typeof gumHealthLog.$inferInsert;
export type DentalDocument = typeof dentalDocuments.$inferSelect;
export type NewDentalDocument = typeof dentalDocuments.$inferInsert;
export type DentalContact = typeof dentalContacts.$inferSelect;
export type NewDentalContact = typeof dentalContacts.$inferInsert;
export type HairInspo = typeof hairInspo.$inferSelect;
export type NewHairInspo = typeof hairInspo.$inferInsert;
export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;
export type Ingredient = typeof ingredients.$inferSelect;
export type NewIngredient = typeof ingredients.$inferInsert;
export type RecipeIngredient = typeof recipeIngredients.$inferSelect;
export type MealLogEntry = typeof mealLog.$inferSelect;
export type PrepSession = typeof prepSessions.$inferSelect;
export type FreezerItem = typeof freezerInventory.$inferSelect;
export type GroceryList = typeof groceryLists.$inferSelect;
export type GroceryItem = typeof groceryItems.$inferSelect;
export type PriceHistoryEntry = typeof priceHistory.$inferSelect;
export type NewPriceHistoryEntry = typeof priceHistory.$inferInsert;
export type Supplement = typeof supplements.$inferSelect;
export type NewSupplement = typeof supplements.$inferInsert;
export type SupplementLogEntry = typeof supplementLog.$inferSelect;
export type NewSupplementLogEntry = typeof supplementLog.$inferInsert;
export type DailyLog = typeof dailyLog.$inferSelect;
export type NewDailyLog = typeof dailyLog.$inferInsert;
export type Haircut = typeof haircuts.$inferSelect;
export type NewHaircut = typeof haircuts.$inferInsert;
export type HairHealthEntry = typeof hairHealthLog.$inferSelect;
export type NewHairHealthEntry = typeof hairHealthLog.$inferInsert;
export type VetContact = typeof vetContacts.$inferSelect;
export type NewVetContact = typeof vetContacts.$inferInsert;

// ── Sleep ────────────────────────────────────────────────────────────────────
export const sleepLog = sqliteTable('sleep_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),           // ISO date — the morning you woke up
  bedtime: text('bedtime'),               // HH:MM
  wakeTime: text('wake_time'),            // HH:MM
  totalSleep: integer('total_sleep'),     // minutes
  score: integer('score'),               // 0–100 Oura sleep score
  efficiency: integer('efficiency'),     // % time in bed asleep
  latency: integer('latency'),           // minutes to fall asleep
  remSleep: integer('rem_sleep'),        // minutes
  deepSleep: integer('deep_sleep'),      // minutes
  lightSleep: integer('light_sleep'),    // minutes
  awakeDuration: integer('awake_duration'), // minutes
  restfulness: integer('restfulness'),   // 0–100
  hrv: integer('hrv'),                   // ms (average during sleep)
  restingHeartRate: integer('resting_heart_rate'), // bpm
  tempDeviation: real('temp_deviation'), // °C from baseline
  respiratoryRate: real('respiratory_rate'), // breaths/min
  spo2: integer('spo2'),                 // % blood oxygen
  sleepPhases: text('sleep_phases'),     // Oura sleep_phase_5_min string e.g. "44332211..."
  awakenCount: integer('awaken_count'),  // transitions TO awake (stage 1) from non-awake
  notes: text('notes'),
  source: text('source').default('manual'), // 'manual' | 'oura'
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export type SleepLog = typeof sleepLog.$inferSelect;
export type NewSleepLog = typeof sleepLog.$inferInsert;

// ── Oura Daily (readiness + stress + activity — separate from sleep sessions) ─
export const ouraDaily = sqliteTable('oura_daily', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull().unique(), // YYYY-MM-DD
  readinessScore: integer('readiness_score'),
  readinessContributors: text('readiness_contributors'), // JSON string
  stressScore: integer('stress_score'),
  stressHigh: integer('stress_high'), // minutes of high stress
  stressRecovery: integer('stress_recovery'), // minutes of recovery
  activityScore: integer('activity_score'),
  timestamp: integer('timestamp', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export type OuraDaily = typeof ouraDaily.$inferSelect;
export type NewOuraDaily = typeof ouraDaily.$inferInsert;
