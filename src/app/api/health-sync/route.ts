import { NextResponse } from 'next/server';
import { db } from '@/db';
import { dailyLog } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// Health Auto Export sends data in this format:
// { data: [ { name: "StepCount", units: "count", data: [{ date: "2025-...", qty: 12345 }] } ] }
// Or the "Export All" format with multiple metrics

interface HealthDataPoint {
  date: string; // ISO 8601 like "2025-04-10 00:00:00 -0500"
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
  data?: HealthMetric[];
  metrics?: HealthMetric[];
}

function parseDate(raw: string): string {
  // "2025-04-10 08:23:00 -0500" → "2025-04-10"
  return raw.substring(0, 10);
}

function getValue(dp: HealthDataPoint): number {
  return dp.qty ?? dp.Avg ?? dp.Max ?? 0;
}

export async function POST(req: Request) {
  // Optional secret check
  const secret = process.env.HEALTH_SYNC_SECRET;
  if (secret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  let body: HealthExportPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const metrics: HealthMetric[] = body.data ?? body.metrics ?? [];
  const updates: Record<string, { steps?: number; waterOz?: number }> = {};

  for (const metric of metrics) {
    const key = metric.name.toLowerCase().replace(/\s+/g, '_');

    if (key === 'stepcount' || key === 'step_count' || metric.name === 'StepCount') {
      for (const dp of metric.data) {
        const date = parseDate(dp.date);
        updates[date] = updates[date] ?? {};
        updates[date].steps = Math.round(getValue(dp));
      }
    }

    if (
      key === 'dietarywater' || key === 'dietary_water' ||
      metric.name === 'DietaryWater' || metric.name === 'Water'
    ) {
      for (const dp of metric.data) {
        const date = parseDate(dp.date);
        updates[date] = updates[date] ?? {};
        // Health Auto Export reports water in liters; convert to oz (1L = 33.814 oz)
        const liters = getValue(dp);
        updates[date].waterOz = Math.round(liters * 33.814);
      }
    }
  }

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

  return NextResponse.json({ ok: true, datesUpdated: upserted });
}
