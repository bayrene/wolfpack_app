'use server';

import { db } from '@/db';
import { ingredients } from '@/db/schema';
import { like } from 'drizzle-orm';

export async function getAllIngredients() {
  return db.select().from(ingredients).all();
}

export async function searchIngredients(query: string) {
  return db
    .select()
    .from(ingredients)
    .where(like(ingredients.name, `%${query}%`))
    .all();
}

export async function createIngredient(data: {
  name: string;
  defaultUnit: 'oz' | 'lb' | 'g' | 'kg' | 'cup' | 'tbsp' | 'tsp' | 'ml' | 'l' | 'each' | 'can' | 'bag';
  caloriesPerUnit: number;
  proteinPerUnit: number;
  carbsPerUnit: number;
  fatPerUnit: number;
  fiberPerUnit: number;
  sugarPerUnit?: number;
  sodiumPerUnit?: number;
  category: 'protein' | 'grain' | 'dairy' | 'vegetable' | 'fruit' | 'condiment' | 'spice' | 'other';
  avgPrice?: number;
  purchaseUnit?: string;
  storePreference?: string;
}) {
  const result = await db.insert(ingredients).values(data).returning({ id: ingredients.id }).get();
  return result.id;
}
