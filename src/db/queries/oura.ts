'use server';

import { db } from '@/db';
import { ouraDaily, sleepLog } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export async function getOuraDaily(date: string) {
  const rows = await db.select().from(ouraDaily).where(eq(ouraDaily.date, date)).all();
  return rows[0] ?? null;
}

export async function getOuraHistory(startDate: string, endDate: string) {
  return db.select().from(ouraDaily)
    .where(and(gte(ouraDaily.date, startDate), lte(ouraDaily.date, endDate)))
    .orderBy(desc(ouraDaily.date))
    .all();
}

export async function getSleepLog(date: string) {
  const rows = await db.select().from(sleepLog)
    .where(and(eq(sleepLog.date, date), eq(sleepLog.source, 'oura')))
    .all();
  return rows[0] ?? null;
}

export async function getSleepHistory(startDate: string, endDate: string) {
  return db.select().from(sleepLog)
    .where(and(
      gte(sleepLog.date, startDate),
      lte(sleepLog.date, endDate),
      eq(sleepLog.source, 'oura'),
    ))
    .orderBy(desc(sleepLog.date))
    .all();
}
