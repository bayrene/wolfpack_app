'use server';

import { db } from '@/db';
import { supplements, supplementLog } from '@/db/schema';
import { eq, desc, and, between } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getAllSupplements() {
  return db.select().from(supplements).all();
}

export async function getActiveSupplements() {
  return db.select().from(supplements).where(eq(supplements.active, true)).all();
}

export async function getSupplementById(id: number) {
  return db.select().from(supplements).where(eq(supplements.id, id)).get();
}

export async function getSupplementLogs(date?: string) {
  if (date) {
    return db
      .select({
        log: supplementLog,
        supplement: supplements,
      })
      .from(supplementLog)
      .innerJoin(supplements, eq(supplementLog.supplementId, supplements.id))
      .where(eq(supplementLog.date, date))
      .orderBy(desc(supplementLog.time))
      .all();
  }
  return db
    .select({
      log: supplementLog,
      supplement: supplements,
    })
    .from(supplementLog)
    .innerJoin(supplements, eq(supplementLog.supplementId, supplements.id))
    .orderBy(desc(supplementLog.date), desc(supplementLog.time))
    .all();
}

export async function getSupplementLogsForRange(startDate: string, endDate: string) {
  return db
    .select({
      log: supplementLog,
      supplement: supplements,
    })
    .from(supplementLog)
    .innerJoin(supplements, eq(supplementLog.supplementId, supplements.id))
    .where(between(supplementLog.date, startDate, endDate))
    .orderBy(desc(supplementLog.date), desc(supplementLog.time))
    .all();
}

export async function logSupplement(data: {
  supplementId: number;
  date: string;
  time: string;
  dose: number;
  person: 'me' | 'wife';
  situation: 'empty_stomach' | 'with_food' | 'with_meal' | 'before_bed' | 'post_workout' | 'other';
  sideEffects?: string;
  effectivenessRating?: number;
  notes?: string;
}) {
  await db.insert(supplementLog).values(data).run();
  revalidatePath('/vitamins');
  revalidatePath('/');
}

export async function updateSupplementLog(
  id: number,
  data: {
    dose?: number;
    time?: string;
    situation?: 'empty_stomach' | 'with_food' | 'with_meal' | 'before_bed' | 'post_workout' | 'other';
    sideEffects?: string | null;
    effectivenessRating?: number | null;
    notes?: string | null;
  },
) {
  await db.update(supplementLog).set(data).where(eq(supplementLog.id, id)).run();
  revalidatePath('/vitamins');
  revalidatePath('/');
}

export async function deleteSupplementLog(id: number) {
  await db.delete(supplementLog).where(eq(supplementLog.id, id)).run();
  revalidatePath('/vitamins');
}

export async function updateSupplement(id: number, data: Partial<{
  name: string;
  brand: string;
  description: string;
  form: 'capsule' | 'powder' | 'tablet' | 'liquid' | 'softgel' | 'gummy';
  defaultDose: number;
  doseUnit: string;
  servingInfo: string;
  benefits: string;
  contents: string;
  bestTimeToTake: string;
  warnings: string;
  avgPrice: number;
  purchaseUnit: string;
  storePreference: string;
  nutritionPerDose: string;
}>) {
  await db.update(supplements).set(data).where(eq(supplements.id, id)).run();
  revalidatePath('/vitamins');
  revalidatePath('/');
}

export async function createSupplement(data: {
  name: string;
  brand: string;
  description?: string;
  form: 'capsule' | 'powder' | 'tablet' | 'liquid' | 'softgel' | 'gummy';
  defaultDose: number;
  doseUnit: string;
  servingInfo?: string;
  benefits?: string;
  contents?: string;
  bestTimeToTake?: string;
  warnings?: string;
  avgPrice?: number;
  purchaseUnit?: string;
  storePreference?: string;
  nutritionPerDose?: string;
}) {
  const result = await db.insert(supplements).values(data).returning({ id: supplements.id }).get();
  revalidatePath('/vitamins');
  return result.id;
}

export async function toggleSupplementActive(id: number) {
  const supp = await db.select().from(supplements).where(eq(supplements.id, id)).get();
  if (!supp) return;
  await db.update(supplements).set({ active: !supp.active }).where(eq(supplements.id, id)).run();
  revalidatePath('/vitamins');
}
