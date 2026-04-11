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
  Pill,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { MEAL_TYPE_LABELS, STEPS_TARGET, WATER_TARGET, COFFEE_LIMIT, CAFFEINE_PER_CUP, USER_PROFILE } from '@/lib/constants';
import { upsertSteps, upsertWater, upsertCoffee } from '@/db/queries/daily-log';
import { toast } from 'sonner';
import type { Recipe, SleepLog, DailyLog, OuraDaily, Supplement, SupplementLogEntry, DentalLogEntry } from '@/db/schema';
import { logSupplement, deleteSupplementLog } from '@/db/queries/supplements';
import { addDentalLog, removeDentalLog } from '@/db/queries/dental';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
  selectedDate: string;
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
  todaySupplements?: Array<{ log: SupplementLogEntry; supplement: Supplement }>;
  activeSupplements?: Supplement[];
  stepsHistory?: DailyLog[];
  ouraToday?: OuraDaily | null;
  sleepToday?: SleepLog | null;
  ouraHistory?: OuraDaily[];
  sleepHistory?: SleepLog[];
  dentalToday?: DentalLogEntry[];
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

const CARD_IDS = ['oura', 'teeth', 'quick-log', 'nutrition', 'steps', 'water', 'coffee', 'supplements', 'meals'] as const;
type CardId = typeof CARD_IDS[number];
const DEFAULT_ORDER: CardId[] = [...CARD_IDS];
const STORAGE_KEY = 'dashboard-card-order-v10';

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
  selectedDate,
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
  todaySupplements = [],
  activeSupplements = [],
  stepsHistory = [],
  ouraToday = null,
  sleepToday = null,
  ouraHistory = [],
  sleepHistory = [],
  dentalToday = [],
}: Props) {
  const router = useRouter();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<string>('breakfast');
  const [steps, setSteps] = useState(todaySteps);
  const [stepsDate, setStepsDate] = useState(selectedDate);
  const [water, setWater] = useState(todayWater);
  const [coffee, setCoffee] = useState(todayCoffee);
  const [isPending, startTransition] = useTransition();
  const [isSyncingOura, setIsSyncingOura] = useState(false);
  const [localDental, setLocalDental] = useState<DentalLogEntry[]>(dentalToday);
  const [brushModal, setBrushModal] = useState<{ open: boolean; slot: 'am' | 'pm' }>({ open: false, slot: 'am' });
  const [brushDurMin, setBrushDurMin] = useState('2');
  const [brushExtras, setBrushExtras] = useState<Set<string>>(new Set());
  const [sleepHistoryRange, setSleepHistoryRange] = useState<7 | 30>(7);
  const stepsInputRef = useRef<HTMLInputElement>(null);
  const waterInputRef = useRef<HTMLInputElement>(null);
  const [cardOrder, setCardOrder] = useState<CardId[]>(DEFAULT_ORDER);
  // supplement doses taken today — initialized from todaySupplements actual logged dose
  const [supplementDoses, setSupplementDoses] = useState<Map<number, number>>(
    () => new Map(todaySupplements.map((ts) => [ts.supplement.id, ts.log.dose ?? ts.supplement.defaultDose ?? 1])),
  );

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
      await upsertWater(selectedDate, 'me', value);
      toast.success('Water updated');
    });
  };

  const handleCoffeeSave = (value: number) => {
    const clamped = Math.max(0, value);
    setCoffee(clamped);
    startTransition(async () => {
      await upsertCoffee(selectedDate, 'me', clamped);
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

  // Compute streaks from history (sorted newest-first from DB, we need oldest→newest for streak logic)
  const computeStepsStreak = () => {
    const sorted = [...stepsHistory].sort((a, b) => b.date.localeCompare(a.date));
    let streak = 0;
    for (const d of sorted) {
      if ((d.steps ?? 0) >= 10000) streak++;
      else break;
    }
    return streak;
  };

  const computeSuppStreak = () => {
    // streak = consecutive days (going back from today) where ALL active supplements were taken
    if (activeSupplements.length === 0) return 0;
    // Build a set of dates per supplementId from todaySupplements
    // For streak we only have todaySupplements (today's data), not historical per-day data
    // Use stepsHistory dates to anchor days, but we don't have daily supp logs per day on the dashboard
    // Simplest approach: streak = 1 if all taken today, else 0
    const allTakenToday = activeSupplements.every((s) => (supplementDoses.get(s.id) ?? 0) > 0);
    return allTakenToday ? 1 : 0;
  };

  const stepsStreak = computeStepsStreak();
  const suppStreak = computeSuppStreak();

  const handleSupplementDose = (suppId: number, delta: number) => {
    const current = supplementDoses.get(suppId) ?? 0;
    const next = Math.max(0, current + delta);
    setSupplementDoses((prev) => new Map(prev).set(suppId, next));
    startTransition(async () => {
      const existing = todaySupplements.find((ts) => ts.supplement.id === suppId);
      if (next === 0) {
        if (existing) await deleteSupplementLog(existing.log.id);
      } else {
        const supp = activeSupplements.find((s) => s.id === suppId);
        if (!supp) return;
        const time = new Date().toTimeString().slice(0, 5);
        if (existing) {
          await deleteSupplementLog(existing.log.id);
        }
        await logSupplement({ supplementId: suppId, date: selectedDate, time, dose: next, person: 'me', situation: 'other' });
      }
    });
  };

  // Date navigation helpers
  const isToday = selectedDate === today;
  const yesterdayDate = (() => {
    const d = new Date(today + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  })();
  const isYesterday = selectedDate === yesterdayDate;

  const selectedDateLabel = isToday
    ? 'Today'
    : isYesterday
    ? 'Yesterday'
    : new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });

  const navigateDate = (direction: 'prev' | 'next') => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + (direction === 'prev' ? -1 : 1));
    const newDate = d.toISOString().split('T')[0];
    if (direction === 'next' && newDate > today) return;
    router.push(`/?date=${newDate}`);
  };

  const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val && /^\d{4}-\d{2}-\d{2}$/.test(val) && val <= today) {
      if (val === today) {
        router.push('/');
      } else {
        router.push(`/?date=${val}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Date Navigation Bar */}
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigateDate('prev')}
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
          </button>

          <div className="relative flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => dateInputRef.current?.click()}
              className="flex items-center gap-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
              aria-label="Pick a date"
            >
              <span>{selectedDateLabel}</span>
              <Calendar className="w-3.5 h-3.5 text-neutral-400" />
            </button>
            <input
              ref={dateInputRef}
              type="date"
              max={today}
              defaultValue={selectedDate}
              onChange={handleDatePickerChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              aria-hidden="true"
              tabIndex={-1}
            />
          </div>

          <button
            type="button"
            onClick={() => navigateDate('next')}
            disabled={isToday}
            className={`p-1.5 rounded-lg transition-colors ${
              isToday
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            aria-label="Next day"
          >
            <ChevronRight className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
          </button>
        </div>

        {!isToday && (
          <Link
            href="/"
            className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors font-medium"
          >
            Back to Today
          </Link>
        )}
      </div>

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

      {/* Streaks Strip */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800">
          <span className="text-base">🔥</span>
          <div>
            <p className="text-sm font-bold leading-none">{stepsStreak}d</p>
            <p className="text-[10px] text-neutral-500 mt-0.5">Steps streak</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800">
          <span className="text-base">💊</span>
          <div>
            <p className="text-sm font-bold leading-none">{suppStreak}d</p>
            <p className="text-[10px] text-neutral-500 mt-0.5">Supplement streak</p>
          </div>
        </div>
      </div>

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
            // ── helpers ──────────────────────────────────────────────────────
            function fmtMins(m: number | null | undefined) {
              if (!m) return '—';
              const h = Math.floor(m / 60);
              const min = m % 60;
              return h > 0 ? `${h}h ${min}m` : `${min}m`;
            }

            // Hypnogram parsing — '1'=awake, '2'=light, '3'=REM, '4'=deep
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

            // quality 0–100 → bar color
            const qualityColor = (q: number) =>
              q >= 70 ? '#4ade80' : q >= 40 ? '#facc15' : '#fb923c';

            // ── data ─────────────────────────────────────────────────────────
            const s = sleepToday;
            const sleepScore = s?.score ?? null;
            const totalSleep = s?.totalSleep ?? null;
            const deepSleep = s?.deepSleep ?? null;
            const remSleep = s?.remSleep ?? null;
            const awakeDuration = s?.awakeDuration ?? null;
            const efficiency = s?.efficiency ?? null;
            const latency = s?.latency ?? null;
            const restfulness = s?.restfulness ?? null;
            const hrv = s?.hrv ?? null;
            const rhr = s?.restingHeartRate ?? null;
            const bedtime = s?.bedtime ?? null;
            const wakeTime = s?.wakeTime ?? null;

            const sleepPhasesRaw = (s as (SleepLog & { sleepPhases?: string | null }) | null)?.sleepPhases ?? null;
            const phaseSegments = parsePhases(sleepPhasesRaw);
            const totalPhaseMins = phaseSegments.reduce((acc, seg) => acc + seg.duration, 0);

            // sleep score label + color
            const scoreLabel = sleepScore == null ? null
              : sleepScore >= 85 ? 'Good'
              : sleepScore >= 70 ? 'Fair'
              : 'Pay attention';
            const scoreLabelColor = sleepScore == null ? '#9ca3af'
              : sleepScore >= 85 ? '#4ade80'
              : sleepScore >= 70 ? '#facc15'
              : '#fb923c';

            // subtitle: "Last night · Xh Ym total"
            const subtitle = totalSleep != null
              ? `Last night · ${fmtMins(totalSleep)} total`
              : 'Last night';

            // contributors — compute quality 0–100 for bar width & color
            const totalForPct = totalSleep ?? 1;
            const remPct = remSleep != null ? Math.round((remSleep / totalForPct) * 100) : null;
            const deepPct = deepSleep != null ? Math.round((deepSleep / totalForPct) * 100) : null;

            type Contributor = {
              label: string;
              value: string;
              quality: number;
              barColor: string;
            };

            const contributors: Contributor[] = [];

            // Total sleep: 0 min = 0, 480 min (8h) = 100, linear
            if (totalSleep != null) {
              const q = Math.min(Math.round((totalSleep / 480) * 100), 100);
              contributors.push({ label: 'Total sleep', value: fmtMins(totalSleep), quality: q, barColor: qualityColor(q) });
            }

            // Efficiency: >85% full
            if (efficiency != null) {
              const q = Math.min(Math.round((efficiency / 85) * 100), 100);
              contributors.push({ label: 'Efficiency', value: `${efficiency}%`, quality: q, barColor: qualityColor(q) });
            }

            // REM: >20% of total = full
            if (remSleep != null && remPct != null) {
              const q = Math.min(Math.round((remPct / 20) * 100), 100);
              contributors.push({ label: 'REM sleep', value: `${fmtMins(remSleep)} · ${remPct}%`, quality: q, barColor: '#a78bfa' });
            }

            // Deep: >15% of total = full
            if (deepSleep != null && deepPct != null) {
              const q = Math.min(Math.round((deepPct / 15) * 100), 100);
              contributors.push({ label: 'Deep sleep', value: `${fmtMins(deepSleep)} · ${deepPct}%`, quality: q, barColor: '#6366f1' });
            }

            // Restfulness: 0–100 direct
            if (restfulness != null) {
              const q = restfulness;
              contributors.push({ label: 'Restfulness', value: String(restfulness), quality: q, barColor: qualityColor(q) });
            }

            // Latency: inverse — <20m = 100, linear up to 60m = 0
            if (latency != null) {
              const q = Math.max(0, Math.min(100, Math.round(((60 - latency) / 40) * 100)));
              contributors.push({ label: 'Sleep latency', value: fmtMins(latency), quality: q, barColor: qualityColor(q) });
            }

            // chart data for history
            const historySlice = [...sleepHistory]
              .sort((a, b) => a.date.localeCompare(b.date))
              .slice(-(sleepHistoryRange));

            const chartData = historySlice.map((sl) => {
              const d = new Date(sl.date + 'T00:00:00');
              const label = d.toLocaleDateString('en-US', { weekday: 'short' });
              return {
                label,
                deep: sl.deepSleep != null ? +(sl.deepSleep / 60).toFixed(2) : 0,
                rem: sl.remSleep != null ? +(sl.remSleep / 60).toFixed(2) : 0,
                light: sl.lightSleep != null ? +(sl.lightSleep / 60).toFixed(2) : 0,
              };
            });

            // sync handler
            const handleSync = async () => {
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
            };

            return (
              <Card className="border-neutral-800 bg-neutral-950">
                <CardContent className="py-5 px-5 space-y-5">

                  {/* ── 1. Header row ─────────────────────────────────────── */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MoonIcon className="w-4 h-4 text-indigo-400" />
                      <span className="text-base font-semibold text-white">Sleep</span>
                    </div>
                    <button
                      onClick={handleSync}
                      disabled={isSyncingOura}
                      className="text-xs px-3 py-1.5 rounded-lg border border-neutral-700 text-neutral-400 hover:border-indigo-500 hover:text-indigo-300 transition-colors disabled:opacity-50"
                    >
                      {isSyncingOura ? 'Syncing…' : 'Sync Now'}
                    </button>
                  </div>

                  {!s ? (
                    /* ── Empty state ─────────────────────────────────────── */
                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                      <MoonIcon className="w-8 h-8 text-neutral-700" />
                      <p className="text-sm text-neutral-500">No sleep data · Hit Sync Now</p>
                    </div>
                  ) : (
                    <>
                      {/* ── 2. Sleep Score ──────────────────────────────── */}
                      <div>
                        <div className="flex items-baseline gap-3">
                          <span className="text-5xl font-bold text-white leading-none">
                            {sleepScore ?? '—'}
                          </span>
                          {scoreLabel && (
                            <span className="text-sm font-semibold" style={{ color: scoreLabelColor }}>
                              {scoreLabel}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-500 mt-1.5">{subtitle}</p>
                      </div>

                      {/* ── 3. Hypnogram bar ────────────────────────────── */}
                      <div>
                        {phaseSegments.length > 0 && totalPhaseMins > 0 ? (
                          <>
                            <div className="flex h-8 rounded-lg overflow-hidden w-full" style={{ gap: '1px' }}>
                              {phaseSegments.map((seg, i) => (
                                <div
                                  key={i}
                                  style={{
                                    width: `${(seg.duration / totalPhaseMins) * 100}%`,
                                    backgroundColor: STAGE_COLORS[seg.stage] ?? '#374151',
                                    borderRadius:
                                      i === 0 ? '8px 0 0 8px'
                                      : i === phaseSegments.length - 1 ? '0 8px 8px 0'
                                      : '0',
                                  }}
                                  title={`${seg.stage === '4' ? 'Deep' : seg.stage === '3' ? 'REM' : seg.stage === '2' ? 'Light' : seg.stage === '1' ? 'Awake' : 'Unknown'} · ${seg.duration}m`}
                                />
                              ))}
                            </div>
                            {/* Bedtime / wake time */}
                            {(bedtime || wakeTime) && (
                              <div className="flex justify-between mt-1">
                                <span className="text-[10px] text-neutral-600">{bedtime ?? ''}</span>
                                <span className="text-[10px] text-neutral-600">{wakeTime ?? ''}</span>
                              </div>
                            )}
                            {/* Legend */}
                            <div className="flex items-center gap-4 mt-2 flex-wrap">
                              {[
                                { stage: '1', label: 'Awake' },
                                { stage: '3', label: 'REM' },
                                { stage: '2', label: 'Light' },
                                { stage: '4', label: 'Deep' },
                              ].map(({ stage, label }) => (
                                <div key={stage} className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: STAGE_COLORS[stage] }} />
                                  <span className="text-[11px] text-neutral-500">{label}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-center h-8 rounded-lg bg-neutral-800/60">
                            <span className="text-[11px] text-neutral-600">No phase data — sync Oura</span>
                          </div>
                        )}
                      </div>

                      {/* ── 4. Contributors ─────────────────────────────── */}
                      {contributors.length > 0 && (
                        <div className="space-y-3.5">
                          {contributors.map((c) => (
                            <div key={c.label}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-neutral-400">{c.label}</span>
                                <span className="text-xs font-semibold text-white">{c.value}</span>
                              </div>
                              <div className="w-full h-[3px] rounded-full bg-neutral-800">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{ width: `${c.quality}%`, backgroundColor: c.barColor }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* ── 5. Key metrics 2×2 grid ─────────────────────── */}
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          {
                            label: 'Time in bed',
                            value: (totalSleep != null && awakeDuration != null)
                              ? fmtMins(totalSleep + awakeDuration)
                              : fmtMins(totalSleep),
                          },
                          { label: 'Efficiency', value: efficiency != null ? `${efficiency}%` : '—' },
                          { label: 'Resting HR', value: rhr != null ? `${rhr} bpm` : '—' },
                          { label: 'HRV', value: hrv != null ? `${hrv} ms` : '—' },
                        ].map(({ label, value }) => (
                          <div key={label} className="bg-neutral-900 rounded-xl px-3.5 py-3">
                            <p className="text-[10px] text-neutral-500 uppercase tracking-wide mb-0.5">{label}</p>
                            <p className="text-sm font-bold text-white">{value}</p>
                          </div>
                        ))}
                      </div>

                      {/* ── 6. Sleep history chart ──────────────────────── */}
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
                          <div style={{ height: 140 }}>
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
                    </>
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
          'supplements': () => (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Pill className="w-4 h-4 text-[#7C3AED]" />
                  Supplements
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeSupplements.length === 0 ? (
                  <p className="text-sm text-neutral-500">No supplements configured</p>
                ) : (
                  <div className="space-y-2">
                    {activeSupplements.map((supp) => {
                      const dose = supplementDoses.get(supp.id) ?? 0;
                      return (
                        <div key={supp.id} className={`flex items-center gap-3 py-2.5 px-3 rounded-xl border transition-colors ${
                          dose > 0 ? 'border-[#7C3AED]/30 bg-[#7C3AED]/5' : 'border-neutral-200 dark:border-neutral-700'
                        }`}>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{supp.name}</p>
                            <p className="text-xs text-neutral-500">{supp.defaultDose} {supp.doseUnit} recommended</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => handleSupplementDose(supp.id, -1)} disabled={dose === 0 || isPending}
                              className="w-7 h-7 rounded-full border border-neutral-300 dark:border-neutral-600 flex items-center justify-center text-sm font-bold hover:border-[#7C3AED] hover:text-[#7C3AED] disabled:opacity-30 transition-colors">−</button>
                            <span className={`w-5 text-center text-sm font-semibold ${dose > 0 ? 'text-[#7C3AED]' : 'text-neutral-400'}`}>{dose}</span>
                            <button onClick={() => handleSupplementDose(supp.id, 1)} disabled={isPending}
                              className="w-7 h-7 rounded-full border border-neutral-300 dark:border-neutral-600 flex items-center justify-center text-sm font-bold hover:border-[#7C3AED] hover:text-[#7C3AED] disabled:opacity-30 transition-colors">+</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ),
          'nutrition': () => (
            <NutritionCard title="Today's Nutrition" data={myNutrition} targets={targets} microTargets={microTargets} />
          ),
          'teeth': () => {
            const brushSessions = localDental.filter(l => l.activity === 'brush').sort((a, b) => a.time.localeCompare(b.time));
            const amBrush = brushSessions.find(l => l.time < '12:00');
            const pmBrush = brushSessions.find(l => l.time >= '12:00');
            const hasMouthwash = localDental.some(l => l.activity === 'mouthwash');
            const hasFloss = localDental.some(l => l.activity === 'floss_pick');
            const hasWaterFlosser = localDental.some(l => l.activity === 'water_flosser');
            const fmtDur = (sec: number | null | undefined) => {
              if (!sec) return '';
              const m = Math.floor(sec / 60); const s = sec % 60;
              return m > 0 ? `${m}m ${s > 0 ? s + 's' : ''}`.trim() : `${s}s`;
            };
            const openBrushModal = (slot: 'am' | 'pm', existingId?: number) => {
              if (existingId) {
                setLocalDental(prev => prev.filter(l => l.id !== existingId));
                startTransition(async () => { await removeDentalLog(existingId); toast.success('Brushing removed'); });
              } else {
                setBrushDurMin('2');
                setBrushExtras(new Set());
                setBrushModal({ open: true, slot });
              }
            };
            return (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    🦷 Teeth Brushing
                    <span className="text-xs font-normal text-neutral-400 ml-auto">Auto-syncs via Apple Health</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => openBrushModal('am', amBrush?.id)} disabled={isPending}
                      className={`rounded-xl p-4 flex flex-col items-center gap-1.5 border-2 transition-all disabled:opacity-50 hover:scale-[1.02] hover:shadow-md ${amBrush ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/60' : 'border-dashed border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/60'}`}>
                      <Sun className={`w-6 h-6 ${amBrush ? 'text-emerald-500' : 'text-neutral-300'}`} />
                      <span className={`text-sm font-semibold ${amBrush ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400'}`}>{amBrush ? 'Morning ✓' : 'Morning'}</span>
                      {amBrush && <span className="text-[11px] text-neutral-500">{amBrush.time}{amBrush.duration ? ` · ${fmtDur(amBrush.duration)}` : ''}</span>}
                      {amBrush && <span className="text-[10px] text-neutral-400">tap to remove</span>}
                    </button>
                    <button onClick={() => openBrushModal('pm', pmBrush?.id)} disabled={isPending}
                      className={`rounded-xl p-4 flex flex-col items-center gap-1.5 border-2 transition-all disabled:opacity-50 hover:scale-[1.02] hover:shadow-md ${pmBrush ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/60' : 'border-dashed border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/60'}`}>
                      <MoonIcon className={`w-6 h-6 ${pmBrush ? 'text-indigo-500' : 'text-neutral-300'}`} />
                      <span className={`text-sm font-semibold ${pmBrush ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-400'}`}>{pmBrush ? 'Evening ✓' : 'Evening'}</span>
                      {pmBrush && <span className="text-[11px] text-neutral-500">{pmBrush.time}{pmBrush.duration ? ` · ${fmtDur(pmBrush.duration)}` : ''}</span>}
                      {pmBrush && <span className="text-[10px] text-neutral-400">tap to remove</span>}
                    </button>
                  </div>
                  {/* Extras strip */}
                  {localDental.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {hasMouthwash && <span className="text-[11px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-full px-2 py-0.5">💧 Mouthwash</span>}
                      {hasFloss && <span className="text-[11px] bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 rounded-full px-2 py-0.5">🧵 Floss</span>}
                      {hasWaterFlosser && <span className="text-[11px] bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 rounded-full px-2 py-0.5">🚿 Water Flosser</span>}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          },
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

      {/* Brush Log Modal */}
      {brushModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setBrushModal(m => ({ ...m, open: false }))}>
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl p-6 space-y-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold">{brushModal.slot === 'am' ? '🌅 Morning' : '🌙 Evening'} Brush</h3>

            {/* Duration */}
            <div className="space-y-2">
              <p className="text-xs text-neutral-500 font-medium">How long did you brush?</p>
              <div className="flex gap-2">
                {['1', '2', '3', '4'].map(m => (
                  <button key={m} onClick={() => setBrushDurMin(m)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${brushDurMin === m ? 'bg-emerald-500 text-white border-emerald-500' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'}`}>
                    {m}m
                  </button>
                ))}
                <input type="number" value={brushDurMin} onChange={e => setBrushDurMin(e.target.value)} min="1" max="30"
                  className="w-16 text-center border rounded-lg text-sm bg-transparent border-neutral-200 dark:border-neutral-700" placeholder="min" />
              </div>
            </div>

            {/* Extras */}
            <div className="space-y-2">
              <p className="text-xs text-neutral-500 font-medium">Did you also use any of these?</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'mouthwash', label: '💧 Mouthwash' },
                  { key: 'floss_pick', label: '🧵 Floss / Pick' },
                  { key: 'water_flosser', label: '🚿 Water Flosser' },
                  { key: 'probiotic', label: '🦠 Oral Probiotic' },
                ].map(({ key, label }) => {
                  const active = brushExtras.has(key);
                  return (
                    <button key={key} onClick={() => setBrushExtras(prev => { const n = new Set(prev); active ? n.delete(key) : n.add(key); return n; })}
                      className={`py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-all text-left ${active ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' : 'border-neutral-200 dark:border-neutral-700 text-neutral-500'}`}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit */}
            <button
              disabled={isPending}
              onClick={() => {
                const now = new Date();
                const time = now.toTimeString().substring(0, 5);
                const durationSec = Math.round(parseFloat(brushDurMin || '2') * 60);
                const tempId = -(Date.now());
                setLocalDental(prev => [...prev, { id: tempId, date: selectedDate, time, activity: 'brush', duration: durationSec, productId: null, notes: null, createdAt: null }]);
                setBrushModal(m => ({ ...m, open: false }));
                startTransition(async () => {
                  await addDentalLog({ date: selectedDate, time, activity: 'brush', duration: durationSec });
                  // Log each extra activity
                  for (const extra of brushExtras) {
                    if (extra === 'probiotic') continue; // notes only
                    await addDentalLog({ date: selectedDate, time, activity: extra as 'mouthwash' | 'floss_pick' | 'water_flosser' });
                  }
                  const extras = Array.from(brushExtras);
                  toast.success(`${brushModal.slot === 'am' ? 'Morning' : 'Evening'} brush logged${extras.length ? ` + ${extras.length} extra` : ''}`);
                });
              }}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50">
              Save
            </button>
          </div>
        </div>
      )}

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
