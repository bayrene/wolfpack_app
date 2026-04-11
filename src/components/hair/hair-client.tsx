'use client';

import React, { useState, useTransition, useRef } from 'react';
import { compressImage } from '@/lib/compress-image';
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
  Scissors,
  Camera,
  Eye,
  Trash2,
  Star,
  Plus,
  Calendar,
  MapPin,
  DollarSign,
  Heart,
  Bookmark,
  Tag,
  Search,
} from 'lucide-react';
import { addHaircut, deleteHaircut, addHairHealthLog, deleteHairHealthLog, addHairInspo, toggleHairInspoFavorite, deleteHairInspo } from '@/db/queries/hair';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Haircut, HairHealthEntry, HairInspo } from '@/db/schema';

// --- Types & Constants ---

interface Props {
  haircuts: Haircut[];
  healthLogs: HairHealthEntry[];
  inspoPhotos: HairInspo[];
  today: string;
  embedded?: boolean;
}

type TabType = 'haircuts' | 'health' | 'inspo';

type HealthCategory = 'general' | 'receding' | 'thinning' | 'white_hair' | 'bald_spot' | 'growth' | 'treatment';
type PhotoAngle = 'front' | 'top' | 'left_side' | 'right_side' | 'back' | 'close_up' | 'other';

const CATEGORY_CONFIG: Record<HealthCategory, { label: string; icon: string; color: string; bgColor: string }> = {
  general: { label: 'General Check', icon: '\uD83D\uDCF8', color: 'text-neutral-600 dark:text-neutral-400', bgColor: 'bg-neutral-100 dark:bg-neutral-800' },
  receding: { label: 'Receding', icon: '\uD83D\uDCC9', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-950' },
  thinning: { label: 'Thinning', icon: '\uD83E\uDEA1', color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-950' },
  white_hair: { label: 'White Hairs', icon: '\uD83E\uDDD3', color: 'text-slate-500 dark:text-slate-400', bgColor: 'bg-slate-100 dark:bg-slate-800' },
  bald_spot: { label: 'Bald Spot', icon: '\u26A0\uFE0F', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-950' },
  growth: { label: 'Growth/Progress', icon: '\uD83C\uDF31', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-950' },
  treatment: { label: 'Treatment', icon: '\uD83D\uDC8A', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-950' },
};

const CATEGORY_BADGE_CLASSES: Record<HealthCategory, string> = {
  general: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300',
  receding: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
  thinning: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300',
  white_hair: 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
  bald_spot: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
  growth: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
  treatment: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
};

const PHOTO_ANGLE_LABELS: Record<PhotoAngle, string> = {
  front: 'Front',
  top: 'Top',
  left_side: 'Left Side',
  right_side: 'Right Side',
  back: 'Back',
  close_up: 'Close-up',
  other: 'Other',
};

// --- Sub-components ---

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
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

function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-3.5 h-3.5 ${
            star <= value ? 'fill-amber-400 text-amber-400' : 'text-neutral-300 dark:text-neutral-600'
          }`}
        />
      ))}
    </div>
  );
}

function SeverityDots({ value }: { value: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((dot) => (
        <div
          key={dot}
          className={cn(
            'w-2 h-2 rounded-full',
            dot <= value ? 'bg-amber-500' : 'bg-neutral-200 dark:bg-neutral-700',
          )}
        />
      ))}
    </div>
  );
}

function PhotoUploadButton({ onPhotoSelect, photo }: { onPhotoSelect: (dataUrl: string) => void; photo: string | null }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Photo must be under 2MB');
      return;
    }
    const base64 = await compressImage(file);
    onPhotoSelect(base64);
  };

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileRef.current?.click()}
        className="gap-2"
      >
        <Camera className="w-4 h-4" />
        {photo ? 'Change Photo' : 'Upload Photo'}
      </Button>
      {photo && (
        <img src={photo} alt="Preview" className="mt-2 w-20 h-20 rounded-lg object-cover border border-neutral-200 dark:border-neutral-700" />
      )}
    </div>
  );
}

// --- Main Component ---

export function HairClient({ haircuts, healthLogs, inspoPhotos, today, embedded }: Props) {
  const [tab, setTab] = useState<TabType>('haircuts');
  const [isPending, startTransition] = useTransition();

  // Haircut modal state
  const [showHaircutModal, setShowHaircutModal] = useState(false);
  const [hcDate, setHcDate] = useState(today);
  const [hcLocation, setHcLocation] = useState('');
  const [hcBarber, setHcBarber] = useState('');
  const [hcStyle, setHcStyle] = useState('');
  const [hcPrice, setHcPrice] = useState('');
  const [hcTip, setHcTip] = useState('');
  const [hcRating, setHcRating] = useState(0);
  const [hcPhoto, setHcPhoto] = useState<string | null>(null);
  const [hcNotes, setHcNotes] = useState('');

  // Health modal state
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [hhDate, setHhDate] = useState(today);
  const [hhCategory, setHhCategory] = useState<HealthCategory>('general');
  const [hhPhoto, setHhPhoto] = useState<string | null>(null);
  const [hhAngle, setHhAngle] = useState<PhotoAngle>('front');
  const [hhSeverity, setHhSeverity] = useState(0);
  const [hhNotes, setHhNotes] = useState('');

  // Inspo modal state
  const [showInspoModal, setShowInspoModal] = useState(false);
  const [inspoTitle, setInspoTitle] = useState('');
  const [inspoTags, setInspoTags] = useState('');
  const [inspoSource, setInspoSource] = useState('');
  const [inspoNotes, setInspoNotes] = useState('');
  const [inspoPhoto, setInspoPhoto] = useState<string | null>(null);
  const [inspoSearch, setInspoSearch] = useState('');

  // Photo viewer state
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);

  // Health filter state
  const [categoryFilter, setCategoryFilter] = useState<HealthCategory | 'all'>('all');

  // Computed
  const daysSinceLastCut = haircuts.length > 0
    ? Math.floor((new Date(today + 'T00:00:00').getTime() - new Date(haircuts[0].date + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const filteredHealthLogs = categoryFilter === 'all'
    ? healthLogs
    : healthLogs.filter((l) => l.category === categoryFilter);

  // Handlers
  const resetHaircutForm = () => {
    setHcDate(today);
    setHcLocation('');
    setHcBarber('');
    setHcStyle('');
    setHcPrice('');
    setHcTip('');
    setHcRating(0);
    setHcPhoto(null);
    setHcNotes('');
  };

  const resetHealthForm = () => {
    setHhDate(today);
    setHhCategory('general');
    setHhPhoto(null);
    setHhAngle('front');
    setHhSeverity(0);
    setHhNotes('');
  };

  const handleSaveHaircut = () => {
    if (!hcLocation.trim()) {
      toast.error('Location is required');
      return;
    }
    if (!hcPrice || parseFloat(hcPrice) < 0) {
      toast.error('Valid price is required');
      return;
    }
    startTransition(async () => {
      await addHaircut({
        date: hcDate,
        location: hcLocation.trim(),
        barberName: hcBarber.trim() || undefined,
        price: parseFloat(hcPrice),
        tip: hcTip ? parseFloat(hcTip) : undefined,
        style: hcStyle.trim() || undefined,
        notes: hcNotes.trim() || undefined,
        photo: hcPhoto || undefined,
        rating: hcRating > 0 ? hcRating : undefined,
      });
      toast.success('Haircut logged!');
      setShowHaircutModal(false);
      resetHaircutForm();
    });
  };

  const handleDeleteHaircut = (id: number) => {
    startTransition(async () => {
      await deleteHaircut(id);
      toast.success('Haircut deleted');
    });
  };

  const handleSaveHealthLog = () => {
    startTransition(async () => {
      await addHairHealthLog({
        date: hhDate,
        category: hhCategory,
        photo: hhPhoto || undefined,
        photoAngle: hhAngle,
        severity: hhSeverity > 0 ? hhSeverity : undefined,
        notes: hhNotes.trim() || undefined,
      });
      toast.success('Hair health entry logged!');
      setShowHealthModal(false);
      resetHealthForm();
    });
  };

  const handleDeleteHealthLog = (id: number) => {
    startTransition(async () => {
      await deleteHairHealthLog(id);
      toast.success('Entry deleted');
    });
  };

  const resetInspoForm = () => {
    setInspoTitle('');
    setInspoTags('');
    setInspoSource('');
    setInspoNotes('');
    setInspoPhoto(null);
  };

  const handleSaveInspo = () => {
    if (!inspoPhoto) {
      toast.error('A photo is required');
      return;
    }
    startTransition(async () => {
      const tagsArray = inspoTags.trim()
        ? JSON.stringify(inspoTags.split(',').map((t) => t.trim()).filter(Boolean))
        : undefined;
      await addHairInspo({
        photo: inspoPhoto,
        title: inspoTitle.trim() || undefined,
        tags: tagsArray,
        source: inspoSource.trim() || undefined,
        notes: inspoNotes.trim() || undefined,
      });
      toast.success('Inspo photo saved!');
      setShowInspoModal(false);
      resetInspoForm();
    });
  };

  const handleToggleFavorite = (id: number) => {
    startTransition(async () => {
      await toggleHairInspoFavorite(id);
    });
  };

  const handleDeleteInspo = (id: number) => {
    startTransition(async () => {
      await deleteHairInspo(id);
      toast.success('Inspo photo deleted');
    });
  };

  const filteredInspo = inspoSearch.trim()
    ? inspoPhotos.filter((p) => {
        const q = inspoSearch.toLowerCase();
        return (
          (p.title && p.title.toLowerCase().includes(q)) ||
          (p.tags && p.tags.toLowerCase().includes(q)) ||
          (p.notes && p.notes.toLowerCase().includes(q))
        );
      })
    : inspoPhotos;

  const priceTotal = (parseFloat(hcPrice) || 0) + (parseFloat(hcTip) || 0);

  return (
    <div className={embedded ? 'space-y-6' : 'max-w-4xl mx-auto space-y-6'}>
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
            >
              Hair
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Track haircuts and hair health over time
            </p>
          </div>
        </div>
      )}

      {/* Tab toggle */}
      <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1 w-fit">
        <Button
          variant={tab === 'haircuts' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('haircuts')}
          className="gap-2"
        >
          <Scissors className="w-4 h-4" />
          Haircuts
        </Button>
        <Button
          variant={tab === 'health' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('health')}
          className="gap-2"
        >
          <Camera className="w-4 h-4" />
          Hair Health
        </Button>
        <Button
          variant={tab === 'inspo' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('inspo')}
          className="gap-2"
        >
          <Bookmark className="w-4 h-4" />
          Inspo
        </Button>
      </div>

      {/* ==================== HAIRCUTS TAB ==================== */}
      {tab === 'haircuts' && (
        <div className="space-y-4">
          {/* Stats + Add button row */}
          <div className="flex items-center justify-between gap-4">
            {daysSinceLastCut !== null ? (
              <Card className="flex-1 !p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    daysSinceLastCut > 30 ? 'bg-amber-100 dark:bg-amber-900' : 'bg-violet-100 dark:bg-violet-900',
                  )}>
                    <Scissors className={cn(
                      'w-5 h-5',
                      daysSinceLastCut > 30 ? 'text-amber-600 dark:text-amber-400' : 'text-violet-600 dark:text-violet-400',
                    )} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                      {daysSinceLastCut} day{daysSinceLastCut !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {daysSinceLastCut > 30 ? 'Time for a cut?' : 'since your last haircut'}
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="flex-1 !p-4">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">No haircuts logged yet</p>
              </Card>
            )}
            <Button onClick={() => setShowHaircutModal(true)} className="gap-2 shrink-0">
              <Plus className="w-4 h-4" />
              Add Haircut
            </Button>
          </div>

          {/* Haircut history */}
          {haircuts.length === 0 ? (
            <Card className="!p-8 text-center">
              <Scissors className="w-10 h-10 mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
              <p className="text-neutral-500 dark:text-neutral-400">No haircuts logged yet. Add your first one!</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {haircuts.map((hc) => (
                <Card key={hc.id} className="!p-4">
                  <div className="flex gap-4">
                    {/* Photo thumbnail */}
                    {hc.photo ? (
                      <button
                        onClick={() => setViewPhoto(hc.photo)}
                        className="shrink-0 group relative"
                      >
                        <img
                          src={hc.photo}
                          alt="Haircut"
                          className="w-20 h-20 rounded-lg object-cover border border-neutral-200 dark:border-neutral-700"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-colors flex items-center justify-center">
                          <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-violet-50 dark:bg-violet-950 flex items-center justify-center shrink-0">
                        <Scissors className="w-8 h-8 text-violet-300 dark:text-violet-700" />
                      </div>
                    )}

                    {/* Details */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                            <span className="text-sm font-medium">{formatDate(hc.date)}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                            <span className="text-sm text-neutral-600 dark:text-neutral-400">
                              {hc.location}
                              {hc.barberName && ` \u2014 ${hc.barberName}`}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteHaircut(hc.id)}
                          disabled={isPending}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {hc.style && (
                        <Badge variant="secondary" className="text-xs">{hc.style}</Badge>
                      )}

                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1 text-sm">
                          <DollarSign className="w-3.5 h-3.5 text-neutral-400" />
                          <span>{formatCurrency(hc.price)}</span>
                          {hc.tip && hc.tip > 0 && (
                            <span className="text-neutral-400">+ {formatCurrency(hc.tip)} tip = {formatCurrency(hc.price + hc.tip)}</span>
                          )}
                        </div>
                        {hc.rating && hc.rating > 0 && <StarDisplay value={hc.rating} />}
                      </div>

                      {hc.notes && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">{hc.notes}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== HAIR HEALTH TAB ==================== */}
      {tab === 'health' && (
        <div className="space-y-4">
          {/* Add button */}
          <div className="flex justify-end">
            <Button onClick={() => setShowHealthModal(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Entry
            </Button>
          </div>

          {/* Category filter pills */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setCategoryFilter('all')}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                categoryFilter === 'all'
                  ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700',
              )}
            >
              All
            </button>
            {(Object.entries(CATEGORY_CONFIG) as [HealthCategory, typeof CATEGORY_CONFIG[HealthCategory]][]).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setCategoryFilter(key)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  categoryFilter === key
                    ? CATEGORY_BADGE_CLASSES[key]
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700',
                )}
              >
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Photo timeline grid */}
          {filteredHealthLogs.length === 0 ? (
            <Card className="!p-8 text-center">
              <Camera className="w-10 h-10 mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
              <p className="text-neutral-500 dark:text-neutral-400">
                {categoryFilter === 'all' ? 'No hair health entries yet. Add your first one!' : 'No entries for this category.'}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredHealthLogs.map((entry) => {
                const cfg = CATEGORY_CONFIG[entry.category as HealthCategory];
                return (
                  <Card key={entry.id} className="!p-0 overflow-hidden">
                    {/* Photo or placeholder */}
                    {entry.photo ? (
                      <button
                        onClick={() => setViewPhoto(entry.photo)}
                        className="w-full group relative"
                      >
                        <img
                          src={entry.photo}
                          alt={cfg.label}
                          className="w-full aspect-square object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    ) : (
                      <div className={cn('w-full aspect-square flex items-center justify-center', cfg.bgColor)}>
                        <span className="text-4xl">{cfg.icon}</span>
                      </div>
                    )}

                    {/* Info */}
                    <div className="p-3 space-y-1.5">
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{formatDate(entry.date)}</p>
                      <div className="flex items-center gap-2">
                        <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold', CATEGORY_BADGE_CLASSES[entry.category as HealthCategory])}>
                          {cfg.label}
                        </span>
                      </div>
                      {entry.severity && entry.severity > 0 && (
                        <SeverityDots value={entry.severity} />
                      )}
                      {entry.notes && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">{entry.notes}</p>
                      )}
                      <button
                        onClick={() => handleDeleteHealthLog(entry.id)}
                        disabled={isPending}
                        className="p-1 rounded text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== INSPO TAB ==================== */}
      {tab === 'inspo' && (
        <div className="space-y-4">
          {/* Search + Add row */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Search by title, tags, or notes..."
                value={inspoSearch}
                onChange={(e) => setInspoSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => setShowInspoModal(true)} className="gap-2 shrink-0">
              <Plus className="w-4 h-4" />
              Add Inspo
            </Button>
          </div>

          {/* Photo grid */}
          {filteredInspo.length === 0 ? (
            <Card className="!p-8 text-center">
              <Bookmark className="w-10 h-10 mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
              <p className="text-neutral-500 dark:text-neutral-400">
                {inspoSearch.trim()
                  ? 'No inspo photos match your search.'
                  : 'No inspiration photos yet. Save some looks to show your barber!'}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredInspo.map((photo) => {
                const parsedTags: string[] = photo.tags
                  ? (() => {
                      try { return JSON.parse(photo.tags); } catch { return photo.tags.split(',').map((t: string) => t.trim()).filter(Boolean); }
                    })()
                  : [];
                return (
                  <Card key={photo.id} className="!p-0 overflow-hidden group">
                    {/* Photo */}
                    <button
                      onClick={() => setViewPhoto(photo.photo)}
                      className="w-full relative"
                    >
                      <img
                        src={photo.photo}
                        alt={photo.title || 'Inspo'}
                        className="w-full aspect-square object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {/* Favorite badge */}
                      {photo.favorite && (
                        <div className="absolute top-2 right-2">
                          <Heart className="w-5 h-5 fill-rose-500 text-rose-500 drop-shadow" />
                        </div>
                      )}
                    </button>

                    {/* Info */}
                    <div className="p-3 space-y-1.5">
                      {photo.title && (
                        <p className="text-sm font-medium truncate">{photo.title}</p>
                      )}
                      {parsedTags.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {parsedTags.slice(0, 3).map((tag: string) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300"
                            >
                              <Tag className="w-2.5 h-2.5" />
                              {tag}
                            </span>
                          ))}
                          {parsedTags.length > 3 && (
                            <span className="text-[10px] text-neutral-400">+{parsedTags.length - 3}</span>
                          )}
                        </div>
                      )}
                      {photo.source && (
                        <p className="text-[10px] text-neutral-400 truncate">via {photo.source}</p>
                      )}
                      {photo.notes && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">{photo.notes}</p>
                      )}
                      <div className="flex items-center gap-1 pt-1">
                        <button
                          onClick={() => handleToggleFavorite(photo.id)}
                          disabled={isPending}
                          className={cn(
                            'p-1.5 rounded-lg transition-colors',
                            photo.favorite
                              ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950'
                              : 'text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950',
                          )}
                        >
                          <Heart className={cn('w-4 h-4', photo.favorite && 'fill-current')} />
                        </button>
                        <button
                          onClick={() => handleDeleteInspo(photo.id)}
                          disabled={isPending}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== ADD INSPO MODAL ==================== */}
      <Dialog open={showInspoModal} onOpenChange={setShowInspoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
              Add Inspiration Photo
            </DialogTitle>
            <DialogDescription>Save a look to show your barber</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Photo (required) */}
            <div>
              <label className="text-sm font-medium mb-1 block">Photo *</label>
              <PhotoUploadButton photo={inspoPhoto} onPhotoSelect={setInspoPhoto} />
            </div>

            {/* Title */}
            <div>
              <label className="text-sm font-medium mb-1 block">Title</label>
              <Input
                placeholder="Low fade + textured top..."
                value={inspoTitle}
                onChange={(e) => setInspoTitle(e.target.value)}
              />
            </div>

            {/* Tags */}
            <div>
              <label className="text-sm font-medium mb-1 block">Tags</label>
              <Input
                placeholder="fade, short, textured (comma-separated)"
                value={inspoTags}
                onChange={(e) => setInspoTags(e.target.value)}
              />
              <p className="text-[10px] text-neutral-400 mt-1">Separate with commas for easy filtering</p>
            </div>

            {/* Source */}
            <div>
              <label className="text-sm font-medium mb-1 block">Source</label>
              <Input
                placeholder="Instagram, Pinterest, URL..."
                value={inspoSource}
                onChange={(e) => setInspoSource(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Textarea
                placeholder="Ask barber for #2 on sides, keep top longer..."
                value={inspoNotes}
                onChange={(e) => setInspoNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button onClick={handleSaveInspo} disabled={isPending} className="w-full">
              {isPending ? 'Saving...' : 'Save Inspo'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== ADD HAIRCUT MODAL ==================== */}
      <Dialog open={showHaircutModal} onOpenChange={setShowHaircutModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
              Log a Haircut
            </DialogTitle>
            <DialogDescription>Record your haircut details</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Date */}
            <div>
              <label className="text-sm font-medium mb-1 block">Date</label>
              <Input type="date" value={hcDate} onChange={(e) => setHcDate(e.target.value)} />
            </div>

            {/* Location */}
            <div>
              <label className="text-sm font-medium mb-1 block">Location *</label>
              <Input
                placeholder="Great Clips, Joe's Barbershop..."
                value={hcLocation}
                onChange={(e) => setHcLocation(e.target.value)}
              />
            </div>

            {/* Barber name */}
            <div>
              <label className="text-sm font-medium mb-1 block">Barber name</label>
              <Input
                placeholder="Optional"
                value={hcBarber}
                onChange={(e) => setHcBarber(e.target.value)}
              />
            </div>

            {/* Style */}
            <div>
              <label className="text-sm font-medium mb-1 block">Style</label>
              <Input
                placeholder="low fade, mid fade + lineup..."
                value={hcStyle}
                onChange={(e) => setHcStyle(e.target.value)}
              />
            </div>

            {/* Price + Tip */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Price ($) *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="25.00"
                  value={hcPrice}
                  onChange={(e) => setHcPrice(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Tip ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="5.00"
                  value={hcTip}
                  onChange={(e) => setHcTip(e.target.value)}
                />
              </div>
            </div>
            {(parseFloat(hcPrice) > 0 || parseFloat(hcTip) > 0) && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Total: <span className="font-medium text-neutral-900 dark:text-neutral-100">{formatCurrency(priceTotal)}</span>
              </p>
            )}

            {/* Rating */}
            <div>
              <label className="text-sm font-medium mb-1 block">Rating</label>
              <StarRating value={hcRating} onChange={setHcRating} />
            </div>

            {/* Photo */}
            <div>
              <label className="text-sm font-medium mb-1 block">Photo</label>
              <PhotoUploadButton photo={hcPhoto} onPhotoSelect={setHcPhoto} />
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Textarea
                placeholder="Any additional notes..."
                value={hcNotes}
                onChange={(e) => setHcNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button onClick={handleSaveHaircut} disabled={isPending} className="w-full">
              {isPending ? 'Saving...' : 'Save Haircut'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== ADD HEALTH ENTRY MODAL ==================== */}
      <Dialog open={showHealthModal} onOpenChange={setShowHealthModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
              Log Hair Health
            </DialogTitle>
            <DialogDescription>Track changes in your hair health over time</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Date */}
            <div>
              <label className="text-sm font-medium mb-1 block">Date</label>
              <Input type="date" value={hhDate} onChange={(e) => setHhDate(e.target.value)} />
            </div>

            {/* Category selector */}
            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(CATEGORY_CONFIG) as [HealthCategory, typeof CATEGORY_CONFIG[HealthCategory]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setHhCategory(key)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border',
                      hhCategory === key
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                        : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
                    )}
                  >
                    <span>{cfg.icon}</span>
                    <span>{cfg.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Photo */}
            <div>
              <label className="text-sm font-medium mb-1 block">Photo</label>
              <PhotoUploadButton photo={hhPhoto} onPhotoSelect={setHhPhoto} />
            </div>

            {/* Photo angle */}
            <div>
              <label className="text-sm font-medium mb-1 block">Photo Angle</label>
              <div className="flex gap-2 flex-wrap">
                {(Object.entries(PHOTO_ANGLE_LABELS) as [PhotoAngle, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setHhAngle(key)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
                      hhAngle === key
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                        : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity */}
            <div>
              <label className="text-sm font-medium mb-1 block">
                Severity <span className="text-neutral-400 font-normal">(1 = minimal, 5 = significant)</span>
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setHhSeverity(level)}
                    className={cn(
                      'w-10 h-10 rounded-lg text-sm font-bold transition-colors border',
                      hhSeverity === level
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                        : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Textarea
                placeholder="e.g., Found 3 white hairs near left temple, stress bald spot seems smaller this week..."
                value={hhNotes}
                onChange={(e) => setHhNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button onClick={handleSaveHealthLog} disabled={isPending} className="w-full">
              {isPending ? 'Saving...' : 'Save Entry'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== FULL-SIZE PHOTO VIEWER ==================== */}
      <Dialog open={!!viewPhoto} onOpenChange={() => setViewPhoto(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>Photo</DialogTitle>
            <DialogDescription>Full size view</DialogDescription>
          </DialogHeader>
          {viewPhoto && (
            <img src={viewPhoto} alt="Full size" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
