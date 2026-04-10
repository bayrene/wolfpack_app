'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, TrendingUp, Target, Droplets } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format, subDays, parseISO } from 'date-fns';
import { WATER_TARGET } from '@/lib/constants';

interface DayData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  vitaminA: number;
  vitaminC: number;
  vitaminD: number;
  vitaminB12: number;
  iron: number;
  zinc: number;
  calcium: number;
  magnesium: number;
  potassium: number;
  meals: { name: string; mealType: string; calories: number; protein: number; carbs: number; fat: number; servings: number }[];
  waterOz: number;
}

interface MicroTargets {
  vitaminA: number;
  vitaminC: number;
  vitaminD: number;
  vitaminB12: number;
  iron: number;
  zinc: number;
  calcium: number;
  magnesium: number;
  potassium: number;
}

interface Props {
  today: string;
  dailyData: DayData[];
  targets: { calories: number; protein: number; carbs: number; fat: number };
  microTargets: MicroTargets;
  fastFoodBaseline: number;
  embedded?: boolean;
}

const COLORS = {
  calories: '#E07A3A',
  protein: '#3A8A5C',
  carbs: '#2A9D8F',
  fat: '#7C3AED',
};

const MICRO_KEYS = ['vitaminA', 'vitaminC', 'vitaminD', 'vitaminB12', 'iron', 'zinc', 'calcium', 'magnesium', 'potassium'] as const;

const MICRO_BAR_CONFIG = [
  { key: 'vitaminA' as const, label: 'Vitamin A', color: '#F59E0B', unit: 'mcg' },
  { key: 'vitaminC' as const, label: 'Vitamin C', color: '#F97316', unit: 'mg' },
  { key: 'vitaminD' as const, label: 'Vitamin D', color: '#EAB308', unit: 'mcg' },
  { key: 'vitaminB12' as const, label: 'Vitamin B12', color: '#EC4899', unit: 'mcg' },
  { key: 'iron' as const, label: 'Iron', color: '#8B5CF6', unit: 'mg' },
  { key: 'zinc' as const, label: 'Zinc', color: '#6366F1', unit: 'mg' },
  { key: 'calcium' as const, label: 'Calcium', color: '#A8A29E', unit: 'mg' },
  { key: 'magnesium' as const, label: 'Magnesium', color: '#14B8A6', unit: 'mg' },
  { key: 'potassium' as const, label: 'Potassium', color: '#06B6D4', unit: 'mg' },
];

export function NutritionClient({ today, dailyData, targets, microTargets, fastFoodBaseline, embedded }: Props) {
  const [view, setView] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [showDailyMicros, setShowDailyMicros] = useState(false);
  const [showWeeklyMicros, setShowWeeklyMicros] = useState(false);
  const [showMonthlyMicros, setShowMonthlyMicros] = useState(false);

  const todayData = dailyData.find((d) => d.date === today) ?? {
    date: today,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    vitaminA: 0,
    vitaminC: 0,
    vitaminD: 0,
    vitaminB12: 0,
    iron: 0,
    zinc: 0,
    calcium: 0,
    magnesium: 0,
    potassium: 0,
    meals: [],
    waterOz: 0,
  };

  // Last 7 days for weekly view
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const dateStr = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
    return dailyData.find((d) => d.date === dateStr) ?? { date: dateStr, calories: 0, protein: 0, carbs: 0, fat: 0, vitaminA: 0, vitaminC: 0, vitaminD: 0, vitaminB12: 0, iron: 0, zinc: 0, calcium: 0, magnesium: 0, potassium: 0, meals: [], waterOz: 0 };
  });

  const weeklyAvg = {
    calories: Math.round(last7.reduce((s, d) => s + d.calories, 0) / 7),
    protein: Math.round(last7.reduce((s, d) => s + d.protein, 0) / 7),
    carbs: Math.round(last7.reduce((s, d) => s + d.carbs, 0) / 7),
    fat: Math.round(last7.reduce((s, d) => s + d.fat, 0) / 7),
  };

  // Macro pie chart data
  const macroData = [
    { name: 'Protein', value: todayData.protein * 4, color: COLORS.protein },
    { name: 'Carbs', value: todayData.carbs * 4, color: COLORS.carbs },
    { name: 'Fat', value: todayData.fat * 9, color: COLORS.fat },
  ];

  // Protein streak
  let proteinStreak = 0;
  for (let i = dailyData.length - 1; i >= 0; i--) {
    if (dailyData[i].protein >= targets.protein) proteinStreak++;
    else break;
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
              Nutrition
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
              Track your daily macros and trends
            </p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
          {(['daily', 'weekly', 'monthly'] as const).map((v) => (
            <Button
              key={v}
              size="sm"
              variant={view === v ? 'default' : 'ghost'}
              onClick={() => setView(v)}
              className="text-xs capitalize"
            >
              {v}
            </Button>
          ))}
        </div>
      </div>

      {/* Daily View */}
      {view === 'daily' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Macro donut */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Macro Split</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={macroData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="value"
                        stroke="none"
                      >
                        {macroData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 text-xs">
                  {macroData.map((m) => (
                    <div key={m.name} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                      {m.name}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Numeric breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Today&apos;s Totals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: 'Calories', value: todayData.calories, target: targets.calories, color: COLORS.calories, unit: '' },
                  { label: 'Protein', value: todayData.protein, target: targets.protein, color: COLORS.protein, unit: 'g' },
                  { label: 'Carbs', value: todayData.carbs, target: targets.carbs, color: COLORS.carbs, unit: 'g' },
                  { label: 'Fat', value: todayData.fat, target: targets.fat, color: COLORS.fat, unit: 'g' },
                ].map(({ label, value, target, color, unit }) => (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{label}</span>
                      <span className="text-neutral-500">
                        {value}{unit} / {target}{unit}
                      </span>
                    </div>
                    <Progress value={(value / target) * 100} indicatorClassName={`bg-[${color}]`} />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setShowDailyMicros(!showDailyMicros)}
                  className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors w-full text-left mt-1"
                >
                  {showDailyMicros ? 'Hide micros \u25B4' : 'Show micros \u25BE'}
                </button>
                {showDailyMicros && (
                  <div className="space-y-3 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                    {MICRO_BAR_CONFIG.map(({ key, label, color, unit }) => (
                      <div key={key}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium">{label}</span>
                          <span className="text-neutral-500">
                            {todayData[key]}{unit} / {microTargets[key]}{unit}
                          </span>
                        </div>
                        <Progress
                          value={Math.min((todayData[key] / microTargets[key]) * 100, 100)}
                          indicatorStyle={{ backgroundColor: color }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Water progress */}
          {todayData.waterOz > 0 && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 mb-2">
                  <Droplets className="w-4 h-4 text-[#0EA5E9]" />
                  <p className="text-sm font-medium">Water</p>
                  <span className="text-xs text-neutral-500 ml-auto">{todayData.waterOz} / {WATER_TARGET} oz</span>
                </div>
                <Progress value={Math.min((todayData.waterOz / WATER_TARGET) * 100, 100)} indicatorClassName="bg-[#0EA5E9]" />
              </CardContent>
            </Card>
          )}

          {/* Today's meals list */}
          {todayData.meals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Meals Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {todayData.meals.map((m, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {m.servings > 1 && <span className="text-neutral-500">{m.servings}x </span>}
                            {m.name}
                          </p>
                        </div>
                        <Badge variant={m.mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack'} className="text-[10px] mt-0.5 capitalize">
                          {m.mealType}
                        </Badge>
                      </div>
                      <div className="text-right text-xs text-neutral-500 flex-shrink-0 ml-3">
                        <p className="font-medium text-neutral-700 dark:text-neutral-300">{m.calories} cal</p>
                        <p>{m.protein}g P / {m.carbs}g C / {m.fat}g F</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Weekly View */}
      {view === 'weekly' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Calories — Last 7 Days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={last7}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => format(parseISO(d), 'EEE')}
                      fontSize={12}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip
                      labelFormatter={(d) => format(parseISO(d as string), 'EEE, MMM d')}
                    />
                    <Bar dataKey="calories" fill={COLORS.calories} radius={[4, 4, 0, 0]} />
                    <Line
                      type="monotone"
                      dataKey={() => targets.calories}
                      stroke="#999"
                      strokeDasharray="5 5"
                      dot={false}
                      name="Target"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Weekly averages */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Avg Calories', value: weeklyAvg.calories, unit: '', color: COLORS.calories },
              { label: 'Avg Protein', value: weeklyAvg.protein, unit: 'g', color: COLORS.protein },
              { label: 'Avg Carbs', value: weeklyAvg.carbs, unit: 'g', color: COLORS.carbs },
              { label: 'Avg Fat', value: weeklyAvg.fat, unit: 'g', color: COLORS.fat },
            ].map(({ label, value, unit, color }) => (
              <Card key={label}>
                <CardContent className="py-4 text-center">
                  <p className="text-2xl font-bold" style={{ color }}>{value}<span className="text-sm font-normal text-neutral-500">{unit}</span></p>
                  <p className="text-xs text-neutral-500 mt-1">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Protein bar chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Protein — Last 7 Days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={last7}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => format(parseISO(d), 'EEE')}
                      fontSize={12}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip labelFormatter={(d) => format(parseISO(d as string), 'EEE, MMM d')} />
                    <Bar dataKey="protein" fill={COLORS.protein} radius={[4, 4, 0, 0]} />
                    <Line
                      type="monotone"
                      dataKey={() => targets.protein}
                      stroke="#999"
                      strokeDasharray="5 5"
                      dot={false}
                      name="Target"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Micronutrient Averages */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                <button
                  type="button"
                  onClick={() => setShowWeeklyMicros(!showWeeklyMicros)}
                  className="flex items-center gap-2 w-full text-left"
                >
                  Micronutrient Averages
                  <span className="text-xs text-neutral-500 font-normal">
                    {showWeeklyMicros ? '\u25B4' : '\u25BE'}
                  </span>
                </button>
              </CardTitle>
            </CardHeader>
            {showWeeklyMicros && (
              <CardContent className="space-y-3">
                {MICRO_BAR_CONFIG.map(({ key, label, color, unit }) => {
                  const avg = Math.round(last7.reduce((s, d) => s + d[key], 0) / 7 * 10) / 10;
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{label}</span>
                        <span className="text-neutral-500">
                          {avg}{unit} / {microTargets[key]}{unit}
                        </span>
                      </div>
                      <Progress
                        value={Math.min((avg / microTargets[key]) * 100, 100)}
                        indicatorStyle={{ backgroundColor: color }}
                      />
                    </div>
                  );
                })}
              </CardContent>
            )}
          </Card>
        </div>
      )}

      {/* Monthly View */}
      {view === 'monthly' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">30-Day Calorie Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dailyData.slice(-30)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => format(parseISO(d), 'd')}
                      fontSize={11}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip labelFormatter={(d) => format(parseISO(d as string), 'MMM d')} />
                    <Bar dataKey="calories" fill={COLORS.calories} radius={[2, 2, 0, 0]} />
                    <Line
                      type="monotone"
                      dataKey={() => targets.calories}
                      stroke="#999"
                      strokeDasharray="5 5"
                      dot={false}
                      name="Target"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {proteinStreak > 0 && (
            <Card className="bg-[#3A8A5C]/10 border-[#3A8A5C]/30">
              <CardContent className="py-4 flex items-center gap-3">
                <Target className="w-6 h-6 text-[#3A8A5C]" />
                <div>
                  <p className="font-semibold text-[#3A8A5C]">
                    {proteinStreak} day protein streak!
                  </p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    You&apos;ve hit your protein target {proteinStreak} days in a row
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Monthly averages */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monthly Averages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-center">
                {[
                  { label: 'Calories', value: dailyData.length > 0 ? Math.round(dailyData.reduce((s, d) => s + d.calories, 0) / dailyData.length) : 0 },
                  { label: 'Protein', value: dailyData.length > 0 ? Math.round(dailyData.reduce((s, d) => s + d.protein, 0) / dailyData.length) : 0 },
                  { label: 'Carbs', value: dailyData.length > 0 ? Math.round(dailyData.reduce((s, d) => s + d.carbs, 0) / dailyData.length) : 0 },
                  { label: 'Fat', value: dailyData.length > 0 ? Math.round(dailyData.reduce((s, d) => s + d.fat, 0) / dailyData.length) : 0 },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xl font-bold">{value}</p>
                    <p className="text-xs text-neutral-500">{label}/day</p>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowMonthlyMicros(!showMonthlyMicros)}
                className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors w-full text-left mt-4"
              >
                {showMonthlyMicros ? 'Hide micros \u25B4' : 'Show micros \u25BE'}
              </button>
              {showMonthlyMicros && (
                <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-center">
                  {MICRO_BAR_CONFIG.map(({ key, label, color, unit }) => {
                    const avg = dailyData.length > 0
                      ? Math.round(dailyData.reduce((s, d) => s + d[key], 0) / dailyData.length * 10) / 10
                      : 0;
                    return (
                      <div key={key}>
                        <p className="text-sm font-bold" style={{ color }}>{avg}<span className="text-xs font-normal text-neutral-500">{unit}</span></p>
                        <p className="text-[10px] text-neutral-500">{label}/day</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
