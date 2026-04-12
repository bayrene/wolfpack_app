'use client';

import React, { useState, useTransition, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Plus,
  Trash2,
  Star,
  Heart,
  Leaf,
  Wind,
  DollarSign,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  addSmokingLog,
  deleteSmokingLog,
  addStrain,
  toggleStrainFavorite,
  deleteStrain,
  rateStrain,
  updateStrain,
} from '@/db/queries/smoking';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { SmokingLogEntry, Strain } from '@/db/schema';

interface Props {
  logs: SmokingLogEntry[];
  strains: Strain[];
  today: string;
  embedded?: boolean;
}

type TabType = 'log' | 'strains';

const STRAIN_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  indica: { label: 'Indica', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950' },
  sativa: { label: 'Sativa', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950' },
  hybrid: { label: 'Hybrid', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950' },
  other: { label: 'Other', color: 'text-neutral-600 dark:text-neutral-400', bg: 'bg-neutral-100 dark:bg-neutral-800' },
};

function getWeekDates(today: string): string[] {
  const dates: string[] = [];
  const d = new Date(today + 'T12:00:00');
  for (let i = 6; i >= 0; i--) {
    const date = new Date(d);
    date.setDate(d.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

function getDayLabel(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
}

function getLast30Dates(today: string): string[] {
  const dates: string[] = [];
  const d = new Date(today + 'T12:00:00');
  for (let i = 29; i >= 0; i--) {
    const date = new Date(d);
    date.setDate(d.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

export function SmokingClient({ logs, strains, today, embedded }: Props) {
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<TabType>('log');

  // Calendar month navigation
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date(today + 'T12:00:00');
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Hookah log modal
  const [showHookahModal, setShowHookahModal] = useState(false);
  const [hookahTime, setHookahTime] = useState('');
  const [hookahDuration, setHookahDuration] = useState('60');
  const [hookahNotes, setHookahNotes] = useState('');

  // Cannabis log modal
  const [showCannabisModal, setShowCannabisModal] = useState(false);
  const [logStrainId, setLogStrainId] = useState<number | null>(null);
  const [logTime, setLogTime] = useState('');
  const [logFeeling, setLogFeeling] = useState('');
  const [logNotes, setLogNotes] = useState('');

  // Strain modal
  const [showStrainModal, setShowStrainModal] = useState(false);
  const [strainName, setStrainName] = useState('');
  const [strainBrand, setStrainBrand] = useState('');
  const [strainType, setStrainType] = useState<'indica' | 'sativa' | 'hybrid' | 'other'>('hybrid');
  const [strainThc, setStrainThc] = useState('');
  const [strainPrice, setStrainPrice] = useState('');
  const [strainNotes, setStrainNotes] = useState('');
  const [strainTerpenes, setStrainTerpenes] = useState<Array<{ name: string; amount: string }>>([
    { name: '', amount: '' },
    { name: '', amount: '' },
    { name: '', amount: '' },
    { name: '', amount: '' },
  ]);
  const [strainRating, setStrainRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  // Edit strain modal
  const [showEditStrainModal, setShowEditStrainModal] = useState(false);
  const [editingStrainId, setEditingStrainId] = useState<number | null>(null);
  const [editStrainName, setEditStrainName] = useState('');
  const [editStrainBrand, setEditStrainBrand] = useState('');
  const [editStrainType, setEditStrainType] = useState<'indica' | 'sativa' | 'hybrid' | 'other'>('hybrid');
  const [editStrainThc, setEditStrainThc] = useState('');
  const [editStrainPrice, setEditStrainPrice] = useState('');
  const [editStrainNotes, setEditStrainNotes] = useState('');
  const [editStrainTerpenes, setEditStrainTerpenes] = useState<Array<{ name: string; amount: string }>>([{ name: '', amount: '' }, { name: '', amount: '' }, { name: '', amount: '' }, { name: '', amount: '' }]);
  const [editStrainRating, setEditStrainRating] = useState(0);
  const [editHoverRating, setEditHoverRating] = useState(0);

  // Strain map for lookups
  const strainMap = useMemo(() => new Map(strains.map(s => [s.id, s])), [strains]);

  const weekDates = useMemo(() => getWeekDates(today), [today]);
  const last30 = useMemo(() => getLast30Dates(today), [today]);
  const todayLogs = useMemo(() => logs.filter(l => l.date === today), [logs, today]);

  const weekActivity = useMemo(() => {
    return weekDates.map(date => {
      const dayLogs = logs.filter(l => l.date === date);
      return {
        date,
        hookah: dayLogs.filter(l => l.type === 'hookah').length,
        cannabis: dayLogs.filter(l => l.type === 'cannabis').length,
        total: dayLogs.length,
      };
    });
  }, [weekDates, logs]);

  const stats = useMemo(() => {
    const last30Logs = logs.filter(l => last30.includes(l.date));
    const hookah30 = last30Logs.filter(l => l.type === 'hookah').length;
    const cannabis30 = last30Logs.filter(l => l.type === 'cannabis').length;
    return { hookah30, cannabis30, total30: last30Logs.length };
  }, [logs, last30]);

  const hookahFreeStreak = useMemo(() => {
    // Only break the streak when a hookah session is actually logged.
    // Missing days (no logs at all) don't break the streak.
    const hookahDates = new Set(
      logs.filter(l => l.type === 'hookah').map(l => l.date)
    );
    // Walk backwards from today until we hit a day with a hookah log
    let streak = 0;
    const d = new Date(today + 'T00:00:00');
    for (let i = 0; i < 365; i++) {
      const cur = new Date(d);
      cur.setDate(d.getDate() - i);
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
      if (hookahDates.has(key)) break;
      streak++;
    }
    return streak;
  }, [logs, today]);

  // Calendar data — group logs by date for the selected month
  const calendarData = useMemo(() => {
    const { year, month } = calMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDow = firstDay.getDay(); // 0=Sun

    // Build a map: date → { hookah, cannabis }
    const dateMap = new Map<string, { hookah: number; cannabis: number }>();
    for (const l of logs) {
      const d = new Date(l.date + 'T12:00:00');
      if (d.getFullYear() === year && d.getMonth() === month) {
        const existing = dateMap.get(l.date) ?? { hookah: 0, cannabis: 0 };
        if (l.type === 'hookah') existing.hookah++;
        else existing.cannabis++;
        dateMap.set(l.date, existing);
      }
    }

    return { daysInMonth, startDow, dateMap };
  }, [calMonth, logs]);

  const navigateCalMonth = useCallback((dir: -1 | 1) => {
    setCalMonth(prev => {
      let m = prev.month + dir;
      let y = prev.year;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      return { year: y, month: m };
    });
  }, []);

  const calMonthLabel = new Date(calMonth.year, calMonth.month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const isCurrentMonth = (() => {
    const d = new Date(today + 'T12:00:00');
    return calMonth.year === d.getFullYear() && calMonth.month === d.getMonth();
  })();

  // --- Handlers ---

  function openHookahLog() {
    setHookahTime(new Date().toTimeString().slice(0, 5));
    setHookahDuration('60');
    setHookahNotes('');
    setShowHookahModal(true);
  }

  function handleLogHookah() {
    startTransition(async () => {
      await addSmokingLog({
        date: today,
        time: hookahTime || undefined,
        type: 'hookah',
        duration: hookahDuration ? parseInt(hookahDuration) : 60,
        notes: hookahNotes || undefined,
      });
      setShowHookahModal(false);
      toast.success('💨 Hookah session logged');
    });
  }

  function openCannabisLog() {
    setLogStrainId(null);
    setLogTime(new Date().toTimeString().slice(0, 5));
    setLogFeeling('');
    setLogNotes('');
    setShowCannabisModal(true);
  }

  function handleLogCannabis() {
    startTransition(async () => {
      await addSmokingLog({
        date: today,
        time: logTime || undefined,
        type: 'cannabis',
        strainId: logStrainId ?? undefined,
        feeling: logFeeling || undefined,
        notes: logNotes || undefined,
      });
      setShowCannabisModal(false);
      toast.success('🌿 Bong rip logged');
    });
  }

  function handleDeleteLog(id: number) {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) startTransition(async () => { await deleteSmokingLog(id); });
    }, 5000);
    toast('Session removed', {
      duration: 5000,
      action: { label: 'Undo', onClick: () => { cancelled = true; clearTimeout(timer); } },
    });
  }

  const BLANK_TERPENES = [
    { name: '', amount: '' },
    { name: '', amount: '' },
    { name: '', amount: '' },
    { name: '', amount: '' },
  ];

  function resetStrainForm() {
    setStrainName('');
    setStrainBrand('');
    setStrainType('hybrid');
    setStrainThc('');
    setStrainPrice('');
    setStrainNotes('');
    setStrainTerpenes(BLANK_TERPENES);
    setStrainRating(0);
    setHoverRating(0);
  }

  function handleAddStrain() {
    if (!strainName.trim()) return;
    const filledTerpenes = strainTerpenes.filter(t => t.name.trim());
    startTransition(async () => {
      await addStrain({
        name: strainName.trim(),
        brand: strainBrand || undefined,
        type: strainType,
        thcContent: strainThc || undefined,
        terpenes: filledTerpenes.length > 0 ? JSON.stringify(filledTerpenes) : undefined,
        price: strainPrice ? parseFloat(strainPrice) : undefined,
        rating: strainRating > 0 ? strainRating : undefined,
        notes: strainNotes || undefined,
      });
      setShowStrainModal(false);
      resetStrainForm();
      toast.success('Strain added');
    });
  }

  function handleToggleFav(id: number) {
    startTransition(async () => { await toggleStrainFavorite(id); });
  }

  function handleDeleteStrain(id: number) {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) startTransition(async () => { await deleteStrain(id); });
    }, 5000);
    toast('Strain removed', {
      duration: 5000,
      action: { label: 'Undo', onClick: () => { cancelled = true; clearTimeout(timer); } },
    });
  }

  function handleRateStrain(id: number, rating: number) {
    startTransition(async () => { await rateStrain(id, rating); });
  }

  function openEditStrain(s: (typeof strains)[number]) {
    setEditingStrainId(s.id);
    setEditStrainName(s.name);
    setEditStrainBrand(s.brand ?? '');
    setEditStrainType(s.type ?? 'hybrid');
    setEditStrainThc(s.thcContent ?? '');
    setEditStrainPrice(s.price != null ? String(s.price) : '');
    setEditStrainNotes(s.notes ?? '');
    setEditStrainRating(s.rating ?? 0);
    setEditHoverRating(0);
    try {
      const parsed = s.terpenes ? JSON.parse(s.terpenes) : [];
      const padded = [...parsed];
      while (padded.length < 4) padded.push({ name: '', amount: '' });
      setEditStrainTerpenes(padded.slice(0, 4));
    } catch {
      setEditStrainTerpenes([{ name: '', amount: '' }, { name: '', amount: '' }, { name: '', amount: '' }, { name: '', amount: '' }]);
    }
    setShowEditStrainModal(true);
  }

  function handleSaveEditStrain() {
    if (!editingStrainId || !editStrainName.trim()) return;
    const filledTerpenes = editStrainTerpenes.filter(t => t.name.trim());
    startTransition(async () => {
      await updateStrain(editingStrainId, {
        name: editStrainName.trim(),
        brand: editStrainBrand || undefined,
        type: editStrainType,
        thcContent: editStrainThc || undefined,
        terpenes: filledTerpenes.length > 0 ? JSON.stringify(filledTerpenes) : undefined,
        price: editStrainPrice ? parseFloat(editStrainPrice) : null,
        rating: editStrainRating > 0 ? editStrainRating : null,
        notes: editStrainNotes || undefined,
      });
      setShowEditStrainModal(false);
      toast.success('Strain updated');
    });
  }

  return (
    <div className={embedded ? 'space-y-6' : 'max-w-4xl mx-auto px-4 py-8 pb-24 md:pb-8'}>
      {/* Header */}
      {!embedded && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
            Smoking Tracker
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Hookah & Cannabis
          </p>
        </div>
      )}

      {/* Quick Log Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={openHookahLog}
          disabled={isPending}
          className="flex items-center gap-3 p-4 rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors active:scale-[0.98]"
        >
          <span className="text-3xl">💨</span>
          <div className="text-left">
            <div className="font-bold text-sm text-blue-700 dark:text-blue-300">Hookah Sesh</div>
            <div className="text-xs text-blue-500 dark:text-blue-400">60 min · tap to log</div>
          </div>
        </button>
        <button
          onClick={openCannabisLog}
          disabled={isPending}
          className="flex items-center gap-3 p-4 rounded-xl border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/50 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors active:scale-[0.98]"
        >
          <span className="text-3xl">🌿</span>
          <div className="text-left">
            <div className="font-bold text-sm text-green-700 dark:text-green-300">Bong Rip</div>
            <div className="text-xs text-green-500 dark:text-green-400">Log with strain info</div>
          </div>
        </button>
      </div>

      {/* Today */}
      <Card className="mb-6 border-neutral-200 dark:border-neutral-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Today</h3>
            <div className="flex items-center gap-3">
              {todayLogs.filter(l => l.type === 'cannabis').length > 0 && (
                <span className="text-xs font-bold text-green-600 dark:text-green-400">
                  🌿 {todayLogs.filter(l => l.type === 'cannabis').length} rip{todayLogs.filter(l => l.type === 'cannabis').length !== 1 ? 's' : ''}
                </span>
              )}
              {todayLogs.filter(l => l.type === 'hookah').length > 0 && (
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                  💨 {todayLogs.filter(l => l.type === 'hookah').length} sesh
                </span>
              )}
              <span className="text-xs text-neutral-500">{formatDate(today)}</span>
            </div>
          </div>
          {todayLogs.length === 0 ? (
            <p className="text-sm text-neutral-400 dark:text-neutral-500">Nothing yet ✨</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {todayLogs.map(l => {
                const strain = l.strainId ? strainMap.get(l.strainId) : null;
                return (
                  <Badge
                    key={l.id}
                    variant="secondary"
                    className={cn(
                      'text-xs py-1 px-2',
                      l.type === 'hookah'
                        ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                        : 'bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400',
                    )}
                  >
                    {l.type === 'hookah' ? '💨' : '🌿'}{' '}
                    {l.time && <span>{l.time}</span>}
                    {strain && <span className="ml-1">· {strain.name}</span>}
                  </Badge>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 7-Day Activity */}
      <Card className="mb-6 border-neutral-200 dark:border-neutral-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">This Week</h3>
            <div className="flex gap-3 text-xs text-neutral-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Hookah</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Cannabis</span>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {weekActivity.map(day => (
              <div key={day.date} className="text-center">
                <div className="text-[10px] text-neutral-400 mb-1">{getDayLabel(day.date)}</div>
                <div
                  className={cn(
                    'w-9 h-9 mx-auto rounded-lg flex items-center justify-center text-xs font-bold',
                    day.total === 0
                      ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-300 dark:text-neutral-600'
                      : day.total <= 1
                        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                        : 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
                  )}
                >
                  {day.total || '—'}
                </div>
                <div className="flex justify-center gap-0.5 mt-1 h-2">
                  {day.hookah > 0 && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                  {day.cannabis > 0 && <div className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Calendar */}
      <Card className="mb-6 border-neutral-200 dark:border-neutral-700">
        <CardContent className="p-4">
          {/* Header with month nav */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => navigateCalMonth(-1)} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
              <ChevronLeft className="w-4 h-4 text-neutral-500" />
            </button>
            <h3 className="font-semibold text-sm">{calMonthLabel}</h3>
            <button
              onClick={() => navigateCalMonth(1)}
              disabled={isCurrentMonth}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </button>
          </div>

          {/* Legend */}
          <div className="flex gap-3 text-xs text-neutral-500 mb-3 justify-center">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Hookah</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Bong</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-neutral-100 dark:bg-neutral-800 inline-block" /> Clean</span>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-[10px] text-neutral-400 text-center font-medium">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for offset */}
            {Array.from({ length: calendarData.startDow }).map((_, i) => (
              <div key={`empty-${i}`} className="h-11" />
            ))}
            {/* Day cells */}
            {Array.from({ length: calendarData.daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${calMonth.year}-${String(calMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const data = calendarData.dateMap.get(dateStr);
              const hookah = data?.hookah ?? 0;
              const cannabis = data?.cannabis ?? 0;
              const total = hookah + cannabis;
              const isToday = dateStr === today;

              return (
                <div
                  key={day}
                  className={cn(
                    'h-11 rounded-lg flex flex-col items-center justify-center relative transition-colors',
                    isToday && 'ring-1 ring-[#E07A3A]',
                    total === 0
                      ? 'bg-neutral-50 dark:bg-neutral-800/50'
                      : total <= 1
                        ? 'bg-amber-100 dark:bg-amber-900/30'
                        : 'bg-orange-100 dark:bg-orange-900/30',
                  )}
                >
                  <span className={cn(
                    'text-[11px] font-medium',
                    isToday ? 'text-[#E07A3A]' : total > 0 ? 'text-neutral-700 dark:text-neutral-200' : 'text-neutral-400 dark:text-neutral-500',
                  )}>
                    {day}
                  </span>
                  {total > 0 && (
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {hookah > 0 && (
                        <span className="text-[8px] font-bold text-blue-500">{hookah}💨</span>
                      )}
                      {cannabis > 0 && (
                        <span className="text-[8px] font-bold text-green-500">{cannabis}🌿</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 30-Day Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.hookah30}</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">💨 Hookah · 30d</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.cannabis30}</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">🌿 Cannabis · 30d</div>
          </CardContent>
        </Card>
        <Card className="border-neutral-200 dark:border-neutral-700">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-neutral-700 dark:text-neutral-300">{stats.total30}</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">🔥 Total · 30d</div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{hookahFreeStreak}</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">🚫💨 Hookah-Free</div>
            <div className="text-[9px] text-neutral-400">day{hookahFreeStreak !== 1 ? 's' : ''} streak</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
        {([
          { key: 'log' as TabType, label: 'Session History' },
          { key: 'strains' as TabType, label: 'Strains' },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              tab === t.key
                ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white'
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ============= LOG TAB ============= */}
      {tab === 'log' && (
        <div className="space-y-2">
          {logs.length === 0 ? (
            <Card className="border-dashed border-neutral-300 dark:border-neutral-600">
              <CardContent className="p-8 text-center text-neutral-400">
                <Wind className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No sessions logged yet</p>
              </CardContent>
            </Card>
          ) : (
            logs.map(log => {
              const strain = log.strainId ? strainMap.get(log.strainId) : null;
              const isHookah = log.type === 'hookah';
              return (
                <Card key={log.id} className="border-neutral-200 dark:border-neutral-700">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          'w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0',
                          isHookah ? 'bg-blue-50 dark:bg-blue-950' : 'bg-green-50 dark:bg-green-950',
                        )}>
                          {isHookah ? '💨' : '🌿'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn(
                              'font-semibold text-sm',
                              isHookah ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400',
                            )}>
                              {isHookah ? 'Hookah' : strain ? strain.name : 'Bong Rip'}
                            </span>
                            {strain?.type && (
                              <Badge variant="secondary" className={cn('text-[10px]', STRAIN_TYPE_CONFIG[strain.type]?.bg, STRAIN_TYPE_CONFIG[strain.type]?.color)}>
                                {STRAIN_TYPE_CONFIG[strain.type]?.label}
                              </Badge>
                            )}
                            {isHookah && (
                              <span className="text-[10px] text-neutral-400">60 min</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-500">
                            <span>{formatDate(log.date)}</span>
                            {log.time && <span>{log.time}</span>}
                          </div>
                          {log.feeling && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 italic">&ldquo;{log.feeling}&rdquo;</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-neutral-400 hover:text-red-500 flex-shrink-0"
                        onClick={() => handleDeleteLog(log.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ============= STRAINS TAB ============= */}
      {tab === 'strains' && (
        <div className="space-y-3">
          <div className="flex justify-end mb-2">
            <Button onClick={() => setShowStrainModal(true)} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1" /> Add Strain
            </Button>
          </div>

          {strains.length === 0 ? (
            <Card className="border-dashed border-neutral-300 dark:border-neutral-600">
              <CardContent className="p-8 text-center text-neutral-400">
                <Leaf className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No strains added yet</p>
                <p className="text-xs mt-1">Add your strains to quick-select when logging</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {strains.map(s => {
                const typeConf = s.type ? STRAIN_TYPE_CONFIG[s.type] : null;
                return (
                  <Card key={s.id} className="border-neutral-200 dark:border-neutral-700">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">🌿 {s.name}</span>
                            {typeConf && (
                              <Badge variant="secondary" className={cn('text-[10px]', typeConf.bg, typeConf.color)}>
                                {typeConf.label}
                              </Badge>
                            )}
                          </div>
                          {s.brand && <div className="text-xs text-neutral-500 mt-0.5">{s.brand}</div>}
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            {s.thcContent && (
                              <span className="text-xs text-green-600 dark:text-green-400 font-medium">THC {s.thcContent}</span>
                            )}
                            {s.price != null && (
                              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                                <DollarSign className="w-3 h-3" />{s.price.toFixed(2)}/oz
                              </span>
                            )}
                          </div>
                          {/* Star rating */}
                          <div className="flex items-center gap-0.5 mt-2">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                key={star}
                                onClick={() => handleRateStrain(s.id, s.rating === star ? 0 : star)}
                                disabled={isPending}
                                title={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                                className="transition-transform hover:scale-110"
                              >
                                <Star className={cn(
                                  'w-4 h-4 transition-colors',
                                  (s.rating ?? 0) >= star
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-neutral-300 dark:text-neutral-600',
                                )} />
                              </button>
                            ))}
                            {s.rating != null && s.rating > 0 && (
                              <span className="text-[10px] text-neutral-400 ml-1">{s.rating}/5</span>
                            )}
                          </div>
                          {/* Terpenes */}
                          {s.terpenes && (() => {
                            try {
                              const terps: Array<{ name: string; amount: string }> = JSON.parse(s.terpenes);
                              if (terps.length === 0) return null;
                              return (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {terps.map((t, i) => (
                                    <span key={i} className="inline-flex items-center gap-1 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[10px] font-medium px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                                      🌿 {t.name}{t.amount ? ` · ${t.amount}` : ''}
                                    </span>
                                  ))}
                                </div>
                              );
                            } catch { return null; }
                          })()}
                          {s.notes && <p className="text-xs text-neutral-400 mt-1.5">{s.notes}</p>}
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-neutral-400 hover:text-[#E07A3A]" onClick={() => openEditStrain(s)} disabled={isPending}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleFav(s.id)} disabled={isPending}>
                            <Heart className={cn('w-3.5 h-3.5', s.favorite ? 'fill-red-500 text-red-500' : 'text-neutral-400')} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-neutral-400 hover:text-red-500" onClick={() => handleDeleteStrain(s.id)} disabled={isPending}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============= HOOKAH LOG MODAL ============= */}
      <Dialog open={showHookahModal} onOpenChange={setShowHookahModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>💨 Log Hookah Sesh</DialogTitle>
            <DialogDescription>When did you start and how long?</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Time Started</label>
                <Input type="time" value={hookahTime} onChange={e => setHookahTime(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Duration (min)</label>
                <Input type="number" min="1" value={hookahDuration} onChange={e => setHookahDuration(e.target.value)} placeholder="60" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Notes <span className="text-neutral-400 font-normal">(optional)</span></label>
              <Input value={hookahNotes} onChange={e => setHookahNotes(e.target.value)} placeholder="Flavor, with who, vibes..." />
            </div>
            <Button onClick={handleLogHookah} disabled={isPending} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              {isPending ? 'Saving...' : 'Log Session'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============= CANNABIS LOG MODAL ============= */}
      <Dialog open={showCannabisModal} onOpenChange={setShowCannabisModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>🌿 Log Bong Rip</DialogTitle>
            <DialogDescription>Pick a strain and how it made you feel</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Time */}
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Time</label>
              <Input type="time" value={logTime} onChange={e => setLogTime(e.target.value)} className="w-32" />
            </div>

            {/* Strain select */}
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-2 block">Strain</label>
              {strains.length === 0 ? (
                <p className="text-xs text-neutral-400">No strains yet — <button onClick={() => { setShowCannabisModal(false); setShowStrainModal(true); }} className="text-[#E07A3A] underline">add one first</button></p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {strains.map(s => {
                    const typeConf = s.type ? STRAIN_TYPE_CONFIG[s.type] : null;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setLogStrainId(logStrainId === s.id ? null : s.id)}
                        className={cn(
                          'px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                          logStrainId === s.id
                            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-400'
                            : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800',
                        )}
                      >
                        {s.name}
                        {typeConf && <span className={cn('ml-1 text-[10px]', typeConf.color)}>({typeConf.label})</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Feeling */}
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">How did it make you feel?</label>
              <Textarea
                value={logFeeling}
                onChange={e => setLogFeeling(e.target.value)}
                rows={2}
                placeholder="Relaxed, creative, sleepy, giggly, focused..."
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Notes (optional)</label>
              <Input value={logNotes} onChange={e => setLogNotes(e.target.value)} placeholder="Anything else" />
            </div>

            <Button onClick={handleLogCannabis} disabled={isPending} className="w-full bg-green-600 hover:bg-green-700 text-white">
              {isPending ? 'Saving...' : 'Log It'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============= EDIT STRAIN MODAL ============= */}
      <Dialog open={showEditStrainModal} onOpenChange={setShowEditStrainModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Strain</DialogTitle>
            <DialogDescription>Update strain details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Strain Name *</label>
              <Input value={editStrainName} onChange={e => setEditStrainName(e.target.value)} placeholder="Blue Dream, GG4, etc." />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Type</label>
              <div className="flex gap-1.5">
                {(['indica', 'sativa', 'hybrid'] as const).map(t => {
                  const conf = STRAIN_TYPE_CONFIG[t];
                  return (
                    <button
                      key={t}
                      onClick={() => setEditStrainType(t)}
                      className={cn(
                        'flex-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                        editStrainType === t
                          ? cn('border-2', conf.bg, conf.color, t === 'indica' ? 'border-purple-400' : t === 'sativa' ? 'border-amber-400' : 'border-green-400')
                          : 'border-neutral-200 dark:border-neutral-700 text-neutral-500',
                      )}
                    >
                      {conf.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Brand</label>
                <Input value={editStrainBrand} onChange={e => setEditStrainBrand(e.target.value)} placeholder="Dispensary / brand" />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">THC %</label>
                <Input value={editStrainThc} onChange={e => setEditStrainThc(e.target.value)} placeholder="23%" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Price ($ per oz)</label>
              <Input type="number" step="0.01" value={editStrainPrice} onChange={e => setEditStrainPrice(e.target.value)} placeholder="0.00" />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Your Rating</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setEditStrainRating(editStrainRating === star ? 0 : star)}
                    onMouseEnter={() => setEditHoverRating(star)}
                    onMouseLeave={() => setEditHoverRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star className={cn(
                      'w-6 h-6 transition-colors',
                      (editHoverRating || editStrainRating) >= star
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-neutral-300 dark:text-neutral-600',
                    )} />
                  </button>
                ))}
                {editStrainRating > 0 && (
                  <span className="text-xs text-neutral-400 ml-1">{editStrainRating}/5</span>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Terpene Profile <span className="text-neutral-400 font-normal">(optional)</span></label>
              <div className="space-y-2">
                {editStrainTerpenes.map((t, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      value={t.name}
                      onChange={e => {
                        const next = [...editStrainTerpenes];
                        next[i] = { ...next[i], name: e.target.value };
                        setEditStrainTerpenes(next);
                      }}
                      placeholder={['Limonene', 'Myrcene', 'Caryophyllene', 'Linalool'][i]}
                      className="flex-1 h-8 text-sm"
                    />
                    <Input
                      value={t.amount}
                      onChange={e => {
                        const next = [...editStrainTerpenes];
                        next[i] = { ...next[i], amount: e.target.value };
                        setEditStrainTerpenes(next);
                      }}
                      placeholder="mg/g"
                      className="w-24 h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Notes</label>
              <Textarea value={editStrainNotes} onChange={e => setEditStrainNotes(e.target.value)} rows={2} placeholder="Anything to remember about this strain" />
            </div>

            <Button onClick={handleSaveEditStrain} disabled={isPending || !editStrainName.trim()} className="w-full bg-[#E07A3A] hover:bg-[#c96a30] text-white">
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============= ADD STRAIN MODAL ============= */}
      <Dialog open={showStrainModal} onOpenChange={setShowStrainModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Strain</DialogTitle>
            <DialogDescription>Track a cannabis strain</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Strain Name *</label>
              <Input value={strainName} onChange={e => setStrainName(e.target.value)} placeholder="Blue Dream, GG4, etc." />
            </div>

            {/* Type */}
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Type</label>
              <div className="flex gap-1.5">
                {(['indica', 'sativa', 'hybrid'] as const).map(t => {
                  const conf = STRAIN_TYPE_CONFIG[t];
                  return (
                    <button
                      key={t}
                      onClick={() => setStrainType(t)}
                      className={cn(
                        'flex-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                        strainType === t
                          ? cn('border-2', conf.bg, conf.color, t === 'indica' ? 'border-purple-400' : t === 'sativa' ? 'border-amber-400' : 'border-green-400')
                          : 'border-neutral-200 dark:border-neutral-700 text-neutral-500',
                      )}
                    >
                      {conf.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Brand</label>
                <Input value={strainBrand} onChange={e => setStrainBrand(e.target.value)} placeholder="Dispensary / brand" />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">THC %</label>
                <Input value={strainThc} onChange={e => setStrainThc(e.target.value)} placeholder="23%" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Price ($ per oz)</label>
              <Input type="number" step="0.01" value={strainPrice} onChange={e => setStrainPrice(e.target.value)} placeholder="0.00" />
            </div>

            {/* Star rating */}
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Your Rating</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setStrainRating(strainRating === star ? 0 : star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star className={cn(
                      'w-6 h-6 transition-colors',
                      (hoverRating || strainRating) >= star
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-neutral-300 dark:text-neutral-600',
                    )} />
                  </button>
                ))}
                {strainRating > 0 && (
                  <span className="text-xs text-neutral-400 ml-1">{strainRating}/5</span>
                )}
              </div>
            </div>

            {/* Terpene profiles */}
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Terpene Profile <span className="text-neutral-400 font-normal">(optional)</span></label>
              <div className="space-y-2">
                {strainTerpenes.map((t, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      value={t.name}
                      onChange={e => {
                        const next = [...strainTerpenes];
                        next[i] = { ...next[i], name: e.target.value };
                        setStrainTerpenes(next);
                      }}
                      placeholder={['Limonene', 'Myrcene', 'Caryophyllene', 'Linalool'][i]}
                      className="flex-1 h-8 text-sm"
                    />
                    <Input
                      value={t.amount}
                      onChange={e => {
                        const next = [...strainTerpenes];
                        next[i] = { ...next[i], amount: e.target.value };
                        setStrainTerpenes(next);
                      }}
                      placeholder="mg/g"
                      className="w-24 h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-neutral-400 mt-1">Enter name + amount, e.g. Limonene / 11.47 mg/g</p>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Notes</label>
              <Textarea value={strainNotes} onChange={e => setStrainNotes(e.target.value)} rows={2} placeholder="Anything to remember about this strain" />
            </div>

            <Button onClick={handleAddStrain} disabled={isPending || !strainName.trim()} className="w-full bg-[#E07A3A] hover:bg-[#c96a30] text-white">
              {isPending ? 'Saving...' : 'Add Strain'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
