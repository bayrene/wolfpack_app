import { getMealsForDateRange } from '@/db/queries/meals';
import { getAllRecipes } from '@/db/queries/recipes';
import { MealLogClient } from '@/components/meals/meal-log-client';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { todayISO } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function MealLogPage() {
  const today = todayISO();
  const now = new Date();
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const [weekMeals, recipes] = await Promise.all([
    getMealsForDateRange(weekStart, weekEnd),
    getAllRecipes(),
  ]);

  const mealsData = weekMeals.map(({ meal, recipe }) => ({
    ...meal,
    recipeName: recipe?.name ?? meal.customName ?? 'Unknown',
    recipeCostPerServing: recipe?.costPerServing ?? null,
  }));

  return (
    <MealLogClient
      today={today}
      weekStart={weekStart}
      weekEnd={weekEnd}
      meals={mealsData}
      recipes={recipes}
    />
  );
}
