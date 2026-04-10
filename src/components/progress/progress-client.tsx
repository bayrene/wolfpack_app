'use client';

import React, { useState, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { upsertSteps } from '@/db/queries/daily-log';
import { toast } from 'sonner';
import {
  Flame,
  Footprints,
  Pill,
  DollarSign,
  TrendingUp,
  Star,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, ReferenceLine, Cell,
} from 'recharts';
import { useRouter } from 'next/navigation';
import {
  format, parseISO, subWeeks, addWeeks, subMonths, addMonths,
  endOfMonth, isAfter, startOfWeek, endOfWeek, startOfMonth,
} from 'date-fns';

interface MacroAvg {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MicroAvg {
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

interface StepsStats {
  avgSteps: number;
  totalSteps: number;
  bestDay: number;
  daysAbove10k: number;
}

interface StepsChartEntry {
  date: string;
  steps: number;
}

interface NutritionDaily {
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
}

interface SuppAdherence {
  id: number;
  name: string;
  brand: string;
  daysTaken: number;
  totalDays: number;
  adherencePercent: number;
  sideEffects: string[];
  avgRating: number;
}

interface Props {
  view: 'week' | 'month';
  periodStart: string;
  periodEnd: string;
  macroAvg: MacroAvg;
  microAvg: MicroAvg;
  nutritionDaily: NutritionDaily[];
  stepsStats: StepsStats;
  stepsChart: StepsChartEntry[];
  suppAdherence: SuppAdherence[];
  spend: number;
  fastFood: number;
  targets: MacroAvg;
  microTargets: MicroTargets;
  stepsTarget: number;
}

const MICRO_CONFIG = [
  { key: 'vitaminA' as const, label: 'Vitamin A', unit: 'mcg' },
  { key: 'vitaminC' as const, label: 'Vitamin C', unit: 'mg' },
  { key: 'vitaminD' as const, label: 'Vitamin D', unit: 'mcg' },
  { key: 'vitaminB12' as const, label: 'B12', unit: 'mcg' },
  { key: 'iron' as const, label: 'Iron', unit: 'mg' },
  { key: 'zinc' as const, label: 'Zinc', unit: 'mg' },
  { key: 'calcium' as const, label: 'Calcium', unit: 'mg' },
  { key: 'magnesium' as const, label: 'Magnesium', unit: 'mg' },
  { key: 'potassium' as const, label: 'Potassium', unit: 'mg' },
];

function computeStreak(dailyData: NutritionDaily[], key: 'protein', target: number): number {
  const sorted = [...dailyData].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  for (const d of sorted) {
    if (d[key] >= target) streak++;
    else break;
  }
  return streak;
}

function computeStepsStreak(data: StepsChartEntry[], target: number): number {
  const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  for (const d of sorted) {
    if (d.steps >= target) streak++;
    else break;
  }
  return streak;
}

function computeSuppStreak(adherenceData: SuppAdherence[]): number {
  if (adherenceData.length === 0) return 0;
  return Math.min(...adherenceData.map(s => s.daysTaken));
}

function shortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ProgressClient({
  view, periodStart, periodEnd,
  macroAvg, microAvg,
  nutritionDaily,
  stepsStats,
  stepsChart,
  suppAdherence,
  spend, fastFood,
  targets, microTargets, stepsTarget,
}: Props) {
  const router = useRouter();
  const [editingStepsDate, setEditingStepsDate] = useState<string | null>(null);
  const [editingStepsValue, setEditingStepsValue] = useState('');
  const [localStepsChart, setLocalStepsChart] = useState(stepsChart);
  const [isPending, startTransition] = useTransition();

  const handleStepsEdit = (date: string, currentSteps: number) => {
    setEditingStepsDate(date);
    setEditingStepsValue(String(currentSteps));
  };

  const saveStepsEdit = () => {
    if (!editingStepsDate) return;
    const val = parseInt(editingStepsValue, 10);
    if (isNaN(val) || val < 0) {
      setEditingStepsDate(null);
      return;
    }
    // Optimistic update
    setLocalStepsChart(prev => prev.map(e => e.date === editingStepsDate ? { ...e, steps: val } : e));
    const dateToSave = editingStepsDate;
    setEditingStepsDate(null);
    startTransition(async () => {
      await upsertSteps(dateToSave, 'me', val);
      toast.success(`Steps updated for ${shortDate(dateToSave)}`);
    });
  };

  const cancelStepsEdit = () => {
    setEditingStepsDate(null);
  };

  const totalSuppAdherence = suppAdherence.length > 0
    ? Math.round(suppAdherence.reduce((sum, s) => sum + s.adherencePercent, 0) / suppAdherence.length)
    : 0;

  const savings = fastFood - spend;

  const proteinStreak = computeStreak(nutritionDaily, 'protein', targets.protein);
  const stepsStreak = computeStepsStreak(stepsChart, stepsTarget);
  const suppStreak = computeSuppStreak(suppAdherence);

  const costPerMeal = nutritionDaily.length > 0
    ? spend / (nutritionDaily.length * 3)
    : 0;

  // Date navigation
  const today = new Date();

  const goToPrev = () => {
    let newStart: string;
    let newEnd: string;
    if (view === 'week') {
      newStart = format(subWeeks(parseISO(periodStart), 1), 'yyyy-MM-dd');
      newEnd = format(subWeeks(parseISO(periodEnd), 1), 'yyyy-MM-dd');
    } else {
      const prevMonthStart = subMonths(parseISO(periodStart), 1);
      newStart = format(startOfMonth(prevMonthStart), 'yyyy-MM-dd');
      newEnd = format(endOfMonth(prevMonthStart), 'yyyy-MM-dd');
    }
    router.push(`/progress?view=${view}&start=${newStart}&end=${newEnd}`);
  };

  const goToNext = () => {
    let newStart: string;
    let newEnd: string;
    if (view === 'week') {
      newStart = format(addWeeks(parseISO(periodStart), 1), 'yyyy-MM-dd');
      newEnd = format(addWeeks(parseISO(periodEnd), 1), 'yyyy-MM-dd');
    } else {
      const nextMonthStart = addMonths(parseISO(periodStart), 1);
      newStart = format(startOfMonth(nextMonthStart), 'yyyy-MM-dd');
      newEnd = format(endOfMonth(nextMonthStart), 'yyyy-MM-dd');
    }
    router.push(`/progress?view=${view}&start=${newStart}&end=${newEnd}`);
  };

  const switchView = (newView: 'week' | 'month') => {
    const refDate = parseISO(periodStart);
    let newStart: string;
    let newEnd: string;
    if (newView === 'week') {
      newStart = format(startOfWeek(refDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      newEnd = format(endOfWeek(refDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    } else {
      newStart = format(startOfMonth(refDate), 'yyyy-MM-dd');
      newEnd = format(endOfMonth(refDate), 'yyyy-MM-dd');
    }
    router.push(`/progress?view=${newView}&start=${newStart}&end=${newEnd}`);
  };

  // Determine if next arrow should be disabled (would go past today)
  const nextPeriodStart = view === 'week'
    ? addWeeks(parseISO(periodStart), 1)
    : addMonths(parseISO(periodStart), 1);
  const nextDisabled = isAfter(nextPeriodStart, today);

  // Date label
  const dateLabel = view === 'week'
    ? `Week of ${format(parseISO(periodStart), 'MMM d')} \u2013 ${format(parseISO(periodEnd), 'MMM d, yyyy')}`
    : format(parseISO(periodStart), 'MMMM yyyy');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
            Progress
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
            Your {view === 'week' ? 'weekly' : 'monthly'} reflection
          </p>
        </div>
        <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
          <Button
            variant={view === 'week' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => switchView('week')}
            className={view === 'week' ? 'bg-[#E07A3A] hover:bg-[#E07A3A]/90 text-white' : ''}
          >
            Week
          </Button>
          <Button
            variant={view === 'month' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => switchView('month')}
            className={view === 'month' ? 'bg-[#E07A3A] hover:bg-[#E07A3A]/90 text-white' : ''}
          >
            Month
          </Button>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-center gap-3">
        <Button variant="ghost" size="icon" onClick={goToPrev} aria-label="Previous period">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 min-w-[200px] text-center">
          {dateLabel}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={goToNext}
          disabled={nextDisabled}
          aria-label="Next period"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Overview Scorecard */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-[#E07A3A]">{macroAvg.calories.toLocaleString()}</p>
            <p className="text-xs text-neutral-500 mt-1">Avg Calories</p>
            <p className="text-[10px] text-neutral-400">target: {targets.calories}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-[#3A8A5C]">{macroAvg.protein}g</p>
            <p className="text-xs text-neutral-500 mt-1">Avg Protein</p>
            <p className="text-[10px] text-neutral-400">target: {targets.protein}g</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-[#2A9D8F]">{stepsStats.avgSteps.toLocaleString()}</p>
            <p className="text-xs text-neutral-500 mt-1">Avg Steps</p>
            <p className="text-[10px] text-neutral-400">target: {stepsTarget.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-[#7C3AED]">{totalSuppAdherence}%</p>
            <p className="text-xs text-neutral-500 mt-1">Supp Adherence</p>
            <p className="text-[10px] text-neutral-400">of days taken</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-[#3A8A5C]">{formatCurrency(savings > 0 ? savings : 0)}</p>
            <p className="text-xs text-neutral-500 mt-1">Saved vs Fast Food</p>
            <p className="text-[10px] text-neutral-400">this {view}</p>
          </CardContent>
        </Card>
      </div>

      {/* Streaks & Wins */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#E07A3A]" />
            Streaks &amp; Wins
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#3A8A5C]/10 flex items-center justify-center text-lg">
                <Flame className="w-5 h-5 text-[#3A8A5C]" />
              </div>
              <div>
                <p className="font-semibold">{proteinStreak} days</p>
                <p className="text-xs text-neutral-500">Protein target streak</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2A9D8F]/10 flex items-center justify-center text-lg">
                <Footprints className="w-5 h-5 text-[#2A9D8F]" />
              </div>
              <div>
                <p className="font-semibold">{stepsStreak} days</p>
                <p className="text-xs text-neutral-500">10k steps streak</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#7C3AED]/10 flex items-center justify-center text-lg">
                <Pill className="w-5 h-5 text-[#7C3AED]" />
              </div>
              <div>
                <p className="font-semibold">{suppStreak} days</p>
                <p className="text-xs text-neutral-500">Supplement streak</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Steps Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Footprints className="w-4 h-4 text-[#2A9D8F]" />
            Steps Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {localStepsChart.length === 0 ? (
            <p className="text-sm text-neutral-500">No steps data for this period.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={localStepsChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => [`${Number(value).toLocaleString()} steps`, 'Steps']}
                    labelFormatter={(label) => shortDate(String(label))}
                  />
                  <ReferenceLine y={stepsTarget} stroke="#2A9D8F" strokeDasharray="5 5" label={{ value: '10k', position: 'right', fontSize: 11 }} />
                  <Bar dataKey="steps" radius={[4, 4, 0, 0]}>
                    {localStepsChart.map((entry, idx) => (
                      <Cell key={idx} fill={entry.steps >= stepsTarget ? '#2A9D8F' : '#2A9D8F80'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Editable daily breakdown */}
          {localStepsChart.length > 0 && (
            <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <p className="text-xs font-medium text-neutral-500 mb-2">Tap the pencil to edit any day</p>
              <div className="space-y-1">
                {localStepsChart.map((entry) => (
                  <div
                    key={entry.date}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${entry.steps >= stepsTarget ? 'bg-[#2A9D8F]' : 'bg-neutral-300 dark:bg-neutral-600'}`} />
                      <span className="text-xs text-neutral-600 dark:text-neutral-400 w-24">
                        {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    {editingStepsDate === entry.date ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={editingStepsValue}
                          onChange={(e) => setEditingStepsValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveStepsEdit();
                            if (e.key === 'Escape') cancelStepsEdit();
                          }}
                          autoFocus
                          className="w-20 text-right text-xs font-semibold bg-white dark:bg-neutral-900 rounded px-2 py-1 border border-[#2A9D8F] focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
                        />
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-[#3A8A5C]" onClick={saveStepsEdit}>
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-neutral-400" onClick={cancelStepsEdit}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold tabular-nums">{entry.steps.toLocaleString()}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-neutral-400 hover:text-[#2A9D8F]"
                          onClick={() => handleStepsEdit(entry.date, entry.steps)}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <div className="text-center">
              <p className="text-lg font-bold">{stepsStats.totalSteps.toLocaleString()}</p>
              <p className="text-xs text-neutral-500">Total</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{stepsStats.avgSteps.toLocaleString()}</p>
              <p className="text-xs text-neutral-500">Daily Avg</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{stepsStats.bestDay.toLocaleString()}</p>
              <p className="text-xs text-neutral-500">Best Day</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{stepsStats.daysAbove10k}</p>
              <p className="text-xs text-neutral-500">Days Above 10k</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Macro Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#E07A3A]" />
            Macro Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          {nutritionDaily.length === 0 ? (
            <p className="text-sm text-neutral-500">No nutrition data for this period.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={nutritionDaily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="cal" orientation="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="pro" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === 'calories') return [`${Number(value).toLocaleString()} kcal`, 'Calories'];
                      if (name === 'protein') return [`${Number(value)}g`, 'Protein'];
                      return [String(value), String(name)];
                    }}
                    labelFormatter={(label) => shortDate(String(label))}
                  />
                  <ReferenceLine yAxisId="cal" y={targets.calories} stroke="#E07A3A" strokeDasharray="5 5" />
                  <ReferenceLine yAxisId="pro" y={targets.protein} stroke="#3A8A5C" strokeDasharray="5 5" />
                  <Bar yAxisId="cal" dataKey="calories" fill="#E07A3A" opacity={0.7} radius={[3, 3, 0, 0]} />
                  <Line yAxisId="pro" type="monotone" dataKey="protein" stroke="#3A8A5C" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Micronutrient Report Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Micronutrient Report Card</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MICRO_CONFIG.map(({ key, label, unit }) => {
              const avg = microAvg[key];
              const target = microTargets[key];
              const pct = target > 0 ? (avg / target) * 100 : 0;
              const status = pct >= 80 ? 'On track' : pct >= 50 ? 'Low' : 'Deficient';
              const statusColor = pct >= 80 ? 'text-[#3A8A5C]' : pct >= 50 ? 'text-yellow-500' : 'text-red-500';
              const barColor = pct >= 80 ? 'bg-[#3A8A5C]' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500';
              return (
                <div key={key} className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">{label}</p>
                    <span className={`text-xs font-medium ${statusColor}`}>{status}</span>
                  </div>
                  <p className="text-xs text-neutral-500 mb-2">
                    {avg}{unit} / {target}{unit} ({Math.round(pct)}%)
                  </p>
                  <Progress value={Math.min(pct, 100)} indicatorClassName={barColor} />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Supplement Adherence */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Pill className="w-4 h-4 text-[#7C3AED]" />
            Supplement Adherence
          </CardTitle>
        </CardHeader>
        <CardContent>
          {suppAdherence.length === 0 ? (
            <p className="text-sm text-neutral-500">No active supplements tracked.</p>
          ) : (
            <div className="space-y-4">
              {suppAdherence.map((supp) => (
                <div key={supp.id} className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="text-sm font-medium">{supp.name}</p>
                      <p className="text-xs text-neutral-500">{supp.brand}</p>
                    </div>
                    <span className="text-sm font-semibold text-[#7C3AED]">
                      {supp.daysTaken}/{supp.totalDays} days
                    </span>
                  </div>
                  <Progress value={supp.adherencePercent} indicatorClassName="bg-[#7C3AED]" className="my-2" />
                  {supp.avgRating > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${star <= Math.round(supp.avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-neutral-300 dark:text-neutral-600'}`}
                        />
                      ))}
                      <span className="text-xs text-neutral-500 ml-1">{supp.avgRating}</span>
                    </div>
                  )}
                  {supp.sideEffects.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-neutral-500">Side effects:</p>
                      {supp.sideEffects.map((se, i) => (
                        <p key={i} className="text-xs text-red-500">- {se}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Spending Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#3A8A5C]" />
            Spending Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{formatCurrency(spend)}</p>
              <p className="text-xs text-neutral-500">Total Spent</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-neutral-400 line-through">{formatCurrency(fastFood)}</p>
              <p className="text-xs text-neutral-500">Fast Food Equivalent</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#3A8A5C]">{formatCurrency(savings > 0 ? savings : 0)}</p>
              <p className="text-xs text-neutral-500">Total Savings</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{formatCurrency(costPerMeal)}</p>
              <p className="text-xs text-neutral-500">Cost per Meal</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
