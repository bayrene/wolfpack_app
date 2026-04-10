'use server';
import { db } from '@/db';
import { skinSettings, skinDayLogs, skinProducts, skinProductUsage } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// Settings
export async function getSkinSettings() {
  return (await db.select().from(skinSettings).get()) ?? null;
}

export async function initSkinProgram(startDate: string) {
  await db.insert(skinSettings).values({ startDate, longestStreak: 0 }).run();
  revalidatePath('/skin');
}

export async function updateSkinLongestStreak(streak: number) {
  const existing = await db.select().from(skinSettings).get();
  if (!existing) return;
  if (streak > (existing.longestStreak ?? 0)) {
    await db.update(skinSettings).set({ longestStreak: streak }).where(eq(skinSettings.id, existing.id)).run();
  }
}

export async function updateSkinStartDate(startDate: string) {
  const existing = await db.select().from(skinSettings).get();
  if (!existing) return;
  await db.update(skinSettings).set({ startDate }).where(eq(skinSettings.id, existing.id)).run();
  revalidatePath('/skin');
}

export async function resetSkinProgram(startDate: string) {
  // Delete all day logs
  await db.delete(skinDayLogs).run();
  // Reset settings
  const existing = await db.select().from(skinSettings).get();
  if (existing) {
    await db.update(skinSettings).set({ startDate, longestStreak: 0 }).where(eq(skinSettings.id, existing.id)).run();
  } else {
    await db.insert(skinSettings).values({ startDate, longestStreak: 0 }).run();
  }
  revalidatePath('/skin');
}

// Day logs
export async function getSkinDayLogs() {
  return db.select().from(skinDayLogs).all();
}

export async function upsertSkinDayLog(date: string, logData: string) {
  const existing = await db.select().from(skinDayLogs).where(eq(skinDayLogs.date, date)).get();
  if (existing) {
    await db.update(skinDayLogs).set({ logData }).where(eq(skinDayLogs.date, date)).run();
  } else {
    await db.insert(skinDayLogs).values({ date, logData }).run();
  }
}

// Products
export async function getSkinProducts() {
  return db.select().from(skinProducts).all();
}

export async function addSkinProduct(data: {
  localId?: string;
  name: string;
  brand: string;
  type: string;
  whenToUse: string;
  instructions: string;
  ingredients?: string;
  active?: boolean;
}) {
  const result = await db.insert(skinProducts).values(data).returning({ id: skinProducts.id }).get();
  revalidatePath('/skin');
  return result.id;
}

export async function updateSkinProduct(
  id: number,
  data: Partial<{
    name: string;
    brand: string;
    type: string;
    whenToUse: string;
    instructions: string;
    ingredients: string;
    active: boolean;
  }>,
) {
  await db.update(skinProducts).set(data).where(eq(skinProducts.id, id)).run();
  revalidatePath('/skin');
}

export async function deleteSkinProduct(id: number) {
  await db.delete(skinProducts).where(eq(skinProducts.id, id)).run();
  revalidatePath('/skin');
}

// Product usage
export async function getSkinProductUsage() {
  return db.select().from(skinProductUsage).all();
}

export async function addSkinProductUsage(data: {
  productId: number;
  date: string;
  time: string;
  notes?: string;
}) {
  await db.insert(skinProductUsage).values(data).run();
}

export async function deleteSkinProductUsage(id: number) {
  await db.delete(skinProductUsage).where(eq(skinProductUsage.id, id)).run();
}

// Bulk migration helper
export async function migrateSkinFromLocalStorage(data: {
  startDate: string;
  longestStreak: number;
  logs: Record<string, unknown>;
  products: Array<{
    id: string;
    name: string;
    brand: string;
    type: string;
    whenToUse: string;
    instructions: string;
    ingredients?: string;
    active: boolean;
  }>;
  productUsage: Array<{
    id: string;
    productId: string;
    date: string;
    time: string;
    notes: string;
  }>;
}) {
  // Only migrate if no settings exist yet
  const existing = await db.select().from(skinSettings).get();
  if (existing) return { success: false, reason: 'already_migrated' };

  // Insert settings
  await db.insert(skinSettings).values({ startDate: data.startDate, longestStreak: data.longestStreak }).run();

  // Insert day logs
  for (const [date, logData] of Object.entries(data.logs)) {
    await db.insert(skinDayLogs).values({ date, logData: JSON.stringify(logData) }).run();
  }

  // Insert products, keep mapping localId→dbId
  const localToDbId = new Map<string, number>();
  for (const prod of data.products) {
    const result = await db
      .insert(skinProducts)
      .values({
        localId: prod.id,
        name: prod.name,
        brand: prod.brand || '',
        type: prod.type,
        whenToUse: prod.whenToUse,
        instructions: prod.instructions || '',
        ingredients: prod.ingredients,
        active: prod.active,
      })
      .returning({ id: skinProducts.id })
      .get();
    localToDbId.set(prod.id, result.id);
  }

  // Insert product usage, mapping old localId to new db productId
  for (const usage of data.productUsage) {
    const dbProductId = localToDbId.get(usage.productId);
    if (dbProductId) {
      await db.insert(skinProductUsage)
        .values({
          productId: dbProductId,
          date: usage.date,
          time: usage.time,
          notes: usage.notes || '',
        })
        .run();
    }
  }

  revalidatePath('/skin');
  return { success: true };
}
