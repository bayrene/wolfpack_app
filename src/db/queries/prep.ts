'use server';

import { db } from '@/db';
import { prepSessions } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getPrepSessions() {
  return db.select().from(prepSessions).orderBy(desc(prepSessions.date)).all();
}

export async function logPrepSession(data: {
  date: string;
  recipesPrepped: string; // JSON string
  totalCost?: number;
  totalTimeMinutes?: number;
  notes?: string;
}) {
  await db.insert(prepSessions).values(data).run();
  revalidatePath('/prep');
}
