'use server';

import { db } from '@/db';
import { recipes, recipeIngredients, ingredients } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getAllRecipes() {
  return db.select().from(recipes).all();
}

export async function getRecipeById(id: number) {
  const recipe = await db.select().from(recipes).where(eq(recipes.id, id)).get();
  if (!recipe) return null;

  const recipeIngs = await db
    .select({
      id: recipeIngredients.id,
      amount: recipeIngredients.amount,
      unit: recipeIngredients.unit,
      ingredient: {
        id: ingredients.id,
        name: ingredients.name,
        defaultUnit: ingredients.defaultUnit,
        caloriesPerUnit: ingredients.caloriesPerUnit,
        proteinPerUnit: ingredients.proteinPerUnit,
        carbsPerUnit: ingredients.carbsPerUnit,
        fatPerUnit: ingredients.fatPerUnit,
        fiberPerUnit: ingredients.fiberPerUnit,
        vitaminAPerUnit: ingredients.vitaminAPerUnit,
        vitaminCPerUnit: ingredients.vitaminCPerUnit,
        vitaminDPerUnit: ingredients.vitaminDPerUnit,
        vitaminB12PerUnit: ingredients.vitaminB12PerUnit,
        ironPerUnit: ingredients.ironPerUnit,
        zincPerUnit: ingredients.zincPerUnit,
        calciumPerUnit: ingredients.calciumPerUnit,
        magnesiumPerUnit: ingredients.magnesiumPerUnit,
        potassiumPerUnit: ingredients.potassiumPerUnit,
        category: ingredients.category,
        avgPrice: ingredients.avgPrice,
        purchaseUnit: ingredients.purchaseUnit,
        storePreference: ingredients.storePreference,
      },
    })
    .from(recipeIngredients)
    .innerJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.id))
    .where(eq(recipeIngredients.recipeId, id))
    .all();

  return { ...recipe, ingredients: recipeIngs };
}

export async function getRecipesByCategory(category: 'breakfast' | 'lunch' | 'dinner' | 'snack') {
  return db.select().from(recipes).where(eq(recipes.category, category)).all();
}

export async function createRecipe(data: {
  name: string;
  description?: string;
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings: number;
  freezerFriendly?: boolean;
  freezerLifeDays?: number;
  fridgeLifeDays?: number;
  costPerServing?: number;
  difficulty?: 'beginner' | 'easy' | 'medium';
  instructions?: string;
  notes?: string;
  ingredients: { ingredientId: number; amount: number; unit: string }[];
}) {
  const { ingredients: ings, ...recipeData } = data;

  const result = await db.insert(recipes).values(recipeData).returning({ id: recipes.id }).get();

  for (const ing of ings) {
    await db.insert(recipeIngredients).values({
      recipeId: result.id,
      ingredientId: ing.ingredientId,
      amount: ing.amount,
      unit: ing.unit,
    }).run();
  }

  revalidatePath('/recipes');
  return result.id;
}

export async function updateRecipe(id: number, data: {
  name?: string;
  description?: string;
  category?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  freezerFriendly?: boolean;
  freezerLifeDays?: number;
  fridgeLifeDays?: number;
  costPerServing?: number;
  difficulty?: 'beginner' | 'easy' | 'medium';
  instructions?: string;
  notes?: string;
}) {
  await db.update(recipes).set(data).where(eq(recipes.id, id)).run();
  revalidatePath('/recipes');
  revalidatePath(`/recipes/${id}`);
}

export async function deleteRecipe(id: number) {
  await db.delete(recipes).where(eq(recipes.id, id)).run();
  revalidatePath('/recipes');
}
