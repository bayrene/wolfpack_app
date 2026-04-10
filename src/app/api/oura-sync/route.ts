import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sleepLog } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { format, subDays } from 'date-fns';

const OURA_BASE = 'https://api.ouraring.com/v2/usercollection';

async function ouraFetch(path: string, token: string) {
  const res = await fetch(`${OURA_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Oura API error: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function POST() {
  const token = process.env.OURA_TOKEN;
  if (!token) return NextResponse.json({ error: 'OURA_TOKEN not set' }, { status: 500 });

  // Fetch last 90 days
  const end = format(new Date(), 'yyyy-MM-dd');
  const start = format(subDays(new Date(), 90), 'yyyy-MM-dd');

  const [sleepData, dailySleepData] = await Promise.all([
    ouraFetch(`/sleep?start_date=${start}&end_date=${end}`, token),
    ouraFetch(`/daily_sleep?start_date=${start}&end_date=${end}`, token),
  ]);

  // Map daily_sleep by day for score + contributors
  const dailyMap: Record<string, { score: number; contributors: Record<string, number> }> = {};
  for (const d of dailySleepData.data ?? []) {
    dailyMap[d.day] = { score: d.score, contributors: d.contributors };
  }

  // Only use "long_sleep" periods (period === 0 is the main sleep, not naps)
  const mainSleeps = (sleepData.data ?? []).filter((s: Record<string, unknown>) => s.period === 0);

  let upserted = 0;
  for (const s of mainSleeps) {
    const day: string = s.day as string;
    const daily = dailyMap[day];

    // Parse bedtime/wake as local HH:MM
    const bedtime = s.bedtime_start ? (s.bedtime_start as string).slice(11, 16) : undefined;
    const wakeTime = s.bedtime_end ? (s.bedtime_end as string).slice(11, 16) : undefined;

    const totalSleep = s.total_sleep_duration != null
      ? Math.round((s.total_sleep_duration as number) / 60)
      : undefined;

    const data = {
      date: day,
      bedtime,
      wakeTime,
      totalSleep,
      score: daily?.score ?? undefined,
      efficiency: s.efficiency as number ?? undefined,
      latency: s.latency != null ? Math.round((s.latency as number) / 60) : undefined,
      remSleep: s.rem_sleep_duration != null ? Math.round((s.rem_sleep_duration as number) / 60) : undefined,
      deepSleep: s.deep_sleep_duration != null ? Math.round((s.deep_sleep_duration as number) / 60) : undefined,
      lightSleep: s.light_sleep_duration != null ? Math.round((s.light_sleep_duration as number) / 60) : undefined,
      awakeDuration: s.awake_time != null ? Math.round((s.awake_time as number) / 60) : undefined,
      restfulness: daily?.contributors?.restfulness ?? undefined,
      hrv: s.average_hrv as number ?? undefined,
      restingHeartRate: s.lowest_heart_rate as number ?? undefined,
      tempDeviation: s.readiness?.temperature_deviation as number ?? undefined,
      respiratoryRate: s.average_breath as number ?? undefined,
      source: 'oura',
    };

    // Upsert: delete existing entry for this day from Oura then re-insert
    const allForDay = await db.select().from(sleepLog)
      .where(eq(sleepLog.date, day))
      .all();
    const existing = allForDay.find(r => r.source === 'oura');

    if (existing) {
      await db.update(sleepLog).set(data).where(eq(sleepLog.id, existing.id)).run();
    } else {
      await db.insert(sleepLog).values(data).run();
    }
    upserted++;
  }

  revalidatePath('/habits');
  revalidatePath('/sleep');

  return NextResponse.json({ synced: upserted, start, end });
}
