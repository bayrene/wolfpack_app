'use client';

import React, { useState, useRef, useTransition, useEffect, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { QuickLogModal } from '@/components/meals/quick-log-modal';
import {
  UtensilsCrossed,
  ChefHat,
  Coffee,
  Sun,
  Moon as MoonIcon,
  Cookie,
  AlertTriangle,
  Footprints,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Calendar,
  Droplets,
  Scale,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { MEAL_TYPE_LABELS, STEPS_TARGET, WATER_TARGET, COFFEE_LIMIT, CAFFEINE_PER_CUP, USER_PROFILE } from '@/lib/constants';
import { upsertSteps, upsertWater, upsertCoffee } from '@/db/queries/daily-log';
import { toast } from 'sonner';
import type { Recipe, SleepLog, DailyLog, OuraDaily } from '@/db/schema';
import Link from 'next/link';

interface NutritionData {
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

interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface FreezerData {
  id: number;
  recipeId: number;
  recipeName: string;
  quantity: number;
  dateFrozen: string;
  expiryDate: string;
  daysRemaining: number;
}

interface UpcomingEvent {
  label: string;
  date: string;
  daysUntil: number;
  type: 'vet' | 'dental' | 'other';
  href: string;
}

interface UserSettings {
  name: string;
  dob: string;
  heightIn: number;
  weightLbs: number;
}

interface Props {
  today: string;
  myNutrition: NutritionData;
  targets: MacroTargets;
  freezerData: FreezerData[];
  recipes: Recipe[];
  weeklySpend: number;
  fastFoodBaseline: number;
  microTargets: MicroTargets;
  isPrepDay: boolean;
  todaySteps: number;
  todayWater: number;
  todayCoffee: number;
  upcomingEvents?: UpcomingEvent[];
  latestSleepLog?: SleepLog | null;
  userSettings?: UserSettings;
  weightHistory?: DailyLog[];
  todayWeight?: number | null;
  ouraToday?: OuraDaily | null;
  sleepToday?: SleepLog | null;
  ouraHistory?: OuraDaily[];
  sleepHistory?: SleepLog[];
  todayMeals: Array<{
    id: number;
    date: string;
    mealType: string;
    person: string;
    recipeName: string;
    servingsConsumed: number | null;
  }>;
}

const mealTypeIcons = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: MoonIcon,
  snack: Cookie,
};

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

const CARD_IDS = ['oura', 'quick-log', 'nutrition', 'steps', 'water', 'coffee', 'weight', 'meals'] as const;
type CardId = typeof CARD_IDS[number];
const DEFAULT_ORDER: CardId[] = [...CARD_IDS];
const STORAGE_KEY = 'dashboard-card-order-v7';

function ReorderableCard({ children, id, index, total, onMoveUp, onMoveDown }: {
  children: React.ReactNode;
  id: string;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="group/reorder relative">
      {children}
      <div className="absolute top-2 right-2 flex flex-col gap-0.5 opacity-0 group-hover/reorder:opacity-100 transition-opacity z-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm shadow-sm"
          onClick={onMoveUp}
          disabled={index === 0}
          aria-label={`Move ${id} up`}
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm shadow-sm"
          onClick={onMoveDown}
          disabled={index === total - 1}
          aria-label={`Move ${id} down`}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function NutritionCard({ title, data, targets, microTargets }: { title: string; data: NutritionData; targets: MacroTargets; microTargets?: MicroTargets }) {
  const [showMicros, setShowMicros] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">Calories</span>
            <span className="text-neutral-500">{data.calories} / {targets.calories}</span>
          </div>
          <Progress value={(data.calories / targets.calories) * 100} indicatorClassName="bg-[#E07A3A]" />
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">Protein</span>
            <span className="text-neutral-500">{data.protein}g / {targets.protein}g</span>
          </div>
          <Progress value={(data.protein / targets.protein) * 100} indicatorClassName="bg-[#3A8A5C]" />
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">Carbs</span>
            <span className="text-neutral-500">{data.carbs}g / {targets.carbs}g</span>
          </div>
          <Progress value={(data.carbs / targets.carbs) * 100} indicatorClassName="bg-[#2A9D8F]" />
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">Fat</span>
            <span className="text-neutral-500">{data.fat}g / {targets.fat}g</span>
          </div>
          <Progress value={(data.fat / targets.fat) * 100} indicatorClassName="bg-[#7C3AED]" />
        </div>

        {microTargets && (
          <div>
            <button
              type="button"
              onClick={() => setShowMicros(!showMicros)}
              className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors w-full text-left mt-1"
            >
              {showMicros ? 'Hide micros \u25B4' : 'Show micros \u25BE'}
            </button>
            {showMicros && (
              <div className="space-y-3 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                {MICRO_BAR_CONFIG.map(({ key, label, color, unit }) => (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">{label}</span>
                      <span className="text-neutral-500">
                        {data[key]}{unit} / {microTargets[key]}{unit}
                      </span>
                    </div>
                    <Progress
                      value={Math.min((data[key] / microTargets[key]) * 100, 100)}
                      indicatorStyle={{ backgroundColor: color }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardClient({
  today,
  myNutrition,
  targets,
  freezerData,
  recipes,
  weeklySpend,
  fastFoodBaseline,
  microTargets,
  isPrepDay,
  todaySteps,
  todayWater,
  todayCoffee,
  todayMeals,
  upcomingEvents = [],
  latestSleepLog,
  userSettings,
  weightHistory = [],
  todayWeight = null,
  ouraToday = null,
  sleepToday = null,
  ouraHistory = [],
  sleepHistory = [],
}: Props) {
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<string>('breakfast');
  const [steps, setSteps] = useState(todaySteps);
  const [stepsDate, setStepsDate] = useState(today);
  const [water, setWater] = useState(todayWater);
  const [coffee, setCoffee] = useState(todayCoffee);
  const [isPending, startTransition] = useTransition();
  const [isSyncingOura, setIsSyncingOura] = useState(false);
  const [sleepHistoryRange, setSleepHistoryRange] = useState<7 | 30>(7);
  const stepsInputRef = useRef<HTMLInputElement>(null);
  const waterInputRef = useRef<HTMLInputElement>(null);
  const [cardOrder, setCardOrder] = useState<CardId[]>(DEFAULT_ORDER);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        // Validate: must contain all known IDs, no extras
        const valid = CARD_IDS.every(id => parsed.includes(id)) && parsed.length === CARD_IDS.length;
        if (valid) {
          setCardOrder(parsed as CardId[]);
        }
      }
    } catch {
      // ignore bad data
    }
  }, []);

  const moveCard = useCallback((index: number, direction: 'up' | 'down') => {
    setCardOrder(prev => {
      const next = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const handleQuickLog = (mealType: string) => {
    setSelectedMealType(mealType);
    setQuickLogOpen(true);
  };

  const handleStepsSave = (value: number) => {
    setSteps(value);
    startTransition(async () => {
      await upsertSteps(stepsDate, 'me', value);
      toast.success(stepsDate === today ? 'Steps updated' : `Steps saved for ${new Date(stepsDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
    });
  };

  const handleWaterSave = (value: number) => {
    setWater(value);
    if (waterInputRef.current) {
      waterInputRef.current.value = String(value);
    }
    startTransition(async () => {
      await upsertWater(today, 'me', value);
      toast.success('Water updated');
    });
  };

  const handleCoffeeSave = (value: number) => {
    const clamped = Math.max(0, value);
    setCoffee(clamped);
    startTransition(async () => {
      await upsertCoffee(today, 'me', clamped);
      toast.success(clamped > 0 ? `${clamped} cup${clamped !== 1 ? 's' : ''} of coffee` : 'Coffee reset');
    });
  };

  const navigateStepsDate = (direction: 'prev' | 'next') => {
    const d = new Date(stepsDate + 'T00:00:00');
    d.setDate(d.getDate() + (direction === 'prev' ? -1 : 1));
    const newDate = d.toISOString().split('T')[0];
    setStepsDate(newDate);
    // Load steps for that date
    startTransition(async () => {
      const { getDailyLog } = await import('@/db/queries/daily-log');
      const log = await getDailyLog(newDate, 'me');
      setSteps(log?.steps ?? 0);
      if (stepsInputRef.current) {
        stepsInputRef.current.value = String(log?.steps ?? 0);
      }
    });
  };

  const isStepsToday = stepsDate === today;
  const stepsDateLabel = isStepsToday
    ? "Today"
    : new Date(stepsDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Header */}
      {(() => {
        const profile = userSettings ?? USER_PROFILE;
        const dob = new Date((profile.dob ?? USER_PROFILE.dob) + 'T00:00:00');
        const now = new Date();
        let age = now.getFullYear() - dob.getFullYear();
        const m = now.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
        const heightIn = profile.heightIn ?? USER_PROFILE.heightIn;
        const weightLbs = profile.weightLbs ?? USER_PROFILE.weightLbs;
        const heightFt = Math.floor(heightIn / 12);
        const heightInRem = heightIn % 12;
        const heightM = heightIn * 0.0254;
        const bmi = (weightLbs / 2.205) / (heightM * heightM);
        const hour = now.getHours();
        const greeting = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
        return (
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
              Good {greeting}, {profile.name ?? USER_PROFILE.name} 👋
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              {' · '}{age} yrs · {heightFt}&apos;{heightInRem}&quot; · {weightLbs} lbs · BMI {bmi.toFixed(1)}
            </p>
          </div>
        );
      })()}

      {/* Upcoming Reminders */}
      {upcomingEvents.length > 0 && (
        <div className="flex flex-col gap-2">
          {upcomingEvents.map((evt, i) => (
            <Link key={i} href={evt.href}>
              <Card className={`cursor-pointer hover:opacity-90 transition-opacity border-l-4 ${
                evt.daysUntil <= 3 ? 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20' :
                evt.daysUntil <= 7 ? 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20' :
                'border-l-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
              }`}>
                <CardContent className="flex items-center justify-between py-3 px-4">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{evt.type === 'vet' ? '🐾' : '🦷'}</span>
                    <div>
                      <p className="text-sm font-medium">{evt.label}</p>
                      <p className="text-xs text-neutral-500">{new Date(evt.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    evt.daysUntil <= 3 ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                    evt.daysUntil <= 7 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
                    'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  }`}>
                    {evt.daysUntil === 0 ? 'Today' : evt.daysUntil === 1 ? 'Tomorrow' : `${evt.daysUntil}d`}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Prep Day Banner */}
      {isPrepDay && (
        <Link href="/prep">
          <Card className="bg-[#E07A3A]/10 border-[#E07A3A]/30 cursor-pointer hover:bg-[#E07A3A]/15 transition-colors">
            <CardContent className="flex items-center gap-3 py-4">
              <ChefHat className="w-6 h-6 text-[#E07A3A]" />
              <div>
                <p className="font-semibold text-[#E07A3A]">It&apos;s prep day!</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Tap here to plan your meal prep session</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Reorderable Cards */}
      {cardOrder.map((id, index) => {
        const renderer: Record<CardId, () => React.ReactNode> = {
          'oura': () => {
            const hasData = ouraToday || sleepToday;
            const readiness = ouraToday?.readinessScore ?? null;
            const activity = ouraToday?.activityScore ?? null;
            const sleepScore = sleepToday?.score ?? null;
            const stressScore = ouraToday?.stressScore ?? null;
            const stressHigh = ouraToday?.stressHigh ?? null;
            const stressRecovery = ouraToday?.stressRecovery ?? null;

            const fmtMins = (m: number | null | undefined) => {
              if (m == null) return '—';
              const h = Math.floor(m / 60);
              const min = m % 60;
              return min === 0 ? `${h}h` : `${h}h ${min}m`;
            };

            const totalSleep = sleepToday?.totalSleep ?? null;
            const deepSleep = sleepToday?.deepSleep ?? null;
            const remSleep = sleepToday?.remSleep ?? null;
            const hrv = sleepToday?.hrv ?? null;
            const rhr = sleepToday?.restingHeartRate ?? null;
            const awakenCount = (sleepToday as (SleepLog & { awakenCount?: number | null }) | null)?.awakenCount ?? null;

            const stressColor = stressScore == null ? '#9ca3af'
              : stressScore >= 70 ? '#4ade80'
              : stressScore >= 40 ? '#facc15'
              : '#f87171';
            const stressLabel = stressScore == null ? '—'
              : stressScore >= 70 ? 'Low'
              : stressScore >= 40 ? 'Medium'
              : 'High';

            // Hypnogram parsing
            // '1'=awake, '2'=light, '3'=REM, '4'=deep, '0'=undefined
            const STAGE_COLORS: Record<string, string> = {
              '4': '#6366f1',
              '3': '#a78bfa',
              '2': '#60a5fa',
              '1': '#f97316',
              '0': '#374151',
            };
            type PhaseSegment = { stage: string; duration: number };

            const parsePhases = (phases: string | null | undefined): PhaseSegment[] => {
              if (!phases) return [];
              const segments: PhaseSegment[] = [];
              let current = phases[0];
              let count = 1;
              for (let i = 1; i < phases.length; i++) {
                if (phases[i] === current) {
                  count++;
                } else {
                  segments.push({ stage: current, duration: count * 5 });
                  current = phases[i];
                  count = 1;
                }
              }
              segments.push({ stage: current, duration: count * 5 });
              return segments;
            };

            const sleepPhasesRaw = (sleepToday as (SleepLog & { sleepPhases?: string | null }) | null)?.sleepPhases ?? null;
            const phaseSegments = parsePhases(sleepPhasesRaw);
            const totalPhaseMins = phaseSegments.reduce((acc, s) => acc + s.duration, 0);

            const ScoreRing = ({ score, color, label }: { score: number | null; color: string; label: string }) => {
              const radius = 32;
              const circumference = 2 * Math.PI * radius;
              const progress = score != null ? (score / 100) * circumference : 0;
              return (
                <div className="flex flex-col items-center gap-1.5">
                  <svg width="80" height="80" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r={radius} fill="none" stroke="#ffffff10" strokeWidth="6" />
                    <circle
                      cx="40" cy="40" r={radius} fill="none" stroke={score != null ? color : '#374151'} strokeWidth="6"
                      strokeDasharray={`${progress} ${circumference}`}
                      strokeLinecap="round"
                      transform="rotate(-90 40 40)"
                    />
                    <text x="40" y="45" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
                      {score ?? '—'}
                    </text>
                  </svg>
                  <span className="text-xs font-medium text-neutral-400">{label}</span>
                </div>
              );
            };

            // Build chart data for 7d / 30d toggle (state hoisted to component top)
            const historySlice = [...sleepHistory]
              .sort((a, b) => a.date.localeCompare(b.date))
              .slice(-(sleepHistoryRange));

            const chartData = historySlice.map((s) => {
              const d = new Date(s.date + 'T00:00:00');
              const label = d.toLocaleDateString('en-US', { weekday: 'short' });
              return {
                label,
                deep: s.deepSleep != null ? +(s.deepSleep / 60).toFixed(2) : 0,
                rem: s.remSleep != null ? +(s.remSleep / 60).toFixed(2) : 0,
                light: s.lightSleep != null ? +(s.lightSleep / 60).toFixed(2) : 0,
                score: s.score ?? null,
              };
            });

            return (
              <Card className="border-neutral-800 bg-neutral-950">
                <CardContent className="py-5 px-5">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-white">Oura</span>
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-indigo-900 text-indigo-300">Ring</span>
                    </div>
                    <button
                      onClick={async () => {
                        setIsSyncingOura(true);
                        try {
                          const res = await fetch('/api/oura-sync', { method: 'POST' });
                          if (res.ok) {
                            toast.success('Oura data synced');
                            window.location.reload();
                          } else {
                            toast.error('Sync failed');
                          }
                        } catch {
                          toast.error('Sync failed');
                        } finally {
                          setIsSyncingOura(false);
                        }
                      }}
                      disabled={isSyncingOura}
                      className="text-xs px-3 py-1.5 rounded-lg bg-indigo-900/60 text-indigo-300 hover:bg-indigo-800/60 transition-colors disabled:opacity-50"
                    >
                      {isSyncingOura ? 'Syncing…' : 'Sync Now'}
                    </button>
                  </div>

                  {!hasData ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                      <p className="text-sm text-neutral-400">No Oura data for today</p>
                      <p className="text-xs text-neutral-600">Tap &quot;Sync Now&quot; to pull your ring data</p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* A. Score Rings */}
                      <div className="flex items-start justify-around">
                        <ScoreRing score={readiness} color="#4ade80" label="Readiness" />
                        <ScoreRing score={sleepScore} color="#a78bfa" label="Sleep" />
                        <ScoreRing score={activity} color="#fb923c" label="Activity" />
                      </div>

                      {/* B. Last Night's Sleep — Hypnogram */}
                      {sleepToday && (
                        <div className="bg-neutral-900 rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Last Night&apos;s Sleep</span>
                            <span className="text-sm font-semibold text-white">{fmtMins(totalSleep)}</span>
                          </div>

                          {/* Hypnogram bar */}
                          {phaseSegments.length > 0 && totalPhaseMins > 0 ? (
                            <div>
                              <div className="flex h-8 rounded-lg overflow-hidden w-full" style={{ gap: '1px' }}>
                                {phaseSegments.map((seg, i) => (
                                  <div
                                    key={i}
                                    style={{
                                      width: `${(seg.duration / totalPhaseMins) * 100}%`,
                                      backgroundColor: STAGE_COLORS[seg.stage] ?? '#374151',
                                      borderRadius: i === 0 ? '8px 0 0 8px' : i === phaseSegments.length - 1 ? '0 8px 8px 0' : '0',
                                    }}
                                    title={`${seg.stage === '4' ? 'Deep' : seg.stage === '3' ? 'REM' : seg.stage === '2' ? 'Light' : seg.stage === '1' ? 'Awake' : 'Unknown'} ${seg.duration}m`}
                                  />
                                ))}
                              </div>
                              {/* Legend */}
                              <div className="flex items-center gap-4 mt-2 flex-wrap">
                                {[
                                  { stage: '4', label: 'Deep' },
                                  { stage: '3', label: 'REM' },
                                  { stage: '2', label: 'Light' },
                                  { stage: '1', label: 'Awake' },
                                ].map(({ stage, label }) => (
                                  <div key={stage} className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STAGE_COLORS[stage] }} />
                                    <span className="text-[11px] text-neutral-400">{label}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-8 rounded-lg bg-neutral-800">
                              <span className="text-[11px] text-neutral-500">No phase data — sync Oura</span>
                            </div>
                          )}

                          {/* C. Sleep Stats Row */}
                          <div className="grid grid-cols-4 gap-2 pt-1">
                            <div className="flex flex-col items-center bg-neutral-800/60 rounded-lg py-2.5 px-1">
                              <span className="text-[10px] text-neutral-400 font-medium mb-1">Total</span>
                              <span className="text-xs font-bold text-white">{fmtMins(totalSleep)}</span>
                            </div>
                            <div className="flex flex-col items-center bg-indigo-950/60 rounded-lg py-2.5 px-1">
                              <span className="text-[10px] text-indigo-300 font-medium mb-1">Deep</span>
                              <span className="text-xs font-bold text-indigo-400">{fmtMins(deepSleep)}</span>
                            </div>
                            <div className="flex flex-col items-center bg-violet-950/60 rounded-lg py-2.5 px-1">
                              <span className="text-[10px] text-violet-300 font-medium mb-1">REM</span>
                              <span className="text-xs font-bold text-violet-400">{fmtMins(remSleep)}</span>
                            </div>
                            <div className="flex flex-col items-center bg-orange-950/60 rounded-lg py-2.5 px-1">
                              <span className="text-[10px] text-orange-300 font-medium mb-1">Wake-ups</span>
                              <span className="text-xs font-bold text-orange-400">{awakenCount ?? '—'}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* D+E. Sleep History Chart with 7d/30d toggle */}
                      {sleepHistory.length > 0 && (
                        <div className="bg-neutral-900 rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Sleep History</span>
                            <div className="flex items-center rounded-lg overflow-hidden border border-neutral-700 text-[11px]">
                              <button
                                onClick={() => setSleepHistoryRange(7)}
                                className={`px-2.5 py-1 transition-colors ${sleepHistoryRange === 7 ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'}`}
                              >7d</button>
                              <button
                                onClick={() => setSleepHistoryRange(30)}
                                className={`px-2.5 py-1 transition-colors ${sleepHistoryRange === 30 ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'}`}
                              >30d</button>
                            </div>
                          </div>
                          <div style={{ height: 160 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barCategoryGap="20%">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                                <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}h`} />
                                <Tooltip
                                  contentStyle={{ backgroundColor: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11, color: '#f5f5f5' }}
                                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                  formatter={(value: any, name: any) => [typeof value === 'number' ? `${value.toFixed(1)}h` : value, typeof name === 'string' ? name.charAt(0).toUpperCase() + name.slice(1) : name]}
                                  labelStyle={{ color: '#9ca3af', marginBottom: 2 }}
                                />
                                <Bar dataKey="deep" stackId="sleep" fill="#6366f1" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="rem" stackId="sleep" fill="#a78bfa" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="light" stackId="sleep" fill="#60a5fa" radius={[3, 3, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          {/* Legend */}
                          <div className="flex items-center gap-4">
                            {[{ color: '#6366f1', label: 'Deep' }, { color: '#a78bfa', label: 'REM' }, { color: '#60a5fa', label: 'Light' }].map(({ color, label }) => (
                              <div key={label} className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                                <span className="text-[11px] text-neutral-400">{label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* F. Stress & HRV */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-neutral-900 rounded-xl p-3 flex flex-col gap-1">
                          <span className="text-[10px] text-neutral-500 uppercase tracking-wide">Stress</span>
                          <span className="text-lg font-bold" style={{ color: stressColor }}>{stressLabel}</span>
                          {(stressHigh != null || stressRecovery != null) && (
                            <span className="text-[10px] text-neutral-500">
                              {stressHigh != null ? `${stressHigh}m high` : ''}{stressHigh != null && stressRecovery != null ? ' · ' : ''}{stressRecovery != null ? `${stressRecovery}m rec` : ''}
                            </span>
                          )}
                        </div>
                        <div className="bg-neutral-900 rounded-xl p-3 flex flex-col gap-1">
                          <span className="text-[10px] text-neutral-500 uppercase tracking-wide">HRV</span>
                          <span className="text-lg font-bold text-rose-400">{hrv != null ? hrv : '—'}</span>
                          {hrv != null && <span className="text-[10px] text-neutral-500">ms avg</span>}
                        </div>
                        <div className="bg-neutral-900 rounded-xl p-3 flex flex-col gap-1">
                          <span className="text-[10px] text-neutral-500 uppercase tracking-wide">Rest HR</span>
                          <span className="text-lg font-bold text-sky-400">{rhr != null ? rhr : '—'}</span>
                          {rhr != null && <span className="text-[10px] text-neutral-500">bpm</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          },
          'quick-log': () => (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4" />
                  Quick Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => {
                    const Icon = mealTypeIcons[type];
                    return (
                      <Button
                        key={type}
                        variant="outline"
                        size="xl"
                        className="flex flex-col gap-1 h-20 text-base"
                        onClick={() => handleQuickLog(type)}
                      >
                        <Icon className="w-5 h-5" />
                        {MEAL_TYPE_LABELS[type]}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ),
          'steps': () => (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Footprints className="w-5 h-5 text-[#2A9D8F]" />
                    <p className="text-sm font-medium">Steps</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => navigateStepsDate('prev')}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <button
                      onClick={() => {
                        if (!isStepsToday) {
                          setStepsDate(today);
                          startTransition(async () => {
                            const { getDailyLog } = await import('@/db/queries/daily-log');
                            const log = await getDailyLog(today, 'me');
                            setSteps(log?.steps ?? todaySteps);
                            if (stepsInputRef.current) {
                              stepsInputRef.current.value = String(log?.steps ?? todaySteps);
                            }
                          });
                        }
                      }}
                      className={`text-xs font-medium px-2 py-1 rounded-md transition-colors min-w-[100px] text-center ${
                        isStepsToday
                          ? 'text-[#2A9D8F]'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      {stepsDateLabel}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={isStepsToday}
                      onClick={() => navigateStepsDate('next')}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-neutral-500">{steps.toLocaleString()} / {STEPS_TARGET.toLocaleString()}</p>
                  <input
                    ref={stepsInputRef}
                    type="number"
                    defaultValue={steps}
                    key={stepsDate}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 0) handleStepsSave(val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className="w-28 text-right text-sm font-semibold bg-neutral-100 dark:bg-neutral-800 rounded-lg px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] focus:border-transparent"
                  />
                </div>
                <Progress value={(steps / STEPS_TARGET) * 100} indicatorClassName="bg-[#2A9D8F]" className="mt-3" />
                {!isStepsToday && (
                  <p className="text-[10px] text-neutral-400 mt-2 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Editing past date — tap &quot;Today&quot; to go back
                  </p>
                )}
              </CardContent>
            </Card>
          ),
          'water': () => (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-[#0EA5E9]" />
                    <p className="text-sm font-medium">Water</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[#0EA5E9] border-[#0EA5E9]/40 hover:bg-[#0EA5E9]/10"
                    onClick={() => handleWaterSave(water + 8)}
                  >
                    +8 oz
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-neutral-500">{water} / {WATER_TARGET} oz</p>
                  <input
                    ref={waterInputRef}
                    type="number"
                    defaultValue={water}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 0) handleWaterSave(val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className="w-28 text-right text-sm font-semibold bg-neutral-100 dark:bg-neutral-800 rounded-lg px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:border-transparent"
                  />
                </div>
                <Progress value={Math.min((water / WATER_TARGET) * 100, 100)} indicatorClassName="bg-[#0EA5E9]" className="mt-3" />
              </CardContent>
            </Card>
          ),
          'coffee': () => (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Coffee className="w-5 h-5 text-[#8B6914]" />
                    <p className="text-sm font-medium">Black Coffee</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[#8B6914] border-[#8B6914]/40 hover:bg-[#8B6914]/10"
                    onClick={() => handleCoffeeSave(coffee + 1)}
                  >
                    +1 cup
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-neutral-500">
                      {coffee} / {COFFEE_LIMIT} cups &bull; {coffee * CAFFEINE_PER_CUP}mg caffeine
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => handleCoffeeSave(coffee - 1)}
                      disabled={coffee <= 0}
                    >
                      <span className="text-lg font-bold">-</span>
                    </Button>
                    <span className="text-lg font-bold w-6 text-center">{coffee}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => handleCoffeeSave(coffee + 1)}
                    >
                      <span className="text-lg font-bold">+</span>
                    </Button>
                  </div>
                </div>
                <Progress
                  value={Math.min((coffee / COFFEE_LIMIT) * 100, 100)}
                  indicatorClassName={coffee > COFFEE_LIMIT ? 'bg-red-500' : 'bg-[#8B6914]'}
                  className="mt-3"
                />
                {coffee > COFFEE_LIMIT && (
                  <p className="text-[10px] text-red-500 mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Over recommended daily limit ({COFFEE_LIMIT} cups / {COFFEE_LIMIT * CAFFEINE_PER_CUP}mg)
                  </p>
                )}
              </CardContent>
            </Card>
          ),
          'weight': () => {
            // Filter to only entries with weight data, sorted oldest→newest for the chart
            const weightPoints = weightHistory
              .filter((log) => log.weightLbs != null)
              .map((log) => ({
                date: log.date,
                weight: log.weightLbs as number,
                label: (() => {
                  const d = new Date(log.date + 'T00:00:00');
                  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                })(),
              }))
              .sort((a, b) => a.date.localeCompare(b.date));

            // Thin out labels: only show one per ~14 days for readability
            const tickIndices = new Set<number>();
            if (weightPoints.length > 0) {
              tickIndices.add(0);
              tickIndices.add(weightPoints.length - 1);
              let lastTickDate = weightPoints[0].date;
              for (let i = 1; i < weightPoints.length - 1; i++) {
                const msGap = new Date(weightPoints[i].date + 'T00:00:00').getTime() - new Date(lastTickDate + 'T00:00:00').getTime();
                if (msGap >= 14 * 24 * 60 * 60 * 1000) {
                  tickIndices.add(i);
                  lastTickDate = weightPoints[i].date;
                }
              }
            }

            const lastRecorded = weightPoints.length > 0 ? weightPoints[weightPoints.length - 1] : null;
            const displayWeight = todayWeight ?? lastRecorded?.weight ?? null;
            const isLastRecorded = todayWeight == null && lastRecorded != null;

            const weights = weightPoints.map((p) => p.weight);
            const minW = weights.length > 0 ? Math.floor(Math.min(...weights)) - 3 : 0;
            const maxW = weights.length > 0 ? Math.ceil(Math.max(...weights)) + 3 : 300;

            // Stats
            const firstWeight = weightPoints.length > 0 ? weightPoints[0].weight : null;
            const lowestWeight = weights.length > 0 ? Math.min(...weights) : null;
            const changeFromStart = displayWeight != null && firstWeight != null ? displayWeight - firstWeight : null;

            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
            const pointsIn30Days = weightPoints.filter((p) => p.date >= thirtyDaysAgoStr);
            const change30d = pointsIn30Days.length >= 2 && displayWeight != null
              ? displayWeight - pointsIn30Days[0].weight
              : null;

            const fmtChange = (n: number | null) => {
              if (n == null) return null;
              const sign = n < 0 ? '' : '+';
              return `${sign}${n.toFixed(1)} lbs`;
            };

            return (
              <Card className="col-span-full">
                <CardContent className="py-5 px-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Scale className="w-5 h-5 text-[#F59E0B]" />
                      <p className="text-base font-semibold">Weight Tracking</p>
                    </div>
                    {displayWeight != null && (
                      <div className="text-right">
                        <p className="text-4xl font-bold text-[#F59E0B] leading-none">{displayWeight.toFixed(1)}<span className="text-lg font-medium text-neutral-400 ml-1">lbs</span></p>
                        {isLastRecorded && lastRecorded && (
                          <p className="text-[10px] text-neutral-400 mt-1">
                            Last recorded · {new Date(lastRecorded.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        )}
                      </div>
                    )}
                    {displayWeight == null && (
                      <p className="text-sm text-neutral-400">No data</p>
                    )}
                  </div>

                  {/* Stat pills */}
                  {weightPoints.length > 1 && (
                    <div className="flex flex-wrap gap-3 mb-4">
                      {changeFromStart != null && (
                        <div className="flex flex-col bg-neutral-100 dark:bg-neutral-800 rounded-xl px-4 py-2 min-w-[90px]">
                          <span className="text-[10px] uppercase tracking-wide text-neutral-500 mb-0.5">Since start</span>
                          <span className={`text-sm font-bold ${changeFromStart < 0 ? 'text-emerald-500' : changeFromStart > 0 ? 'text-rose-500' : 'text-neutral-400'}`}>
                            {fmtChange(changeFromStart)}
                          </span>
                        </div>
                      )}
                      {change30d != null && (
                        <div className="flex flex-col bg-neutral-100 dark:bg-neutral-800 rounded-xl px-4 py-2 min-w-[90px]">
                          <span className="text-[10px] uppercase tracking-wide text-neutral-500 mb-0.5">Last 30 days</span>
                          <span className={`text-sm font-bold ${change30d < 0 ? 'text-emerald-500' : change30d > 0 ? 'text-rose-500' : 'text-neutral-400'}`}>
                            {fmtChange(change30d)}
                          </span>
                        </div>
                      )}
                      {lowestWeight != null && (
                        <div className="flex flex-col bg-neutral-100 dark:bg-neutral-800 rounded-xl px-4 py-2 min-w-[90px]">
                          <span className="text-[10px] uppercase tracking-wide text-neutral-500 mb-0.5">All-time low</span>
                          <span className="text-sm font-bold text-[#F59E0B]">{lowestWeight.toFixed(1)} lbs</span>
                        </div>
                      )}
                    </div>
                  )}

                  {weightPoints.length > 1 ? (
                    <div style={{ height: 320 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={weightPoints} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                          <defs>
                            <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.12)" vertical={false} />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 11, fill: '#6b7280' }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(_value, index) => tickIndices.has(index) ? _value : ''}
                            interval={0}
                          />
                          <YAxis
                            domain={[minW, maxW]}
                            tick={{ fontSize: 11, fill: '#6b7280' }}
                            tickLine={false}
                            axisLine={false}
                            width={44}
                            tickFormatter={(v: number) => `${v}`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1c1c1e',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 8,
                              fontSize: 12,
                              color: '#f5f5f5',
                            }}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            formatter={(value: any) => [typeof value === 'number' ? `${value.toFixed(1)} lbs` : `${value} lbs`, 'Weight']}
                            labelStyle={{ color: '#9ca3af', marginBottom: 2 }}
                          />
                          <Area
                            type="monotone"
                            dataKey="weight"
                            stroke="#F59E0B"
                            strokeWidth={2.5}
                            fill="url(#weightGrad)"
                            dot={false}
                            activeDot={{ r: 5, fill: '#F59E0B', strokeWidth: 0 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : weightPoints.length === 1 ? (
                    <p className="text-xs text-neutral-400 mt-2">Log more entries to see your trend.</p>
                  ) : (
                    <p className="text-xs text-neutral-400 mt-2">No weight entries in the last 90 days.</p>
                  )}
                </CardContent>
              </Card>
            );
          },
          'nutrition': () => (
            <NutritionCard title="Today's Nutrition" data={myNutrition} targets={targets} microTargets={microTargets} />
          ),
          'meals': () => (
            todayMeals.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Today&apos;s Meals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {todayMeals.map((meal) => (
                      <div key={meal.id} className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                        <div className="flex items-center gap-3">
                          <Badge variant={meal.mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack'}>
                            {MEAL_TYPE_LABELS[meal.mealType]}
                          </Badge>
                          <span className="text-sm font-medium">{meal.recipeName}</span>
                        </div>
                        <span className="text-xs text-neutral-500">{meal.servingsConsumed ? `${meal.servingsConsumed} serving${meal.servingsConsumed > 1 ? 's' : ''}` : ''}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null
          ),
        };

        const content = renderer[id]();
        if (!content) return null;

        return (
          <ReorderableCard
            key={id}
            id={id}
            index={index}
            total={cardOrder.length}
            onMoveUp={() => moveCard(index, 'up')}
            onMoveDown={() => moveCard(index, 'down')}
          >
            {content}
          </ReorderableCard>
        );
      })}

      {/* Quick Log Modal */}
      <QuickLogModal
        open={quickLogOpen}
        onOpenChange={setQuickLogOpen}
        recipes={recipes}
        defaultMealType={selectedMealType}
        today={today}
      />
    </div>
  );
}
