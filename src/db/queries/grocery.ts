'use server';

import { db } from '@/db';
import { groceryLists, groceryItems } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getActiveGroceryList() {
  const list = await db.select().from(groceryLists).limit(1).get();
  if (!list) {
    const newList = await db.insert(groceryLists).values({ name: 'Weekly Groceries' }).returning().get();
    return { ...newList, items: [] };
  }

  const items = await db
    .select()
    .from(groceryItems)
    .where(eq(groceryItems.listId, list.id))
    .orderBy(asc(groceryItems.checked), asc(groceryItems.sortOrder))
    .all();

  return { ...list, items };
}

export async function addGroceryItem(data: {
  listId: number;
  ingredientId?: number;
  name: string;
  amount?: number;
  unit?: string;
  estimatedCost?: number;
  store?: string;
}) {
  await db.insert(groceryItems).values(data).run();
  revalidatePath('/grocery');
}

export async function toggleGroceryItem(id: number) {
  const item = await db.select().from(groceryItems).where(eq(groceryItems.id, id)).get();
  if (!item) return;
  await db.update(groceryItems)
    .set({ checked: !item.checked })
    .where(eq(groceryItems.id, id))
    .run();
  revalidatePath('/grocery');
}

export async function deleteGroceryItem(id: number) {
  await db.delete(groceryItems).where(eq(groceryItems.id, id)).run();
  revalidatePath('/grocery');
}

export async function clearCheckedItems(listId: number) {
  await db.delete(groceryItems)
    .where(eq(groceryItems.listId, listId))
    .run();
  revalidatePath('/grocery');
}

export async function addRecipeToGroceryList(listId: number, recipeIngs: { name: string; amount: number; unit: string; ingredientId: number; estimatedCost?: number; store?: string }[]) {
  for (const ing of recipeIngs) {
    // Check if ingredient already exists in the list
    const allItems = await db
      .select()
      .from(groceryItems)
      .where(eq(groceryItems.listId, listId))
      .all();
    const existing = allItems.find(item => item.ingredientId === ing.ingredientId && !item.checked);

    if (existing) {
      await db.update(groceryItems)
        .set({ amount: (existing.amount ?? 0) + ing.amount })
        .where(eq(groceryItems.id, existing.id))
        .run();
    } else {
      await db.insert(groceryItems).values({
        listId,
        ingredientId: ing.ingredientId,
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        estimatedCost: ing.estimatedCost,
        store: ing.store,
      }).run();
    }
  }
  revalidatePath('/grocery');
}
