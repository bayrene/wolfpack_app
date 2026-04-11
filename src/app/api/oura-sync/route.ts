import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sleepLog, ouraDaily } from '@/db/schema';
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

export async function GET() {
  return POST();
}

export async function POST() {
  const token = process.env.OURA_TOKEN;
  if (!token) return NextResponse.json({ error: 'OURA_TOKEN not set' }, { status: 500 });

  // Fetch last 90 days
  const end = format(new Date(), 'yyyy-MM-dd');
  const start = format(subDays(new Date(), 90), 'yyyy-MM-dd');

  const [sleepData, dailySleepData, readinessData, stressData, activityData] = await Promise.all([
    ouraFetch(`/sleep?start_date=${start}&end_date=${end}`, token),
    ouraFetch(`/daily_sleep?start_date=${start}&end_date=${end}`, token),
    ouraFetch(`/daily_readiness?start_date=${start}&end_date=${end}`, token),
    ouraFetch(`/daily_stress?start_date=${start}&end_date=${end}`, token),
    ouraFetch(`/daily_activity?start_date=${start}&end_date=${end}`, token),
  ]);

  // Map daily_sleep by day for score + contributors
  const dailyMap: Record<string, { score: number; contributors: Record<string, number> }> = {};
  for (const d of dailySleepData.data ?? []) {
    dailyMap[d.day] = { score: d.score, contributors: d.contributors };
  }

  // Only use main overnight sleep — type=long_sleep (v2 API) or period=0 (older API)
  // Pick the best sleep per day: prefer long_sleep, fall back to longest duration
  const allSleeps: Record<string, unknown>[] = sleepData.data ?? [];
  console.log('[oura-sync] total sleep sessions:', allSleeps.length, allSleeps.map((s: Record<string, unknown>) => `${s.day} type=${s.type} period=${s.period} dur=${s.total_sleep_duration}`).join(' | '));
  const mainSleepsRaw = allSleeps.filter((s: Record<string, unknown>) =>
    s.type === 'long_sleep' || s.period === 0
  );
  // If still empty, take all (don't filter) — may be using unknown API version
  const mainSleeps = mainSleepsRaw.length > 0 ? mainSleepsRaw : allSleeps;

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

    // Parse sleep_phase_5_min: count transitions TO '1' (awake) from a non-awake state
    const sleepPhases = s.sleep_phase_5_min as string ?? undefined;
    let awakenCount: number | undefined = undefined;
    if (sleepPhases) {
      let count = 0;
      for (let i = 1; i < sleepPhases.length; i++) {
        if (sleepPhases[i] === '1' && sleepPhases[i - 1] !== '1') {
          count++;
        }
      }
      awakenCount = count;
    }

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
      tempDeviation: (s.readiness as Record<string, unknown> | null)?.temperature_deviation as number ?? undefined,
      respiratoryRate: s.average_breath as number ?? undefined,
      sleepPhases,
      awakenCount,
      source: 'oura',
    };

    // Upsert: build explicit update object to avoid Drizzle/Turso spread bug
    const allForDay = await db.select().from(sleepLog)
      .where(eq(sleepLog.date, day))
      .all();
    const existing = allForDay.find(r => r.source === 'oura');

    if (existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateObj: Record<string, any> = {};
      if (data.bedtime !== undefined) updateObj.bedtime = data.bedtime;
      if (data.wakeTime !== undefined) updateObj.wakeTime = data.wakeTime;
      if (data.totalSleep !== undefined) updateObj.totalSleep = data.totalSleep;
      if (data.score !== undefined) updateObj.score = data.score;
      if (data.efficiency !== undefined) updateObj.efficiency = data.efficiency;
      if (data.latency !== undefined) updateObj.latency = data.latency;
      if (data.remSleep !== undefined) updateObj.remSleep = data.remSleep;
      if (data.deepSleep !== undefined) updateObj.deepSleep = data.deepSleep;
      if (data.lightSleep !== undefined) updateObj.lightSleep = data.lightSleep;
      if (data.awakeDuration !== undefined) updateObj.awakeDuration = data.awakeDuration;
      if (data.restfulness !== undefined) updateObj.restfulness = data.restfulness;
      if (data.hrv !== undefined) updateObj.hrv = data.hrv;
      if (data.restingHeartRate !== undefined) updateObj.restingHeartRate = data.restingHeartRate;
      if (data.tempDeviation !== undefined) updateObj.tempDeviation = data.tempDeviation;
      if (data.respiratoryRate !== undefined) updateObj.respiratoryRate = data.respiratoryRate;
      if (data.sleepPhases !== undefined) updateObj.sleepPhases = data.sleepPhases;
      if (data.awakenCount !== undefined) updateObj.awakenCount = data.awakenCount;
      updateObj.source = 'oura';
      await db.update(sleepLog).set(updateObj).where(eq(sleepLog.id, existing.id)).run();
    } else {
      await db.insert(sleepLog).values(data).run();
    }
    upserted++;
  }

  // Backfill from daily_sleep when no detailed /sleep session exists for that day
  // This covers days where the ring syncs a score but no full session data
  const sleepDays = new Set(mainSleeps.map((s: Record<string, unknown>) => s.day as string));
  for (const d of dailySleepData.data ?? []) {
    const day: string = d.day as string;
    if (sleepDays.has(day)) continue; // already have detailed data

    const data = {
      date: day,
      score: d.score as number ?? undefined,
      restfulness: d.contributors?.restfulness as number ?? undefined,
      source: 'oura',
    };

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

  // Upsert readiness into ouraDaily
  let readinessUpserted = 0;
  for (const r of readinessData.data ?? []) {
    const day: string = r.day as string;
    const readinessPayload = {
      readinessScore: r.score as number ?? null,
      readinessContributors: r.contributors ? JSON.stringify(r.contributors) : null,
    };
    const existing = await db.select().from(ouraDaily).where(eq(ouraDaily.date, day)).all();
    if (existing.length > 0) {
      await db.update(ouraDaily).set(readinessPayload).where(eq(ouraDaily.date, day)).run();
    } else {
      await db.insert(ouraDaily).values({ date: day, ...readinessPayload }).run();
    }
    readinessUpserted++;
  }

  // Upsert stress into ouraDaily
  let stressUpserted = 0;
  for (const s of stressData.data ?? []) {
    const day: string = s.day as string;
    const stressPayload = {
      stressScore: s.stress_high != null || s.recovery_high != null
        ? Math.max(0, Math.round(100 - ((s.stress_high ?? 0) / Math.max((s.stress_high ?? 0) + (s.recovery_high ?? 1), 1)) * 100))
        : null,
      stressHigh: s.stress_high != null ? Math.round((s.stress_high as number) / 60) : null,
      stressRecovery: s.recovery_high != null ? Math.round((s.recovery_high as number) / 60) : null,
    };
    const existing = await db.select().from(ouraDaily).where(eq(ouraDaily.date, day)).all();
    if (existing.length > 0) {
      await db.update(ouraDaily).set(stressPayload).where(eq(ouraDaily.date, day)).run();
    } else {
      await db.insert(ouraDaily).values({ date: day, ...stressPayload }).run();
    }
    stressUpserted++;
  }

  // Upsert activity score + steps into ouraDaily, and sync steps → dailyLog
  let activityUpserted = 0;
  for (const a of activityData.data ?? []) {
    const day: string = a.day as string;
    const activityPayload = {
      activityScore: a.score as number ?? null,
    };
    const existing = await db.select().from(ouraDaily).where(eq(ouraDaily.date, day)).all();
    if (existing.length > 0) {
      await db.update(ouraDaily).set(activityPayload).where(eq(ouraDaily.date, day)).run();
    } else {
      await db.insert(ouraDaily).values({ date: day, ...activityPayload }).run();
    }
    activityUpserted++;

  }

  revalidatePath('/');
  revalidatePath('/habits');
  revalidatePath('/sleep');
  revalidatePath('/progress');

  return NextResponse.json({
    synced: upserted,
    readinessUpserted,
    stressUpserted,
    activityUpserted,
    start,
    end,
  });
}
