'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { Card } from '@/components/ui/card';
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
  MapPin,
  Star,
  Heart,
  Clock,
  Search,
  Wine,
  UtensilsCrossed,
  Globe,
  Phone,
  CalendarDays,
  ArrowUpDown,
} from 'lucide-react';
import { addHappyHour, updateHappyHour, toggleHappyHourFavorite, deleteHappyHour } from '@/db/queries/happy-hours';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { HappyHourDeal } from '@/db/schema';

interface Props {
  deals: HappyHourDeal[];
  today: string;
}

type SortKey = 'distance' | 'rating' | 'name';

const DAY_ABBREVS: Record<string, string> = {
  '0': 'Sun', '1': 'Mon', '2': 'Tue', '3': 'Wed', '4': 'Thu', '5': 'Fri', '6': 'Sat',
};

function todayAbbrev(today: string) {
  const d = new Date(today + 'T00:00:00');
  return DAY_ABBREVS[String(d.getDay())];
}

function isActiveToday(dayOfWeek: string | null | undefined, today: string): boolean {
  if (!dayOfWeek) return false;
  const abbrev = todayAbbrev(today);
  const lower = dayOfWeek.toLowerCase();
  const abbrevLower = abbrev.toLowerCase();
  if (lower === 'everyday' || lower === 'daily' || lower === 'every day') return true;
  if (lower.includes(abbrevLower)) return true;
  // handle ranges like "Mon-Fri"
  const rangeMatch = lower.match(/(\w+)-(\w+)/);
  if (rangeMatch) {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const startIdx = days.findIndex((d) => rangeMatch[1].startsWith(d));
    const endIdx = days.findIndex((d) => rangeMatch[2].startsWith(d));
    const todayIdx = days.indexOf(abbrevLower);
    if (startIdx !== -1 && endIdx !== -1 && todayIdx !== -1) {
      if (startIdx <= endIdx) return todayIdx >= startIdx && todayIdx <= endIdx;
      // wraps weekend: e.g. Fri-Sun
      return todayIdx >= startIdx || todayIdx <= endIdx;
    }
  }
  return false;
}

function formatTime(t: string | null | undefined): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" onClick={() => onChange(star)} className="p-0.5">
          <Star className={cn('w-5 h-5 transition-colors',
            star <= value ? 'fill-amber-400 text-amber-400' : 'text-neutral-300 dark:text-neutral-600 hover:text-amber-300')} />
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ value }: { value: number | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={cn('w-3 h-3', s <= value ? 'fill-amber-400 text-amber-400' : 'text-neutral-300 dark:text-neutral-600')} />
      ))}
    </div>
  );
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const EMPTY_FORM = {
  restaurant: '',
  address: '',
  distance: '',
  selectedDays: [] as string[],
  startTime: '',
  endTime: '',
  deals: '',
  drinkSpecials: '',
  foodSpecials: '',
  rating: 0,
  website: '',
  phone: '',
  notes: '',
  lastVisited: '',
};

function daysToString(days: string[]): string {
  if (days.length === 0) return '';
  if (days.length === 7) return 'Everyday';
  return days.join(',');
}

export function HappyHoursClient({ deals, today }: Props) {
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [filterToday, setFilterToday] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const setField = (key: string, value: string | number | string[]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleDay = (day: string) => {
    setForm((f) => {
      const days = f.selectedDays.includes(day)
        ? f.selectedDays.filter((d) => d !== day)
        : [...f.selectedDays, day];
      return { ...f, selectedDays: days };
    });
  };

  const resetForm = () => setForm({ ...EMPTY_FORM });

  const handleSave = () => {
    if (!form.restaurant.trim()) { toast.error('Restaurant name is required'); return; }
    if (!form.deals.trim()) { toast.error('Deals description is required'); return; }
    startTransition(async () => {
      await addHappyHour({
        restaurant: form.restaurant.trim(),
        address: form.address.trim() || undefined,
        distance: form.distance ? parseFloat(form.distance) : undefined,
        dayOfWeek: daysToString(form.selectedDays) || undefined,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        deals: form.deals.trim(),
        drinkSpecials: form.drinkSpecials.trim() || undefined,
        foodSpecials: form.foodSpecials.trim() || undefined,
        rating: form.rating > 0 ? form.rating : undefined,
        website: form.website.trim() || undefined,
        phone: form.phone.trim() || undefined,
        notes: form.notes.trim() || undefined,
        lastVisited: form.lastVisited || undefined,
      });
      toast.success('Happy hour deal added!');
      setShowAddModal(false);
      resetForm();
    });
  };

  const handleToggleFavorite = (id: number, current: boolean | null) => {
    startTransition(async () => {
      await toggleHappyHourFavorite(id, !current);
      toast.success(!current ? 'Added to favorites' : 'Removed from favorites');
    });
  };

  const handleDelete = (id: number) => {
    startTransition(async () => {
      await deleteHappyHour(id);
      toast.success('Deal removed');
    });
  };

  const filtered = useMemo(() => {
    let list = [...deals];
    if (filterToday) {
      list = list.filter((d) => isActiveToday(d.dayOfWeek, today));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((d) =>
        d.restaurant.toLowerCase().includes(q) ||
        (d.deals || '').toLowerCase().includes(q) ||
        (d.address || '').toLowerCase().includes(q) ||
        (d.drinkSpecials || '').toLowerCase().includes(q) ||
        (d.foodSpecials || '').toLowerCase().includes(q),
      );
    }
    // favorites pinned to top, then sort
    list.sort((a, b) => {
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      if (sortKey === 'distance') return (a.distance ?? 9999) - (b.distance ?? 9999);
      if (sortKey === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
      return a.restaurant.localeCompare(b.restaurant);
    });
    return list;
  }, [deals, filterToday, search, sortKey, today]);

  const todayDealsCount = useMemo(
    () => deals.filter((d) => isActiveToday(d.dayOfWeek, today)).length,
    [deals, today],
  );

  return (
    <div className="space-y-5">
      {/* Stats bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {deals.length} deals &bull; {todayDealsCount} active today
        </p>
        <Button onClick={() => { resetForm(); setShowAddModal(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Add Deal
        </Button>
      </div>

      {/* Filter / search bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFilterToday((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
            filterToday
              ? 'bg-[#E07A3A] text-white'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700',
          )}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          Today&apos;s Deals
        </button>

        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deals, restaurants..."
            className="pl-8 h-8 text-sm"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
          {(['name', 'distance', 'rating'] as SortKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setSortKey(k)}
              className={cn(
                'px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors capitalize',
                sortKey === k
                  ? 'bg-[#E07A3A]/10 text-[#E07A3A]'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700',
              )}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <Card className="!p-8 text-center">
          <Wine className="w-10 h-10 mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
          <p className="text-neutral-500 dark:text-neutral-400">
            {deals.length === 0
              ? 'No happy hour deals yet. Add your first one!'
              : 'No deals match your filters.'}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((deal) => {
            const active = isActiveToday(deal.dayOfWeek, today);
            return (
              <Card
                key={deal.id}
                className={cn('!p-4 relative', deal.favorite && 'ring-1 ring-[#E07A3A]/40')}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-sm font-bold truncate" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                        {deal.restaurant}
                      </h3>
                      {deal.favorite && <Heart className="w-3.5 h-3.5 fill-[#E07A3A] text-[#E07A3A] shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {active && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                          Active Today
                        </span>
                      )}
                      {deal.distance != null && (
                        <span className="flex items-center gap-0.5 text-[10px] text-neutral-500 dark:text-neutral-400">
                          <MapPin className="w-3 h-3" />
                          {deal.distance.toFixed(1)} mi
                        </span>
                      )}
                      <StarDisplay value={deal.rating} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggleFavorite(deal.id, deal.favorite)}
                      disabled={isPending}
                      className={cn(
                        'p-1.5 rounded-lg transition-colors',
                        deal.favorite
                          ? 'text-[#E07A3A] hover:bg-orange-50 dark:hover:bg-orange-950'
                          : 'text-neutral-400 hover:text-[#E07A3A] hover:bg-orange-50 dark:hover:bg-orange-950',
                      )}
                    >
                      <Heart className={cn('w-3.5 h-3.5', deal.favorite && 'fill-current')} />
                    </button>
                    <button
                      onClick={() => handleDelete(deal.id)}
                      disabled={isPending}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Hours row */}
                {(deal.dayOfWeek || deal.startTime || deal.endTime) && (
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                    <Clock className="w-3 h-3 shrink-0" />
                    {deal.dayOfWeek && <span>{deal.dayOfWeek}</span>}
                    {(deal.startTime || deal.endTime) && (
                      <span>
                        {formatTime(deal.startTime)}
                        {deal.startTime && deal.endTime && ' – '}
                        {formatTime(deal.endTime)}
                      </span>
                    )}
                  </div>
                )}

                {/* Deals */}
                <p className="text-xs text-neutral-700 dark:text-neutral-300 mb-2 leading-relaxed">{deal.deals}</p>

                {/* Drink / food specials */}
                {deal.drinkSpecials && (
                  <div className="flex items-start gap-1 text-xs text-blue-600 dark:text-blue-400 mb-1">
                    <Wine className="w-3 h-3 mt-0.5 shrink-0" />
                    <span>{deal.drinkSpecials}</span>
                  </div>
                )}
                {deal.foodSpecials && (
                  <div className="flex items-start gap-1 text-xs text-green-600 dark:text-green-400 mb-1">
                    <UtensilsCrossed className="w-3 h-3 mt-0.5 shrink-0" />
                    <span>{deal.foodSpecials}</span>
                  </div>
                )}

                {/* Address */}
                {deal.address && (
                  <p className="text-[10px] text-neutral-400 flex items-center gap-0.5 mt-1">
                    <MapPin className="w-3 h-3" /> {deal.address}
                  </p>
                )}

                {/* Links row */}
                {(deal.website || deal.phone) && (
                  <div className="flex items-center gap-3 mt-2">
                    {deal.website && (
                      <a href={deal.website} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-0.5 text-[10px] text-[#E07A3A] hover:underline">
                        <Globe className="w-3 h-3" /> Website
                      </a>
                    )}
                    {deal.phone && (
                      <a href={`tel:${deal.phone}`}
                        className="flex items-center gap-0.5 text-[10px] text-neutral-500 hover:text-neutral-700">
                        <Phone className="w-3 h-3" /> {deal.phone}
                      </a>
                    )}
                  </div>
                )}

                {deal.notes && (
                  <p className="text-[10px] text-neutral-400 italic mt-1">{deal.notes}</p>
                )}
                {deal.lastVisited && (
                  <p className="text-[10px] text-neutral-400 mt-1">Last visited: {deal.lastVisited}</p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ==================== ADD MODAL ==================== */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>Add Happy Hour Deal</DialogTitle>
            <DialogDescription>Track happy hour deals near you</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <label className="text-sm font-medium mb-1 block">Restaurant *</label>
              <Input
                placeholder="El Dorado Cantina, Khoury's..."
                value={form.restaurant}
                onChange={(e) => setField('restaurant', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Deals *</label>
              <Input
                placeholder="$5 margaritas, half-off apps, $4 drafts..."
                value={form.deals}
                onChange={(e) => setField('deals', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Day(s)</label>
              <div className="flex gap-1.5 flex-wrap">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors',
                      form.selectedDays.includes(day)
                        ? 'bg-[#E07A3A] border-[#E07A3A] text-white'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-[#E07A3A] hover:text-[#E07A3A]',
                    )}
                  >
                    {day}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setField('selectedDays', form.selectedDays.length === 7 ? [] : [...DAYS_OF_WEEK])}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors',
                    form.selectedDays.length === 7
                      ? 'bg-[#E07A3A] border-[#E07A3A] text-white'
                      : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-[#E07A3A] hover:text-[#E07A3A]',
                  )}
                >
                  Every Day
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Distance from home (mi)</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="3.2"
                  value={form.distance}
                  onChange={(e) => setField('distance', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Start Time</label>
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setField('startTime', e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">End Time</label>
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setField('endTime', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Drink Specials</label>
              <Input
                placeholder="$4 house wine, $3 domestics..."
                value={form.drinkSpecials}
                onChange={(e) => setField('drinkSpecials', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Food Specials</label>
              <Input
                placeholder="Half-off apps, $2 tacos..."
                value={form.foodSpecials}
                onChange={(e) => setField('foodSpecials', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Address</label>
              <Input
                placeholder="123 Main St, Henderson, NV"
                value={form.address}
                onChange={(e) => setField('address', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Rating</label>
              <StarRating value={form.rating} onChange={(v) => setField('rating', v)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Website</label>
                <Input
                  placeholder="https://..."
                  value={form.website}
                  onChange={(e) => setField('website', e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Phone</label>
                <Input
                  placeholder="(702) 555-0000"
                  value={form.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Last Visited</label>
              <Input
                type="date"
                value={form.lastVisited}
                onChange={(e) => setField('lastVisited', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Textarea
                placeholder="Parking tips, vibe, who to ask for..."
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
                rows={2}
              />
            </div>
            <Button onClick={handleSave} disabled={isPending} className="w-full">
              {isPending ? 'Saving...' : 'Save Deal'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
