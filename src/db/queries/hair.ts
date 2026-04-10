'use server';

import { db } from '@/db';
import { haircuts, hairHealthLog, hairInspo } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getAllHaircuts() {
  return db.select().from(haircuts).orderBy(desc(haircuts.date)).all();
}

export async function addHaircut(data: {
  date: string;
  location: string;
  barberName?: string;
  price: number;
  tip?: number;
  style?: string;
  notes?: string;
  photo?: string;
  rating?: number;
}) {
  await db.insert(haircuts).values(data).run();
  revalidatePath('/hair');
}

export async function deleteHaircut(id: number) {
  await db.delete(haircuts).where(eq(haircuts.id, id)).run();
  revalidatePath('/hair');
}

export async function getAllHairHealthLogs() {
  return db.select().from(hairHealthLog).orderBy(desc(hairHealthLog.date)).all();
}

export async function addHairHealthLog(data: {
  date: string;
  photo?: string;
  photoAngle?: 'front' | 'top' | 'left_side' | 'right_side' | 'back' | 'close_up' | 'other';
  category: 'general' | 'receding' | 'thinning' | 'white_hair' | 'bald_spot' | 'growth' | 'treatment';
  severity?: number;
  notes?: string;
}) {
  await db.insert(hairHealthLog).values(data).run();
  revalidatePath('/hair');
}

export async function deleteHairHealthLog(id: number) {
  await db.delete(hairHealthLog).where(eq(hairHealthLog.id, id)).run();
  revalidatePath('/hair');
}

// --- Inspiration Photos ---

export async function getAllHairInspo() {
  return db.select().from(hairInspo).orderBy(desc(hairInspo.createdAt)).all();
}

export async function addHairInspo(data: {
  photo: string;
  title?: string;
  tags?: string;
  source?: string;
  notes?: string;
}) {
  await db.insert(hairInspo).values(data).run();
  revalidatePath('/hair');
}

export async function toggleHairInspoFavorite(id: number) {
  const item = await db.select().from(hairInspo).where(eq(hairInspo.id, id)).get();
  if (!item) return;
  await db.update(hairInspo).set({ favorite: !item.favorite }).where(eq(hairInspo.id, id)).run();
  revalidatePath('/hair');
}

export async function deleteHairInspo(id: number) {
  await db.delete(hairInspo).where(eq(hairInspo.id, id)).run();
  revalidatePath('/hair');
}
