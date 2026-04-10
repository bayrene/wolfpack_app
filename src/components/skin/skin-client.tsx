'use client';

import React, { useState, useEffect, useCallback, useRef, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Shield,
  Flame,
  Sparkles,
  Droplets,
  CheckCircle2,
  Trophy,
  Sun,
  Moon,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Circle,
  CheckCircle,
  TrendingUp,
  RotateCcw,
  Settings2,
  AlertTriangle,
  Camera,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  FlaskConical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  initSkinProgram,
  upsertSkinDayLog,
  updateSkinLongestStreak,
  updateSkinStartDate,
  resetSkinProgram,
  addSkinProduct,
  updateSkinProduct,
  deleteSkinProduct,
  addSkinProductUsage,
  deleteSkinProductUsage,
  migrateSkinFromLocalStorage,
} from '@/db/queries/skin';
import type { SkinSettingsRow, SkinDayLogRow, SkinProductRow, SkinProductUsageRow } from '@/db/schema';

// ── Data types ──────────────────────────────────────────────────────

interface DayLog {
  morningRoutine: Record<string, boolean>;
  eveningRoutine: Record<string, boolean>;
  hydration: { ozConsumed: number; goal: number };
  coffee: { cups: number };
  tweezed: boolean;
  nutrition: { ateFruit: boolean; ateVegetable: boolean; ateFastFood: boolean };
  skinRoutine: Record<string, boolean>;
}

interface SkinProduct {
  id: string;
  name: string;
  brand: string;
  type: 'cleanser' | 'moisturizer' | 'serum' | 'sunscreen' | 'treatment' | 'toner' | 'exfoliant' | 'mask' | 'oil' | 'other';
  whenToUse: 'morning' | 'evening' | 'both' | 'weekly' | 'as_needed';
  instructions: string;
  ingredients?: string;
  active: boolean;
}

interface ProductUsageLog {
  id: string;
  productId: string;
  date: string;
  time: string; // 'morning' | 'evening' | 'afternoon' | custom HH:MM
  notes: string;
}

interface SkinPhoto {
  id: string;
  date: string;
  side: 'left' | 'right' | 'front' | 'other';
  dataUrl: string;
  notes: string;
}

// ── Default routine items ───────────────────────────────────────────

const DEFAULT_MORNING_ROUTINE: Record<string, boolean> = {
  'Gentle cleanser': false,
  'Hydrating toner': false,
  'Vitamin C serum': false,
  'Moisturizer': false,
  'Sunscreen SPF 30+': false,
  'Hands off face': false,
  'Clean pillowcase': false,
};

const DEFAULT_EVENING_ROUTINE: Record<string, boolean> = {
  'Oil cleanser / micellar': false,
  'Gentle cleanser': false,
  'Treatment / actives': false,
  'Hydrating serum': false,
  'Moisturizer': false,
  'Lip balm': false,
  'Humidifier on': false,
};

const DEFAULT_SKIN_ROUTINE: Record<string, boolean> = {
  'Wash Face': false,
  'Moisturize': false,
  'Sunscreen': false,
  'Serum': false,
};

function createEmptyLog(): DayLog {
  return {
    morningRoutine: { ...DEFAULT_MORNING_ROUTINE },
    eveningRoutine: { ...DEFAULT_EVENING_ROUTINE },
    hydration: { ozConsumed: 0, goal: 64 },
    coffee: { cups: 0 },
    tweezed: false,
    nutrition: { ateFruit: false, ateVegetable: false, ateFastFood: false },
    skinRoutine: { ...DEFAULT_SKIN_ROUTINE },
  };
}

function getDefaultProducts(): Omit<SkinProduct, 'id'>[] {
  return [
    { name: 'Azelaic Acid Suspension 10%', brand: 'The Ordinary', type: 'treatment', whenToUse: 'evening', instructions: 'Apply a thin layer after cleansing & serums. Brightening formula for uneven skin tone, blemishes & texture.', active: true },
    { name: '2% BHA Liquid Exfoliant', brand: "Paula's Choice", type: 'exfoliant', whenToUse: 'evening', instructions: 'Apply with cotton pad after cleansing. Salicylic acid unclogs pores, smooths skin tone. Use 2-3x per week.', active: true },
    { name: 'Ingrown Hair Treatment', brand: 'Anthony', type: 'treatment', whenToUse: 'as_needed', instructions: 'Apply to irritated areas. Glycolic, Salicylic & Phytic Acids remove dead skin and free trapped hairs. Willowherb & Lavender soothe skin.', active: true },
    { name: 'Facial Moisturizer SPF 30', brand: 'Vanicream', type: 'sunscreen', whenToUse: 'morning', instructions: 'Apply liberally 15 min before sun exposure. Reapply every 2 hours. Zinc oxide sunscreen with ceramides.', ingredients: 'Active: Zinc oxide 19.5%. Inactive: water, C12-15 alkyl benzoate, isopentyldiol, squalane, glycerin, coco-caprylate/caprate, bis-octyldodecyl dimer dilinoleate/propanediol copolymer, glyceryl stearate, PEG-100 stearate, polyhydroxystearic acid, cetearyl alcohol, sucrose stearate, ceramide EOP, ceramide NG, ceramide NP, ceramide AS, ceramide AP, carnosine, phytosterols, hydrogenated lecithin, dimethicone, triethoxycaprylylsilane, polyacrylate crosspolymer-11, caprylyl glycol, 1,2-hexanediol', active: true },
    { name: 'Daily Facial Moisturizer', brand: 'Vanicream', type: 'moisturizer', whenToUse: 'both', instructions: 'Apply as needed day or night. Hyaluronic acid & ceramides for deep hydration. Non-comedogenic.', ingredients: 'water, squalane, glycerin, pentylene glycol, polyglyceryl-2 stearate, glyceryl stearate, stearyl alcohol, hyaluronic acid, ceramide EOP, ceramide NG, ceramide NP, ceramide AS, ceramide AP, carnosine, phytosterols, hydrogenated lecithin, caprylyl glycol, polyacrylate crosspolymer-11, 1,2-hexanediol', active: true },
    { name: 'Hyaluronic Acid Serum', brand: 'Good Molecules', type: 'serum', whenToUse: 'both', instructions: 'Apply to damp skin before moisturizer. Deep hydration to plump fine lines. 75mL / 2.5 fl oz.', active: true },
  ];
}

// ── Helpers ─────────────────────────────────────────────────────────

function getDayNumber(startDate: string, date: string): number {
  const start = new Date(startDate + 'T00:00:00');
  const d = new Date(date + 'T00:00:00');
  return Math.max(1, Math.floor((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

function getPhaseInfo(dayNumber: number) {
  if (dayNumber <= 14) return { phase: 'Phase 1', label: 'Heal', color: '#EF4444', bgColor: 'bg-red-50 dark:bg-red-950/30', icon: Shield };
  if (dayNumber <= 42) return { phase: 'Phase 2', label: 'Rebuild', color: '#F59E0B', bgColor: 'bg-amber-50 dark:bg-amber-950/30', icon: Flame };
  return { phase: 'Phase 3', label: 'Maintain', color: '#10B981', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30', icon: Sparkles };
}

function getNoTweezeStreak(logs: Record<string, DayLog>, fromDate: string): number {
  let streak = 0;
  const d = new Date(fromDate + 'T00:00:00');
  for (let i = 0; i < 365; i++) {
    const cur = new Date(d);
    cur.setDate(d.getDate() - i);
    const key = cur.toISOString().split('T')[0];
    const log = logs[key];
    if (!log) break;
    if (log.tweezed) break;
    streak++;
  }
  return streak;
}

function getRoutineCount(log: DayLog | undefined): { done: number; total: number } {
  if (!log) return { done: 0, total: 14 };
  let done = 0, total = 0;
  for (const v of Object.values(log.morningRoutine)) { total++; if (v) done++; }
  for (const v of Object.values(log.eveningRoutine)) { total++; if (v) done++; }
  return { done, total: total || 14 };
}

function dateAdd(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function formatDateLabel(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getLast7Dates(today: string): string[] {
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) dates.push(dateAdd(today, -i));
  return dates;
}

// ── Component ───────────────────────────────────────────────────────

type TabType = 'products' | 'photos' | 'history';

const PRODUCT_TYPE_CONFIG: Record<SkinProduct['type'], { label: string; icon: string }> = {
  cleanser: { label: 'Cleanser', icon: '🧼' },
  moisturizer: { label: 'Moisturizer', icon: '💧' },
  serum: { label: 'Serum', icon: '💜' },
  sunscreen: { label: 'Sunscreen', icon: '☀️' },
  treatment: { label: 'Treatment', icon: '💊' },
  toner: { label: 'Toner', icon: '🫧' },
  exfoliant: { label: 'Exfoliant', icon: '✨' },
  mask: { label: 'Mask', icon: '🎭' },
  oil: { label: 'Oil', icon: '🫒' },
  other: { label: 'Other', icon: '📦' },
};

const WHEN_CONFIG: Record<SkinProduct['whenToUse'], { label: string; color: string }> = {
  morning: { label: 'Morning', color: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300' },
  evening: { label: 'Evening', color: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' },
  both: { label: 'AM & PM', color: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300' },
  weekly: { label: 'Weekly', color: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' },
  as_needed: { label: 'As Needed', color: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300' },
};

const SIDE_CONFIG: Record<SkinPhoto['side'], { label: string }> = {
  left: { label: 'Left Side' },
  right: { label: 'Right Side' },
  front: { label: 'Front' },
  other: { label: 'Other' },
};

// localStorage key for photos only
const PHOTOS_KEY = 'skin-tracker-photos';

interface Props {
  today: string;
  embedded?: boolean;
  initialSettings: SkinSettingsRow | null;
  initialDayLogs: SkinDayLogRow[];
  initialProducts: SkinProductRow[];
  initialProductUsage: SkinProductUsageRow[];
}

export function SkinClient({
  today,
  embedded,
  initialSettings,
  initialDayLogs,
  initialProducts,
  initialProductUsage,
}: Props) {
  // ── Build initial state from DB rows ──────────────────────────────

  const logsFromDb: Record<string, DayLog> = {};
  for (const row of initialDayLogs) {
    try { logsFromDb[row.date] = JSON.parse(row.logData); } catch {}
  }

  const productsFromDb: SkinProduct[] = initialProducts.map(p => ({
    id: String(p.id),
    name: p.name,
    brand: p.brand,
    type: p.type as SkinProduct['type'],
    whenToUse: p.whenToUse as SkinProduct['whenToUse'],
    instructions: p.instructions,
    ingredients: p.ingredients ?? undefined,
    active: p.active ?? true,
  }));

  const usageFromDb: ProductUsageLog[] = initialProductUsage.map(u => ({
    id: String(u.id),
    productId: String(u.productId),
    date: u.date,
    time: u.time,
    notes: u.notes ?? '',
  }));

  // ── State ─────────────────────────────────────────────────────────

  const [settings, setSettings] = useState(
    initialSettings
      ? { startDate: initialSettings.startDate, longestStreak: initialSettings.longestStreak ?? 0 }
      : null,
  );
  const [logs, setLogs] = useState<Record<string, DayLog>>(logsFromDb);
  const [products, setProducts] = useState<SkinProduct[]>(productsFromDb);
  const [productUsage, setProductUsage] = useState<ProductUsageLog[]>(usageFromDb);
  const [photos, setPhotos] = useState<SkinPhoto[]>([]);
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [viewDate, setViewDate] = useState(today);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newStartDate, setNewStartDate] = useState('');

  // Product modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [prodName, setProdName] = useState('');
  const [prodBrand, setProdBrand] = useState('');
  const [prodType, setProdType] = useState<SkinProduct['type']>('cleanser');
  const [prodWhen, setProdWhen] = useState<SkinProduct['whenToUse']>('morning');
  const [prodInstructions, setProdInstructions] = useState('');

  // Expanded product (to show ingredients)
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  // Usage log modal
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [usageProductId, setUsageProductId] = useState<string | null>(null);
  const [usageTime, setUsageTime] = useState<string>('morning');
  const [usageNotes, setUsageNotes] = useState('');

  // Photo
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoSide, setPhotoSide] = useState<SkinPhoto['side']>('left');
  const [photoNotes, setPhotoNotes] = useState('');
  const [photoData, setPhotoData] = useState('');
  const [photoDate, setPhotoDate] = useState(today);

  const photoInputRef = useRef<HTMLInputElement>(null);

  // ── Load photos from localStorage (kept in localStorage only) ────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PHOTOS_KEY);
      if (raw) setPhotos(JSON.parse(raw));
    } catch {}
  }, []);

  // ── Check for migration prompt ────────────────────────────────────
  useEffect(() => {
    if (!initialSettings) {
      try {
        const raw = localStorage.getItem('skin-tracker-state');
        if (raw) {
          setShowMigrationPrompt(true);
        }
      } catch {}
    }
  }, [initialSettings]);

  // ── Migration handler ─────────────────────────────────────────────
  const handleMigrate = () => {
    try {
      const raw = localStorage.getItem('skin-tracker-state');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      startTransition(async () => {
        const result = await migrateSkinFromLocalStorage({
          startDate: parsed.startDate || today,
          longestStreak: parsed.longestStreak || 0,
          logs: parsed.logs || {},
          products: parsed.products || [],
          productUsage: parsed.productUsage || [],
        });
        if (result.success) {
          toast.success('Data migrated to database!');
          localStorage.removeItem('skin-tracker-state');
          window.location.reload();
        }
      });
    } catch {
      toast.error('Migration failed');
    }
  };

  // ── Mutators ─────────────────────────────────────────────────────

  const updateLog = useCallback(
    (date: string, updater: (log: DayLog) => DayLog) => {
      const log = logs[date] ?? createEmptyLog();
      const updated = updater({ ...log });
      const newLogs = { ...logs, [date]: updated };
      setLogs(newLogs);
      startTransition(async () => {
        await upsertSkinDayLog(date, JSON.stringify(updated));
        // Recalculate streak
        const streak = getNoTweezeStreak(newLogs, today);
        if (streak > (settings?.longestStreak ?? 0)) {
          setSettings(s => (s ? { ...s, longestStreak: streak } : s));
          await updateSkinLongestStreak(streak);
        }
      });
    },
    [logs, settings, today],
  );

  const toggleRoutineItem = (date: string, routine: 'morningRoutine' | 'eveningRoutine', key: string) => {
    updateLog(date, (log) => ({
      ...log,
      [routine]: { ...log[routine], [key]: !log[routine][key] },
    }));
  };

  const toggleTweezed = (date: string) => {
    updateLog(date, (log) => ({ ...log, tweezed: !log.tweezed }));
  };

  const updateHydration = (date: string, oz: number) => {
    updateLog(date, (log) => ({
      ...log,
      hydration: { ...log.hydration, ozConsumed: Math.max(0, oz) },
    }));
  };

  const updateCoffee = (date: string, cups: number) => {
    updateLog(date, (log) => ({
      ...log,
      coffee: { cups: Math.max(0, cups) },
    }));
  };

  const toggleNutrition = (date: string, field: 'ateFruit' | 'ateVegetable' | 'ateFastFood') => {
    updateLog(date, (log) => ({
      ...log,
      nutrition: { ...log.nutrition, [field]: !log.nutrition[field] },
    }));
  };

  const handleResetProgram = () => {
    setLogs({});
    setSettings({ startDate: today, longestStreak: 0 });
    setSettingsOpen(false);
    setViewDate(today);
    startTransition(async () => {
      await resetSkinProgram(today);
    });
    toast.success('Program reset — Day 1 starts today');
  };

  const handleSetStartDate = () => {
    if (!newStartDate) return;
    setSettings(s => (s ? { ...s, startDate: newStartDate } : s));
    setSettingsOpen(false);
    startTransition(async () => {
      await updateSkinStartDate(newStartDate);
    });
    toast.success('Start date updated');
  };

  const addProduct = () => {
    if (!prodName.trim()) return;
    startTransition(async () => {
      const dbId = await addSkinProduct({
        name: prodName.trim(),
        brand: prodBrand.trim(),
        type: prodType,
        whenToUse: prodWhen,
        instructions: prodInstructions.trim(),
        active: true,
      });
      const product: SkinProduct = {
        id: String(dbId),
        name: prodName.trim(),
        brand: prodBrand.trim(),
        type: prodType,
        whenToUse: prodWhen,
        instructions: prodInstructions.trim(),
        active: true,
      };
      setProducts(prev => [...prev, product]);
      setShowProductModal(false);
      setProdName('');
      setProdBrand('');
      setProdType('cleanser');
      setProdWhen('morning');
      setProdInstructions('');
      toast.success('Product added');
    });
  };

  const toggleProductActive = (id: string) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    const newActive = !product.active;
    setProducts(prev => prev.map(p => (p.id === id ? { ...p, active: newActive } : p)));
    startTransition(async () => {
      await updateSkinProduct(parseInt(id), { active: newActive });
    });
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    startTransition(async () => {
      await deleteSkinProduct(parseInt(id));
    });
    toast.success('Product removed');
  };

  const openLogUsage = (productId: string) => {
    setUsageProductId(productId);
    const hour = new Date().getHours();
    setUsageTime(hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening');
    setUsageNotes('');
    setShowUsageModal(true);
  };

  const logProductUsage = () => {
    if (!usageProductId) return;
    startTransition(async () => {
      await addSkinProductUsage({
        productId: parseInt(usageProductId),
        date: today,
        time: usageTime,
        notes: usageNotes.trim() || undefined,
      });
      const entry: ProductUsageLog = {
        id: Date.now().toString(), // temp id until reload
        productId: usageProductId,
        date: today,
        time: usageTime,
        notes: usageNotes.trim(),
      };
      setProductUsage(prev => [...prev, entry]);
      setShowUsageModal(false);
      const prod = products.find(p => p.id === usageProductId);
      toast.success(`Logged ${prod?.name || 'product'}`);
    });
  };

  const deleteUsageLog = (id: string) => {
    setProductUsage(prev => prev.filter(u => u.id !== id));
    const numericId = parseInt(id);
    if (!isNaN(numericId)) {
      startTransition(async () => {
        await deleteSkinProductUsage(numericId);
      });
    }
    toast.success('Usage removed');
  };

  const getProductUsageToday = (productId: string): ProductUsageLog[] => {
    return productUsage.filter(u => u.productId === productId && u.date === today);
  };

  const getProductLastUsed = (productId: string): ProductUsageLog | undefined => {
    const usages = productUsage.filter(u => u.productId === productId);
    return usages.length > 0 ? usages[usages.length - 1] : undefined;
  };

  // ── Photos (localStorage only) ────────────────────────────────────

  const savePhotos = (next: SkinPhoto[]) => {
    setPhotos(next);
    try { localStorage.setItem(PHOTOS_KEY, JSON.stringify(next)); } catch {}
  };

  const addPhoto = () => {
    if (!photoData) return;
    const photo: SkinPhoto = {
      id: Date.now().toString(),
      date: photoDate,
      side: photoSide,
      dataUrl: photoData,
      notes: photoNotes.trim(),
    };
    savePhotos([...photos, photo]);
    setShowPhotoModal(false);
    setPhotoData('');
    setPhotoNotes('');
    setPhotoSide('left');
    toast.success('Progress photo saved');
  };

  const deletePhoto = (id: string) => {
    savePhotos(photos.filter(p => p.id !== id));
    toast.success('Photo removed');
  };

  // ── handleInit ────────────────────────────────────────────────────

  const handleInit = () => {
    startTransition(async () => {
      await initSkinProgram(today);
      setSettings({ startDate: today, longestStreak: 0 });
      const defaults = getDefaultProducts();
      for (const defaultProd of defaults) {
        const dbId = await addSkinProduct(defaultProd);
        setProducts(prev => [...prev, { ...defaultProd, id: String(dbId) }]);
      }
      toast.success('Skin Recovery Tracker started!');
    });
  };

  // ── Render: not started ───────────────────────────────────────────

  if (!settings) {
    return (
      <div className={embedded ? '' : 'space-y-6'}>
        {showMigrationPrompt && (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Found existing skin data</p>
                <p className="text-xs text-neutral-500">Migrate your localStorage data to the database for sync &amp; backup.</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" onClick={handleMigrate} disabled={isPending}>
                  {isPending ? 'Migrating…' : 'Migrate'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowMigrationPrompt(false)}>
                  Skip
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        {!embedded && (
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
              Skin Recovery
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">Track your skin healing journey</p>
          </div>
        )}
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Shield className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto" />
            <div>
              <p className="text-lg font-semibold">Start Your Skin Recovery</p>
              <p className="text-sm text-neutral-500 mt-1">
                Track routines, hydration, and habits to heal and maintain healthy skin.
              </p>
            </div>
            <Button onClick={handleInit} disabled={isPending} className="bg-[#E07A3A] hover:bg-[#c96a2f] text-white">
              <Shield className="w-4 h-4 mr-2" /> {isPending ? 'Starting…' : 'Start Tracking'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Current log helpers ─────────────────────────────────

  const ensureLog = (date: string): DayLog => {
    if (logs[date]) return logs[date];
    return createEmptyLog();
  };

  const currentLog = ensureLog(viewDate);
  const dayNumber = getDayNumber(settings.startDate, viewDate);
  const phaseInfo = getPhaseInfo(dayNumber);
  const PhaseIcon = phaseInfo.icon;
  const noTweezeStreak = getNoTweezeStreak(logs, today);

  const isViewingToday = viewDate === today;

  // ── Phase progress ──────────────────────────────────────

  const todayDayNumber = getDayNumber(settings.startDate, today);
  const phaseMaxDay = todayDayNumber <= 14 ? 14 : todayDayNumber <= 42 ? 42 : 90;
  const phaseStartDay = todayDayNumber <= 14 ? 1 : todayDayNumber <= 42 ? 15 : 43;
  const phaseProgress = Math.min(((todayDayNumber - phaseStartDay) / (phaseMaxDay - phaseStartDay + 1)) * 100, 100);
  const todayPhase = getPhaseInfo(todayDayNumber);

  // ── Tab definitions ─────────────────────────────────────

  const tabs: { key: TabType; label: string }[] = [
    { key: 'products', label: 'Products' },
    { key: 'photos', label: 'Photos' },
    { key: 'history', label: 'History' },
  ];

  // ── Render ──────────────────────────────────────────────

  return (
    <div className={embedded ? '' : 'space-y-6'}>
      {/* Migration prompt (shown when initialSettings exists but user has stale localStorage — shouldn't happen often) */}
      {showMigrationPrompt && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Found existing skin data</p>
              <p className="text-xs text-neutral-500">Migrate your localStorage data to the database for sync &amp; backup.</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" onClick={handleMigrate} disabled={isPending}>
                {isPending ? 'Migrating…' : 'Migrate'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowMigrationPrompt(false)}>
                Skip
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
              Skin Recovery
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
              {todayPhase.phase}: {todayPhase.label} &middot; Day {todayDayNumber}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => { setNewStartDate(settings.startDate); setSettingsOpen(true); }}>
            <Settings2 className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Phase Banner */}
      <Card className={cn('border', todayPhase.bgColor)} style={{ borderColor: todayPhase.color + '33' }}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <PhaseIcon className="w-5 h-5" style={{ color: todayPhase.color }} />
              <Badge className="text-white text-xs font-semibold" style={{ backgroundColor: todayPhase.color }}>
                {todayPhase.phase}: {todayPhase.label}
              </Badge>
            </div>
            <span className="text-2xl font-bold" style={{ color: todayPhase.color }}>
              Day {todayDayNumber}
            </span>
          </div>
          <Progress value={phaseProgress} indicatorStyle={{ backgroundColor: todayPhase.color }} className="h-2" />
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-neutral-400">Day {phaseStartDay}</span>
            <span className="text-[10px] text-neutral-400">Day {phaseMaxDay}</span>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-3 text-center">
            <Trophy className="w-4 h-4 text-amber-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{noTweezeStreak}</p>
            <p className="text-[10px] text-neutral-500">No-Tweeze Streak</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <Droplets className="w-4 h-4 text-[#2A9D8F] mx-auto mb-1" />
            <p className="text-xl font-bold text-[#2A9D8F]">
              {new Set(productUsage.filter(u => u.date === today).map(u => u.productId)).size}
            </p>
            <p className="text-[10px] text-neutral-500">Products Used</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <TrendingUp className="w-4 h-4 text-purple-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{settings.longestStreak}</p>
            <p className="text-[10px] text-neutral-500">Best Streak</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1 flex">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex-1 text-sm font-medium py-2 rounded-md transition-all',
              activeTab === tab.key
                ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-neutral-100'
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── PRODUCTS TAB ────────────────────────────────── */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Tweeze Check */}
          <Card className={cn(currentLog.tweezed && 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20')}>
            <CardContent className="py-4">
              <button
                onClick={() => toggleTweezed(today)}
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className={cn('w-5 h-5', currentLog.tweezed ? 'text-red-500' : 'text-neutral-300 dark:text-neutral-600')} />
                  <div className="text-left">
                    <p className="text-sm font-medium">Did you tweeze today?</p>
                    <p className="text-[11px] text-neutral-500">Keep the streak going!</p>
                  </div>
                </div>
                <div className={cn(
                  'w-12 h-7 rounded-full transition-colors flex items-center px-1',
                  currentLog.tweezed ? 'bg-red-500 justify-end' : 'bg-neutral-200 dark:bg-neutral-700 justify-start',
                )}>
                  <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                </div>
              </button>
            </CardContent>
          </Card>

          {/* Quick Routine Checklist */}
          <Card>
            <CardContent className="py-3">
              <p className="text-xs font-medium text-neutral-500 mb-2">Daily Routine</p>
              <div className="flex gap-2">
                {Object.entries(currentLog.skinRoutine || DEFAULT_SKIN_ROUTINE).map(([key, done]) => (
                  <button
                    key={key}
                    onClick={() => {
                      const skinRoutine = { ...(currentLog.skinRoutine || DEFAULT_SKIN_ROUTINE), [key]: !done };
                      updateLog(today, (log) => ({ ...log, skinRoutine }));
                    }}
                    className={cn(
                      'flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg border transition-all text-center',
                      done
                        ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                        : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800',
                    )}
                  >
                    {done ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Circle className="w-4 h-4 text-neutral-300 dark:text-neutral-600" />
                    )}
                    <span className={cn('text-[11px] font-medium', done ? 'text-emerald-700 dark:text-emerald-300' : 'text-neutral-600 dark:text-neutral-400')}>{key}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <p className="text-xs text-neutral-500">Tap a product to log usage</p>
            <Button onClick={() => setShowProductModal(true)} size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> Add Product
            </Button>
          </div>

          {products.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <span className="text-4xl block mb-2">🧴</span>
                <p className="text-sm text-neutral-500">No skin products yet. Add your routine products to track when and how to use them.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {(['morning', 'evening', 'both', 'weekly', 'as_needed'] as const).map(when => {
                const prods = products.filter(p => p.whenToUse === when && p.active);
                if (prods.length === 0) return null;
                const wcfg = WHEN_CONFIG[when];
                return (
                  <div key={when}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold', wcfg.color)}>{wcfg.label}</span>
                      <span className="text-[10px] text-neutral-400">{prods.length} product{prods.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="space-y-2">
                      {prods.map(p => {
                        const tcfg = PRODUCT_TYPE_CONFIG[p.type];
                        const todayUsages = getProductUsageToday(p.id);
                        const usedToday = todayUsages.length > 0;
                        const lastUsed = getProductLastUsed(p.id);
                        return (
                          <Card key={p.id} className="group hover:ring-1 hover:ring-[#E07A3A]/30 transition-all cursor-pointer">
                            <CardContent className="p-3">
                              <div className="flex items-center gap-3">
                                {/* Tap target — main area */}
                                <button
                                  onClick={() => openLogUsage(p.id)}
                                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                                >
                                  <div className={cn(
                                    'w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-lg transition-colors',
                                    usedToday ? 'bg-emerald-100 dark:bg-emerald-900/50 ring-2 ring-emerald-400' : 'bg-neutral-100 dark:bg-neutral-800',
                                  )}>
                                    {usedToday ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <span>{tcfg.icon}</span>}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium truncate">{p.name}</p>
                                      {usedToday && (
                                        <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                                          Used {todayUsages.length}x
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-neutral-400 truncate">{p.brand} &bull; {tcfg.label}</p>
                                    {p.instructions && (
                                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">{p.instructions}</p>
                                    )}
                                    {lastUsed && !usedToday && (
                                      <p className="text-[10px] text-neutral-400 mt-0.5">
                                        Last used: {formatDateLabel(lastUsed.date)}{lastUsed.time ? ` (${lastUsed.time})` : ''}
                                      </p>
                                    )}
                                  </div>
                                </button>

                                {/* Actions */}
                                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => toggleProductActive(p.id)}
                                    className="p-1.5 rounded-lg text-neutral-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950 transition-colors"
                                    title="Deactivate"
                                  >
                                    <Settings2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => deleteProduct(p.id)}
                                    className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                                    title="Remove"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              {/* Expandable ingredients */}
                              {p.ingredients && (
                                <div className="mt-2 border-t border-neutral-100 dark:border-neutral-800 pt-2">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setExpandedProductId(expandedProductId === p.id ? null : p.id); }}
                                    className="flex items-center gap-1 text-[10px] text-neutral-400 hover:text-[#E07A3A] transition-colors"
                                  >
                                    <FlaskConical className="w-3 h-3" />
                                    Ingredients
                                    {expandedProductId === p.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  </button>
                                  {expandedProductId === p.id && (
                                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1.5 leading-relaxed">
                                      {p.ingredients}
                                    </p>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Inactive products */}
              {(() => {
                const inactive = products.filter(p => !p.active);
                if (inactive.length === 0) return null;
                return (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] text-neutral-400 font-medium">Inactive ({inactive.length})</span>
                    </div>
                    <div className="space-y-2">
                      {inactive.map(p => {
                        const tcfg = PRODUCT_TYPE_CONFIG[p.type];
                        return (
                          <Card key={p.id} className="opacity-50">
                            <CardContent className="p-3">
                              <div className="flex items-center gap-3">
                                <span className="text-lg">{tcfg.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{p.name}</p>
                                  <p className="text-[10px] text-neutral-400">{p.brand}</p>
                                </div>
                                <button
                                  onClick={() => toggleProductActive(p.id)}
                                  className="px-2 py-1 rounded text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-emerald-600 transition-colors"
                                >
                                  Reactivate
                                </button>
                                <button
                                  onClick={() => deleteProduct(p.id)}
                                  className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Today's usage summary */}
              {(() => {
                const todayUsages = productUsage.filter(u => u.date === today);
                if (todayUsages.length === 0) return null;
                const TIME_CYCLE = ['morning', 'afternoon', 'evening', 'before_bed'] as const;
                return (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        Today&apos;s Usage ({todayUsages.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-1.5">
                        {todayUsages.map(u => {
                          const prod = products.find(p => p.id === u.productId);
                          return (
                            <div key={u.id} className="flex items-center justify-between text-xs py-1 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                              <div className="flex items-center gap-2">
                                <span className="text-emerald-500">&#10003;</span>
                                <span className="font-medium">{prod?.name || 'Unknown'}</span>
                              </div>
                              <div className="flex items-center gap-2 text-neutral-400">
                                {u.notes && <span className="italic text-[10px]">{u.notes}</span>}
                                <span className="text-[10px] capitalize">{u.time.replace('_', ' ')}</span>
                                <button
                                  onClick={() => deleteUsageLog(u.id)}
                                  className="p-0.5 rounded text-neutral-400 hover:text-red-500 transition-colors"
                                  title="Remove"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
            </>
          )}
        </div>
      )}

      {/* ── PHOTOS TAB ──────────────────────────────────── */}
      {activeTab === 'photos' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setPhotoDate(today); setShowPhotoModal(true); }} size="sm" className="gap-2">
              <Camera className="w-4 h-4" /> Add Photo
            </Button>
          </div>

          {photos.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Camera className="w-10 h-10 mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
                <p className="text-sm text-neutral-500">No progress photos yet. Take left/right side photos to track your skin recovery over time.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Group by date */}
              {Object.entries(
                photos.reduce<Record<string, SkinPhoto[]>>((acc, p) => {
                  (acc[p.date] = acc[p.date] || []).push(p);
                  return acc;
                }, {})
              )
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([date, datePhotos]) => {
                  const dn = getDayNumber(settings.startDate, date);
                  const pi = getPhaseInfo(dn);
                  return (
                    <div key={date}>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                        <span className="text-sm font-medium">{formatDateLabel(date)}</span>
                        <span className="text-[10px] font-medium" style={{ color: pi.color }}>Day {dn}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {datePhotos.map(photo => (
                          <Card key={photo.id} className="overflow-hidden">
                            <div className="aspect-[3/4] relative">
                              <img src={photo.dataUrl} alt={`${photo.side} - ${photo.date}`} className="w-full h-full object-cover" />
                              <div className="absolute top-2 left-2">
                                <Badge className="text-[10px] bg-black/60 text-white border-0">{SIDE_CONFIG[photo.side].label}</Badge>
                              </div>
                              <button
                                onClick={() => deletePhoto(photo.id)}
                                className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            {photo.notes && (
                              <CardContent className="p-2">
                                <p className="text-[11px] text-neutral-500">{photo.notes}</p>
                              </CardContent>
                            )}
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ──────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* 7-Day Overview */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Last 7 Days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {getLast7Dates(today).map((date) => {
                  const log = logs[date];
                  const tweezed = log?.tweezed ?? false;
                  const productsUsed = new Set(productUsage.filter(u => u.date === date).map(u => u.productId)).size;
                  const hasActivity = !!log || productsUsed > 0;
                  const dayLabel = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
                  const dayNum = new Date(date + 'T00:00:00').getDate();
                  const isToday = date === today;

                  return (
                    <button
                      key={date}
                      onClick={() => { setViewDate(date); setActiveTab('products'); }}
                      className="flex flex-col items-center gap-1 py-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                    >
                      <span className={cn('text-[10px]', isToday ? 'font-bold text-neutral-700 dark:text-neutral-200' : 'text-neutral-400')}>{dayLabel}</span>
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2',
                          tweezed
                            ? 'border-red-400 bg-red-50 dark:bg-red-950/30 text-red-600'
                            : productsUsed >= 3
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600'
                              : productsUsed > 0
                                ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-600'
                                : 'border-neutral-200 dark:border-neutral-700 text-neutral-400',
                        )}
                      >
                        {dayNum}
                      </div>
                      {tweezed && <span className="text-[10px] text-red-500">tweezed</span>}
                      {!tweezed && productsUsed > 0 && <span className="text-[10px] text-emerald-600 dark:text-emerald-400">{productsUsed}p</span>}
                      {!hasActivity && <span className="text-[10px] text-neutral-300 dark:text-neutral-600">—</span>}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Logged Days List */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">All Logged Days</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(logs).length === 0 && productUsage.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-4">No entries yet</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {(() => {
                    // Combine dates from both logs and product usage
                    const allDates = new Set([
                      ...Object.keys(logs),
                      ...productUsage.map(u => u.date),
                    ]);
                    return Array.from(allDates)
                      .sort((a, b) => b.localeCompare(a))
                      .map((date) => {
                        const log = logs[date];
                        const dn = getDayNumber(settings.startDate, date);
                        const pi = getPhaseInfo(dn);
                        const productsUsed = new Set(productUsage.filter(u => u.date === date).map(u => u.productId)).size;

                        return (
                          <button
                            key={date}
                            onClick={() => { setViewDate(date); setActiveTab('products'); }}
                            className="flex items-center justify-between w-full py-2.5 px-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors border border-neutral-100 dark:border-neutral-800"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: pi.color }} />
                              <div className="text-left">
                                <p className="text-sm font-medium">{formatDateLabel(date)}</p>
                                <p className="text-[11px] text-neutral-400">Day {dn} &middot; {pi.phase}: {pi.label}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {log?.tweezed && (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">tweezed</Badge>
                              )}
                              {productsUsed > 0 && (
                                <span className="text-xs text-neutral-500">{productsUsed} product{productsUsed !== 1 ? 's' : ''}</span>
                              )}
                              <ChevronRight className="w-4 h-4 text-neutral-400" />
                            </div>
                          </button>
                        );
                      });
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Product Modal */}
      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Skin Product</DialogTitle>
            <DialogDescription>Track what products you use and when to use them.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Product Name *</label>
                <Input placeholder="CeraVe Cleanser..." value={prodName} onChange={(e) => setProdName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Brand</label>
                <Input placeholder="CeraVe, La Roche-Posay..." value={prodBrand} onChange={(e) => setProdBrand(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Product Type</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {(Object.entries(PRODUCT_TYPE_CONFIG) as [SkinProduct['type'], { label: string; icon: string }][]).map(([key, cfg]) => (
                  <button key={key} type="button" onClick={() => setProdType(key)}
                    className={cn('flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg text-[11px] font-medium border transition-colors',
                      prodType === key
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800')}>
                    <span className="text-lg">{cfg.icon}</span>
                    <span>{cfg.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">When to Use</label>
              <div className="flex gap-2 flex-wrap">
                {(Object.entries(WHEN_CONFIG) as [SkinProduct['whenToUse'], { label: string; color: string }][]).map(([key, cfg]) => (
                  <button key={key} type="button" onClick={() => setProdWhen(key)}
                    className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
                      prodWhen === key
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800')}>
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Instructions / How to Use</label>
              <Input placeholder="Apply pea-sized amount after washing face..." value={prodInstructions} onChange={(e) => setProdInstructions(e.target.value)} />
            </div>
            <Button onClick={addProduct} disabled={isPending} className="w-full bg-[#E07A3A] hover:bg-[#c96a2f] text-white">
              {isPending ? 'Saving…' : 'Save Product'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Usage Log Modal */}
      <Dialog open={showUsageModal} onOpenChange={setShowUsageModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
              Log Usage
            </DialogTitle>
            <DialogDescription>
              {usageProductId ? products.find(p => p.id === usageProductId)?.name : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Show product instructions as a tip */}
            {(() => {
              const prod = usageProductId ? products.find(p => p.id === usageProductId) : null;
              if (!prod?.instructions) return null;
              return (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-0.5">How to use:</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">{prod.instructions}</p>
                </div>
              );
            })()}

            <div>
              <label className="text-sm font-medium mb-1.5 block">When did you use it?</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: 'morning', label: '🌅 Morning' },
                  { key: 'afternoon', label: '☀️ Afternoon' },
                  { key: 'evening', label: '🌙 Evening' },
                  { key: 'before_bed', label: '😴 Before Bed' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setUsageTime(key)}
                    className={cn(
                      'px-3 py-2 rounded-lg text-xs font-medium border transition-all',
                      usageTime === key
                        ? 'border-[#E07A3A] bg-[#E07A3A]/10 text-[#E07A3A] shadow-sm'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Notes (optional)</label>
              <Input
                placeholder="How it felt, skin reaction, amount used..."
                value={usageNotes}
                onChange={(e) => setUsageNotes(e.target.value)}
              />
            </div>

            <Button onClick={logProductUsage} disabled={isPending} className="w-full bg-[#E07A3A] hover:bg-[#c96a2f] text-white">
              {isPending ? 'Logging…' : 'Log Usage'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Modal */}
      <Dialog open={showPhotoModal} onOpenChange={setShowPhotoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Progress Photo</DialogTitle>
            <DialogDescription>Track your skin recovery with side-by-side photos over time.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Date</label>
              <Input type="date" value={photoDate} onChange={(e) => setPhotoDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Side</label>
              <div className="flex gap-2">
                {(Object.entries(SIDE_CONFIG) as [SkinPhoto['side'], { label: string }][]).map(([key, cfg]) => (
                  <button key={key} type="button" onClick={() => setPhotoSide(key)}
                    className={cn('flex-1 py-2 rounded-lg text-sm font-medium transition-colors border',
                      photoSide === key
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800')}>
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setPhotoData(reader.result as string);
                  reader.readAsDataURL(file);
                }}
              />
              {photoData ? (
                <div className="space-y-2">
                  <img src={photoData} alt="Preview" className="w-full aspect-[3/4] object-cover rounded-lg" />
                  <Button variant="outline" size="sm" onClick={() => { setPhotoData(''); if (photoInputRef.current) photoInputRef.current.value = ''; }}>
                    Remove Photo
                  </Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full h-32 border-dashed" onClick={() => photoInputRef.current?.click()}>
                  <div className="text-center">
                    <Camera className="w-8 h-8 mx-auto text-neutral-400 mb-2" />
                    <p className="text-sm text-neutral-500">Tap to select photo</p>
                  </div>
                </Button>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Input placeholder="Any observations..." value={photoNotes} onChange={(e) => setPhotoNotes(e.target.value)} />
            </div>
            <Button onClick={addPhoto} disabled={!photoData} className="w-full bg-[#E07A3A] hover:bg-[#c96a2f] text-white">Save Photo</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Skin Recovery Settings</DialogTitle>
            <DialogDescription>Adjust your program start date or reset your progress.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium block mb-1.5">Program Start Date</label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                />
                <Button onClick={handleSetStartDate} disabled={isPending} className="bg-[#E07A3A] hover:bg-[#c96a2f] text-white">
                  Save
                </Button>
              </div>
            </div>
            <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
              <Button variant="destructive" onClick={handleResetProgram} disabled={isPending} className="w-full">
                <RotateCcw className="w-4 h-4 mr-2" /> Reset Program
              </Button>
              <p className="text-[11px] text-neutral-400 mt-2 text-center">
                This resets your start date to today and clears all logs.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
