import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/db';
import { mealLog, dailyLog, sleepLog, recipes } from '@/db/schema';
import { between, eq } from 'drizzle-orm';
import { format, subDays } from 'date-fns';

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set in .env.local' }, { status: 500 });
  }

  const today = format(new Date(), 'yyyy-MM-dd');
  const weekAgo = format(subDays(new Date(), 6), 'yyyy-MM-dd');

  // Gather last 7 days of data
  const [meals, dailyLogs, sleepLogs] = await Promise.all([
    db
      .select({ meal: mealLog, recipe: recipes })
      .from(mealLog)
      .leftJoin(recipes, eq(mealLog.recipeId, recipes.id))
      .where(between(mealLog.date, weekAgo, today))
      .all(),
    db
      .select()
      .from(dailyLog)
      .where(between(dailyLog.date, weekAgo, today))
      .all(),
    db
      .select()
      .from(sleepLog)
      .where(between(sleepLog.date, weekAgo, today))
      .all(),
  ]);

  // Aggregate by day
  const days: Record<string, {
    calories: number; protein: number; meals: string[];
    steps: number; water: number; coffee: number;
    sleep?: { score?: number; totalSleep?: number; hrv?: number };
  }> = {};

  for (const { meal, recipe } of meals) {
    if (meal.person !== 'me') continue;
    if (!days[meal.date]) days[meal.date] = { calories: 0, protein: 0, meals: [], steps: 0, water: 0, coffee: 0 };
    const name = recipe?.name ?? meal.customName ?? 'Unknown';
    const servings = meal.servingsConsumed ?? 1;
    // Only count custom-entry calories (recipe nutrition requires joining ingredients)
    const cal = (meal.customCalories ?? 0) * servings;
    const prot = (meal.customProtein ?? 0) * servings;
    days[meal.date].calories += cal;
    days[meal.date].protein += prot;
    days[meal.date].meals.push(name);
  }

  for (const log of dailyLogs) {
    if (log.person !== 'me') continue;
    if (!days[log.date]) days[log.date] = { calories: 0, protein: 0, meals: [], steps: 0, water: 0, coffee: 0 };
    days[log.date].steps = log.steps ?? 0;
    days[log.date].water = log.waterOz ?? 0;
    days[log.date].coffee = log.coffee ?? 0;
  }

  for (const s of sleepLogs) {
    if (!days[s.date]) days[s.date] = { calories: 0, protein: 0, meals: [], steps: 0, water: 0, coffee: 0 };
    days[s.date].sleep = {
      score: s.score ?? undefined,
      totalSleep: s.totalSleep ?? undefined,
      hrv: s.hrv ?? undefined,
    };
  }

  const summary = Object.entries(days)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => {
      const sleepStr = d.sleep
        ? `, sleep score ${d.sleep.score ?? '?'}, ${d.sleep.totalSleep ? Math.floor(d.sleep.totalSleep / 60) + 'h' + (d.sleep.totalSleep % 60) + 'm' : '?'}, HRV ${d.sleep.hrv ?? '?'}`
        : '';
      const calStr = d.calories > 0 ? `${Math.round(d.calories)} kcal, ${Math.round(d.protein)}g protein, ` : '';
      return `${date}: ${calStr}${d.steps.toLocaleString()} steps, ${d.water}oz water, ${d.coffee} coffees${sleepStr}. Ate: ${d.meals.slice(0, 5).join(', ') || 'nothing logged'}`;
    })
    .join('\n');

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [
      {
        role: 'user',
        content: `Here's my health data for the past 7 days (${weekAgo} to ${today}):\n\n${summary}\n\nGive me a concise weekly digest in 3 sections:\n1. **Wins** (2-3 things I did well)\n2. **Watch** (1-2 areas to improve)\n3. **This Week** (one specific, actionable tip)\n\nBe direct and personal. No filler. Under 200 words total.`,
      },
    ],
  });

  const digest = message.content[0].type === 'text' ? message.content[0].text : '';

  return NextResponse.json({
    digest,
    period: { start: weekAgo, end: today },
    generatedAt: new Date().toISOString(),
  });
}
