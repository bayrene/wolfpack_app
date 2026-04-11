import { getMealsForDate, getWeeklySpending } from '@/db/queries/meals';
import { getFreezerInventory } from '@/db/queries/freezer';
import { getAllRecipes, getRecipesByIds } from '@/db/queries/recipes';
import { getDailyLog, getDailyLogsForRange } from '@/db/queries/daily-log';
import { getSupplementLogs, getActiveSupplements } from '@/db/queries/supplements';
import { getUserSettings } from '@/db/queries/user-settings';
import { getLatestSleepLog } from '@/db/queries/sleep';
import { getOuraDaily, getOuraHistory, getSleepLog, getSleepHistory } from '@/db/queries/oura';
import { getDentalLogsForDate } from '@/db/queries/dental';
import { todayISO, daysUntil } from '@/lib/utils';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { startOfWeek, endOfWeek, format, isWeekend } from 'date-fns';
import { db } from '@/db';
import { vetVisits, dentalCheckups } from '@/db/schema';
import { desc, gt } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export interface UpcomingEvent {
  label: string;
  date: string;
  daysUntil: number;
  type: 'vet' | 'dental' | 'other';
  href: string;
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const params = await searchParams;
  const today = todayISO();
  const selectedDate = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : today;
  const now = new Date();
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const selectedDateObj = new Date(selectedDate + 'T00:00:00');
  const thirtyDaysAgo = format(new Date(selectedDateObj.getTime() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

  const [todayMeals, freezerItems, allRecipes, weeklySpend, todayStepsLog, todaySupplements, activeSupplements, settings, latestSleep, stepsHistory, ouraToday, sleepToday, ouraHistory, sleepHistory, dentalToday] = await Promise.all([
    getMealsForDate(selectedDate),
    getFreezerInventory(),
    getAllRecipes(),
    getWeeklySpending(weekStart, weekEnd),
    getDailyLog(selectedDate, 'me'),
    getSupplementLogs(selectedDate),
    getActiveSupplements(),
    getUserSettings(),
    getLatestSleepLog(),
    getDailyLogsForRange(thirtyDaysAgo, selectedDate, 'me'),
    getOuraDaily(selectedDate),
    getSleepLog(selectedDate),
    getOuraHistory(thirtyDaysAgo, selectedDate),
    getSleepHistory(thirtyDaysAgo, selectedDate),
    getDentalLogsForDate(selectedDate),
  ]);

  const todaySteps = todayStepsLog?.steps ?? 0;
  const todayWater = todayStepsLog?.waterOz ?? 0;
  const todayCoffee = todayStepsLog?.coffee ?? 0;

  // Build targets from DB settings
  const targets = {
    calories: settings.caloriesTarget ?? 2000,
    protein: settings.proteinTarget ?? 150,
    carbs: settings.carbsTarget ?? 200,
    fat: settings.fatTarget ?? 65,
    fiber: settings.fiberTarget ?? 30,
    sugar: settings.sugarTarget ?? 50,
  };
  const microTargets = {
    vitaminA: settings.vitaminATarget ?? 900,
    vitaminC: settings.vitaminCTarget ?? 500,
    vitaminD: settings.vitaminDTarget ?? 50,
    vitaminB12: settings.vitaminB12Target ?? 10,
    iron: settings.ironTarget ?? 8,
    zinc: settings.zincTarget ?? 15,
    calcium: settings.calciumTarget ?? 1000,
    magnesium: settings.magnesiumTarget ?? 500,
    potassium: settings.potassiumTarget ?? 4700,
  };
  const fastFoodBaseline = settings.fastFoodWeeklyBaseline ?? 350;

  // Batch-fetch all recipe details in 2 queries instead of 2*N
  const recipeIds = [...new Set(todayMeals.filter(m => m.recipe).map(m => m.recipe!.id))];
  const recipeDetails = await getRecipesByIds(recipeIds);
  const recipeDetailMap = new Map(recipeDetails.map(r => [r.id, r]));

  // Helper: compute nutrition from a recipe detail's ingredients
  const computeRecipeNutrition = (rd: typeof recipeDetails[number], recipeServings: number, consumed: number) => {
    let tc = 0, tp = 0, tca = 0, tf = 0, tSugar = 0;
    let tVitA = 0, tVitC = 0, tVitD = 0, tVitB12 = 0;
    let tIron = 0, tZinc = 0, tCalcium = 0, tMag = 0, tPot = 0;
    for (const ri of rd.ingredients) {
      tc += ri.ingredient.caloriesPerUnit * ri.amount;
      tp += ri.ingredient.proteinPerUnit * ri.amount;
      tca += ri.ingredient.carbsPerUnit * ri.amount;
      tf += ri.ingredient.fatPerUnit * ri.amount;
      tSugar += (ri.ingredient.sugarPerUnit ?? 0) * ri.amount;
      tVitA += (ri.ingredient.vitaminAPerUnit ?? 0) * ri.amount;
      tVitC += (ri.ingredient.vitaminCPerUnit ?? 0) * ri.amount;
      tVitD += (ri.ingredient.vitaminDPerUnit ?? 0) * ri.amount;
      tVitB12 += (ri.ingredient.vitaminB12PerUnit ?? 0) * ri.amount;
      tIron += (ri.ingredient.ironPerUnit ?? 0) * ri.amount;
      tZinc += (ri.ingredient.zincPerUnit ?? 0) * ri.amount;
      tCalcium += (ri.ingredient.calciumPerUnit ?? 0) * ri.amount;
      tMag += (ri.ingredient.magnesiumPerUnit ?? 0) * ri.amount;
      tPot += (ri.ingredient.potassiumPerUnit ?? 0) * ri.amount;
    }
    const rs = recipeServings || 1;
    const m = consumed / rs;
    return {
      calories: tc * m, protein: tp * m, carbs: tca * m, fat: tf * m, sugar: tSugar * m,
      vitaminA: tVitA * m, vitaminC: tVitC * m, vitaminD: tVitD * m, vitaminB12: tVitB12 * m,
      iron: tIron * m, zinc: tZinc * m, calcium: tCalcium * m, magnesium: tMag * m, potassium: tPot * m,
    };
  };

  // Calculate today's nutrition (no individual DB calls — uses preloaded map)
  const calculatePersonNutrition = (person: string) => {
    let calories = 0, protein = 0, carbs = 0, fat = 0, sugar = 0;
    let vitaminA = 0, vitaminC = 0, vitaminD = 0, vitaminB12 = 0;
    let iron = 0, zinc = 0, calcium = 0, magnesium = 0, potassium = 0;

    for (const { meal, recipe } of todayMeals) {
      if (meal.person !== person) continue;
      const servings = meal.servingsConsumed ?? 1;
      if (meal.customCalories != null) {
        calories += meal.customCalories * servings;
        protein += (meal.customProtein ?? 0) * servings;
        carbs += (meal.customCarbs ?? 0) * servings;
        fat += (meal.customFat ?? 0) * servings;
      } else if (recipe) {
        const rd = recipeDetailMap.get(recipe.id);
        if (rd) {
          const n = computeRecipeNutrition(rd, recipe.servings ?? 1, servings);
          calories += n.calories; protein += n.protein; carbs += n.carbs; fat += n.fat; sugar += n.sugar;
          vitaminA += n.vitaminA; vitaminC += n.vitaminC; vitaminD += n.vitaminD; vitaminB12 += n.vitaminB12;
          iron += n.iron; zinc += n.zinc; calcium += n.calcium; magnesium += n.magnesium; potassium += n.potassium;
        }
      }
    }

    for (const { log, supplement } of todaySupplements) {
      if (log.person !== person) continue;
      if (!supplement.nutritionPerDose) continue;
      try {
        const n = JSON.parse(supplement.nutritionPerDose);
        const dose = log.dose;
        calories += (n.calories ?? 0) * dose; protein += (n.protein ?? 0) * dose;
        carbs += (n.carbs ?? 0) * dose; fat += (n.fat ?? 0) * dose;
        sugar += (n.sugar ?? 0) * dose;
        vitaminA += (n.vitaminA ?? 0) * dose; vitaminC += (n.vitaminC ?? 0) * dose;
        vitaminD += (n.vitaminD ?? 0) * dose; vitaminB12 += (n.vitaminB12 ?? 0) * dose;
        iron += (n.iron ?? 0) * dose; zinc += (n.zinc ?? 0) * dose;
        calcium += (n.calcium ?? 0) * dose; magnesium += (n.magnesium ?? 0) * dose;
        potassium += (n.potassium ?? 0) * dose;
      } catch { /* skip */ }
    }

    return {
      calories: Math.round(calories), protein: Math.round(protein),
      carbs: Math.round(carbs), fat: Math.round(fat), sugar: Math.round(sugar),
      vitaminA: Math.round(vitaminA * 10) / 10, vitaminC: Math.round(vitaminC * 10) / 10,
      vitaminD: Math.round(vitaminD * 10) / 10, vitaminB12: Math.round(vitaminB12 * 10) / 10,
      iron: Math.round(iron * 10) / 10, zinc: Math.round(zinc * 10) / 10,
      calcium: Math.round(calcium), magnesium: Math.round(magnesium), potassium: Math.round(potassium),
    };
  };

  const myNutrition = calculatePersonNutrition('me');

  // Upcoming reminders — vet + dental next appointments within 60 days
  const upcomingEvents: UpcomingEvent[] = [];
  const cutoff = format(new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

  const futureVetVisits = await db.select().from(vetVisits)
    .where(gt(vetVisits.nextAppointment, today))
    .orderBy(vetVisits.nextAppointment)
    .all();
  for (const v of futureVetVisits) {
    if (v.nextAppointment && v.nextAppointment <= cutoff) {
      upcomingEvents.push({
        label: `Vet — ${v.vetName ?? v.location ?? 'appointment'}`,
        date: v.nextAppointment,
        daysUntil: daysUntil(v.nextAppointment),
        type: 'vet',
        href: '/vet',
      });
    }
  }

  const futureDentalVisits = await db.select().from(dentalCheckups)
    .where(gt(dentalCheckups.nextAppointment, today))
    .orderBy(dentalCheckups.nextAppointment)
    .all();
  for (const d of futureDentalVisits) {
    if (d.nextAppointment && d.nextAppointment <= cutoff) {
      upcomingEvents.push({
        label: `Dentist — ${d.dentistName ?? d.location ?? 'appointment'}`,
        date: d.nextAppointment,
        daysUntil: daysUntil(d.nextAppointment),
        type: 'dental',
        href: '/grooming',
      });
    }
  }

  upcomingEvents.sort((a, b) => a.date.localeCompare(b.date));

  const freezerData = freezerItems.map(({ item, recipe }) => ({
    id: item.id,
    recipeId: item.recipeId,
    recipeName: recipe.name,
    quantity: item.quantity,
    dateFrozen: item.dateFrozen,
    expiryDate: item.expiryDate,
    daysRemaining: daysUntil(item.expiryDate),
  }));

  const isPrepDay = isWeekend(now);

  return (
    <DashboardClient
      key={selectedDate}
      today={today}
      selectedDate={selectedDate}
      myNutrition={myNutrition}
      targets={targets}
      freezerData={freezerData}
      recipes={allRecipes}
      weeklySpend={weeklySpend}
      fastFoodBaseline={fastFoodBaseline}
      microTargets={microTargets}
      isPrepDay={isPrepDay}
      todaySteps={todaySteps}
      todayWater={todayWater}
      todayCoffee={todayCoffee}
      upcomingEvents={upcomingEvents}
      latestSleepLog={latestSleep}
      todaySupplements={todaySupplements}
      activeSupplements={activeSupplements}
      stepsHistory={stepsHistory}
      userSettings={{ name: settings.name ?? 'Rene', dob: settings.dob ?? '1993-03-14', heightIn: settings.heightIn ?? 69, weightLbs: settings.weightLbs ?? 150 }}
      todayMeals={todayMeals.map(({ meal, recipe }) => {
        let cal = 0, pro = 0, car = 0, f = 0, sug = 0;
        if (meal.customCalories != null) {
          const sv = meal.servingsConsumed ?? 1;
          cal = Math.round(meal.customCalories * sv);
          pro = Math.round((meal.customProtein ?? 0) * sv);
          car = Math.round((meal.customCarbs ?? 0) * sv);
          f = Math.round((meal.customFat ?? 0) * sv);
        } else if (recipe) {
          const rd = recipeDetailMap.get(recipe.id);
          if (rd) {
            const n = computeRecipeNutrition(rd, recipe.servings ?? 1, meal.servingsConsumed ?? 1);
            cal = Math.round(n.calories); pro = Math.round(n.protein);
            car = Math.round(n.carbs); f = Math.round(n.fat); sug = Math.round(n.sugar);
          }
        }
        return {
          ...meal,
          recipeName: recipe?.name ?? meal.customName ?? 'Unknown',
          calories: cal, protein: pro, carbs: car, fat: f, sugar: sug,
        };
      })}
      ouraToday={ouraToday}
      sleepToday={sleepToday}
      ouraHistory={ouraHistory}
      sleepHistory={sleepHistory}
      dentalToday={dentalToday}
    />
  );
}
