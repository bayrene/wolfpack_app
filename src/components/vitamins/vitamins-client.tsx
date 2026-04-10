'use client';

import React, { useState, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Pill,
  Plus,
  Minus,
  Clock,
  AlertTriangle,
  Check,
  Trash2,
  Star,
  Sun,
  Moon as MoonIcon,
  Coffee,
  Utensils,
  Dumbbell,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldAlert,
  Pencil,
  FlaskConical,
} from 'lucide-react';
import { logSupplement, updateSupplementLog, deleteSupplementLog, createSupplement, updateSupplement } from '@/db/queries/supplements';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Supplement } from '@/db/schema';

interface ContentItem {
  name: string;
  amount?: string;
  detail?: string;
}

interface LogEntry {
  id: number;
  supplementId: number;
  date: string;
  time: string;
  dose: number;
  person: string;
  situation: string;
  sideEffects: string | null;
  effectivenessRating: number | null;
  notes: string | null;
  supplementName: string;
  supplementBrand: string;
  doseUnit: string;
}

interface Props {
  supplements: Supplement[];
  todayLogs: LogEntry[];
  recentLogs: LogEntry[];
  today: string;
  embedded?: boolean;
}

const SITUATION_OPTIONS = [
  { value: 'empty_stomach', label: 'Empty stomach', icon: Coffee },
  { value: 'with_food', label: 'With food/snack', icon: Utensils },
  { value: 'with_meal', label: 'With full meal', icon: Utensils },
  { value: 'before_bed', label: 'Before bed', icon: MoonIcon },
  { value: 'post_workout', label: 'Post-workout', icon: Dumbbell },
  { value: 'other', label: 'Other', icon: HelpCircle },
];

const SITUATION_LABELS: Record<string, string> = {
  empty_stomach: 'Empty stomach',
  with_food: 'With food',
  with_meal: 'With meal',
  before_bed: 'Before bed',
  post_workout: 'Post-workout',
  other: 'Other',
};

function parseContents(raw: string | null): ContentItem[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ContentItem[];
  } catch {
    return [];
  }
}

function EffectivenessRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" onClick={() => onChange(star)} className="p-0.5">
          <Star
            className={`w-5 h-5 transition-colors ${
              star <= value
                ? 'fill-amber-400 text-amber-400'
                : 'text-neutral-300 dark:text-neutral-600 hover:text-amber-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function DoseAdjuster({ value, onChange, unit }: { value: number; onChange: (v: number) => void; unit: string }) {
  // Whole units only for capsules, tablets, softgels, gummies — you can't split them
  const wholeOnly = /capsule|tablet|softgel|gummy|gummies/i.test(unit);
  const step = wholeOnly ? 1 : 0.5;
  const minVal = wholeOnly ? 1 : 0.5;
  return (
    <div className="flex items-center gap-2">
      <Button
        size="icon"
        variant="outline"
        className="h-10 w-10 rounded-lg"
        onClick={() => onChange(Math.max(minVal, value - step))}
      >
        <Minus className="w-4 h-4" />
      </Button>
      <div className="text-center min-w-[80px]">
        <span className="text-xl font-bold">{wholeOnly ? Math.round(value) : value}</span>
        <span className="text-xs text-neutral-500 ml-1">{unit}</span>
      </div>
      <Button
        size="icon"
        variant="outline"
        className="h-10 w-10 rounded-lg"
        onClick={() => onChange(value + step)}
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
}

function ContentsSection({ contents, supplementId, expandedContents, toggleExpanded }: {
  contents: ContentItem[];
  supplementId: number;
  expandedContents: Set<number>;
  toggleExpanded: (id: number) => void;
}) {
  if (contents.length === 0) return null;
  const isExpanded = expandedContents.has(supplementId);
  const itemCount = contents.length;
  // For probiotic-style items (no amounts, just detail), use "strains" language
  const hasAmounts = contents.some((c) => c.amount);
  const countLabel = hasAmounts ? `${itemCount} ingredients` : `${itemCount} components`;

  return (
    <div className="mt-2">
      <button
        onClick={() => toggleExpanded(supplementId)}
        className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
      >
        <FlaskConical className="w-3.5 h-3.5" />
        <span>What&apos;s inside</span>
        <span className="text-neutral-400 dark:text-neutral-500">({countLabel})</span>
        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {isExpanded && (
        <div className="mt-2 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
          {contents.map((item, i) => (
            <div
              key={`${item.name}-${i}`}
              className={cn(
                'px-3 py-2 text-xs',
                i % 2 === 0
                  ? 'bg-neutral-50 dark:bg-neutral-800/50'
                  : 'bg-white dark:bg-neutral-900/30',
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-neutral-700 dark:text-neutral-300">{item.name}</span>
                {item.amount && (
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100 whitespace-nowrap">{item.amount}</span>
                )}
              </div>
              {item.detail && (
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 leading-relaxed">{item.detail}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function parseContentsFromText(text: string): string {
  const lines = text.split('\n').filter((l) => l.trim());
  const items: ContentItem[] = lines.map((line) => {
    const parts = line.split(' - ');
    if (parts.length >= 2) {
      return { name: parts[0].trim(), amount: parts.slice(1).join(' - ').trim() };
    }
    return { name: line.trim() };
  });
  return JSON.stringify(items);
}

export function VitaminsClient({ supplements, todayLogs, recentLogs, today, embedded }: Props) {
  const [isPending, startTransition] = useTransition();
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [addSupplementOpen, setAddSupplementOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LogEntry | null>(null);
  const [expandedContents, setExpandedContents] = useState<Set<number>>(new Set());

  // Log form state
  const [selectedSupplement, setSelectedSupplement] = useState<Supplement | null>(null);
  const [dose, setDose] = useState(2);
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  });
  const [situation, setSituation] = useState('with_meal');
  const [sideEffects, setSideEffects] = useState('');
  const [effectiveness, setEffectiveness] = useState(4);
  const [logNotes, setLogNotes] = useState('');

  // Edit form state
  const [editDose, setEditDose] = useState(0);
  const [editTime, setEditTime] = useState('');
  const [editSituation, setEditSituation] = useState('with_meal');
  const [editSideEffects, setEditSideEffects] = useState('');
  const [editEffectiveness, setEditEffectiveness] = useState(4);
  const [editNotes, setEditNotes] = useState('');

  // Add supplement form state
  const [newName, setNewName] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newForm, setNewForm] = useState('capsule');
  const [newDefaultDose, setNewDefaultDose] = useState('2');
  const [newDoseUnit, setNewDoseUnit] = useState('capsules');
  const [newBestTime, setNewBestTime] = useState('');
  const [newWarnings, setNewWarnings] = useState('');
  const [newContents, setNewContents] = useState('');
  // Nutrition per dose fields (shared between add + edit)
  const [newCalories, setNewCalories] = useState('');
  const [newProtein, setNewProtein] = useState('');
  const [newCarbs, setNewCarbs] = useState('');
  const [newFat, setNewFat] = useState('');
  const [newVitA, setNewVitA] = useState('');
  const [newVitC, setNewVitC] = useState('');
  const [newVitD, setNewVitD] = useState('');
  const [newVitB12, setNewVitB12] = useState('');
  const [newIron, setNewIron] = useState('');
  const [newZinc, setNewZinc] = useState('');
  const [newCalcium, setNewCalcium] = useState('');
  const [newMagnesium, setNewMagnesium] = useState('');
  const [newPotassium, setNewPotassium] = useState('');

  // Edit supplement modal state
  const [editSupplementOpen, setEditSupplementOpen] = useState(false);
  const [editingSupplementId, setEditingSupplementId] = useState<number | null>(null);

  // Check which supplements are already logged today
  const loggedToday = new Set(todayLogs.map((l) => l.supplementId));

  const toggleExpanded = (id: number) => {
    setExpandedContents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const openLogModal = (supp: Supplement) => {
    setSelectedSupplement(supp);
    setDose(supp.defaultDose);
    setTime(() => {
      const now = new Date();
      return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    });
    setSituation('with_meal');
    setSideEffects('');
    setEffectiveness(4);
    setLogNotes('');
    setLogModalOpen(true);
  };

  const handleLog = () => {
    if (!selectedSupplement) return;
    startTransition(async () => {
      await logSupplement({
        supplementId: selectedSupplement.id,
        date: today,
        time,
        dose,
        person: 'me',
        situation: situation as 'empty_stomach' | 'with_food' | 'with_meal' | 'before_bed' | 'post_workout' | 'other',
        sideEffects: sideEffects || undefined,
        effectivenessRating: effectiveness,
        notes: logNotes || undefined,
      });
      toast.success(`${selectedSupplement.name} logged!`);
      setLogModalOpen(false);
    });
  };

  const handleDelete = (id: number) => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) startTransition(async () => { await deleteSupplementLog(id); });
    }, 5000);
    toast('Log entry removed', {
      duration: 5000,
      action: { label: 'Undo', onClick: () => { cancelled = true; clearTimeout(timer); } },
    });
  };

  const openEditModal = (entry: LogEntry) => {
    setEditingEntry(entry);
    setEditDose(entry.dose);
    setEditTime(entry.time);
    setEditSituation(entry.situation);
    setEditSideEffects(entry.sideEffects || '');
    setEditEffectiveness(entry.effectivenessRating || 4);
    setEditNotes(entry.notes || '');
    setEditModalOpen(true);
  };

  const handleEdit = () => {
    if (!editingEntry) return;
    startTransition(async () => {
      await updateSupplementLog(editingEntry.id, {
        dose: editDose,
        time: editTime,
        situation: editSituation as 'empty_stomach' | 'with_food' | 'with_meal' | 'before_bed' | 'post_workout' | 'other',
        sideEffects: editSideEffects || null,
        effectivenessRating: editEffectiveness,
        notes: editNotes || null,
      });
      toast.success(`${editingEntry.supplementName} log updated!`);
      setEditModalOpen(false);
      setEditingEntry(null);
    });
  };

  const buildNutritionJson = () => {
    const n: Record<string, number> = {};
    if (newCalories) n.calories = parseFloat(newCalories);
    if (newProtein) n.protein = parseFloat(newProtein);
    if (newCarbs) n.carbs = parseFloat(newCarbs);
    if (newFat) n.fat = parseFloat(newFat);
    if (newVitA) n.vitaminA = parseFloat(newVitA);
    if (newVitC) n.vitaminC = parseFloat(newVitC);
    if (newVitD) n.vitaminD = parseFloat(newVitD);
    if (newVitB12) n.vitaminB12 = parseFloat(newVitB12);
    if (newIron) n.iron = parseFloat(newIron);
    if (newZinc) n.zinc = parseFloat(newZinc);
    if (newCalcium) n.calcium = parseFloat(newCalcium);
    if (newMagnesium) n.magnesium = parseFloat(newMagnesium);
    if (newPotassium) n.potassium = parseFloat(newPotassium);
    return Object.keys(n).length > 0 ? JSON.stringify(n) : undefined;
  };

  const resetNutritionFields = () => {
    setNewCalories(''); setNewProtein(''); setNewCarbs(''); setNewFat('');
    setNewVitA(''); setNewVitC(''); setNewVitD(''); setNewVitB12('');
    setNewIron(''); setNewZinc(''); setNewCalcium(''); setNewMagnesium(''); setNewPotassium('');
  };

  const loadNutritionFromJson = (json: string | null | undefined) => {
    if (!json) { resetNutritionFields(); return; }
    try {
      const n = JSON.parse(json);
      setNewCalories(n.calories != null ? String(n.calories) : '');
      setNewProtein(n.protein != null ? String(n.protein) : '');
      setNewCarbs(n.carbs != null ? String(n.carbs) : '');
      setNewFat(n.fat != null ? String(n.fat) : '');
      setNewVitA(n.vitaminA != null ? String(n.vitaminA) : '');
      setNewVitC(n.vitaminC != null ? String(n.vitaminC) : '');
      setNewVitD(n.vitaminD != null ? String(n.vitaminD) : '');
      setNewVitB12(n.vitaminB12 != null ? String(n.vitaminB12) : '');
      setNewIron(n.iron != null ? String(n.iron) : '');
      setNewZinc(n.zinc != null ? String(n.zinc) : '');
      setNewCalcium(n.calcium != null ? String(n.calcium) : '');
      setNewMagnesium(n.magnesium != null ? String(n.magnesium) : '');
      setNewPotassium(n.potassium != null ? String(n.potassium) : '');
    } catch { resetNutritionFields(); }
  };

  const handleAddSupplement = () => {
    if (!newName || !newBrand) return;
    startTransition(async () => {
      await createSupplement({
        name: newName,
        brand: newBrand,
        description: newDescription || undefined,
        form: newForm as 'capsule' | 'powder' | 'tablet' | 'liquid' | 'softgel' | 'gummy',
        defaultDose: parseFloat(newDefaultDose),
        doseUnit: newDoseUnit,
        bestTimeToTake: newBestTime || undefined,
        warnings: newWarnings || undefined,
        contents: newContents ? parseContentsFromText(newContents) : undefined,
        nutritionPerDose: buildNutritionJson(),
      });
      toast.success(`${newName} added!`);
      setAddSupplementOpen(false);
      setNewName(''); setNewBrand(''); setNewDescription(''); setNewContents('');
      setNewForm('capsule'); setNewDefaultDose('2'); setNewDoseUnit('capsules');
      setNewBestTime(''); setNewWarnings('');
      resetNutritionFields();
    });
  };

  const openEditSupplement = (supp: Supplement) => {
    setEditingSupplementId(supp.id);
    setNewName(supp.name);
    setNewBrand(supp.brand);
    setNewDescription(supp.description ?? '');
    setNewForm(supp.form);
    setNewDefaultDose(String(supp.defaultDose));
    setNewDoseUnit(supp.doseUnit);
    setNewBestTime(supp.bestTimeToTake ?? '');
    setNewWarnings(supp.warnings ?? '');
    // Re-stringify contents back to text for editing
    try {
      const parsed: ContentItem[] = supp.contents ? JSON.parse(supp.contents) : [];
      setNewContents(parsed.map((c) => `${c.name}${c.amount ? ' - ' + c.amount : ''}`).join('\n'));
    } catch { setNewContents(''); }
    loadNutritionFromJson(supp.nutritionPerDose);
    setEditSupplementOpen(true);
  };

  const handleSaveSupplement = () => {
    if (!editingSupplementId || !newName || !newBrand) return;
    startTransition(async () => {
      await updateSupplement(editingSupplementId, {
        name: newName,
        brand: newBrand,
        description: newDescription || undefined,
        form: newForm as 'capsule' | 'powder' | 'tablet' | 'liquid' | 'softgel' | 'gummy',
        defaultDose: parseFloat(newDefaultDose),
        doseUnit: newDoseUnit,
        bestTimeToTake: newBestTime || undefined,
        warnings: newWarnings || undefined,
        contents: newContents ? parseContentsFromText(newContents) : undefined,
        nutritionPerDose: buildNutritionJson(),
      });
      toast.success(`${newName} updated!`);
      setEditSupplementOpen(false);
      setEditingSupplementId(null);
      resetNutritionFields();
    });
  };

  // Side effects from recent logs
  const recentSideEffects = recentLogs.filter((l) => l.sideEffects);

  // Compute today's supplement nutrition totals
  const suppNutritionToday = React.useMemo(() => {
    const totals: Record<string, number> = {};
    const suppMap = new Map(supplements.map((s) => [s.id, s]));
    for (const log of todayLogs) {
      const supp = suppMap.get(log.supplementId);
      if (!supp?.nutritionPerDose) continue;
      try {
        const n = JSON.parse(supp.nutritionPerDose) as Record<string, number>;
        for (const [key, val] of Object.entries(n)) {
          totals[key] = (totals[key] ?? 0) + val * log.dose;
        }
      } catch { /* skip */ }
    }
    return totals;
  }, [supplements, todayLogs]);

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
              Vitamins & Supplements
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
              Track your daily stack
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setAddSupplementOpen(true)}>
            <Plus className="w-4 h-4" /> Add Supplement
          </Button>
        </div>
      )}

      {/* Today's stack — Compact grid */}
      <div>
        <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">
          Today&apos;s Stack
        </h2>
        {supplements.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {supplements.map((supp) => {
              const taken = loggedToday.has(supp.id);
              const todayEntry = todayLogs.find((l) => l.supplementId === supp.id);

              return (
                <Card
                  key={supp.id}
                  className={cn(
                    'transition-all duration-150 relative overflow-hidden',
                    taken ? 'border-[#3A8A5C]/50 bg-[#3A8A5C]/5' : 'hover:border-neutral-300 dark:hover:border-neutral-600',
                  )}
                >
                  <CardContent className="p-3 flex flex-col h-full">
                    {/* Top: brand + type + name + form */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 truncate">
                          {supp.brand}
                        </p>
                      </div>
                      <h3
                        className="font-bold text-[13px] leading-tight mt-0.5 cursor-pointer hover:text-[#E07A3A] transition-colors"
                        style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
                        title={supp.name}
                        onClick={() => openLogModal(supp)}
                      >
                        {supp.name}
                      </h3>
                      {supp.description && (
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                          {supp.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="secondary" className="text-[9px] capitalize px-1.5 py-0">
                          {supp.form}
                        </Badge>
                        <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                          {supp.defaultDose} {supp.doseUnit}
                        </span>
                      </div>
                      {supp.bestTimeToTake && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-1.5 flex items-center gap-1">
                          <Clock className="w-3 h-3 flex-shrink-0" /> {supp.bestTimeToTake}
                        </p>
                      )}
                      {/* Expandable contents/benefits */}
                      {(() => {
                        const contents = parseContents(supp.contents);
                        const benefits: string[] = supp.benefits ? (() => { try { return JSON.parse(supp.benefits); } catch { return []; } })() : [];
                        if (contents.length === 0 && benefits.length === 0) return null;
                        const isExpanded = expandedContents.has(supp.id);
                        return (
                          <div className="mt-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleExpanded(supp.id); }}
                              className="flex items-center gap-1 text-[10px] font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                            >
                              <FlaskConical className="w-3 h-3" />
                              <span>What&apos;s inside</span>
                              <span className="text-neutral-400 dark:text-neutral-500">
                                ({contents.length > 0 ? `${contents.length} items` : `${benefits.length} benefits`})
                              </span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                            {isExpanded && (
                              <div className="mt-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 overflow-hidden max-h-[200px] overflow-y-auto">
                                {contents.length > 0 ? contents.map((item, i) => (
                                  <div
                                    key={`${item.name}-${i}`}
                                    className={cn(
                                      'px-2 py-1.5 text-[10px]',
                                      i % 2 === 0
                                        ? 'bg-neutral-50 dark:bg-neutral-800/50'
                                        : 'bg-white dark:bg-neutral-900/30',
                                    )}
                                  >
                                    <div className="flex items-baseline justify-between gap-1">
                                      <span className="font-medium text-neutral-700 dark:text-neutral-300">{item.name}</span>
                                      {item.amount && (
                                        <span className="font-semibold text-neutral-900 dark:text-neutral-100 whitespace-nowrap text-[9px]">{item.amount}</span>
                                      )}
                                    </div>
                                    {item.detail && (
                                      <p className="text-[9px] text-neutral-400 dark:text-neutral-500 mt-0.5 leading-relaxed">{item.detail}</p>
                                    )}
                                  </div>
                                )) : benefits.map((b: string, i: number) => (
                                  <div
                                    key={i}
                                    className={cn(
                                      'px-2 py-1.5 text-[10px] flex items-center gap-1.5',
                                      i % 2 === 0
                                        ? 'bg-neutral-50 dark:bg-neutral-800/50'
                                        : 'bg-white dark:bg-neutral-900/30',
                                    )}
                                  >
                                    <Sparkles className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                                    <span className="text-neutral-700 dark:text-neutral-300">{b}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Bottom: status + take button */}
                    <div className="mt-auto pt-2 border-t border-neutral-100 dark:border-neutral-800">
                      {taken && todayEntry ? (
                        <p className="text-[10px] text-[#3A8A5C] font-medium flex items-center gap-1 mb-1.5">
                          <Check className="w-3 h-3" /> Taken at {todayEntry.time}
                        </p>
                      ) : (
                        <div className="mb-1.5" />
                      )}
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant={taken ? 'outline' : 'default'}
                          className={cn(
                            'flex-1 text-xs h-8',
                            taken ? 'border-[#3A8A5C] text-[#3A8A5C]' : '',
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            openLogModal(supp);
                          }}
                        >
                          {taken ? (
                            <>
                              <Check className="w-3 h-3" /> Log again
                            </>
                          ) : (
                            <>
                              <Pill className="w-3 h-3" /> Take
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-neutral-400 hover:text-[#E07A3A]"
                          title="Edit supplement"
                          onClick={(e) => { e.stopPropagation(); openEditSupplement(supp); }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>

                  {/* Green border accent when taken */}
                  {taken && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#3A8A5C]" />
                  )}
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <Pill className="w-10 h-10 mx-auto text-neutral-300 mb-2" />
              <p className="text-neutral-500">No supplements added yet</p>
              <Button variant="outline" className="mt-3" onClick={() => setAddSupplementOpen(true)}>
                <Plus className="w-4 h-4" /> Add your first supplement
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Today's supplement nutrition totals */}
      {Object.keys(suppNutritionToday).length > 0 && (
        <Card className="border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-900/10">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
              <FlaskConical className="w-4 h-4" />
              Today&apos;s Supplement Nutrition
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {[
                { key: 'calories', label: 'Calories', unit: '' },
                { key: 'protein', label: 'Protein', unit: 'g' },
                { key: 'carbs', label: 'Carbs', unit: 'g' },
                { key: 'fat', label: 'Fat', unit: 'g' },
                { key: 'vitaminA', label: 'Vit A', unit: 'mcg' },
                { key: 'vitaminC', label: 'Vit C', unit: 'mg' },
                { key: 'vitaminD', label: 'Vit D', unit: 'mcg' },
                { key: 'vitaminB12', label: 'B12', unit: 'mcg' },
                { key: 'iron', label: 'Iron', unit: 'mg' },
                { key: 'zinc', label: 'Zinc', unit: 'mg' },
                { key: 'calcium', label: 'Calcium', unit: 'mg' },
                { key: 'magnesium', label: 'Magnesium', unit: 'mg' },
                { key: 'potassium', label: 'Potassium', unit: 'mg' },
              ]
                .filter(({ key }) => suppNutritionToday[key] != null && suppNutritionToday[key] > 0)
                .map(({ key, label, unit }) => (
                  <div key={key} className="text-center">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
                    <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                      {suppNutritionToday[key] % 1 === 0
                        ? suppNutritionToday[key]
                        : suppNutritionToday[key].toFixed(1)}
                      <span className="text-[10px] font-normal ml-0.5">{unit}</span>
                    </p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Side effects tracker */}
      {recentSideEffects.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <ShieldAlert className="w-4 h-4" />
              Recent Side Effects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentSideEffects.slice(0, 5).map((entry) => (
                <div key={entry.id} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p>
                      <span className="font-medium">{entry.supplementName}</span>
                      {' — '}
                      <span className="text-amber-700 dark:text-amber-400">{entry.sideEffects}</span>
                    </p>
                    <p className="text-xs text-neutral-500">
                      {formatDate(entry.date)} at {entry.time} • {SITUATION_LABELS[entry.situation]}
                      {entry.notes && ` • ${entry.notes}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 7-day history */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent History</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedHistory(!expandedHistory)}
            >
              {expandedHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {expandedHistory ? 'Less' : 'Show all'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(expandedHistory ? recentLogs : recentLogs.slice(0, 8)).map((entry) => (
              <div
                key={entry.id}
                className="flex items-start justify-between py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{entry.supplementName}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {entry.dose} {entry.doseUnit}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
                    <span>{formatDate(entry.date)}</span>
                    <span>•</span>
                    <span>{entry.time}</span>
                    <span>•</span>
                    <span>{SITUATION_LABELS[entry.situation]}</span>
                  </div>
                  {entry.sideEffects && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {entry.sideEffects}
                    </p>
                  )}
                  {entry.notes && (
                    <p className="text-xs text-neutral-400 italic mt-0.5">{entry.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {entry.effectivenessRating && (
                    <div className="flex gap-0.5 mr-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-2.5 h-2.5 ${s <= entry.effectivenessRating! ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'}`}
                        />
                      ))}
                    </div>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-neutral-400 hover:text-[#E07A3A]"
                    onClick={() => openEditModal(entry)}
                    title="Edit log entry"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-neutral-400 hover:text-red-500"
                    onClick={() => handleDelete(entry.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {recentLogs.length === 0 && (
              <p className="text-sm text-neutral-500 text-center py-4">No logs yet — start tracking above!</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ==================== LOG SUPPLEMENT MODAL ==================== */}
      <Dialog open={logModalOpen} onOpenChange={setLogModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-[#E07A3A]" />
              Log {selectedSupplement?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedSupplement?.brand} • {selectedSupplement?.form}
            </DialogDescription>
          </DialogHeader>

          {selectedSupplement && (
            <div className="space-y-5">
              {/* What's inside — collapsible */}
              <ContentsSection
                contents={parseContents(selectedSupplement.contents ?? null)}
                supplementId={selectedSupplement.id}
                expandedContents={expandedContents}
                toggleExpanded={toggleExpanded}
              />

              {/* Dose adjuster */}
              <div>
                <label className="text-sm font-medium mb-2 block">Dose</label>
                <DoseAdjuster
                  value={dose}
                  onChange={setDose}
                  unit={selectedSupplement.doseUnit}
                />
                {selectedSupplement.servingInfo && (
                  <p className="text-[11px] text-neutral-400 mt-1">{selectedSupplement.servingInfo}</p>
                )}
              </div>

              {/* Time picker */}
              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Time taken
                </label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="text-lg h-12 font-mono"
                />
              </div>

              {/* Situation selector */}
              <div>
                <label className="text-sm font-medium mb-2 block">Situation</label>
                <div className="grid grid-cols-3 gap-2">
                  {SITUATION_OPTIONS.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setSituation(value)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs font-medium transition-colors ${
                        situation === value
                          ? 'border-[#E07A3A] bg-[#E07A3A]/5 text-[#E07A3A]'
                          : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Warning callout if relevant */}
              {selectedSupplement.warnings && situation === 'empty_stomach' && (
                <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Heads up: {selectedSupplement.warnings.split('.')[0]}.
                  </p>
                </div>
              )}

              {/* Side effects */}
              <div>
                <label className="text-sm font-medium mb-1 block flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Side effects
                  <span className="text-neutral-400 font-normal">(if any)</span>
                </label>
                <Textarea
                  value={sideEffects}
                  onChange={(e) => setSideEffects(e.target.value)}
                  placeholder="e.g., upset stomach, headache, nausea..."
                  className="min-h-[60px]"
                />
              </div>

              {/* How you feel */}
              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> How do you feel?
                </label>
                <EffectivenessRating value={effectiveness} onChange={setEffectiveness} />
                <p className="text-[10px] text-neutral-400 mt-1">
                  {effectiveness === 1 && 'Terrible — bad reaction'}
                  {effectiveness === 2 && 'Not great — some issues'}
                  {effectiveness === 3 && 'Neutral — no change'}
                  {effectiveness === 4 && 'Good — feel fine'}
                  {effectiveness === 5 && 'Great — noticeable benefit'}
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium mb-1 block">Notes</label>
                <Textarea
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  placeholder="Any additional context..."
                  className="min-h-[50px]"
                />
              </div>

              <Button onClick={handleLog} disabled={isPending} className="w-full" size="lg">
                {isPending ? 'Logging...' : `Log ${selectedSupplement.name}`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== EDIT LOG MODAL ==================== */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-[#E07A3A]" />
              Edit Log — {editingEntry?.supplementName}
            </DialogTitle>
            <DialogDescription>
              {editingEntry?.supplementBrand} • {formatDate(editingEntry?.date || '')} at {editingEntry?.time}
            </DialogDescription>
          </DialogHeader>

          {editingEntry && (
            <div className="space-y-5">
              {/* Dose adjuster */}
              <div>
                <label className="text-sm font-medium mb-2 block">Dose</label>
                <DoseAdjuster
                  value={editDose}
                  onChange={setEditDose}
                  unit={editingEntry.doseUnit}
                />
              </div>

              {/* Time picker */}
              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Time taken
                </label>
                <Input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="text-lg h-12 font-mono"
                />
              </div>

              {/* Situation selector */}
              <div>
                <label className="text-sm font-medium mb-2 block">Situation</label>
                <div className="grid grid-cols-3 gap-2">
                  {SITUATION_OPTIONS.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setEditSituation(value)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs font-medium transition-colors ${
                        editSituation === value
                          ? 'border-[#E07A3A] bg-[#E07A3A]/5 text-[#E07A3A]'
                          : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Side effects — highlighted since this is the main reason to edit */}
              <div className="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/50 rounded-lg p-3">
                <label className="text-sm font-medium mb-1 block flex items-center gap-1 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5" /> Side effects
                  <span className="text-amber-500/70 font-normal text-xs">(update anytime)</span>
                </label>
                <Textarea
                  value={editSideEffects}
                  onChange={(e) => setEditSideEffects(e.target.value)}
                  placeholder="e.g., upset stomach, headache, bloating..."
                  className="min-h-[70px] bg-white dark:bg-neutral-900"
                />
              </div>

              {/* Effectiveness */}
              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> How do you feel now?
                </label>
                <EffectivenessRating value={editEffectiveness} onChange={setEditEffectiveness} />
                <p className="text-[10px] text-neutral-400 mt-1">
                  {editEffectiveness === 1 && 'Terrible — bad reaction'}
                  {editEffectiveness === 2 && 'Not great — some issues'}
                  {editEffectiveness === 3 && 'Neutral — no change'}
                  {editEffectiveness === 4 && 'Good — feel fine'}
                  {editEffectiveness === 5 && 'Great — noticeable benefit'}
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium mb-1 block">Notes</label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Any additional context..."
                  className="min-h-[50px]"
                />
              </div>

              <Button onClick={handleEdit} disabled={isPending} className="w-full" size="lg">
                {isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== ADD SUPPLEMENT MODAL ==================== */}
      <Dialog open={addSupplementOpen} onOpenChange={setAddSupplementOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Supplement</DialogTitle>
            <DialogDescription>Add a new vitamin or supplement to your stack</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Name *</label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., Vitamin D3" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Brand *</label>
              <Input value={newBrand} onChange={(e) => setNewBrand(e.target.value)} placeholder="e.g., Nature Made" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="e.g., Probiotic + Prebiotic Supplement"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Form</label>
                <Select
                  value={newForm}
                  onChange={(e) => setNewForm(e.target.value)}
                  options={[
                    { value: 'capsule', label: 'Capsule' },
                    { value: 'powder', label: 'Powder' },
                    { value: 'tablet', label: 'Tablet' },
                    { value: 'liquid', label: 'Liquid' },
                    { value: 'softgel', label: 'Softgel' },
                    { value: 'gummy', label: 'Gummy' },
                  ]}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Default dose</label>
                <Input type="number" value={newDefaultDose} onChange={(e) => setNewDefaultDose(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Dose unit</label>
                <Input value={newDoseUnit} onChange={(e) => setNewDoseUnit(e.target.value)} placeholder="capsules" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Best time to take</label>
              <Input value={newBestTime} onChange={(e) => setNewBestTime(e.target.value)} placeholder="e.g., Morning with food" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Contents / Ingredients</label>
              <Textarea
                value={newContents}
                onChange={(e) => setNewContents(e.target.value)}
                placeholder={"Paste ingredient list, one per line...\ne.g., Vitamin D3 - 50 mcg\nZinc - 15 mg"}
                className="min-h-[80px]"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                Use &quot;Name - Amount&quot; format, one ingredient per line
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Warnings / Notes</label>
              <Textarea value={newWarnings} onChange={(e) => setNewWarnings(e.target.value)} placeholder="Any warnings or important notes..." />
            </div>
            {/* Nutrition per dose */}
            <div>
              <p className="text-sm font-medium mb-2">Nutrition per dose <span className="text-neutral-400 font-normal text-xs">(optional — used for dashboard tracking)</span></p>
              <div className="grid grid-cols-4 gap-2">
                <div><label className="text-[10px] text-neutral-500 mb-0.5 block">Calories</label><Input type="number" value={newCalories} onChange={(e) => setNewCalories(e.target.value)} placeholder="0" className="h-8 text-xs" /></div>
                <div><label className="text-[10px] text-neutral-500 mb-0.5 block">Protein (g)</label><Input type="number" value={newProtein} onChange={(e) => setNewProtein(e.target.value)} placeholder="0" className="h-8 text-xs" /></div>
                <div><label className="text-[10px] text-neutral-500 mb-0.5 block">Carbs (g)</label><Input type="number" value={newCarbs} onChange={(e) => setNewCarbs(e.target.value)} placeholder="0" className="h-8 text-xs" /></div>
                <div><label className="text-[10px] text-neutral-500 mb-0.5 block">Fat (g)</label><Input type="number" value={newFat} onChange={(e) => setNewFat(e.target.value)} placeholder="0" className="h-8 text-xs" /></div>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-2">
                <div><label className="text-[10px] text-neutral-500 mb-0.5 block">Vit A (mcg)</label><Input type="number" value={newVitA} onChange={(e) => setNewVitA(e.target.value)} placeholder="0" className="h-8 text-xs" /></div>
                <div><label className="text-[10px] text-neutral-500 mb-0.5 block">Vit C (mg)</label><Input type="number" value={newVitC} onChange={(e) => setNewVitC(e.target.value)} placeholder="0" className="h-8 text-xs" /></div>
                <div><label className="text-[10px] text-neutral-500 mb-0.5 block">Vit D (mcg)</label><Input type="number" value={newVitD} onChange={(e) => setNewVitD(e.target.value)} placeholder="0" className="h-8 text-xs" /></div>
                <div><label className="text-[10px] text-neutral-500 mb-0.5 block">Vit B12 (mcg)</label><Input type="number" value={newVitB12} onChange={(e) => setNewVitB12(e.target.value)} placeholder="0" className="h-8 text-xs" /></div>
              </div>
              <div className="grid grid-cols-5 gap-2 mt-2">
                <div><label className="text-[10px] text-neutral-500 mb-0.5 block">Iron (mg)</label><Input type="number" value={newIron} onChange={(e) => setNewIron(e.target.value)} placeholder="0" className="h-8 text-xs" /></div>
                <div><label className="text-[10px] text-neutral-500 mb-0.5 block">Zinc (mg)</label><Input type="number" value={newZinc} onChange={(e) => setNewZinc(e.target.value)} placeholder="0" className="h-8 text-xs" /></div>
                <div><label className="text-[10px] text-neutral-500 mb-0.5 block">Calcium (mg)</label><Input type="number" value={newCalcium} onChange={(e) => setNewCalcium(e.target.value)} placeholder="0" className="h-8 text-xs" /></div>
                <div><label className="text-[10px] text-neutral-500 mb-0.5 block">Magnes. (mg)</label><Input type="number" value={newMagnesium} onChange={(e) => setNewMagnesium(e.target.value)} placeholder="0" className="h-8 text-xs" /></div>
                <div><label className="text-[10px] text-neutral-500 mb-0.5 block">Potass. (mg)</label><Input type="number" value={newPotassium} onChange={(e) => setNewPotassium(e.target.value)} placeholder="0" className="h-8 text-xs" /></div>
              </div>
            </div>
            <Button onClick={handleAddSupplement} disabled={!newName || !newBrand || isPending} className="w-full">
              {isPending ? 'Adding...' : 'Add Supplement'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== EDIT SUPPLEMENT MODAL ==================== */}
      <Dialog open={editSupplementOpen} onOpenChange={setEditSupplementOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-[#E07A3A]" /> Edit Supplement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Name *</label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Brand *</label>
              <Input value={newBrand} onChange={(e) => setNewBrand(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Form</label>
                <Select
                  value={newForm}
                  onChange={(e) => setNewForm(e.target.value)}
                  options={[
                    { value: 'capsule', label: 'Capsule' },
                    { value: 'powder', label: 'Powder' },
                    { value: 'tablet', label: 'Tablet' },
                    { value: 'liquid', label: 'Liquid' },
                    { value: 'softgel', label: 'Softgel' },
                    { value: 'gummy', label: 'Gummy' },
                  ]}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Default dose</label>
                <Input type="number" value={newDefaultDose} onChange={(e) => setNewDefaultDose(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Dose unit</label>
                <Input value={newDoseUnit} onChange={(e) => setNewDoseUnit(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Best time to take</label>
              <Input value={newBestTime} onChange={(e) => setNewBestTime(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Contents / Ingredients</label>
              <Textarea value={newContents} onChange={(e) => setNewContents(e.target.value)} className="min-h-[70px]" placeholder={"Vitamin D3 - 50 mcg\nZinc - 15 mg"} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Warnings / Notes</label>
              <Textarea value={newWarnings} onChange={(e) => setNewWarnings(e.target.value)} />
            </div>
            {/* Nutrition per dose */}
            <div>
              <p className="text-sm font-medium mb-2">Nutrition per dose <span className="text-neutral-400 font-normal text-xs">(used for dashboard tracking)</span></p>
              <div className="grid grid-cols-4 gap-2">
                <div><label className="text-[10px] text-neutral-500 mb-0.5 block">Calories</label><Input type="number" value={newCalories} onChange={(e) => setNewCalories(e.target.value)} placeholder="0" className="h-8 text-xs" /></div>
                <div><label className="text-[10px] text-neutral-500 mb-0.5 block">Protein (g)</label><Input type="number" value={newProtein} onChange={(e) => setNewProtein(e.target.value)} placeholder="0" className="h-8 text-xs" /></div>
                <div><label className="text-[10px] text-neutral-500 mb-0.5 block">Carbs (g)</label><Input type="number" value={newCarbs} onChange={(e) => setNewCarbs(e.target.value)} placeholder="0" className="h-8 text-xs" /></div>
                <div><label className="text-[10px] text-neutral-500 mb-0.5 block">Fat (g)</label><Input type="number" value={newFat} onChange={(e) => setNewFat(e.target.value)} placeholder="0" className="h-8 text-xs" /></div>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-2">
                <div><label className="text-[10px] text-neutral-500 mb-0.5 block">Vit A (mcg)</label><Input type="number" value={newVitA} onChange={(e) => setNewVitA(e.target.value)} placeholder="0" className="h-8 text-xs" /></div>
                <div><label className="text-[10px] text-neutral-500 mb-0.5 block">Vit C (mg)</label><Input type="number" value={newVitC} onChange={(e) => setNewVitC(e.target.value)} placeholder="0" className="h-8 text-xs" /></div>
                <div><label className="text-[10px] text-neutral-500 mb-0.5 block">Vit D (mcg)</label><Input type="number" value={newVitD} onChange={(e) => setNewVitD(e.target.value)} placeholder="0" className="h-8 text-xs" /></div>
                <div><label className="text-[10px] text-neutral-500 mb-0.5 block">Vit B12 (mcg)</label><Input type="number" value={newVitB12} onChange={(e) => setNewVitB12(e.target.value)} placeholder="0" className="h-8 text-xs" /></div>
              </div>
              <div className="grid grid-cols-5 gap-2 mt-2">
                <div><label className="text-[10px] text-neutral-500 mb-0.5 block">Iron (mg)</label><Input type="number" value={newIron} onChange={(e) => setNewIron(e.target.value)} placeholder="0" className="h-8 text-xs" /></div>
                <div><label className="text-[10px] text-neutral-500 mb-0.5 block">Zinc (mg)</label><Input type="number" value={newZinc} onChange={(e) => setNewZinc(e.target.value)} placeholder="0" className="h-8 text-xs" /></div>
                <div><label className="text-[10px] text-neutral-500 mb-0.5 block">Calcium (mg)</label><Input type="number" value={newCalcium} onChange={(e) => setNewCalcium(e.target.value)} placeholder="0" className="h-8 text-xs" /></div>
                <div><label className="text-[10px] text-neutral-500 mb-0.5 block">Magnes. (mg)</label><Input type="number" value={newMagnesium} onChange={(e) => setNewMagnesium(e.target.value)} placeholder="0" className="h-8 text-xs" /></div>
                <div><label className="text-[10px] text-neutral-500 mb-0.5 block">Potass. (mg)</label><Input type="number" value={newPotassium} onChange={(e) => setNewPotassium(e.target.value)} placeholder="0" className="h-8 text-xs" /></div>
              </div>
            </div>
            <Button onClick={handleSaveSupplement} disabled={!newName || !newBrand || isPending} className="w-full">
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
