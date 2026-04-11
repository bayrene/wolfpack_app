'use client';

import React, { useState, useRef, useTransition, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { QuickLogModal } from '@/components/meals/quick-log-modal';
import {
  Snowflake,
  UtensilsCrossed,
  TrendingDown,
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
  Sparkles,
  Loader2,
  Scale,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { MEAL_TYPE_LABELS, STEPS_TARGET, WATER_TARGET, COFFEE_LIMIT, CAFFEINE_PER_CUP, USER_PROFILE } from '@/lib/constants';
import { upsertSteps, upsertWater, upsertCoffee } from '@/db/queries/daily-log';
import { toast } from 'sonner';
import type { Recipe, SleepLog, DailyLog } from '@/db/schema';
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

const CARD_IDS = ['quick-log', 'nutrition', 'sleep', 'steps', 'water', 'coffee', 'weight', 'meals', 'freezer-spending', 'weekly-digest'] as const;
type CardId = typeof CARD_IDS[number];
const DEFAULT_ORDER: CardId[] = [...CARD_IDS];
const STORAGE_KEY = 'dashboard-card-order-v4';

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
}: Props) {
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<string>('breakfast');
  const [steps, setSteps] = useState(todaySteps);
  const [digest, setDigest] = useState<{ text: string; period: string } | null>(null);
  const [digestLoading, setDigestLoading] = useState(false);
  const [stepsDate, setStepsDate] = useState(today);
  const [water, setWater] = useState(todayWater);
  const [coffee, setCoffee] = useState(todayCoffee);
  const [isPending, startTransition] = useTransition();
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

  const savings = fastFoodBaseline - weeklySpend;

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
          'sleep': () => {
            const s = latestSleepLog;
            const score = s?.score;
            const ringColor = !score ? '#9ca3af' : score >= 85 ? '#10b981' : score >= 70 ? '#f59e0b' : '#ef4444';
            const scoreLabel = !score ? '' : score >= 85 ? 'Good' : score >= 70 ? 'Fair' : 'Poor';
            const fmtMins = (m: number | null | undefined) => {
              if (!m) return '—';
              const h = Math.floor(m / 60), min = m % 60;
              return min === 0 ? `${h}h` : `${h}h ${min}m`;
            };
            const total = s?.totalSleep;
            const stageTotal = total || ((s?.deepSleep ?? 0) + (s?.remSleep ?? 0) + (s?.lightSleep ?? 0) + (s?.awakeDuration ?? 0));
            return (
              <Link href="/habits">
                <Card className="cursor-pointer hover:shadow-md transition-shadow border-neutral-200 dark:border-neutral-700">
                  <CardContent className="py-4 px-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <MoonIcon className="w-4 h-4 text-indigo-500" />
                        <p className="text-sm font-medium">Last Night's Sleep</p>
                      </div>
                      {s?.source === 'oura' && (
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">Oura</span>
                      )}
                    </div>

                    {s ? (
                      <div className="flex items-center gap-4">
                        {/* Score ring */}
                        <div className="relative flex-shrink-0">
                          <svg width={56} height={56} className="-rotate-90">
                            <circle cx={28} cy={28} r={20} fill="none" stroke="currentColor" strokeWidth={6} className="text-neutral-200 dark:text-neutral-700" />
                            <circle cx={28} cy={28} r={20} fill="none" stroke={ringColor} strokeWidth={6}
                              strokeDasharray={`${score ? (score / 100) * (2 * Math.PI * 20) : 0} ${2 * Math.PI * 20}`}
                              strokeLinecap="round" />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-sm font-bold" style={{ color: ringColor }}>{score ?? '—'}</span>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold" style={{ color: ringColor }}>{scoreLabel || '—'}</span>
                            {total && <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{fmtMins(total)}</span>}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-neutral-500 flex-wrap">
                            {s.bedtime && <span>🌙 {s.bedtime}</span>}
                            {s.wakeTime && <span>☀️ {s.wakeTime}</span>}
                            {s.hrv != null && <span className="text-rose-500 font-medium">{s.hrv}ms HRV</span>}
                            {s.restingHeartRate != null && <span className="text-sky-500 font-medium">{s.restingHeartRate}bpm</span>}
                          </div>
                          {/* Mini stage bar */}
                          {stageTotal > 0 && (
                            <div className="flex h-2 rounded-full overflow-hidden gap-px mt-1">
                              {(s.deepSleep ?? 0) > 0 && <div className="bg-indigo-600 dark:bg-indigo-500 rounded-l-full" style={{ width: `${((s.deepSleep ?? 0) / stageTotal) * 100}%` }} />}
                              {(s.remSleep ?? 0) > 0 && <div className="bg-violet-500" style={{ width: `${((s.remSleep ?? 0) / stageTotal) * 100}%` }} />}
                              {(s.lightSleep ?? 0) > 0 && <div className="bg-sky-400" style={{ width: `${((s.lightSleep ?? 0) / stageTotal) * 100}%` }} />}
                              {(s.awakeDuration ?? 0) > 0 && <div className="bg-amber-300 rounded-r-full" style={{ width: `${((s.awakeDuration ?? 0) / stageTotal) * 100}%` }} />}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-sm text-neutral-400">
                        <span>No sleep data</span>
                        <span className="text-xs text-indigo-500">Log or sync →</span>
                      </div>
                    )}

                    {s?.date && (
                      <p className="text-[10px] text-neutral-400 mt-2">
                        {new Date(s.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
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

            const lastRecorded = weightPoints.length > 0 ? weightPoints[weightPoints.length - 1] : null;
            const displayWeight = todayWeight ?? lastRecorded?.weight ?? null;
            const isLastRecorded = todayWeight == null && lastRecorded != null;

            const weights = weightPoints.map((p) => p.weight);
            const minW = weights.length > 0 ? Math.floor(Math.min(...weights)) - 2 : 0;
            const maxW = weights.length > 0 ? Math.ceil(Math.max(...weights)) + 2 : 300;

            return (
              <Card>
                <CardContent className="py-4 px-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-[#F59E0B]" />
                      <p className="text-sm font-medium">Weight</p>
                    </div>
                    {displayWeight != null && (
                      <div className="text-right">
                        <p className="text-lg font-bold text-[#F59E0B]">{displayWeight.toFixed(1)} lbs</p>
                        {isLastRecorded && lastRecorded && (
                          <p className="text-[10px] text-neutral-400">
                            Last recorded · {new Date(lastRecorded.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        )}
                      </div>
                    )}
                    {displayWeight == null && (
                      <p className="text-sm text-neutral-400">No data</p>
                    )}
                  </div>

                  {weightPoints.length > 1 ? (
                    <div className="mt-2" style={{ height: 200 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={weightPoints} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            tickLine={false}
                            axisLine={false}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            domain={[minW, maxW]}
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            tickLine={false}
                            axisLine={false}
                            width={48}
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
                          <Line
                            type="monotone"
                            dataKey="weight"
                            stroke="#F59E0B"
                            strokeWidth={2}
                            dot={{ r: 3, fill: '#F59E0B', strokeWidth: 0 }}
                            activeDot={{ r: 5, fill: '#F59E0B', strokeWidth: 0 }}
                          />
                        </LineChart>
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
          'freezer-spending': () => (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Snowflake className="w-4 h-4 text-blue-500" />
                    Freezer Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {freezerData.length === 0 ? (
                    <p className="text-sm text-neutral-500">Freezer is empty. Time to meal prep!</p>
                  ) : (
                    <div className="space-y-3">
                      {freezerData.map((item) => (
                        <div key={item.id} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{item.recipeName}</p>
                            <p className="text-xs text-neutral-500">{item.quantity} servings</p>
                          </div>
                          <Badge
                            variant={
                              item.daysRemaining < 7 ? 'destructive' :
                              item.daysRemaining < 14 ? 'warning' :
                              'success'
                            }
                          >
                            {item.daysRemaining < 0 ? 'Expired' :
                             item.daysRemaining === 0 ? 'Today' :
                             `${item.daysRemaining}d left`}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                  <Link href="/freezer" className="text-sm text-[#E07A3A] hover:underline mt-3 block">
                    View freezer inventory →
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-[#3A8A5C]" />
                    Weekly Spending
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-3xl font-bold text-[#3A8A5C]">{formatCurrency(weeklySpend)}</p>
                        <p className="text-xs text-neutral-500">meal prep this week</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-neutral-500 line-through">{formatCurrency(fastFoodBaseline)}</p>
                        <p className="text-xs text-neutral-500">fast food estimate</p>
                      </div>
                    </div>
                    {savings > 0 && (
                      <div className="bg-[#3A8A5C]/10 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-[#3A8A5C]">
                          You&apos;re saving {formatCurrency(savings)} this week!
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ),
          'weekly-digest': () => (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-500" />
                  Weekly AI Digest
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {digest ? (
                  <>
                    <p className="text-xs text-neutral-400">{digest.period}</p>
                    <div className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
                      {digest.text}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        setDigestLoading(true);
                        setDigest(null);
                        try {
                          const res = await fetch('/api/weekly-digest');
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error ?? 'Failed');
                          setDigest({ text: data.digest, period: `${data.period.start} → ${data.period.end}` });
                        } catch (err: unknown) {
                          toast.error(err instanceof Error ? err.message : 'Digest failed');
                        } finally {
                          setDigestLoading(false);
                        }
                      }}
                      disabled={digestLoading}
                      className="text-violet-600 border-violet-200 hover:bg-violet-50"
                    >
                      {digestLoading ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Generating…</> : 'Regenerate'}
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col items-start gap-3">
                    <p className="text-sm text-neutral-500">
                      Get a personalized summary of your last 7 days — nutrition, sleep, steps, and habits.
                    </p>
                    <Button
                      onClick={async () => {
                        setDigestLoading(true);
                        try {
                          const res = await fetch('/api/weekly-digest');
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error ?? 'Failed');
                          setDigest({ text: data.digest, period: `${data.period.start} → ${data.period.end}` });
                        } catch (err: unknown) {
                          toast.error(err instanceof Error ? err.message : 'Digest failed');
                        } finally {
                          setDigestLoading(false);
                        }
                      }}
                      disabled={digestLoading}
                      size="sm"
                      className="bg-violet-600 hover:bg-violet-700 text-white"
                    >
                      {digestLoading ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Generating…</> : <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Generate Digest</>}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
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
