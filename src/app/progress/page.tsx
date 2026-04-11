import { getMealsForDateRange } from '@/db/queries/meals';
import { getRecipeById } from '@/db/queries/recipes';
import { getDailyLogsForRange } from '@/db/queries/daily-log';
import { getSupplementLogsForRange, getActiveSupplements } from '@/db/queries/supplements';
import { getSleepHistory } from '@/db/queries/oura';
import { ProgressClient } from '@/components/progress/progress-client';
import { todayISO } from '@/lib/utils';
import { DEFAULT_TARGETS, MICRO_TARGETS, STEPS_TARGET } from '@/lib/constants';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';

export const dynamic = 'force-dynamic';

interface DayNutrition {
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
}

async function computeDailyNutrition(startDate: string, endDate: string): Promise<DayNutrition[]> {
  const allMeals = await getMealsForDateRange(startDate, endDate);
  const dayMap = new Map<string, DayNutrition>();

  for (const { meal, recipe } of allMeals) {
    if (meal.person !== 'me') continue;
    const day = meal.date;
    if (!dayMap.has(day)) {
      dayMap.set(day, {
        date: day, calories: 0, protein: 0, carbs: 0, fat: 0,
        vitaminA: 0, vitaminC: 0, vitaminD: 0, vitaminB12: 0,
        iron: 0, zinc: 0, calcium: 0, magnesium: 0, potassium: 0,
      });
    }
    const dd = dayMap.get(day)!;
    const servings = meal.servingsConsumed ?? 1;

    let cal = 0, pro = 0, carb = 0, fat = 0;
    let mVitA = 0, mVitC = 0, mVitD = 0, mVitB12 = 0;
    let mIron = 0, mZinc = 0, mCalcium = 0, mMagnesium = 0, mPotassium = 0;

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
  }

  return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export default async function ProgressPage({ searchParams }: { searchParams: Promise<{ view?: string; start?: string; end?: string }> }) {
  const params = await searchParams;
  const today = todayISO();
  const now = new Date();

  // Determine view and date range
  const view: 'week' | 'month' = params.view === 'month' ? 'month' : 'week';

  let periodStart: string;
  let periodEnd: string;

  if (params.start && params.end) {
    periodStart = params.start;
    periodEnd = params.end;
  } else if (view === 'month') {
    periodStart = format(startOfMonth(now), 'yyyy-MM-dd');
    periodEnd = format(endOfMonth(now), 'yyyy-MM-dd');
  } else {
    periodStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    periodEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  }

  // Clamp periodEnd to today so we don't query future data
  const clampedEnd = periodEnd > today ? today : periodEnd;
  const totalDays = differenceInDays(parseISO(clampedEnd), parseISO(periodStart)) + 1;

  // Weight history: 365 days for the weight trend card
  const oneYearAgo = format(new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

  const [
    nutritionDaily,
    stepsDaily,
    suppLogs,
    activeSupplements,
    weightHistory,
    sleepHistory,
  ] = await Promise.all([
    computeDailyNutrition(periodStart, clampedEnd),
    getDailyLogsForRange(periodStart, clampedEnd, 'me'),
    getSupplementLogsForRange(periodStart, clampedEnd),
    getActiveSupplements(),
    getDailyLogsForRange(oneYearAgo, today, 'me'),
    getSleepHistory(periodStart, clampedEnd),
  ]);

  // Compute macro averages
  const avgMacros = (data: DayNutrition[]) => {
    if (data.length === 0) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const sum = data.reduce((acc, d) => ({
      calories: acc.calories + d.calories,
      protein: acc.protein + d.protein,
      carbs: acc.carbs + d.carbs,
      fat: acc.fat + d.fat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    return {
      calories: Math.round(sum.calories / data.length),
      protein: Math.round(sum.protein / data.length),
      carbs: Math.round(sum.carbs / data.length),
      fat: Math.round(sum.fat / data.length),
    };
  };

  // Compute micro averages
  const avgMicros = (data: DayNutrition[]) => {
    if (data.length === 0) return { vitaminA: 0, vitaminC: 0, vitaminD: 0, vitaminB12: 0, iron: 0, zinc: 0, calcium: 0, magnesium: 0, potassium: 0 };
    const keys = ['vitaminA', 'vitaminC', 'vitaminD', 'vitaminB12', 'iron', 'zinc', 'calcium', 'magnesium', 'potassium'] as const;
    const result: Record<string, number> = {};
    for (const key of keys) {
      const sum = data.reduce((acc, d) => acc + d[key], 0);
      result[key] = Math.round((sum / data.length) * 10) / 10;
    }
    return result as { vitaminA: number; vitaminC: number; vitaminD: number; vitaminB12: number; iron: number; zinc: number; calcium: number; magnesium: number; potassium: number };
  };

  // Steps stats
  const computeStepsStats = (logs: typeof stepsDaily) => {
    if (logs.length === 0) return { avgSteps: 0, totalSteps: 0, bestDay: 0, daysAbove10k: 0 };
    const stepsArr = logs.map(l => l.steps ?? 0);
    return {
      avgSteps: Math.round(stepsArr.reduce((a, b) => a + b, 0) / stepsArr.length),
      totalSteps: stepsArr.reduce((a, b) => a + b, 0),
      bestDay: Math.max(...stepsArr),
      daysAbove10k: stepsArr.filter(s => s >= STEPS_TARGET).length,
    };
  };

  // Supplement adherence
  const computeSuppAdherence = (logs: typeof suppLogs, days: number) => {
    return activeSupplements.map(supp => {
      const suppEntries = logs.filter(l => l.log.supplementId === supp.id);
      const uniqueDays = new Set(suppEntries.map(l => l.log.date)).size;
      const sideEffects = suppEntries
        .filter(l => l.log.sideEffects)
        .map(l => l.log.sideEffects!);
      const ratings = suppEntries
        .filter(l => l.log.effectivenessRating != null)
        .map(l => l.log.effectivenessRating!);
      const avgRating = ratings.length > 0 ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : 0;
      return {
        id: supp.id,
        name: supp.name,
        brand: supp.brand,
        daysTaken: uniqueDays,
        totalDays: days,
        adherencePercent: Math.round((uniqueDays / days) * 100),
        sideEffects,
        avgRating,
      };
    });
  };

  // Steps daily data for chart
  const stepsChartData = stepsDaily
    .map(l => ({ date: l.date, steps: l.steps ?? 0 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Water & coffee averages
  const waterCoffeeAvg = (() => {
    const logs = stepsDaily.filter(l => (l.waterOz ?? 0) > 0 || (l.coffee ?? 0) > 0);
    if (logs.length === 0) return { avgWater: 0, avgCoffee: 0 };
    return {
      avgWater: Math.round(logs.reduce((s, l) => s + (l.waterOz ?? 0), 0) / totalDays),
      avgCoffee: Math.round((logs.reduce((s, l) => s + (l.coffee ?? 0), 0) / totalDays) * 10) / 10,
    };
  })();

  return (
    <ProgressClient
      view={view}
      periodStart={periodStart}
      periodEnd={periodEnd}
      macroAvg={avgMacros(nutritionDaily)}
      microAvg={avgMicros(nutritionDaily)}
      nutritionDaily={nutritionDaily}
      stepsStats={computeStepsStats(stepsDaily)}
      stepsChart={stepsChartData}
      suppAdherence={computeSuppAdherence(suppLogs, totalDays)}
      targets={DEFAULT_TARGETS}
      microTargets={MICRO_TARGETS}
      stepsTarget={STEPS_TARGET}
      weightHistory={weightHistory}
      sleepHistory={sleepHistory}
      avgWaterOz={waterCoffeeAvg.avgWater}
      avgCoffeeCups={waterCoffeeAvg.avgCoffee}
    />
  );
}
