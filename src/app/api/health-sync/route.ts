import { NextResponse } from 'next/server';
import { db } from '@/db';
import { dailyLog } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

interface HealthDataPoint {
  date: string;
  qty?: number;
  Avg?: number;
  Min?: number;
  Max?: number;
  source?: string;
}

interface HealthMetric {
  name: string;
  units?: string;
  data: HealthDataPoint[];
}

interface HealthExportPayload {
  data?: HealthMetric[] | { metrics?: HealthMetric[] };
  metrics?: HealthMetric[];
}

function parseDate(raw: string): string {
  return raw.substring(0, 10);
}

function getValue(dp: HealthDataPoint): number {
  return dp.qty ?? dp.Avg ?? dp.Max ?? 0;
}

export async function POST(req: Request) {
  const secret = process.env.HEALTH_SYNC_SECRET;
  if (secret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  let body: HealthExportPayload;
  try {
    const text = await req.text();
    console.log('[health-sync] raw body:', text.substring(0, 500));
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  console.log('[health-sync] keys:', Object.keys(body));
  // Health Auto Export sends { data: { metrics: [...] } } or { data: [...] } or { metrics: [...] }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = body as any;
  const metrics: HealthMetric[] = raw?.data?.metrics ?? body.data ?? body.metrics ?? [];
  console.log('[health-sync] metrics count:', metrics.length);
  console.log('[health-sync] metric names:', metrics.map(m => m.name).join(', '));

  const updates: Record<string, { steps?: number; waterOz?: number; weightLbs?: number; restingHeartRate?: number; caffeineMg?: number; workoutMinutes?: number }> = {};

  for (const metric of metrics) {
    const nameLower = metric.name.toLowerCase().replace(/\s+/g, '');
    console.log('[health-sync] processing metric:', metric.name, '→', nameLower, 'data points:', metric.data?.length);

    if (nameLower === 'stepcount' || nameLower === 'step_count' || nameLower === 'steps') {
      // Separate Oura-sourced points from device (iPhone/Watch) points
      // Apple Health consolidates Oura step data differently — prefer device sources
      const byDateDevice: Record<string, number[]> = {};
      const byDateOura: Record<string, number[]> = {};
      for (const dp of metric.data) {
        const date = parseDate(dp.date);
        const src = (dp.source ?? '').toLowerCase();
        const isOura = src.includes('oura');
        if (isOura) {
          byDateOura[date] = byDateOura[date] ?? [];
          byDateOura[date].push(Math.round(getValue(dp)));
        } else {
          byDateDevice[date] = byDateDevice[date] ?? [];
          byDateDevice[date].push(Math.round(getValue(dp)));
        }
      }
      // Collect all dates across both buckets
      const allDates = new Set([...Object.keys(byDateDevice), ...Object.keys(byDateOura)]);
      for (const date of allDates) {
        updates[date] = updates[date] ?? {};
        const deviceVals = byDateDevice[date] ?? [];
        const ouraVals = byDateOura[date] ?? [];
        // Prefer device source; fall back to Oura if no device data
        const vals = deviceVals.length > 0 ? deviceVals : ouraVals;
        updates[date].steps = vals.reduce((a, b) => a + b, 0);
        console.log(`[health-sync] steps ${date}: device=${deviceVals.reduce((a,b)=>a+b,0)} (${deviceVals.length}pts) oura=${ouraVals.reduce((a,b)=>a+b,0)} (${ouraVals.length}pts) → using ${deviceVals.length > 0 ? 'device' : 'oura'}: ${updates[date].steps}`);
      }
    }

    if (nameLower === 'dietarywater' || nameLower === 'water' || nameLower === 'dietarywater(l)' || nameLower === 'dietary_water') {
      const units = metric.units?.toLowerCase() ?? '';
      for (const dp of metric.data) {
        const date = parseDate(dp.date);
        updates[date] = updates[date] ?? {};
        const val = getValue(dp);
        let oz: number;
        if (units.includes('cup')) {
          oz = Math.round(val * 8);
        } else if (units.includes('ml') || units.includes('milliliter')) {
          oz = Math.round(val * 0.033814);
        } else if (units.includes('fl_oz') || units === 'oz' || units.includes('fluid')) {
          oz = Math.round(val);
        } else {
          // Default: liters (Apple Health standard)
          oz = val > 50 ? Math.round(val) : Math.round(val * 33.814);
        }
        updates[date].waterOz = (updates[date].waterOz ?? 0) + oz;
      }
    }

    // Weight — take the last reading of the day (most recent)
    if (nameLower === 'body_mass' || nameLower === 'bodymass' || nameLower === 'weight' || nameLower === 'weight_body_mass' || nameLower === 'weightbodymass') {
      for (const dp of metric.data) {
        const date = parseDate(dp.date);
        updates[date] = updates[date] ?? {};
        const val = getValue(dp);
        // Convert kg→lbs only if units say kg; Imperial Health setups send lbs directly
        const isKg = metric.units?.toLowerCase().includes('kg') || metric.units?.toLowerCase() === 'g';
        updates[date].weightLbs = isKg ? Math.round(val * 2.20462 * 10) / 10 : Math.round(val * 10) / 10;
      }
    }

    // Resting heart rate
    if (nameLower === 'resting_heart_rate' || nameLower === 'restingheartrate') {
      for (const dp of metric.data) {
        const date = parseDate(dp.date);
        updates[date] = updates[date] ?? {};
        updates[date].restingHeartRate = Math.round(getValue(dp));
      }
    }

    // Caffeine — sum all intake per day, convert mg
    if (nameLower === 'dietary_caffeine' || nameLower === 'dietarycaffeine' || nameLower === 'caffeine') {
      for (const dp of metric.data) {
        const date = parseDate(dp.date);
        updates[date] = updates[date] ?? {};
        updates[date].caffeineMg = (updates[date].caffeineMg ?? 0) + Math.round(getValue(dp));
      }
    }

    // Workout / exercise time in minutes
    if (nameLower === 'apple_exercise_time' || nameLower === 'appleexercisetime' || nameLower === 'exercise_time' || nameLower === 'workout_minutes') {
      for (const dp of metric.data) {
        const date = parseDate(dp.date);
        updates[date] = updates[date] ?? {};
        updates[date].workoutMinutes = (updates[date].workoutMinutes ?? 0) + Math.round(getValue(dp));
      }
    }
  }

  console.log('[health-sync] updates:', JSON.stringify(updates));

  let upserted = 0;
  for (const [date, vals] of Object.entries(updates)) {
    const existing = await db
      .select()
      .from(dailyLog)
      .where(and(eq(dailyLog.date, date), eq(dailyLog.person, 'me')))
      .get();

    if (existing) {
      await db.update(dailyLog)
        .set({ ...vals })
        .where(eq(dailyLog.id, existing.id))
        .run();
    } else {
      await db.insert(dailyLog)
        .values({ date, person: 'me', ...vals })
        .run();
    }
    upserted++;
  }

  revalidatePath('/');
  revalidatePath('/progress');

  return NextResponse.json({ ok: true, datesUpdated: upserted, metricsReceived: metrics.map(m => m.name) });
}
