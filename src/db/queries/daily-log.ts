'use server';

import { db } from '@/db';
import { dailyLog } from '@/db/schema';
import { eq, and, between, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getDailyLog(date: string, person: string) {
  return db
    .select()
    .from(dailyLog)
    .where(and(eq(dailyLog.date, date), eq(dailyLog.person, person as 'me' | 'wife')))
    .get();
}

export async function getDailyLogsForRange(startDate: string, endDate: string, person: string) {
  return db
    .select()
    .from(dailyLog)
    .where(
      and(
        between(dailyLog.date, startDate, endDate),
        eq(dailyLog.person, person as 'me' | 'wife'),
      ),
    )
    .orderBy(desc(dailyLog.date))
    .all();
}

export async function upsertSteps(date: string, person: string, steps: number) {
  const existing = await getDailyLog(date, person);
  if (existing) {
    await db.update(dailyLog)
      .set({ steps })
      .where(eq(dailyLog.id, existing.id))
      .run();
  } else {
    await db.insert(dailyLog)
      .values({ date, person: person as 'me' | 'wife', steps })
      .run();
  }
  revalidatePath('/');
  revalidatePath('/progress');
}

export async function upsertWater(date: string, person: string, waterOz: number) {
  const existing = await getDailyLog(date, person);
  if (existing) {
    await db.update(dailyLog)
      .set({ waterOz })
      .where(eq(dailyLog.id, existing.id))
      .run();
  } else {
    await db.insert(dailyLog)
      .values({ date, person: person as 'me' | 'wife', waterOz })
      .run();
  }
  revalidatePath('/');
  revalidatePath('/nutrition');
}

export async function upsertCoffee(date: string, person: string, coffee: number) {
  const existing = await getDailyLog(date, person);
  if (existing) {
    await db.update(dailyLog)
      .set({ coffee })
      .where(eq(dailyLog.id, existing.id))
      .run();
  } else {
    await db.insert(dailyLog)
      .values({ date, person: person as 'me' | 'wife', coffee })
      .run();
  }
  revalidatePath('/');
}
