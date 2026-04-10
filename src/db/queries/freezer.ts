'use server';

import { db } from '@/db';
import { freezerInventory, recipes } from '@/db/schema';
import { eq, gt } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getFreezerInventory() {
  return db
    .select({
      item: freezerInventory,
      recipe: recipes,
    })
    .from(freezerInventory)
    .innerJoin(recipes, eq(freezerInventory.recipeId, recipes.id))
    .where(gt(freezerInventory.quantity, 0))
    .all();
}

export async function addToFreezer(data: {
  recipeId: number;
  quantity: number;
  dateFrozen: string;
  expiryDate: string;
  notes?: string;
}) {
  await db.insert(freezerInventory).values(data).run();
  revalidatePath('/freezer');
  revalidatePath('/');
}

export async function decrementFreezerItem(id: number) {
  const item = await db.select().from(freezerInventory).where(eq(freezerInventory.id, id)).get();
  if (!item || item.quantity <= 0) return;

  await db.update(freezerInventory)
    .set({ quantity: item.quantity - 1 })
    .where(eq(freezerInventory.id, id))
    .run();

  revalidatePath('/freezer');
  revalidatePath('/');
}

export async function deleteFreezerItem(id: number) {
  await db.delete(freezerInventory).where(eq(freezerInventory.id, id)).run();
  revalidatePath('/freezer');
  revalidatePath('/');
}
