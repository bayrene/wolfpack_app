'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Plus, Trash2, Moon, Sun, TrendingUp, Heart, Wind, Pencil, RefreshCw } from 'lucide-react';
import { addSleepLog, deleteSleepLog, updateSleepLog } from '@/db/queries/sleep';
import type { SleepLog } from '@/db/schema';
import { format, subDays, parseISO } from 'date-fns';

interface Props {
  logs: SleepLog[];
  today: string;
  embedded?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number | null | undefined) {
  if (!score) return { text: 'text-neutral-400', bg: 'bg-neutral-100 dark:bg-neutral-800', ring: '#9ca3af' };
  if (score >= 85) return { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950', ring: '#10b981' };
  if (score >= 70) return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950', ring: '#f59e0b' };
  return { text: 'text-red-500 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950', ring: '#ef4444' };
}

function scoreLabel(score: number | null | undefined) {
  if (!score) return 'No data';
  if (score >= 85) return 'Good';
  if (score >= 70) return 'Fair';
  return 'Poor';
}

function fmtMins(mins: number | null | undefined) {
  if (!mins) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function calcTotalSleep(bedtime: string, wakeTime: string): number {
  const [bh, bm] = bedtime.split(':').map(Number);
  const [wh, wm] = wakeTime.split(':').map(Number);
  let mins = (wh * 60 + wm) - (bh * 60 + bm);
  if (mins < 0) mins += 24 * 60;
  return mins;
}

// ── Score Ring SVG ────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 120 }: { score: number | null | undefined; size?: number }) {
  const { ring } = scoreColor(score);
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const pct = score ? Math.min(score / 100, 1) : 0;
  const dash = pct * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={10} className="text-neutral-200 dark:text-neutral-700" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={ring} strokeWidth={10}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  );
}

// ── Sleep Stage Bar ───────────────────────────────────────────────────────────

function SleepStageBar({ log }: { log: SleepLog }) {
  const total = log.totalSleep || (log.deepSleep ?? 0) + (log.remSleep ?? 0) + (log.lightSleep ?? 0) + (log.awakeDuration ?? 0);
  if (!total) return null;
  const deep = ((log.deepSleep ?? 0) / total) * 100;
  const rem = ((log.remSleep ?? 0) / total) * 100;
  const light = ((log.lightSleep ?? 0) / total) * 100;
  const awake = ((log.awakeDuration ?? 0) / total) * 100;
  return (
    <div className="space-y-2">
      <div className="flex h-5 rounded-full overflow-hidden gap-0.5">
        {deep > 0 && <div className="bg-indigo-600 dark:bg-indigo-500 rounded-l-full" style={{ width: `${deep}%` }} title={`Deep ${fmtMins(log.deepSleep)}`} />}
        {rem > 0 && <div className="bg-violet-500 dark:bg-violet-400" style={{ width: `${rem}%` }} title={`REM ${fmtMins(log.remSleep)}`} />}
        {light > 0 && <div className="bg-sky-400 dark:bg-sky-300" style={{ width: `${light}%` }} title={`Light ${fmtMins(log.lightSleep)}`} />}
        {awake > 0 && <div className="bg-amber-300 dark:bg-amber-400 rounded-r-full" style={{ width: `${awake}%` }} title={`Awake ${fmtMins(log.awakeDuration)}`} />}
      </div>
      <div className="flex gap-3 text-[10px] text-neutral-500">
        {log.deepSleep != null && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-500 inline-block" />Deep {fmtMins(log.deepSleep)}</span>}
        {log.remSleep != null && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />REM {fmtMins(log.remSleep)}</span>}
        {log.lightSleep != null && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />Light {fmtMins(log.lightSleep)}</span>}
        {log.awakeDuration != null && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-300 inline-block" />Awake {fmtMins(log.awakeDuration)}</span>}
      </div>
    </div>
  );
}

// ── Contributor Card ──────────────────────────────────────────────────────────

function Contributor({ label, value, sub, pct, color }: { label: string; value: string; sub?: string; pct?: number; color: string }) {
  return (
    <div className="bg-neutral-50 dark:bg-neutral-800/60 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-500 font-medium">{label}</span>
        <span className="text-sm font-bold" style={{ color }}>{value}</span>
      </div>
      {pct !== undefined && (
        <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
        </div>
      )}
      {sub && <p className="text-[10px] text-neutral-400">{sub}</p>}
    </div>
  );
}

// ── Weekly Trend Chart ────────────────────────────────────────────────────────

function WeeklyChart({ logs, today }: { logs: SleepLog[]; today: string }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = format(subDays(parseISO(today), 6 - i), 'yyyy-MM-dd');
    const log = logs.find(l => l.date === d);
    return { date: d, label: format(parseISO(d), 'EEE'), log };
  });
  const maxScore = 100;
  return (
    <div className="flex items-end gap-1.5 h-16">
      {days.map(({ label, log, date }) => {
        const score = log?.score;
        const { ring } = scoreColor(score);
        const h = score ? Math.max(8, (score / maxScore) * 56) : 4;
        const isToday = date === today;
        return (
          <div key={date} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t-md transition-all"
              style={{ height: h, backgroundColor: score ? ring : undefined }}
              title={score ? `${score} — ${scoreLabel(score)}` : 'No data'}
            >
              {!score && <div className="w-full h-full bg-neutral-200 dark:bg-neutral-700 rounded-t-md" />}
            </div>
            <span className={cn('text-[9px]', isToday ? 'font-bold text-neutral-700 dark:text-neutral-200' : 'text-neutral-400')}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Log Form ──────────────────────────────────────────────────────────────────

interface LogFormState {
  date: string;
  bedtime: string;
  wakeTime: string;
  score: string;
  efficiency: string;
  latency: string;
  remSleep: string;
  deepSleep: string;
  lightSleep: string;
  awakeDuration: string;
  restfulness: string;
  hrv: string;
  restingHeartRate: string;
  tempDeviation: string;
  respiratoryRate: string;
  spo2: string;
  notes: string;
}

const EMPTY_FORM: LogFormState = {
  date: '', bedtime: '', wakeTime: '', score: '', efficiency: '', latency: '',
  remSleep: '', deepSleep: '', lightSleep: '', awakeDuration: '', restfulness: '',
  hrv: '', restingHeartRate: '', tempDeviation: '', respiratoryRate: '', spo2: '', notes: '',
};

function formFromLog(log: SleepLog): LogFormState {
  return {
    date: log.date,
    bedtime: log.bedtime ?? '',
    wakeTime: log.wakeTime ?? '',
    score: log.score != null ? String(log.score) : '',
    efficiency: log.efficiency != null ? String(log.efficiency) : '',
    latency: log.latency != null ? String(log.latency) : '',
    remSleep: log.remSleep != null ? String(log.remSleep) : '',
    deepSleep: log.deepSleep != null ? String(log.deepSleep) : '',
    lightSleep: log.lightSleep != null ? String(log.lightSleep) : '',
    awakeDuration: log.awakeDuration != null ? String(log.awakeDuration) : '',
    restfulness: log.restfulness != null ? String(log.restfulness) : '',
    hrv: log.hrv != null ? String(log.hrv) : '',
    restingHeartRate: log.restingHeartRate != null ? String(log.restingHeartRate) : '',
    tempDeviation: log.tempDeviation != null ? String(log.tempDeviation) : '',
    respiratoryRate: log.respiratoryRate != null ? String(log.respiratoryRate) : '',
    spo2: log.spo2 != null ? String(log.spo2) : '',
    notes: log.notes ?? '',
  };
}

function formToData(f: LogFormState) {
  const total = f.bedtime && f.wakeTime ? calcTotalSleep(f.bedtime, f.wakeTime) : undefined;
  return {
    date: f.date,
    bedtime: f.bedtime || undefined,
    wakeTime: f.wakeTime || undefined,
    totalSleep: total,
    score: f.score ? parseInt(f.score) : undefined,
    efficiency: f.efficiency ? parseInt(f.efficiency) : undefined,
    latency: f.latency ? parseInt(f.latency) : undefined,
    remSleep: f.remSleep ? parseInt(f.remSleep) : undefined,
    deepSleep: f.deepSleep ? parseInt(f.deepSleep) : undefined,
    lightSleep: f.lightSleep ? parseInt(f.lightSleep) : undefined,
    awakeDuration: f.awakeDuration ? parseInt(f.awakeDuration) : undefined,
    restfulness: f.restfulness ? parseInt(f.restfulness) : undefined,
    hrv: f.hrv ? parseInt(f.hrv) : undefined,
    restingHeartRate: f.restingHeartRate ? parseInt(f.restingHeartRate) : undefined,
    tempDeviation: f.tempDeviation ? parseFloat(f.tempDeviation) : undefined,
    respiratoryRate: f.respiratoryRate ? parseFloat(f.respiratoryRate) : undefined,
    spo2: f.spo2 ? parseInt(f.spo2) : undefined,
    notes: f.notes || undefined,
  };
}

// ── Main Component ────────────────────────────────────────────────────────────

export function SleepClient({ logs, today, embedded }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<LogFormState>({ ...EMPTY_FORM, date: today });
  const [isSyncing, setIsSyncing] = useState(false);

  async function handleOuraSync() {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/oura-sync', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Sync failed');
      toast.success(`Synced ${json.synced} nights from Oura`);
      // Reload to show fresh data
      window.location.reload();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Oura sync failed');
    } finally {
      setIsSyncing(false);
    }
  }

  const setField = (k: keyof LogFormState, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  // Auto-calc total sleep when bedtime/wake changes
  const previewTotal = form.bedtime && form.wakeTime ? calcTotalSleep(form.bedtime, form.wakeTime) : null;

  const latestLog = logs[0] ?? null;
  const todayLog = logs.find(l => l.date === today) ?? null;

  const avg7 = useMemo(() => {
    const recent = logs.slice(0, 7);
    if (!recent.length) return null;
    const withScore = recent.filter(l => l.score != null);
    const withSleep = recent.filter(l => l.totalSleep != null);
    return {
      score: withScore.length ? Math.round(withScore.reduce((s, l) => s + (l.score ?? 0), 0) / withScore.length) : null,
      totalSleep: withSleep.length ? Math.round(withSleep.reduce((s, l) => s + (l.totalSleep ?? 0), 0) / withSleep.length) : null,
      hrv: (() => { const w = recent.filter(l => l.hrv != null); return w.length ? Math.round(w.reduce((s, l) => s + (l.hrv ?? 0), 0) / w.length) : null; })(),
      rhr: (() => { const w = recent.filter(l => l.restingHeartRate != null); return w.length ? Math.round(w.reduce((s, l) => s + (l.restingHeartRate ?? 0), 0) / w.length) : null; })(),
    };
  }, [logs]);

  function openAdd() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, date: today });
    setShowModal(true);
  }

  function openEdit(log: SleepLog) {
    setEditingId(log.id);
    setForm(formFromLog(log));
    setShowModal(true);
  }

  function handleSave() {
    if (!form.date) { toast.error('Date is required'); return; }
    const data = formToData(form);
    startTransition(async () => {
      if (editingId) {
        await updateSleepLog(editingId, data);
        toast.success('Sleep log updated');
      } else {
        await addSleepLog(data);
        toast.success('Sleep logged');
      }
      setShowModal(false);
    });
  }

  function handleDelete(id: number) {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) startTransition(async () => { await deleteSleepLog(id); });
    }, 5000);
    toast('Sleep log removed', {
      duration: 5000,
      action: { label: 'Undo', onClick: () => { cancelled = true; clearTimeout(timer); } },
    });
  }

  const displayLog = todayLog ?? latestLog;
  const { text: scoreText, ring: scoreRing } = scoreColor(displayLog?.score);

  return (
    <div className={embedded ? 'space-y-5' : 'max-w-4xl mx-auto px-4 py-8 pb-24 md:pb-8 space-y-5'}>
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>Sleep</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Powered by Oura Ring</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleOuraSync} size="sm" variant="outline" disabled={isSyncing} className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-800 dark:hover:bg-indigo-950">
              <RefreshCw className={cn('w-3.5 h-3.5 mr-1', isSyncing && 'animate-spin')} />
              {isSyncing ? 'Syncing…' : 'Sync Oura'}
            </Button>
            <Button onClick={openAdd} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="w-4 h-4 mr-1" /> Log Night
            </Button>
          </div>
        </div>
      )}

      {embedded && (() => {
        const embeddedLabel = todayLog
          ? ('Last night \u00b7 ' + format(parseISO(todayLog.date), 'MMM d'))
          : latestLog
            ? ('Last logged \u00b7 ' + format(parseISO(latestLog.date), 'MMM d'))
            : 'No sleep data yet';
        return (
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-500 font-medium">{embeddedLabel}</p>
            <div className="flex items-center gap-2">
              <Button onClick={handleOuraSync} size="sm" variant="ghost" disabled={isSyncing} className="text-indigo-600 dark:text-indigo-400 h-8 px-2">
                <RefreshCw className={cn('w-3.5 h-3.5', isSyncing && 'animate-spin')} />
              </Button>
              <Button onClick={openAdd} size="sm" variant="outline">
                <Plus className="w-3.5 h-3.5 mr-1" /> Log Night
              </Button>
            </div>
          </div>
        );
      })()}

      {/* ── Score + Summary ── */}
      {displayLog ? (
        <Card className="border-neutral-200 dark:border-neutral-700 overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center gap-5">
              {/* Score ring */}
              <div className="relative flex-shrink-0">
                <ScoreRing score={displayLog.score} size={100} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={cn('text-2xl font-bold', scoreText)}>
                    {displayLog.score ?? '—'}
                  </span>
                  <span className="text-[9px] text-neutral-400 uppercase tracking-wider">Sleep</span>
                </div>
              </div>
              {/* Key stats */}
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-lg font-bold', scoreText)}>{scoreLabel(displayLog.score)}</span>
                    {displayLog.source === 'oura' && (
                      <Badge variant="secondary" className="text-[9px] bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">Oura</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-neutral-500 mt-0.5">
                    {displayLog.bedtime && <span className="flex items-center gap-1"><Moon className="w-3 h-3" />{displayLog.bedtime}</span>}
                    {displayLog.wakeTime && <span className="flex items-center gap-1"><Sun className="w-3 h-3" />{displayLog.wakeTime}</span>}
                    {displayLog.totalSleep && <span className="font-medium text-neutral-700 dark:text-neutral-300">{fmtMins(displayLog.totalSleep)}</span>}
                  </div>
                </div>
                {/* Stage bar */}
                <SleepStageBar log={displayLog} />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-neutral-300 dark:border-neutral-600">
          <CardContent className="p-10 text-center">
            <Moon className="w-10 h-10 mx-auto mb-3 text-indigo-300 dark:text-indigo-700" />
            <p className="text-sm text-neutral-500">No sleep data yet</p>
            <p className="text-xs text-neutral-400 mt-1">Log your first night or connect Oura to sync automatically</p>
            <Button onClick={openAdd} size="sm" className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="w-3.5 h-3.5 mr-1" /> Log Night
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── 7-day trend + avg stats ── */}
      {logs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border-neutral-200 dark:border-neutral-700">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-neutral-500 mb-3">7-Day Sleep Score</p>
              <WeeklyChart logs={logs} today={today} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card className="border-neutral-200 dark:border-neutral-700">
              <CardContent className="p-3 text-center">
                <Moon className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{avg7?.score ?? '—'}</p>
                <p className="text-[10px] text-neutral-500">Avg Score</p>
              </CardContent>
            </Card>
            <Card className="border-neutral-200 dark:border-neutral-700">
              <CardContent className="p-3 text-center">
                <TrendingUp className="w-4 h-4 text-violet-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-violet-600 dark:text-violet-400">{avg7?.totalSleep ? fmtMins(avg7.totalSleep) : '—'}</p>
                <p className="text-[10px] text-neutral-500">Avg Sleep</p>
              </CardContent>
            </Card>
            <Card className="border-neutral-200 dark:border-neutral-700">
              <CardContent className="p-3 text-center">
                <Heart className="w-4 h-4 text-rose-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{avg7?.hrv ?? '—'}<span className="text-xs font-normal text-neutral-400 ml-0.5">ms</span></p>
                <p className="text-[10px] text-neutral-500">Avg HRV</p>
              </CardContent>
            </Card>
            <Card className="border-neutral-200 dark:border-neutral-700">
              <CardContent className="p-3 text-center">
                <Wind className="w-4 h-4 text-sky-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-sky-600 dark:text-sky-400">{avg7?.rhr ?? '—'}<span className="text-xs font-normal text-neutral-400 ml-0.5">bpm</span></p>
                <p className="text-[10px] text-neutral-500">Avg Resting HR</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── Contributors for latest log ── */}
      {displayLog && (
        <div>
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Contributors</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {displayLog.totalSleep != null && (
              <Contributor label="Total Sleep" value={fmtMins(displayLog.totalSleep)}
                pct={(displayLog.totalSleep / 480) * 100}
                sub="Target: 8h" color={displayLog.totalSleep >= 420 ? '#10b981' : displayLog.totalSleep >= 360 ? '#f59e0b' : '#ef4444'} />
            )}
            {displayLog.efficiency != null && (
              <Contributor label="Efficiency" value={`${displayLog.efficiency}%`}
                pct={displayLog.efficiency}
                sub="% time asleep in bed" color={displayLog.efficiency >= 85 ? '#10b981' : displayLog.efficiency >= 70 ? '#f59e0b' : '#ef4444'} />
            )}
            {displayLog.deepSleep != null && (
              <Contributor label="Deep Sleep" value={fmtMins(displayLog.deepSleep)}
                pct={(displayLog.deepSleep / 90) * 100}
                sub="Target: ~90 min" color="#4f46e5" />
            )}
            {displayLog.remSleep != null && (
              <Contributor label="REM Sleep" value={fmtMins(displayLog.remSleep)}
                pct={(displayLog.remSleep / 120) * 100}
                sub="Target: ~120 min" color="#8b5cf6" />
            )}
            {displayLog.latency != null && (
              <Contributor label="Latency" value={`${displayLog.latency}m`}
                pct={Math.max(0, 100 - (displayLog.latency / 30) * 100)}
                sub="Time to fall asleep" color={displayLog.latency <= 20 ? '#10b981' : displayLog.latency <= 30 ? '#f59e0b' : '#ef4444'} />
            )}
            {displayLog.restfulness != null && (
              <Contributor label="Restfulness" value={`${displayLog.restfulness}`}
                pct={displayLog.restfulness}
                sub="Movement during sleep" color={displayLog.restfulness >= 80 ? '#10b981' : '#f59e0b'} />
            )}
            {displayLog.hrv != null && (
              <Contributor label="HRV" value={`${displayLog.hrv} ms`}
                sub="Heart rate variability" color="#10b981" />
            )}
            {displayLog.restingHeartRate != null && (
              <Contributor label="Resting HR" value={`${displayLog.restingHeartRate} bpm`}
                sub="Lowest during sleep" color="#f43f5e" />
            )}
            {displayLog.tempDeviation != null && (
              <Contributor label="Temp Deviation" value={`${displayLog.tempDeviation > 0 ? '+' : ''}${displayLog.tempDeviation.toFixed(2)}°C`}
                sub="From your baseline" color={Math.abs(displayLog.tempDeviation) < 0.5 ? '#10b981' : '#f59e0b'} />
            )}
            {displayLog.respiratoryRate != null && (
              <Contributor label="Respiratory Rate" value={`${displayLog.respiratoryRate.toFixed(1)}`}
                sub="Breaths per minute" color="#06b6d4" />
            )}
            {displayLog.spo2 != null && (
              <Contributor label="SpO₂" value={`${displayLog.spo2}%`}
                sub="Blood oxygen" color={displayLog.spo2 >= 95 ? '#10b981' : '#ef4444'} />
            )}
          </div>
        </div>
      )}

      {/* ── History ── */}
      {logs.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">History</p>
          <div className="space-y-2">
            {logs.map(log => {
              const { text: st, ring } = scoreColor(log.score);
              return (
                <Card key={log.id} className="border-neutral-200 dark:border-neutral-700">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      {/* Mini ring */}
                      <div className="relative flex-shrink-0 w-10 h-10">
                        <svg width={40} height={40} className="-rotate-90">
                          <circle cx={20} cy={20} r={14} fill="none" stroke="currentColor" strokeWidth={5} className="text-neutral-200 dark:text-neutral-700" />
                          <circle cx={20} cy={20} r={14} fill="none" stroke={ring} strokeWidth={5}
                            strokeDasharray={`${log.score ? (log.score / 100) * (2 * Math.PI * 14) : 0} ${2 * Math.PI * 14}`}
                            strokeLinecap="round" />
                        </svg>
                        <span className={cn('absolute inset-0 flex items-center justify-center text-[10px] font-bold', st)}>
                          {log.score ?? '—'}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{format(parseISO(log.date), 'EEE, MMM d')}</span>
                          {log.source === 'oura' && <Badge variant="secondary" className="text-[9px] bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300">Oura</Badge>}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5 flex-wrap">
                          {log.totalSleep && <span className="font-medium text-neutral-700 dark:text-neutral-300">{fmtMins(log.totalSleep)}</span>}
                          {log.bedtime && <span>🌙 {log.bedtime}</span>}
                          {log.wakeTime && <span>☀️ {log.wakeTime}</span>}
                          {log.deepSleep != null && <span className="text-indigo-600 dark:text-indigo-400">Deep {fmtMins(log.deepSleep)}</span>}
                          {log.remSleep != null && <span className="text-violet-600 dark:text-violet-400">REM {fmtMins(log.remSleep)}</span>}
                          {log.hrv != null && <span className="text-rose-500">{log.hrv}ms HRV</span>}
                        </div>
                        <SleepStageBar log={log} />
                      </div>

                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-neutral-400 hover:text-[#E07A3A]" onClick={() => openEdit(log)} disabled={isPending}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-neutral-400 hover:text-red-500" onClick={() => handleDelete(log.id)} disabled={isPending}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Log / Edit Modal ── */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Sleep Log' : 'Log Sleep'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update your sleep data' : 'Manually enter your sleep data — connect Oura to sync automatically'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Date */}
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Date (morning you woke up)</label>
              <Input type="date" value={form.date} onChange={e => setField('date', e.target.value)} />
            </div>

            {/* Bedtime / Wake */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Bedtime</label>
                <Input type="time" value={form.bedtime} onChange={e => setField('bedtime', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Wake Time</label>
                <Input type="time" value={form.wakeTime} onChange={e => setField('wakeTime', e.target.value)} />
              </div>
            </div>
            {previewTotal && (
              <p className="text-xs text-indigo-600 dark:text-indigo-400 -mt-2">→ {fmtMins(previewTotal)} total sleep</p>
            )}

            {/* Score + Efficiency */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Sleep Score <span className="text-neutral-400 font-normal">(0–100)</span></label>
                <Input type="number" min="0" max="100" value={form.score} onChange={e => setField('score', e.target.value)} placeholder="85" />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Efficiency <span className="text-neutral-400 font-normal">(%)</span></label>
                <Input type="number" min="0" max="100" value={form.efficiency} onChange={e => setField('efficiency', e.target.value)} placeholder="92" />
              </div>
            </div>

            {/* Sleep stages */}
            <div>
              <p className="text-xs font-semibold text-neutral-500 mb-2">Sleep Stages <span className="font-normal">(minutes)</span></p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Deep Sleep</label>
                  <Input type="number" min="0" value={form.deepSleep} onChange={e => setField('deepSleep', e.target.value)} placeholder="90" />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">REM Sleep</label>
                  <Input type="number" min="0" value={form.remSleep} onChange={e => setField('remSleep', e.target.value)} placeholder="120" />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Light Sleep</label>
                  <Input type="number" min="0" value={form.lightSleep} onChange={e => setField('lightSleep', e.target.value)} placeholder="200" />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Awake Time</label>
                  <Input type="number" min="0" value={form.awakeDuration} onChange={e => setField('awakeDuration', e.target.value)} placeholder="15" />
                </div>
              </div>
            </div>

            {/* Biometrics */}
            <div>
              <p className="text-xs font-semibold text-neutral-500 mb-2">Biometrics</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">HRV <span className="text-neutral-400">(ms)</span></label>
                  <Input type="number" min="0" value={form.hrv} onChange={e => setField('hrv', e.target.value)} placeholder="62" />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Resting HR <span className="text-neutral-400">(bpm)</span></label>
                  <Input type="number" min="0" value={form.restingHeartRate} onChange={e => setField('restingHeartRate', e.target.value)} placeholder="55" />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Temp Deviation <span className="text-neutral-400">(°C)</span></label>
                  <Input type="number" step="0.01" value={form.tempDeviation} onChange={e => setField('tempDeviation', e.target.value)} placeholder="-0.13" />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Resp. Rate <span className="text-neutral-400">(br/min)</span></label>
                  <Input type="number" step="0.1" value={form.respiratoryRate} onChange={e => setField('respiratoryRate', e.target.value)} placeholder="14.5" />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">SpO₂ <span className="text-neutral-400">(%)</span></label>
                  <Input type="number" min="0" max="100" value={form.spo2} onChange={e => setField('spo2', e.target.value)} placeholder="97" />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Latency <span className="text-neutral-400">(min)</span></label>
                  <Input type="number" min="0" value={form.latency} onChange={e => setField('latency', e.target.value)} placeholder="12" />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Notes</label>
              <Textarea value={form.notes} onChange={e => setField('notes', e.target.value)} rows={2} placeholder="Woke up once, caffeine late, stressful day..." />
            </div>

            <Button onClick={handleSave} disabled={isPending || !form.date} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
              {isPending ? 'Saving...' : editingId ? 'Save Changes' : 'Log Night'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
