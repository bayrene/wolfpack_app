import { getMealsForDateRange } from '@/db/queries/meals';
import { getRecipeById } from '@/db/queries/recipes';
import { getDailyLogsForRange } from '@/db/queries/daily-log';
import { NutritionClient } from '@/components/nutrition/nutrition-client';
import { todayISO } from '@/lib/utils';
import { DEFAULT_TARGETS, FAST_FOOD_WEEKLY_BASELINE, MICRO_TARGETS } from '@/lib/constants';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';

export const dynamic = 'force-dynamic';

interface DayData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  vitaminA: number;
  vitaminC: number;
  vitaminD: number;
  vitaminB12: number;
  iron: number;
  zinc: number;
  calcium: number;
  magnesium: number;
  potassium: number;
  meals: { name: string; mealType: string; calories: number; protein: number; carbs: number; fat: number; servings: number }[];
  waterOz: number;
}

export default async function NutritionPage() {
  const today = todayISO();
  const now = new Date();

  // Get past 30 days of meals
  const thirtyDaysAgo = format(subDays(now, 30), 'yyyy-MM-dd');
  const allMeals = await getMealsForDateRange(thirtyDaysAgo, today);

  // Calculate per-day nutrition for "me"
  const dayMap = new Map<string, DayData>();

  for (const { meal, recipe } of allMeals) {
    if (meal.person !== 'me') continue;

    const day = meal.date;
    if (!dayMap.has(day)) {
      dayMap.set(day, { date: day, calories: 0, protein: 0, carbs: 0, fat: 0, vitaminA: 0, vitaminC: 0, vitaminD: 0, vitaminB12: 0, iron: 0, zinc: 0, calcium: 0, magnesium: 0, potassium: 0, meals: [], waterOz: 0 });
    }
    const dd = dayMap.get(day)!;

    let cal = 0, pro = 0, carb = 0, fat = 0;
    let mVitA = 0, mVitC = 0, mVitD = 0, mVitB12 = 0;
    let mIron = 0, mZinc = 0, mCalcium = 0, mMagnesium = 0, mPotassium = 0;
    const servings = meal.servingsConsumed ?? 1;

    if (meal.customCalories != null) {
      cal = meal.customCalories * servings;
      pro = (meal.customProtein ?? 0) * servings;
      carb = (meal.customCarbs ?? 0) * servings;
      fat = (meal.customFat ?? 0) * servings;
    } else if (recipe) {
      const detail = await getRecipeById(recipe.id);
      if (detail) {
        let tc = 0, tp = 0, tca = 0, tf = 0;
        let tVitA = 0, tVitC = 0, tVitD = 0, tVitB12 = 0;
        let tIron = 0, tZinc = 0, tCalcium = 0, tMagnesium = 0, tPotassium = 0;
        for (const ri of detail.ingredients) {
          tc += ri.ingredient.caloriesPerUnit * ri.amount;
          tp += ri.ingredient.proteinPerUnit * ri.amount;
          tca += ri.ingredient.carbsPerUnit * ri.amount;
          tf += ri.ingredient.fatPerUnit * ri.amount;
          tVitA += (ri.ingredient.vitaminAPerUnit ?? 0) * ri.amount;
          tVitC += (ri.ingredient.vitaminCPerUnit ?? 0) * ri.amount;
          tVitD += (ri.ingredient.vitaminDPerUnit ?? 0) * ri.amount;
          tVitB12 += (ri.ingredient.vitaminB12PerUnit ?? 0) * ri.amount;
          tIron += (ri.ingredient.ironPerUnit ?? 0) * ri.amount;
          tZinc += (ri.ingredient.zincPerUnit ?? 0) * ri.amount;
          tCalcium += (ri.ingredient.calciumPerUnit ?? 0) * ri.amount;
          tMagnesium += (ri.ingredient.magnesiumPerUnit ?? 0) * ri.amount;
          tPotassium += (ri.ingredient.potassiumPerUnit ?? 0) * ri.amount;
        }
        const rs = recipe.servings ?? 1;
        cal = (tc / rs) * servings;
        pro = (tp / rs) * servings;
        carb = (tca / rs) * servings;
        fat = (tf / rs) * servings;
        mVitA = (tVitA / rs) * servings;
        mVitC = (tVitC / rs) * servings;
        mVitD = (tVitD / rs) * servings;
        mVitB12 = (tVitB12 / rs) * servings;
        mIron = (tIron / rs) * servings;
        mZinc = (tZinc / rs) * servings;
        mCalcium = (tCalcium / rs) * servings;
        mMagnesium = (tMagnesium / rs) * servings;
        mPotassium = (tPotassium / rs) * servings;
      }
    }

    dd.calories += Math.round(cal);
    dd.protein += Math.round(pro);
    dd.carbs += Math.round(carb);
    dd.fat += Math.round(fat);
    dd.vitaminA += Math.round(mVitA * 10) / 10;
    dd.vitaminC += Math.round(mVitC * 10) / 10;
    dd.vitaminD += Math.round(mVitD * 10) / 10;
    dd.vitaminB12 += Math.round(mVitB12 * 10) / 10;
    dd.iron += Math.round(mIron * 10) / 10;
    dd.zinc += Math.round(mZinc * 10) / 10;
    dd.calcium += Math.round(mCalcium);
    dd.magnesium += Math.round(mMagnesium);
    dd.potassium += Math.round(mPotassium);
    dd.meals.push({
      name: recipe?.name ?? meal.customName ?? 'Unknown',
      mealType: meal.mealType,
      calories: Math.round(cal),
      protein: Math.round(pro),
      carbs: Math.round(carb),
      fat: Math.round(fat),
      servings: meal.servingsConsumed ?? 1,
    });
  }

  // Merge water data from daily logs
  const waterLogs = await getDailyLogsForRange(thirtyDaysAgo, today, 'me');
  for (const log of waterLogs) {
    const dd = dayMap.get(log.date);
    if (dd) {
      dd.waterOz = log.waterOz ?? 0;
    } else {
      dayMap.set(log.date, {
        date: log.date, calories: 0, protein: 0, carbs: 0, fat: 0,
        vitaminA: 0, vitaminC: 0, vitaminD: 0, vitaminB12: 0,
        iron: 0, zinc: 0, calcium: 0, magnesium: 0, potassium: 0,
        meals: [], waterOz: log.waterOz ?? 0,
      });
    }
  }

  const dailyData = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <NutritionClient
      today={today}
      dailyData={dailyData}
      targets={DEFAULT_TARGETS}
      microTargets={MICRO_TARGETS}
      fastFoodBaseline={FAST_FOOD_WEEKLY_BASELINE}
    />
  );
}
