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

  const updates: Record<string, { steps?: number; waterOz?: number }> = {};

  for (const metric of metrics) {
    const nameLower = metric.name.toLowerCase().replace(/\s+/g, '');
    console.log('[health-sync] processing metric:', metric.name, '→', nameLower, 'data points:', metric.data?.length);

    if (nameLower === 'stepcount' || nameLower === 'step_count' || nameLower === 'steps') {
      // Sum all minute-by-minute readings per day
      for (const dp of metric.data) {
        const date = parseDate(dp.date);
        updates[date] = updates[date] ?? {};
        updates[date].steps = (updates[date].steps ?? 0) + Math.round(getValue(dp));
      }
    }

    if (nameLower === 'dietarywater' || nameLower === 'water' || nameLower === 'dietarywater(l)') {
      for (const dp of metric.data) {
        const date = parseDate(dp.date);
        updates[date] = updates[date] ?? {};
        const val = getValue(dp);
        const oz = val > 50 ? Math.round(val) : Math.round(val * 33.814);
        updates[date].waterOz = (updates[date].waterOz ?? 0) + oz;
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
