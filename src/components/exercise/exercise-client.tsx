'use client';

import React, { useState, useTransition, useMemo, useRef } from 'react';
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
  Calendar,
  Clock,
  Heart,
  Star,
  Search,
  ExternalLink,
  FileText,
  Upload,
  Activity,
  Flame,
  Zap,
  Target,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  ThumbsUp,
  Camera,
  AlertTriangle,
  Dumbbell,
  Minus,
} from 'lucide-react';
import {
  addExercise,
  toggleExerciseFavorite,
  deleteExercise,
  addExerciseLog,
  deleteExerciseLog,
  addPainLog,
  deletePainLog,
  addMedicalRecord,
  deleteMedicalRecord,
  addRepCounter,
  deleteRepCounter,
} from '@/db/queries/exercise';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Exercise, ExerciseLogEntry, PainLogEntry, MedicalRecord, RepCounter } from '@/db/schema';

// --- Types & Constants ---

interface Props {
  exercises: Exercise[];
  logs: ExerciseLogEntry[];
  painLogs: PainLogEntry[];
  records: MedicalRecord[];
  repCounts: RepCounter[];
  today: string;
  embedded?: boolean;
}

type TabType = 'library' | 'log' | 'pain' | 'records' | 'counters';
type ExCategory = 'pilates' | 'yoga' | 'stretch' | 'strength' | 'mobility' | 'posture' | 'breathing' | 'other';
type TargetArea = 'neck' | 'upper_back' | 'lower_back' | 'shoulders' | 'full_spine' | 'core' | 'hips' | 'full_body' | 'other';
type PainArea = 'neck' | 'upper_back' | 'lower_back' | 'shoulders' | 'left_shoulder' | 'right_shoulder' | 'hips' | 'other';
type PainType = 'ache' | 'sharp' | 'stiffness' | 'burning' | 'radiating' | 'tingling' | 'other';
type RecordType = 'mri' | 'xray' | 'ct_scan' | 'report' | 'referral' | 'other';

const CATEGORY_CONFIG: Record<ExCategory, { label: string; icon: string; color: string; bgColor: string }> = {
  pilates: { label: 'Pilates', icon: '🧘', color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-950' },
  yoga: { label: 'Yoga', icon: '🙏', color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-50 dark:bg-teal-950' },
  stretch: { label: 'Stretch', icon: '🤸', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-950' },
  strength: { label: 'Strength', icon: '💪', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-950' },
  mobility: { label: 'Mobility', icon: '🔄', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-950' },
  posture: { label: 'Posture', icon: '🧍', color: 'text-indigo-600 dark:text-indigo-400', bgColor: 'bg-indigo-50 dark:bg-indigo-950' },
  breathing: { label: 'Breathing', icon: '🌬️', color: 'text-cyan-600 dark:text-cyan-400', bgColor: 'bg-cyan-50 dark:bg-cyan-950' },
  other: { label: 'Other', icon: '📋', color: 'text-neutral-600 dark:text-neutral-400', bgColor: 'bg-neutral-50 dark:bg-neutral-800' },
};

const TARGET_LABELS: Record<TargetArea, string> = {
  neck: 'Neck', upper_back: 'Upper Back', lower_back: 'Lower Back', shoulders: 'Shoulders',
  full_spine: 'Full Spine', core: 'Core', hips: 'Hips', full_body: 'Full Body', other: 'Other',
};

const PAIN_AREA_LABELS: Record<PainArea, string> = {
  neck: 'Neck', upper_back: 'Upper Back', lower_back: 'Lower Back', shoulders: 'Shoulders',
  left_shoulder: 'Left Shoulder', right_shoulder: 'Right Shoulder', hips: 'Hips', other: 'Other',
};

const PAIN_TYPE_LABELS: Record<PainType, string> = {
  ache: 'Ache', sharp: 'Sharp', stiffness: 'Stiffness', burning: 'Burning',
  radiating: 'Radiating', tingling: 'Tingling', other: 'Other',
};

const RECORD_TYPE_LABELS: Record<RecordType, { label: string; icon: string }> = {
  mri: { label: 'MRI', icon: '🧲' },
  xray: { label: 'X-Ray', icon: '☢️' },
  ct_scan: { label: 'CT Scan', icon: '🔬' },
  report: { label: 'Report', icon: '📄' },
  referral: { label: 'Referral', icon: '📋' },
  other: { label: 'Other', icon: '📎' },
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
  intermediate: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
  advanced: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
};

function painColor(level: number): string {
  if (level <= 3) return 'text-green-600 dark:text-green-400';
  if (level <= 5) return 'text-amber-600 dark:text-amber-400';
  if (level <= 7) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

function painBgColor(level: number): string {
  if (level <= 3) return 'bg-green-500';
  if (level <= 5) return 'bg-amber-500';
  if (level <= 7) return 'bg-orange-500';
  return 'bg-red-500';
}

function getCurrentTime() {
  return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
}

function FileUpload({ onSelect, label }: { onSelect: (url: string, name: string) => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <input ref={ref} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5MB'); return; }
        const reader = new FileReader();
        reader.onloadend = () => onSelect(reader.result as string, file.name);
        reader.readAsDataURL(file);
      }} />
      <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()} className="gap-2">
        <Upload className="w-4 h-4" />{label}
      </Button>
    </div>
  );
}

// --- Main Component ---

export function ExerciseClient({ exercises, logs, painLogs, records, repCounts, today, embedded }: Props) {
  const [tab, setTab] = useState<TabType>('counters');
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ExCategory | 'all'>('all');
  const [targetFilter, setTargetFilter] = useState<TargetArea | 'all'>('all');
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null);

  // Add exercise modal
  const [showExModal, setShowExModal] = useState(false);
  const [exName, setExName] = useState('');
  const [exCategory, setExCategory] = useState<ExCategory>('stretch');
  const [exTarget, setExTarget] = useState<TargetArea>('lower_back');
  const [exPurpose, setExPurpose] = useState('');
  const [exInstructions, setExInstructions] = useState('');
  const [exDuration, setExDuration] = useState('');
  const [exDifficulty, setExDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [exVideoUrl, setExVideoUrl] = useState('');
  const [exNotes, setExNotes] = useState('');

  // Log modal
  const [showLogModal, setShowLogModal] = useState(false);
  const [logExerciseId, setLogExerciseId] = useState<number | undefined>(undefined);
  const [logCustomName, setLogCustomName] = useState('');
  const [logDuration, setLogDuration] = useState('');
  const [logSets, setLogSets] = useState('');
  const [logReps, setLogReps] = useState('');
  const [logPainBefore, setLogPainBefore] = useState(0);
  const [logPainAfter, setLogPainAfter] = useState(0);
  const [logFeltGood, setLogFeltGood] = useState(false);
  const [logNotes, setLogNotes] = useState('');

  // Pain modal
  const [showPainModal, setShowPainModal] = useState(false);
  const [pAreas, setPAreas] = useState<PainArea[]>([]);
  const [pSeverity, setPSeverity] = useState(5);
  const [pTypes, setPTypes] = useState<PainType[]>([]);
  const [pTrigger, setPTrigger] = useState('');
  const [pRelief, setPRelief] = useState('');
  const [pNotes, setPNotes] = useState('');

  // Record modal
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [recDate, setRecDate] = useState(today);
  const [recType, setRecType] = useState<RecordType>('mri');
  const [recTitle, setRecTitle] = useState('');
  const [recProvider, setRecProvider] = useState('');
  const [recFindings, setRecFindings] = useState('');
  const [recFile, setRecFile] = useState<string | null>(null);
  const [recFileName, setRecFileName] = useState('');
  const [recNotes, setRecNotes] = useState('');

  // Counter state
  const [counterReps, setCounterReps] = useState(10);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [counterType, setCounterType] = useState<'pushups' | 'pullups'>('pushups');

  // Computed
  const filteredExercises = useMemo(() => {
    let result = exercises;
    if (categoryFilter !== 'all') result = result.filter((e) => e.category === categoryFilter);
    if (targetFilter !== 'all') result = result.filter((e) => e.targetArea === targetFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((e) =>
        e.name.toLowerCase().includes(q) ||
        (e.purpose && e.purpose.toLowerCase().includes(q)) ||
        (e.notes && e.notes.toLowerCase().includes(q))
      );
    }
    return result;
  }, [exercises, categoryFilter, targetFilter, search]);

  const favorites = exercises.filter((e) => e.favorite);
  const todaysLogs = logs.filter((l) => l.date === today);
  const todaysPain = painLogs.filter((l) => l.date === today);

  const avgPainLast7 = useMemo(() => {
    const recent = painLogs.filter((l) => {
      const d = new Date(l.date + 'T00:00:00');
      const t = new Date(today + 'T00:00:00');
      return (t.getTime() - d.getTime()) / 86400000 <= 7;
    });
    if (recent.length === 0) return null;
    return (recent.reduce((s, l) => s + l.severity, 0) / recent.length).toFixed(1);
  }, [painLogs, today]);

  // Counter computed
  const todaysCounters = repCounts.filter((r) => r.date === today);
  const todayPushups = todaysCounters.filter((r) => r.exerciseType === 'pushups').reduce((s, r) => s + r.reps, 0);
  const todayPullups = todaysCounters.filter((r) => r.exerciseType === 'pullups').reduce((s, r) => s + r.reps, 0);

  const last7Counters = useMemo(() => {
    const days: { date: string; pushups: number; pullups: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today + 'T00:00:00');
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const dayRecs = repCounts.filter((r) => r.date === iso);
      days.push({
        date: iso,
        pushups: dayRecs.filter((r) => r.exerciseType === 'pushups').reduce((s, r) => s + r.reps, 0),
        pullups: dayRecs.filter((r) => r.exerciseType === 'pullups').reduce((s, r) => s + r.reps, 0),
      });
    }
    return days;
  }, [repCounts, today]);

  // Handlers
  const handleQuickCounter = (type: 'pushups' | 'pullups', reps: number) => {
    startTransition(async () => {
      const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      await addRepCounter({ date: today, time, exerciseType: type, reps });
      toast.success(`+${reps} ${type}!`);
    });
  };

  const handleCustomLog = () => {
    if (counterReps <= 0) { toast.error('Enter a valid number'); return; }
    startTransition(async () => {
      const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      await addRepCounter({ date: today, time, exerciseType: counterType, reps: counterReps });
      toast.success(`+${counterReps} ${counterType}!`);
      setShowCounterModal(false);
    });
  };

  const handleDeleteCounter = (id: number) => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) startTransition(async () => { await deleteRepCounter(id); });
    }, 5000);
    toast('Entry removed', {
      duration: 5000,
      action: { label: 'Undo', onClick: () => { cancelled = true; clearTimeout(timer); } },
    });
  };

  const handleSaveExercise = () => {
    if (!exName.trim()) { toast.error('Name is required'); return; }
    startTransition(async () => {
      await addExercise({
        name: exName.trim(),
        category: exCategory,
        targetArea: exTarget,
        purpose: exPurpose.trim() || undefined,
        instructions: exInstructions.trim() || undefined,
        duration: exDuration.trim() || undefined,
        difficulty: exDifficulty,
        videoUrl: exVideoUrl.trim() || undefined,
        notes: exNotes.trim() || undefined,
      });
      toast.success(`${exName} added to library!`);
      setShowExModal(false);
      setExName(''); setExPurpose(''); setExInstructions(''); setExDuration('');
      setExVideoUrl(''); setExNotes('');
    });
  };

  const handleToggleFavorite = (id: number) => {
    startTransition(async () => { await toggleExerciseFavorite(id); });
  };

  const handleDeleteExercise = (id: number) => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) startTransition(async () => { await deleteExercise(id); });
    }, 5000);
    toast('Exercise removed', {
      duration: 5000,
      action: { label: 'Undo', onClick: () => { cancelled = true; clearTimeout(timer); } },
    });
  };

  const handleQuickLog = (ex: Exercise) => {
    startTransition(async () => {
      await addExerciseLog({
        date: today,
        exerciseId: ex.id,
        category: ex.category,
        targetArea: ex.targetArea,
        feltGood: true,
      });
      toast.success(`${ex.name} logged!`);
    });
  };

  const openLogModalWithExercise = (ex: Exercise) => {
    setLogExerciseId(ex.id);
    setLogCustomName('');
    setLogPainBefore(0);
    setLogPainAfter(0);
    setLogFeltGood(false);
    setLogNotes('');
    // Pre-fill from last logged session for this exercise
    const lastLog = logs.find((l) => l.exerciseId === ex.id);
    if (lastLog) {
      setLogDuration(lastLog.duration ? String(lastLog.duration) : '');
      setLogSets(lastLog.sets ? String(lastLog.sets) : '');
      setLogReps(lastLog.reps ? String(lastLog.reps) : '');
    } else {
      setLogDuration('');
      setLogSets('');
      setLogReps('');
    }
    setShowLogModal(true);
  };

  const handleSaveLog = () => {
    if (!logExerciseId && !logCustomName.trim()) {
      toast.error('Select an exercise or enter a custom name');
      return;
    }
    const ex = logExerciseId ? exercises.find((e) => e.id === logExerciseId) : null;
    startTransition(async () => {
      await addExerciseLog({
        date: today,
        exerciseId: logExerciseId,
        customName: logCustomName.trim() || undefined,
        category: ex?.category || undefined,
        targetArea: ex?.targetArea || undefined,
        duration: logDuration ? parseInt(logDuration) : undefined,
        sets: logSets ? parseInt(logSets) : undefined,
        reps: logReps ? parseInt(logReps) : undefined,
        painBefore: logPainBefore > 0 ? logPainBefore : undefined,
        painAfter: logPainAfter > 0 ? logPainAfter : undefined,
        feltGood: logFeltGood,
        notes: logNotes.trim() || undefined,
      });
      toast.success('Exercise logged!');
      setShowLogModal(false);
    });
  };

  const handleDeleteLog = (id: number) => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) startTransition(async () => { await deleteExerciseLog(id); });
    }, 5000);
    toast('Log deleted', {
      duration: 5000,
      action: { label: 'Undo', onClick: () => { cancelled = true; clearTimeout(timer); } },
    });
  };

  const handleSavePain = () => {
    if (pAreas.length === 0) { toast.error('Select at least one area'); return; }
    startTransition(async () => {
      const time = getCurrentTime();
      await Promise.all(pAreas.map(area => addPainLog({
        date: today,
        time,
        area,
        severity: pSeverity,
        type: pTypes.length > 0 ? (pTypes.join(',') as PainType) : undefined,
        trigger: pTrigger.trim() || undefined,
        relief: pRelief.trim() || undefined,
        notes: pNotes.trim() || undefined,
      })));
      toast.success(`Pain logged for ${pAreas.length} area${pAreas.length > 1 ? 's' : ''}`);
      setShowPainModal(false);
      setPAreas([]); setPTypes([]); setPTrigger(''); setPRelief(''); setPNotes('');
    });
  };

  const handleDeletePain = (id: number) => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) startTransition(async () => { await deletePainLog(id); });
    }, 5000);
    toast('Entry deleted', {
      duration: 5000,
      action: { label: 'Undo', onClick: () => { cancelled = true; clearTimeout(timer); } },
    });
  };

  const handleSaveRecord = () => {
    if (!recTitle.trim()) { toast.error('Title is required'); return; }
    startTransition(async () => {
      await addMedicalRecord({
        date: recDate,
        type: recType,
        title: recTitle.trim(),
        provider: recProvider.trim() || undefined,
        findings: recFindings.trim() || undefined,
        file: recFile || undefined,
        fileName: recFileName || undefined,
        notes: recNotes.trim() || undefined,
      });
      toast.success('Record saved!');
      setShowRecordModal(false);
      setRecTitle(''); setRecProvider(''); setRecFindings(''); setRecFile(null); setRecFileName(''); setRecNotes('');
    });
  };

  const handleDeleteRecord = (id: number) => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) startTransition(async () => { await deleteMedicalRecord(id); });
    }, 5000);
    toast('Record deleted', {
      duration: 5000,
      action: { label: 'Undo', onClick: () => { cancelled = true; clearTimeout(timer); } },
    });
  };

  return (
    <div className={embedded ? 'space-y-6' : 'max-w-4xl mx-auto space-y-6'}>
      {/* Header */}
      {!embedded && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
            Exercise & Rehab
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Spine health, pain tracking, and exercise library
          </p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="!p-3 text-center">
          <p className="text-2xl font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>{todaysLogs.length}</p>
          <p className="text-[10px] text-neutral-500">Exercises Today</p>
        </Card>
        <Card className="!p-3 text-center">
          <p className={cn('text-2xl font-bold', avgPainLast7 ? painColor(parseFloat(avgPainLast7)) : 'text-neutral-300')}
            style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
            {avgPainLast7 || '—'}
          </p>
          <p className="text-[10px] text-neutral-500">Avg Pain (7d)</p>
        </Card>
        <Card className="!p-3 text-center">
          <p className="text-2xl font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>{exercises.length}</p>
          <p className="text-[10px] text-neutral-500">In Library</p>
        </Card>
        <Card className="!p-3 text-center">
          <p className="text-2xl font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>{records.length}</p>
          <p className="text-[10px] text-neutral-500">Records</p>
        </Card>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1 w-fit flex-wrap">
        <Button variant={tab === 'counters' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('counters')} className="gap-1.5">
          <Dumbbell className="w-4 h-4" />Counters
        </Button>
        <Button variant={tab === 'library' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('library')} className="gap-1.5">
          <Target className="w-4 h-4" />Exercises
        </Button>
        <Button variant={tab === 'log' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('log')} className="gap-1.5">
          <Activity className="w-4 h-4" />Log
        </Button>
        <Button variant={tab === 'pain' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('pain')} className="gap-1.5">
          <Flame className="w-4 h-4" />Pain
        </Button>
        <Button variant={tab === 'records' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('records')} className="gap-1.5">
          <FileText className="w-4 h-4" />Records
        </Button>
      </div>

      {/* ==================== COUNTERS TAB ==================== */}
      {tab === 'counters' && (
        <div className="space-y-6">
          {/* Quick log buttons */}
          <div className="grid grid-cols-2 gap-4">
            {/* Pushups card */}
            <Card className="!p-0 overflow-hidden">
              <div className="bg-red-50 dark:bg-red-950/40 p-4 text-center border-b border-red-100 dark:border-red-900/40">
                <p className="text-3xl font-bold text-red-600 dark:text-red-400" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                  {todayPushups}
                </p>
                <p className="text-xs text-red-500/80 dark:text-red-400/60 font-medium mt-0.5">Pushups Today</p>
              </div>
              <div className="p-3 space-y-2">
                <div className="grid grid-cols-3 gap-1.5">
                  {[5, 10, 15, 20, 25, 50].map((n) => (
                    <Button key={n} variant="outline" size="sm" disabled={isPending}
                      onClick={() => handleQuickCounter('pushups', n)}
                      className="text-xs font-semibold hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-950/30">
                      +{n}
                    </Button>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="w-full text-xs text-neutral-500"
                  onClick={() => { setCounterType('pushups'); setCounterReps(10); setShowCounterModal(true); }}>
                  Custom amount...
                </Button>
              </div>
            </Card>

            {/* Pullups card */}
            <Card className="!p-0 overflow-hidden">
              <div className="bg-blue-50 dark:bg-blue-950/40 p-4 text-center border-b border-blue-100 dark:border-blue-900/40">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                  {todayPullups}
                </p>
                <p className="text-xs text-blue-500/80 dark:text-blue-400/60 font-medium mt-0.5">Pull-ups Today</p>
              </div>
              <div className="p-3 space-y-2">
                <div className="grid grid-cols-3 gap-1.5">
                  {[1, 2, 3, 5, 8, 10].map((n) => (
                    <Button key={n} variant="outline" size="sm" disabled={isPending}
                      onClick={() => handleQuickCounter('pullups', n)}
                      className="text-xs font-semibold hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-950/30">
                      +{n}
                    </Button>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="w-full text-xs text-neutral-500"
                  onClick={() => { setCounterType('pullups'); setCounterReps(5); setShowCounterModal(true); }}>
                  Custom amount...
                </Button>
              </div>
            </Card>
          </div>

          {/* 7-day chart */}
          <Card className="!p-4">
            <h3 className="text-sm font-semibold mb-3">Last 7 Days</h3>
            <div className="grid grid-cols-7 gap-2">
              {last7Counters.map((day) => {
                const maxVal = Math.max(...last7Counters.map((d) => d.pushups + d.pullups), 1);
                const total = day.pushups + day.pullups;
                const heightPct = Math.max((total / maxVal) * 100, 4);
                const dayLabel = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
                const isToday = day.date === today;
                return (
                  <div key={day.date} className="flex flex-col items-center gap-1">
                    <div className="h-20 w-full flex items-end justify-center">
                      <div className="w-full max-w-[28px] flex flex-col items-end justify-end" style={{ height: '100%' }}>
                        {day.pullups > 0 && (
                          <div
                            className="w-full rounded-t bg-blue-400 dark:bg-blue-500"
                            style={{ height: `${(day.pullups / maxVal) * 100}%`, minHeight: day.pullups > 0 ? '3px' : 0 }}
                          />
                        )}
                        {day.pushups > 0 && (
                          <div
                            className={cn('w-full bg-red-400 dark:bg-red-500', day.pullups === 0 && 'rounded-t')}
                            style={{ height: `${(day.pushups / maxVal) * 100}%`, minHeight: day.pushups > 0 ? '3px' : 0 }}
                          />
                        )}
                        {total === 0 && (
                          <div className="w-full rounded-t bg-neutral-200 dark:bg-neutral-700" style={{ height: '3px' }} />
                        )}
                      </div>
                    </div>
                    {total > 0 && <span className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400">{total}</span>}
                    <span className={cn('text-[10px]', isToday ? 'font-bold text-[#E07A3A]' : 'text-neutral-400')}>{dayLabel}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 justify-center mt-3">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-red-400" /><span className="text-[10px] text-neutral-500">Pushups</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-blue-400" /><span className="text-[10px] text-neutral-500">Pull-ups</span></div>
            </div>
          </Card>

          {/* Today's log entries */}
          {todaysCounters.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Today&apos;s Entries</h3>
              {todaysCounters.map((entry) => (
                <Card key={entry.id} className="!p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold',
                      entry.exerciseType === 'pushups' ? 'bg-red-500' : 'bg-blue-500'
                    )}>
                      {entry.reps}
                    </div>
                    <div>
                      <p className="text-sm font-medium capitalize">{entry.exerciseType === 'pullups' ? 'Pull-ups' : 'Pushups'}</p>
                      {entry.time && <p className="text-[10px] text-neutral-400">{entry.time}</p>}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteCounter(entry.id)} className="text-neutral-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </Card>
              ))}
            </div>
          )}

          {/* All-time stats */}
          {repCounts.length > 0 && (
            <Card className="!p-4">
              <h3 className="text-sm font-semibold mb-2">All-Time Stats</h3>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-red-500" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                    {repCounts.filter((r) => r.exerciseType === 'pushups').reduce((s, r) => s + r.reps, 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-neutral-500">Total Pushups</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-500" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                    {repCounts.filter((r) => r.exerciseType === 'pullups').reduce((s, r) => s + r.reps, 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-neutral-500">Total Pull-ups</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Custom counter modal */}
      <Dialog open={showCounterModal} onOpenChange={setShowCounterModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="capitalize">{counterType === 'pullups' ? 'Pull-ups' : 'Pushups'}</DialogTitle>
            <DialogDescription>Log a custom rep count</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" size="sm" onClick={() => setCounterReps(Math.max(1, counterReps - 1))}>
                <Minus className="w-4 h-4" />
              </Button>
              <Input type="number" value={counterReps} onChange={(e) => setCounterReps(parseInt(e.target.value) || 0)}
                className="w-20 text-center text-lg font-bold" min={1} />
              <Button variant="outline" size="sm" onClick={() => setCounterReps(counterReps + 1)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <Button onClick={handleCustomLog} disabled={isPending} className="w-full">
              {isPending ? 'Logging...' : `Log ${counterReps} ${counterType === 'pullups' ? 'Pull-ups' : 'Pushups'}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== EXERCISE LIBRARY TAB ==================== */}
      {tab === 'library' && (
        <div className="space-y-4">
          {/* Search + filters + add */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input placeholder="Search exercises..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Button onClick={() => setShowExModal(true)} className="gap-2 shrink-0">
              <Plus className="w-4 h-4" />Add
            </Button>
          </div>

          {/* Category pills */}
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setCategoryFilter('all')}
              className={cn('px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors',
                categoryFilter === 'all' ? 'bg-[#E07A3A]/10 text-[#E07A3A]' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500')}>
              All
            </button>
            {(Object.entries(CATEGORY_CONFIG) as [ExCategory, typeof CATEGORY_CONFIG[ExCategory]][]).map(([key, cfg]) => (
              <button key={key} onClick={() => setCategoryFilter(key)}
                className={cn('px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors',
                  categoryFilter === key ? cfg.bgColor + ' ' + cfg.color : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500')}>
                {cfg.icon} {cfg.label}
              </button>
            ))}
          </div>

          {/* Target area pills */}
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setTargetFilter('all')}
              className={cn('px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors',
                targetFilter === 'all' ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500')}>
              All areas
            </button>
            {(Object.entries(TARGET_LABELS) as [TargetArea, string][]).map(([key, label]) => (
              <button key={key} onClick={() => setTargetFilter(key)}
                className={cn('px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors',
                  targetFilter === key ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500')}>
                {label}
              </button>
            ))}
          </div>

          {/* Exercise cards */}
          {filteredExercises.length === 0 ? (
            <Card className="!p-8 text-center">
              <Target className="w-10 h-10 mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
              <p className="text-neutral-500 dark:text-neutral-400">
                {exercises.length === 0 ? 'No exercises yet. Build your rehab library!' : 'No exercises match your filters.'}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredExercises.map((ex) => {
                const catCfg = CATEGORY_CONFIG[ex.category as ExCategory];
                const isExpanded = expandedExercise === ex.id;
                return (
                  <Card key={ex.id} className="!p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0', catCfg.bgColor)}>
                        {catCfg.icon}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>{ex.name}</h3>
                            {ex.purpose && <p className="text-xs text-indigo-600 dark:text-indigo-400">{ex.purpose}</p>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => openLogModalWithExercise(ex)} disabled={isPending}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-[#E07A3A] hover:bg-orange-50 dark:hover:bg-orange-950 transition-colors"
                              title="Log with details (pre-filled from last session)">
                              <Plus className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleQuickLog(ex)} disabled={isPending}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
                              title="Quick log (no details)">
                              <Zap className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleToggleFavorite(ex.id)} disabled={isPending}
                              className={cn('p-1.5 rounded-lg transition-colors',
                                ex.favorite ? 'text-rose-500' : 'text-neutral-400 hover:text-rose-500')}>
                              <Heart className={cn('w-4 h-4', ex.favorite && 'fill-current')} />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="secondary" className={cn('text-[9px]', catCfg.bgColor, catCfg.color)}>{catCfg.label}</Badge>
                          <Badge variant="secondary" className="text-[9px]">{TARGET_LABELS[ex.targetArea as TargetArea]}</Badge>
                          {ex.difficulty && (
                            <Badge variant="secondary" className={cn('text-[9px] capitalize', DIFFICULTY_COLORS[ex.difficulty])}>{ex.difficulty}</Badge>
                          )}
                          {ex.duration && <span className="text-[10px] text-neutral-400">{ex.duration}</span>}
                        </div>

                        {/* Expandable */}
                        <button onClick={() => setExpandedExercise(isExpanded ? null : ex.id)}
                          className="text-[10px] text-neutral-400 hover:text-neutral-600 flex items-center gap-0.5">
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {isExpanded ? 'Less' : 'Instructions & details'}
                        </button>

                        {isExpanded && (
                          <div className="pt-2 space-y-2 border-t border-neutral-100 dark:border-neutral-800">
                            {ex.instructions && (
                              <div>
                                <p className="text-[10px] font-medium text-neutral-500 mb-0.5">How to do it:</p>
                                <p className="text-xs text-neutral-600 dark:text-neutral-400 whitespace-pre-line">{ex.instructions}</p>
                              </div>
                            )}
                            {ex.videoUrl && (
                              <a href={ex.videoUrl} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" />Watch video
                              </a>
                            )}
                            {ex.notes && <p className="text-xs text-neutral-400 italic">{ex.notes}</p>}
                            <button onClick={() => handleDeleteExercise(ex.id)} disabled={isPending}
                              className="text-[10px] text-red-500 hover:underline">
                              Delete exercise
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== LOG TAB ==================== */}
      {tab === 'log' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">Today&apos;s Exercises</p>
            <Button onClick={() => {
              setLogExerciseId(undefined); setLogCustomName(''); setLogDuration(''); setLogSets('');
              setLogReps(''); setLogPainBefore(0); setLogPainAfter(0); setLogFeltGood(false); setLogNotes('');
              setShowLogModal(true);
            }} className="gap-2">
              <Plus className="w-4 h-4" />Log Exercise
            </Button>
          </div>

          {/* Quick-log favorites */}
          {favorites.length > 0 && (
            <Card className="!p-4">
              <p className="text-sm font-medium mb-2">Quick Log Favorites</p>
              <div className="flex flex-wrap gap-2">
                {favorites.map((ex) => (
                  <Button key={ex.id} variant="outline" size="sm" onClick={() => handleQuickLog(ex)} disabled={isPending} className="gap-1.5 text-xs">
                    {CATEGORY_CONFIG[ex.category as ExCategory]?.icon} {ex.name}
                  </Button>
                ))}
              </div>
            </Card>
          )}

          {/* Today's log entries */}
          {todaysLogs.length === 0 ? (
            <Card className="!p-6 text-center">
              <Activity className="w-8 h-8 mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
              <p className="text-neutral-500 text-sm">No exercises logged today. Time to move!</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {todaysLogs.map((entry) => {
                const ex = entry.exerciseId ? exercises.find((e) => e.id === entry.exerciseId) : null;
                const catCfg = entry.category ? CATEGORY_CONFIG[entry.category as ExCategory] : null;
                return (
                  <Card key={entry.id} className="!p-3">
                    <div className="flex items-center gap-3">
                      {catCfg && (
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-sm', catCfg.bgColor)}>
                          {catCfg.icon}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{ex?.name || entry.customName || 'Exercise'}</p>
                        <div className="flex items-center gap-2 text-[10px] text-neutral-500 flex-wrap">
                          {entry.sets && entry.reps && <span>{entry.sets}x{entry.reps}</span>}
                          {entry.duration && <span>{Math.round(entry.duration / 60)}min</span>}
                          {entry.painBefore !== null && entry.painAfter !== null && entry.painBefore !== undefined && entry.painAfter !== undefined && entry.painBefore > 0 && (
                            <span className={cn(entry.painAfter < entry.painBefore ? 'text-green-500' : entry.painAfter > entry.painBefore ? 'text-red-500' : '')}>
                              Pain: {entry.painBefore} → {entry.painAfter}
                            </span>
                          )}
                          {entry.feltGood && <ThumbsUp className="w-3 h-3 text-green-500" />}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteLog(entry.id)} disabled={isPending}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 transition-colors shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Recent history */}
          {logs.length > todaysLogs.length && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">Recent History</p>
              {logs.filter((l) => l.date !== today).slice(0, 15).map((entry) => {
                const ex = entry.exerciseId ? exercises.find((e) => e.id === entry.exerciseId) : null;
                return (
                  <div key={entry.id} className="flex items-center gap-3 py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                    <span className="text-xs text-neutral-400 w-16 shrink-0">{formatDate(entry.date)}</span>
                    <span className="text-sm font-medium flex-1 truncate">{ex?.name || entry.customName || 'Exercise'}</span>
                    {entry.feltGood && <ThumbsUp className="w-3 h-3 text-green-500 shrink-0" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== PAIN TAB ==================== */}
      {tab === 'pain' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">Pain Tracker</p>
            <Button onClick={() => { setPAreas([]); setPTypes([]); setShowPainModal(true); }} className="gap-2">
              <Plus className="w-4 h-4" />Log Pain
            </Button>
          </div>

          {/* Today's pain */}
          {todaysPain.length > 0 && (
            <Card className="!p-4 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-2">Today&apos;s Pain</p>
              {todaysPain.map((p) => (
                <div key={p.id} className="flex items-center gap-3 py-1.5">
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white', painBgColor(p.severity))}>
                    {p.severity}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{PAIN_AREA_LABELS[p.area as PainArea]}</p>
                    <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                      {p.type && <span>{p.type.split(',').map(t => PAIN_TYPE_LABELS[t as PainType] ?? t).join(', ')}</span>}
                      {p.trigger && <span>• {p.trigger}</span>}
                    </div>
                  </div>
                  <button onClick={() => handleDeletePain(p.id)} disabled={isPending}
                    className="p-1 text-neutral-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </Card>
          )}

          {/* Pain history */}
          {painLogs.length === 0 ? (
            <Card className="!p-8 text-center">
              <Flame className="w-10 h-10 mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
              <p className="text-neutral-500">No pain entries yet. Log when you feel discomfort to track patterns.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {painLogs.slice(0, 30).map((p) => (
                <Card key={p.id} className="!p-3">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0', painBgColor(p.severity))}>
                      {p.severity}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{PAIN_AREA_LABELS[p.area as PainArea]}</span>
                        {p.type && p.type.split(',').map(t => (
  <Badge key={t} variant="secondary" className="text-[9px]">{PAIN_TYPE_LABELS[t as PainType] ?? t}</Badge>
))}
                      </div>
                      <div className="text-[10px] text-neutral-400 flex items-center gap-2">
                        <span>{formatDate(p.date)}</span>
                        {p.time && <span>{p.time}</span>}
                        {p.trigger && <span>• Trigger: {p.trigger}</span>}
                      </div>
                      {p.relief && <p className="text-[10px] text-green-500">Relief: {p.relief}</p>}
                      {p.notes && <p className="text-[10px] text-neutral-400 italic">{p.notes}</p>}
                    </div>
                    <button onClick={() => handleDeletePain(p.id)} disabled={isPending}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 transition-colors shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== RECORDS TAB ==================== */}
      {tab === 'records' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">Medical Records</p>
            <Button onClick={() => { setRecDate(today); setRecTitle(''); setRecProvider(''); setRecFindings('');
              setRecFile(null); setRecFileName(''); setRecNotes(''); setShowRecordModal(true); }} className="gap-2">
              <Plus className="w-4 h-4" />Add Record
            </Button>
          </div>

          <Card className="!p-4 border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
              Your imaging (MRI & X-ray) came back structurally okay — but your cervical and lumbar lordosis (natural spine curves) have flattened. The exercises here target restoring that curvature.
            </p>
          </Card>

          {records.length === 0 ? (
            <Card className="!p-8 text-center">
              <FileText className="w-10 h-10 mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
              <p className="text-neutral-500">No records uploaded yet. Upload MRI, X-ray, and other reports.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {records.map((rec) => {
                const typeCfg = RECORD_TYPE_LABELS[rec.type as RecordType];
                return (
                  <Card key={rec.id} className="!p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{typeCfg.icon}</span>
                          <h3 className="text-sm font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>{rec.title}</h3>
                          <Badge variant="secondary" className="text-[10px]">{typeCfg.label}</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-neutral-400">
                          <Calendar className="w-3 h-3" />{formatDate(rec.date)}
                          {rec.provider && <span>• {rec.provider}</span>}
                        </div>
                        {rec.findings && (
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800 rounded-lg p-2">{rec.findings}</p>
                        )}
                        {rec.fileName && (
                          <p className="text-[10px] text-blue-500 flex items-center gap-1">
                            <FileText className="w-3 h-3" />{rec.fileName}
                          </p>
                        )}
                        {rec.notes && <p className="text-xs text-neutral-400 italic">{rec.notes}</p>}
                      </div>
                      <button onClick={() => handleDeleteRecord(rec.id)} disabled={isPending}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 transition-colors shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== ADD EXERCISE MODAL ==================== */}
      <Dialog open={showExModal} onOpenChange={setShowExModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>Add Exercise</DialogTitle>
            <DialogDescription>Build your rehab and exercise library</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <label className="text-sm font-medium mb-1 block">Name *</label>
              <Input placeholder="Cat-Cow Stretch, Chin Tucks..." value={exName} onChange={(e) => setExName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <div className="grid grid-cols-4 gap-2">
                {(Object.entries(CATEGORY_CONFIG) as [ExCategory, typeof CATEGORY_CONFIG[ExCategory]][]).map(([key, cfg]) => (
                  <button key={key} type="button" onClick={() => setExCategory(key)}
                    className={cn('flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg text-[10px] font-medium border transition-colors',
                      exCategory === key ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400')}>
                    <span>{cfg.icon}</span>{cfg.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Target Area</label>
              <div className="flex gap-2 flex-wrap">
                {(Object.entries(TARGET_LABELS) as [TargetArea, string][]).map(([key, label]) => (
                  <button key={key} type="button" onClick={() => setExTarget(key)}
                    className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                      exTarget === key ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400')}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Purpose</label>
              <Input placeholder="Restore cervical lordosis, decompress lumbar spine..." value={exPurpose} onChange={(e) => setExPurpose(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Instructions</label>
              <Textarea placeholder="Step-by-step how to perform..." value={exInstructions} onChange={(e) => setExInstructions(e.target.value)} rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Duration / Reps</label>
                <Input placeholder="30 sec, 10 reps x 3 sets" value={exDuration} onChange={(e) => setExDuration(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Difficulty</label>
                <div className="flex gap-2">
                  {(['beginner', 'intermediate', 'advanced'] as const).map((d) => (
                    <button key={d} type="button" onClick={() => setExDifficulty(d)}
                      className={cn('flex-1 py-1.5 rounded-lg text-[10px] font-medium border transition-colors capitalize',
                        exDifficulty === d ? DIFFICULTY_COLORS[d] + ' border-transparent' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400')}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Video URL</label>
              <Input placeholder="YouTube link..." value={exVideoUrl} onChange={(e) => setExVideoUrl(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Textarea placeholder="Tips, modifications..." value={exNotes} onChange={(e) => setExNotes(e.target.value)} rows={2} />
            </div>
            <Button onClick={handleSaveExercise} disabled={isPending} className="w-full">
              {isPending ? 'Saving...' : 'Save Exercise'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== LOG EXERCISE MODAL ==================== */}
      <Dialog open={showLogModal} onOpenChange={setShowLogModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>Log Exercise</DialogTitle>
            <DialogDescription>Track what you did and how it felt</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <label className="text-sm font-medium mb-1 block">Exercise</label>
              <select value={logExerciseId || ''} onChange={(e) => setLogExerciseId(e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm">
                <option value="">Custom / not in library</option>
                {exercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>{ex.name} ({CATEGORY_CONFIG[ex.category as ExCategory]?.label})</option>
                ))}
              </select>
            </div>
            {!logExerciseId && (
              <div>
                <label className="text-sm font-medium mb-1 block">Custom Name</label>
                <Input placeholder="What did you do?" value={logCustomName} onChange={(e) => setLogCustomName(e.target.value)} />
              </div>
            )}
            {logExerciseId && logs.some((l) => l.exerciseId === logExerciseId) && (
              <p className="text-xs text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Pre-filled from your last session — adjust as needed
              </p>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Duration (sec)</label>
                <Input type="number" placeholder="120" value={logDuration} onChange={(e) => setLogDuration(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Sets</label>
                <Input type="number" placeholder="3" value={logSets} onChange={(e) => setLogSets(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Reps</label>
                <Input type="number" placeholder="10" value={logReps} onChange={(e) => setLogReps(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Pain Before (1-10)</label>
                <div className="flex gap-1">
                  {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                    <button key={n} type="button" onClick={() => setLogPainBefore(n)}
                      className={cn('w-7 h-7 rounded text-[10px] font-bold border transition-colors',
                        logPainBefore === n ? painBgColor(n) + ' text-white border-transparent' : 'border-neutral-200 dark:border-neutral-700 text-neutral-500')}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Pain After (1-10)</label>
                <div className="flex gap-1">
                  {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                    <button key={n} type="button" onClick={() => setLogPainAfter(n)}
                      className={cn('w-7 h-7 rounded text-[10px] font-bold border transition-colors',
                        logPainAfter === n ? painBgColor(n) + ' text-white border-transparent' : 'border-neutral-200 dark:border-neutral-700 text-neutral-500')}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Felt Good?</label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setLogFeltGood(true)}
                  className={cn('flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                    logFeltGood ? 'border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'
                      : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400')}>
                  👍 Yes
                </button>
                <button type="button" onClick={() => setLogFeltGood(false)}
                  className={cn('flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                    !logFeltGood ? 'border-neutral-500 bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                      : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400')}>
                  👎 Not really
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Textarea placeholder="How it felt, modifications made..." value={logNotes} onChange={(e) => setLogNotes(e.target.value)} rows={2} />
            </div>
            <Button onClick={handleSaveLog} disabled={isPending} className="w-full">
              {isPending ? 'Saving...' : 'Log It'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== PAIN LOG MODAL ==================== */}
      <Dialog open={showPainModal} onOpenChange={setShowPainModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>Log Pain</DialogTitle>
            <DialogDescription>Track pain to find patterns and measure progress</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Area <span className="text-neutral-400 font-normal text-xs">(select all that apply)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(PAIN_AREA_LABELS) as [PainArea, string][]).map(([key, label]) => {
                  const selected = pAreas.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPAreas(prev => selected ? prev.filter(a => a !== key) : [...prev, key])}
                      className={cn(
                        'px-3 py-2 rounded-lg text-sm font-medium border transition-colors text-left',
                        selected
                          ? 'border-red-500 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'
                          : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800',
                      )}
                    >
                      {selected && <span className="mr-1">✓</span>}{label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Severity (1-10)</label>
              <div className="flex gap-1">
                {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                  <button key={n} type="button" onClick={() => setPSeverity(n)}
                    className={cn('flex-1 py-2.5 rounded-lg text-sm font-bold border transition-colors',
                      pSeverity === n ? painBgColor(n) + ' text-white border-transparent'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-500')}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Type <span className="text-neutral-400 font-normal text-xs">(select all that apply)</span>
              </label>
              <div className="flex gap-2 flex-wrap">
                {(Object.entries(PAIN_TYPE_LABELS) as [PainType, string][]).map(([key, label]) => {
                  const selected = pTypes.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPTypes(prev => selected ? prev.filter(t => t !== key) : [...prev, key])}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                        selected
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                          : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800',
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Trigger</label>
              <Input placeholder="Sitting too long, slept wrong, after workout..." value={pTrigger} onChange={(e) => setPTrigger(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">What Helped</label>
              <Input placeholder="Stretching, heat pad, ibuprofen..." value={pRelief} onChange={(e) => setPRelief(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Textarea placeholder="Any other details..." value={pNotes} onChange={(e) => setPNotes(e.target.value)} rows={2} />
            </div>
            <Button onClick={handleSavePain} disabled={isPending} className="w-full">
              {isPending ? 'Saving...' : 'Log Pain'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== ADD RECORD MODAL ==================== */}
      <Dialog open={showRecordModal} onOpenChange={setShowRecordModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>Add Medical Record</DialogTitle>
            <DialogDescription>Upload MRI, X-ray, reports, and other documents</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <label className="text-sm font-medium mb-1 block">Title *</label>
              <Input placeholder="Cervical MRI, Lumbar X-Ray..." value={recTitle} onChange={(e) => setRecTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Type</label>
              <div className="flex gap-2 flex-wrap">
                {(Object.entries(RECORD_TYPE_LABELS) as [RecordType, typeof RECORD_TYPE_LABELS[RecordType]][]).map(([key, cfg]) => (
                  <button key={key} type="button" onClick={() => setRecType(key)}
                    className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                      recType === key ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400')}>
                    {cfg.icon} {cfg.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Date</label>
                <Input type="date" value={recDate} onChange={(e) => setRecDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Provider</label>
                <Input placeholder="Dr. Smith, Imaging Center..." value={recProvider} onChange={(e) => setRecProvider(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Findings / Summary</label>
              <Textarea placeholder="What the report said..." value={recFindings} onChange={(e) => setRecFindings(e.target.value)} rows={4} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Upload File</label>
              <FileUpload label={recFileName || 'Choose file (image or PDF, max 5MB)'}
                onSelect={(url, name) => { setRecFile(url); setRecFileName(name); }} />
              {recFileName && <p className="text-xs text-green-500 mt-1">📎 {recFileName}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Textarea placeholder="Additional context..." value={recNotes} onChange={(e) => setRecNotes(e.target.value)} rows={2} />
            </div>
            <Button onClick={handleSaveRecord} disabled={isPending} className="w-full">
              {isPending ? 'Saving...' : 'Save Record'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
