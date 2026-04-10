'use server';

import { db } from '@/db';
import { priceHistory, ingredients } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getPriceHistory(ingredientId: number) {
  return db
    .select()
    .from(priceHistory)
    .where(eq(priceHistory.ingredientId, ingredientId))
    .orderBy(desc(priceHistory.date))
    .all();
}

export async function getAllPriceHistory() {
  return db
    .select({
      price: priceHistory,
      ingredient: {
        id: ingredients.id,
        name: ingredients.name,
        category: ingredients.category,
      },
    })
    .from(priceHistory)
    .innerJoin(ingredients, eq(priceHistory.ingredientId, ingredients.id))
    .orderBy(desc(priceHistory.date))
    .all();
}

export async function addPriceEntry(data: {
  ingredientId: number;
  price: number;
  store: string;
  date: string;
  unitPurchased?: string;
  qualityRating?: number;
  notes?: string;
}) {
  await db.insert(priceHistory).values(data).run();

  // Also update the ingredient's avg_price and store_preference
  const entries = await db
    .select()
    .from(priceHistory)
    .where(eq(priceHistory.ingredientId, data.ingredientId))
    .all();

  const avgPrice = entries.reduce((sum, e) => sum + e.price, 0) / entries.length;

  await db.update(ingredients)
    .set({
      avgPrice: Math.round(avgPrice * 100) / 100,
      storePreference: data.store,
    })
    .where(eq(ingredients.id, data.ingredientId))
    .run();

  revalidatePath('/ingredients');
  revalidatePath('/grocery');
}

export async function deletePriceEntry(id: number) {
  await db.delete(priceHistory).where(eq(priceHistory.id, id)).run();
  revalidatePath('/ingredients');
}
