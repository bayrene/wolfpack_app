'use server';

import { db } from '@/db';
import { smokingLog, strains } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// --- Smoking Log ---

export async function getAllSmokingLogs() {
  return db.select().from(smokingLog).orderBy(desc(smokingLog.date), desc(smokingLog.time)).all();
}

export async function addSmokingLog(data: {
  date: string;
  time?: string;
  type: 'hookah' | 'cannabis';
  strainId?: number;
  feeling?: string;
  duration?: number;
  notes?: string;
}) {
  await db.insert(smokingLog).values(data).run();
  revalidatePath('/smoking');
}

export async function deleteSmokingLog(id: number) {
  await db.delete(smokingLog).where(eq(smokingLog.id, id)).run();
  revalidatePath('/smoking');
}

// --- Strains ---

export async function getAllStrains() {
  return db.select().from(strains).orderBy(strains.name).all();
}

export async function rateStrain(id: number, rating: number) {
  await db.update(strains).set({ rating }).where(eq(strains.id, id)).run();
  revalidatePath('/smoking');
}

export async function addStrain(data: {
  name: string;
  brand?: string;
  type?: 'indica' | 'sativa' | 'hybrid' | 'other';
  thcContent?: string;
  terpenes?: string;
  price?: number;
  pricePerOz?: number;
  rating?: number;
  notes?: string;
}) {
  await db.insert(strains).values(data).run();
  revalidatePath('/smoking');
}

export async function toggleStrainFavorite(id: number) {
  const item = await db.select().from(strains).where(eq(strains.id, id)).get();
  if (!item) return;
  await db.update(strains).set({ favorite: !item.favorite }).where(eq(strains.id, id)).run();
  revalidatePath('/smoking');
}

export async function deleteStrain(id: number) {
  await db.delete(strains).where(eq(strains.id, id)).run();
  revalidatePath('/smoking');
}

export async function updateStrain(id: number, data: {
  name?: string;
  brand?: string;
  type?: 'indica' | 'sativa' | 'hybrid' | 'other';
  thcContent?: string;
  terpenes?: string;
  price?: number | null;
  rating?: number | null;
  notes?: string;
}) {
  await db.update(strains).set(data).where(eq(strains.id, id)).run();
  revalidatePath('/smoking');
  revalidatePath('/habits');
}
