'use server';

import { db } from '@/db';
import { mealLog, recipes } from '@/db/schema';
import { eq, and, between, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getMealsForDate(date: string) {
  return db
    .select({
      meal: mealLog,
      recipe: recipes,
    })
    .from(mealLog)
    .leftJoin(recipes, eq(mealLog.recipeId, recipes.id))
    .where(eq(mealLog.date, date))
    .all();
}

export async function getMealsForDateRange(startDate: string, endDate: string) {
  return db
    .select({
      meal: mealLog,
      recipe: recipes,
    })
    .from(mealLog)
    .leftJoin(recipes, eq(mealLog.recipeId, recipes.id))
    .where(between(mealLog.date, startDate, endDate))
    .all();
}

export async function logMeal(data: {
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  person: 'me' | 'wife' | 'both';
  recipeId?: number;
  servingsConsumed?: number;
  customName?: string;
  customCalories?: number;
  customProtein?: number;
  customCarbs?: number;
  customFat?: number;
  notes?: string;
}) {
  // If logging for 'both', create two entries
  if (data.person === 'both') {
    const { person, ...rest } = data;
    await db.insert(mealLog).values({ ...rest, person: 'me' }).run();
    await db.insert(mealLog).values({ ...rest, person: 'wife' }).run();
  } else {
    await db.insert(mealLog).values(data).run();
  }
  revalidatePath('/');
  revalidatePath('/log');
  revalidatePath('/nutrition');
}

export async function deleteMealLog(id: number) {
  await db.delete(mealLog).where(eq(mealLog.id, id)).run();
  revalidatePath('/');
  revalidatePath('/log');
  revalidatePath('/nutrition');
}

export async function getWeeklySpending(startDate: string, endDate: string) {
  const meals = await getMealsForDateRange(startDate, endDate);
  let total = 0;
  for (const { meal, recipe } of meals) {
    if (recipe?.costPerServing) {
      total += recipe.costPerServing * (meal.servingsConsumed ?? 1);
    }
  }
  return total;
}
