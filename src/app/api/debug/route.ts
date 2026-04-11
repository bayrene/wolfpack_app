import { NextResponse } from 'next/server';
import { db } from '@/db';
import { dailyLog } from '@/db/schema';
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

  return NextResponse.json({ date, todayRow: rows[0] ?? null, recent });
}
