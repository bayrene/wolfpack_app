import { NextResponse } from 'next/server';
import { db } from '@/db';
import { dailyLog, sleepLog } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') ?? new Date().toISOString().substring(0, 10);

  const rows = await db
    .select()
    .from(dailyLog)
    .where(and(eq(dailyLog.date, date), eq(dailyLog.person, 'me')))
    .all();

  const recent = await db
    .select()
    .from(dailyLog)
    .where(eq(dailyLog.person, 'me'))
    .orderBy(desc(dailyLog.date))
    .limit(5)
    .all();

  const recentSleep = await db
    .select({ date: sleepLog.date, source: sleepLog.source, score: sleepLog.score, totalSleep: sleepLog.totalSleep })
    .from(sleepLog)
    .orderBy(desc(sleepLog.date))
    .limit(15)
    .all();

  return NextResponse.json({ date, todayRow: rows[0] ?? null, recent, recentSleep });
}

// PATCH /api/debug?date=2026-04-11&steps=150
// Directly fix a value in the DB for debugging
export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') ?? new Date().toISOString().substring(0, 10);
  const steps = searchParams.get('steps');

  if (!steps) return NextResponse.json({ error: 'steps param required' }, { status: 400 });

  const existing = await db
    .select()
    .from(dailyLog)
    .where(and(eq(dailyLog.date, date), eq(dailyLog.person, 'me')))
    .get();

  if (existing) {
    await db.update(dailyLog).set({ steps: parseInt(steps) }).where(eq(dailyLog.id, existing.id)).run();
  } else {
    await db.insert(dailyLog).values({ date, person: 'me', steps: parseInt(steps) }).run();
  }

  return NextResponse.json({ ok: true, date, steps: parseInt(steps) });
}
