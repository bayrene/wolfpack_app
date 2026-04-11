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
  TrendingUp,
  Star,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Check,
  X,
  Scale,
  Moon as MoonIcon,
  Droplets,
  Coffee,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, ReferenceLine, Cell, LineChart,
} from 'recharts';
import type { DailyLog, SleepLog } from '@/db/schema';
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
  targets: MacroAvg;
  microTargets: MicroTargets;
  stepsTarget: number;
  weightHistory?: DailyLog[];
  sleepHistory?: SleepLog[];
  avgWaterOz?: number;
  avgCoffeeCups?: number;
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
  targets, microTargets, stepsTarget,
  weightHistory = [],
  sleepHistory = [],
  avgWaterOz = 0,
  avgCoffeeCups = 0,
}: Props) {
  const router = useRouter();
  const [editingStepsDate, setEditingStepsDate] = useState<string | null>(null);
  const [editingStepsValue, setEditingStepsValue] = useState('');
  const [localStepsChart, setLocalStepsChart] = useState(stepsChart);
  const [isPending, startTransition] = useTransition();
  const [weightPeriod, setWeightPeriod] = useState<'week' | 'month' | 'quarter' | 'semester' | 'year' | 'all'>('month');
  const [weightOffset, setWeightOffset] = useState(0);

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

  const proteinStreak = computeStreak(nutritionDaily, 'protein', targets.protein);
  const stepsStreak = computeStepsStreak(stepsChart, stepsTarget);
  const suppStreak = computeSuppStreak(suppAdherence);

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
              <p className="text-xs font-medium text-neutral-500 mb-2">Tap a row to edit steps</p>
              <div className="space-y-1">
                {localStepsChart.map((entry) => (
                  <div
                    key={entry.date}
                    className="group flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
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
                          className="h-6 w-6 text-neutral-400 hover:text-[#2A9D8F] opacity-0 group-hover:opacity-100 transition-opacity"
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

      {/* Weight Trend */}
      {(() => {
        const allWeightPoints = weightHistory
          .filter((log) => log.weightLbs != null)
          .map((log) => ({ date: log.date, weight: log.weightLbs as number }))
          .sort((a, b) => a.date.localeCompare(b.date));

        const todayStr = new Date().toISOString().split('T')[0];

        const getPeriodWindow = (period: typeof weightPeriod, offset: number): { start: Date; end: Date; label: string } => {
          const ref = new Date(todayStr + 'T00:00:00');
          if (period === 'all') {
            const earliest = allWeightPoints.length > 0
              ? new Date(allWeightPoints[0].date + 'T00:00:00')
              : new Date(ref.getFullYear(), 0, 1);
            return { start: earliest, end: ref, label: 'All time' };
          }
          if (period === 'week') {
            const dayOfWeek = ref.getDay();
            const daysToMon = (dayOfWeek + 6) % 7;
            const monThisWeek = new Date(ref);
            monThisWeek.setDate(ref.getDate() - daysToMon);
            monThisWeek.setHours(0, 0, 0, 0);
            const start = new Date(monThisWeek);
            start.setDate(start.getDate() + offset * 7);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return { start, end, label: `${fmt(start)} – ${fmt(end).split(' ')[1]}, ${end.getFullYear()}` };
          }
          if (period === 'month') {
            const base = new Date(ref.getFullYear(), ref.getMonth() + offset, 1);
            const start = new Date(base.getFullYear(), base.getMonth(), 1);
            const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
            return { start, end, label: start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) };
          }
          if (period === 'quarter') {
            const currentQ = Math.floor(ref.getMonth() / 3);
            const targetQ = currentQ + offset;
            const year = ref.getFullYear() + Math.floor(targetQ / 4);
            const q = ((targetQ % 4) + 4) % 4;
            const start = new Date(year, q * 3, 1);
            const end = new Date(year, q * 3 + 3, 0);
            const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            return { start, end, label: `${fmt(start)} – ${fmt(end)}` };
          }
          if (period === 'semester') {
            const currentS = ref.getMonth() < 6 ? 0 : 1;
            const totalS = ref.getFullYear() * 2 + currentS + offset;
            const year = Math.floor(totalS / 2);
            const s = ((totalS % 2) + 2) % 2;
            const start = new Date(year, s * 6, 1);
            const end = new Date(year, s * 6 + 6, 0);
            const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            return { start, end, label: `${fmt(start)} – ${fmt(end)}` };
          }
          const year = ref.getFullYear() + offset;
          return { start: new Date(year, 0, 1), end: new Date(year, 11, 31), label: String(year) };
        };

        const { start: windowStart, end: windowEnd, label: windowLabel } = getPeriodWindow(weightPeriod, weightOffset);
        const windowStartStr = windowStart.toISOString().split('T')[0];
        const windowEndStr = windowEnd.toISOString().split('T')[0];
        const effectiveEndStr = windowEndStr > todayStr ? todayStr : windowEndStr;

        const periodPoints = allWeightPoints.filter(p => p.date >= windowStartStr && p.date <= effectiveEndStr);
        const chartPoints = periodPoints.map((p) => {
          const d = new Date(p.date + 'T00:00:00');
          let xLabel: string;
          if (weightPeriod === 'week') xLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
          else if (weightPeriod === 'month') xLabel = String(d.getDate());
          else xLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return { date: p.date, weight: p.weight, label: xLabel };
        });

        const chartWeights = chartPoints.map(p => p.weight);
        const yMin = chartWeights.length > 0 ? Math.floor(Math.min(...chartWeights)) - 2 : 140;
        const yMax = chartWeights.length > 0 ? Math.ceil(Math.max(...chartWeights)) + 2 : 200;

        const periodFirst = chartPoints.length > 0 ? chartPoints[0].weight : null;
        const periodLast = chartPoints.length > 0 ? chartPoints[chartPoints.length - 1].weight : null;
        const trendDelta = periodFirst != null && periodLast != null ? periodLast - periodFirst : null;
        const STABLE_THRESHOLD = 0.5;
        const trendStatus: 'stable' | 'gaining' | 'losing' =
          trendDelta == null || Math.abs(trendDelta) < STABLE_THRESHOLD ? 'stable'
          : trendDelta > 0 ? 'gaining' : 'losing';
        const trendColor = trendStatus === 'losing' ? '#4ade80' : trendStatus === 'gaining' ? '#f87171' : '#9ca3af';
        const trendArrow = trendStatus === 'losing' ? '↓' : trendStatus === 'gaining' ? '↑' : '→';
        const fmtTrend = (n: number | null) => { if (n == null) return '—'; const sign = n > 0 ? '+' : ''; return `${sign}${n.toFixed(1)} lb`; };

        const lastRecorded = allWeightPoints.length > 0 ? allWeightPoints[allWeightPoints.length - 1] : null;
        const displayWeight = lastRecorded?.weight ?? null;

        const PERIOD_TABS: Array<{ id: typeof weightPeriod; label: string }> = [
          { id: 'week', label: 'Week' },
          { id: 'month', label: 'Month' },
          { id: 'quarter', label: 'Quarter' },
          { id: 'semester', label: 'Semester' },
          { id: 'year', label: 'Year' },
          { id: 'all', label: 'All' },
        ];

        const canGoForward = weightPeriod !== 'all' && windowEndStr < todayStr;
        const canGoBack = weightPeriod !== 'all' && allWeightPoints.some(p => p.date < windowStartStr);

        const maxTicks = weightPeriod === 'week' ? 7 : weightPeriod === 'month' ? 10 : 8;
        const tickStep = chartPoints.length > maxTicks ? Math.ceil(chartPoints.length / maxTicks) : 1;
        const visibleTicks = new Set<number>();
        chartPoints.forEach((_, i) => { if (i === 0 || i === chartPoints.length - 1 || i % tickStep === 0) visibleTicks.add(i); });

        return (
          <Card className="border-neutral-800 bg-neutral-950">
            <CardContent className="py-5 px-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-[#818cf8]" />
                  <p className="text-base font-semibold text-white">Weight</p>
                </div>
                <div className="text-right">
                  {displayWeight != null ? (
                    <>
                      <p className="text-4xl font-bold text-white leading-none">
                        {displayWeight.toFixed(1)}
                        <span className="text-lg font-medium text-neutral-400 ml-1">lbs</span>
                      </p>
                      {lastRecorded && (
                        <p className="text-[10px] text-neutral-500 mt-0.5">
                          Last recorded · {new Date(lastRecorded.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-neutral-400">No data</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 mb-4 flex-wrap">
                {PERIOD_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { setWeightPeriod(tab.id); setWeightOffset(0); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${weightPeriod === tab.id ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-neutral-200'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {weightPeriod !== 'all' ? (
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => canGoBack && setWeightOffset(o => o - 1)} disabled={!canGoBack} className="p-1 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" aria-label="Previous period">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-medium text-neutral-300">{windowLabel}</span>
                  <button onClick={() => canGoForward && setWeightOffset(o => o + 1)} disabled={!canGoForward} className="p-1 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" aria-label="Next period">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center mb-3">
                  <span className="text-xs font-medium text-neutral-300">{windowLabel}</span>
                </div>
              )}
              <div className="flex items-center justify-between mb-4 px-1">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-0.5">Weight</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-bold" style={{ color: trendColor }}>{trendArrow}</span>
                    <span className="text-sm font-semibold text-white capitalize">{trendStatus}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-0.5">Trend</p>
                  <p className="text-sm font-semibold" style={{ color: trendColor }}>{fmtTrend(trendDelta)}</p>
                </div>
              </div>
              {chartPoints.length > 1 ? (
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartPoints} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.06)" vertical={true} horizontal={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={(_value, index) => visibleTicks.has(index) ? _value : ''} interval={0} />
                      <YAxis domain={[yMin, yMax]} tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={36} tickFormatter={(v: number) => `${v}`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, color: '#f5f5f5' }}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(value: any) => [typeof value === 'number' ? `${value.toFixed(1)} lbs` : `${value} lbs`, 'Weight']}
                        labelFormatter={(label, payload) => {
                          if (payload && payload.length > 0) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const item = payload[0] as any;
                            if (item?.payload?.date) return new Date(item.payload.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                          }
                          return label;
                        }}
                        labelStyle={{ color: '#9ca3af', marginBottom: 2 }}
                      />
                      <Line type="monotone" dataKey="weight" stroke="#818cf8" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3, fill: '#818cf8', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#818cf8', strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : chartPoints.length === 1 ? (
                <div className="flex items-center justify-center h-[220px]">
                  <p className="text-sm text-neutral-400">Only one entry — log more to see the trend.</p>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[220px]">
                  <p className="text-sm text-neutral-400">No weight data for this period.</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Sleep History */}
      {sleepHistory.length > 0 && (() => {
        const sorted = [...sleepHistory].sort((a, b) => a.date.localeCompare(b.date));
        const chartData = sorted.map(sl => {
          const d = new Date(sl.date + 'T00:00:00');
          const label = view === 'week'
            ? d.toLocaleDateString('en-US', { weekday: 'short' })
            : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return {
            label,
            deep: sl.deepSleep != null ? +(sl.deepSleep / 60).toFixed(2) : 0,
            rem: sl.remSleep != null ? +(sl.remSleep / 60).toFixed(2) : 0,
            light: sl.lightSleep != null ? +(sl.lightSleep / 60).toFixed(2) : 0,
            score: sl.score ?? 0,
            hrv: sl.hrv ?? 0,
          };
        });
        const withScore = sorted.filter(sl => sl.score != null);
        const avgScore = withScore.length > 0 ? Math.round(withScore.reduce((s, sl) => s + (sl.score ?? 0), 0) / withScore.length) : null;
        const withDeep = sorted.filter(sl => sl.deepSleep != null);
        const avgDeepMins = withDeep.length > 0 ? Math.round(withDeep.reduce((s, sl) => s + (sl.deepSleep ?? 0), 0) / withDeep.length) : null;
        const withHrv = sorted.filter(sl => sl.hrv != null);
        const avgHrv = withHrv.length > 0 ? Math.round(withHrv.reduce((s, sl) => s + (sl.hrv ?? 0), 0) / withHrv.length) : null;
        const fmtMins = (m: number) => { const h = Math.floor(m / 60); const min = m % 60; return h > 0 ? `${h}h ${min}m` : `${min}m`; };

        return (
          <Card className="border-neutral-800 bg-neutral-950">
            <CardContent className="py-5 px-5 space-y-4">
              <div className="flex items-center gap-2">
                <MoonIcon className="w-4 h-4 text-indigo-400" />
                <span className="text-base font-semibold text-white">Sleep History</span>
              </div>
              <div style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}h`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11, color: '#f5f5f5' }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(value: any, name: any) => [typeof value === 'number' ? `${value.toFixed(1)}h` : value, typeof name === 'string' ? name.charAt(0).toUpperCase() + name.slice(1) : name]}
                      labelStyle={{ color: '#9ca3af', marginBottom: 2 }}
                    />
                    <Bar dataKey="deep" stackId="sleep" fill="#6366f1" />
                    <Bar dataKey="rem" stackId="sleep" fill="#a78bfa" />
                    <Bar dataKey="light" stackId="sleep" fill="#60a5fa" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-4">
                {[{ color: '#6366f1', label: 'Deep' }, { color: '#a78bfa', label: 'REM' }, { color: '#60a5fa', label: 'Light' }].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-[11px] text-neutral-400">{label}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-neutral-800">
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{avgScore ?? '—'}</p>
                  <p className="text-xs text-neutral-500">Avg Score</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{avgDeepMins != null ? fmtMins(avgDeepMins) : '—'}</p>
                  <p className="text-xs text-neutral-500">Avg Deep</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{avgHrv != null ? `${avgHrv} ms` : '—'}</p>
                  <p className="text-xs text-neutral-500">Avg HRV</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Water & Coffee */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="py-4 px-4">
            <div className="flex items-center gap-2 mb-3">
              <Droplets className="w-4 h-4 text-[#0EA5E9]" />
              <p className="text-sm font-medium">Avg Water</p>
            </div>
            <p className="text-2xl font-bold">{avgWaterOz}<span className="text-sm font-normal text-neutral-500 ml-1">oz/day</span></p>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-neutral-500 mb-1">
                <span>{avgWaterOz} oz</span>
                <span>112 oz</span>
              </div>
              <Progress value={Math.min((avgWaterOz / 112) * 100, 100)} indicatorClassName="bg-[#0EA5E9]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 px-4">
            <div className="flex items-center gap-2 mb-3">
              <Coffee className="w-4 h-4 text-[#8B6914]" />
              <p className="text-sm font-medium">Avg Coffee</p>
            </div>
            <p className="text-2xl font-bold">{avgCoffeeCups}<span className="text-sm font-normal text-neutral-500 ml-1">cups/day</span></p>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-neutral-500 mb-1">
                <span>{avgCoffeeCups} cups</span>
                <span>3 cups</span>
              </div>
              <Progress value={Math.min((avgCoffeeCups / 3) * 100, 100)} indicatorClassName={avgCoffeeCups > 3 ? 'bg-red-500' : 'bg-[#8B6914]'} />
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
