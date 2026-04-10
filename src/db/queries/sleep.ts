'use server';

import { db } from '@/db';
import { sleepLog } from '@/db/schema';
import { eq, desc, gte, lte, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getAllSleepLogs() {
  return db.select().from(sleepLog).orderBy(desc(sleepLog.date)).all();
}

export async function getSleepLogsForRange(from: string, to: string) {
  return db.select().from(sleepLog)
    .where(and(gte(sleepLog.date, from), lte(sleepLog.date, to)))
    .orderBy(desc(sleepLog.date))
    .all();
}

export async function addSleepLog(data: {
  date: string;
  bedtime?: string;
  wakeTime?: string;
  totalSleep?: number;
  score?: number;
  efficiency?: number;
  latency?: number;
  remSleep?: number;
  deepSleep?: number;
  lightSleep?: number;
  awakeDuration?: number;
  restfulness?: number;
  hrv?: number;
  restingHeartRate?: number;
  tempDeviation?: number;
  respiratoryRate?: number;
  spo2?: number;
  notes?: string;
  source?: string;
}) {
  await db.insert(sleepLog).values(data).run();
  revalidatePath('/habits');
  revalidatePath('/sleep');
}

export async function updateSleepLog(id: number, data: Partial<{
  bedtime: string;
  wakeTime: string;
  totalSleep: number;
  score: number;
  efficiency: number;
  latency: number;
  remSleep: number;
  deepSleep: number;
  lightSleep: number;
  awakeDuration: number;
  restfulness: number;
  hrv: number;
  restingHeartRate: number;
  tempDeviation: number;
  respiratoryRate: number;
  spo2: number;
  notes: string;
}>) {
  await db.update(sleepLog).set(data).where(eq(sleepLog.id, id)).run();
  revalidatePath('/habits');
  revalidatePath('/sleep');
}

export async function deleteSleepLog(id: number) {
  await db.delete(sleepLog).where(eq(sleepLog.id, id)).run();
  revalidatePath('/habits');
  revalidatePath('/sleep');
}
