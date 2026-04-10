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
  Calendar,
  Clock,
  DollarSign,
  MapPin,
  Star,
  Heart,
  ChevronLeft,
  ChevronRight,
  Ticket,
  UtensilsCrossed,
  Film,
  TreePine,
  Home,
  Plane,
  PartyPopper,
  HelpCircle,
  Tag,
  CheckCircle2,
  XCircle,
  Lightbulb,
  CalendarCheck,
  BookOpen,
  Wine,
  Car,
  Hotel,
  GlassWater,
  Sparkles,
  ShoppingBag,
  Bus,
  LogOut,
  Clapperboard,
  ChevronDown,
  ChevronUp,
  Copy,
  Hash,
} from 'lucide-react';
import { addDateNight, updateDateNight, deleteDateNight, addItineraryItem, updateItineraryItem, deleteItineraryItem } from '@/db/queries/date-nights';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { DateNight, HappyHourDeal, DateItineraryItem } from '@/db/schema';
import { HappyHoursClient } from '@/components/dates/happy-hours-client';

// --- Types & Constants ---

interface Props {
  dateNights: DateNight[];
  happyHourDeals: HappyHourDeal[];
  itineraryItems: DateItineraryItem[];
  today: string;
}

type ItineraryType = 'flight' | 'car_rental' | 'hotel' | 'restaurant' | 'activity' | 'show' | 'bar' | 'spa' | 'shopping' | 'transport' | 'checkout' | 'other';
type ItineraryStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

const ITINERARY_TYPE_CONFIG: Record<ItineraryType, { label: string; icon: typeof Plane; color: string; bgColor: string }> = {
  flight: { label: 'Flight', icon: Plane, color: 'text-sky-600 dark:text-sky-400', bgColor: 'bg-sky-50 dark:bg-sky-950' },
  car_rental: { label: 'Car Rental', icon: Car, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-950' },
  hotel: { label: 'Hotel', icon: Hotel, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-950' },
  restaurant: { label: 'Restaurant', icon: UtensilsCrossed, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-950' },
  activity: { label: 'Activity', icon: Ticket, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-950' },
  show: { label: 'Show', icon: Clapperboard, color: 'text-pink-600 dark:text-pink-400', bgColor: 'bg-pink-50 dark:bg-pink-950' },
  bar: { label: 'Bar / Lounge', icon: GlassWater, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-950' },
  spa: { label: 'Spa', icon: Sparkles, color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-50 dark:bg-teal-950' },
  shopping: { label: 'Shopping', icon: ShoppingBag, color: 'text-rose-600 dark:text-rose-400', bgColor: 'bg-rose-50 dark:bg-rose-950' },
  transport: { label: 'Transport', icon: Bus, color: 'text-indigo-600 dark:text-indigo-400', bgColor: 'bg-indigo-50 dark:bg-indigo-950' },
  checkout: { label: 'Checkout', icon: LogOut, color: 'text-neutral-600 dark:text-neutral-400', bgColor: 'bg-neutral-100 dark:bg-neutral-800' },
  other: { label: 'Other', icon: HelpCircle, color: 'text-neutral-600 dark:text-neutral-400', bgColor: 'bg-neutral-100 dark:bg-neutral-800' },
};

const ITINERARY_STATUS_CONFIG: Record<ItineraryStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' },
  completed: { label: 'Completed', color: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' },
};

type DateCategory = 'dinner' | 'movie' | 'activity' | 'outdoor' | 'home' | 'travel' | 'event' | 'other';
type DateStatus = 'idea' | 'planned' | 'booked' | 'completed' | 'cancelled';
type ViewMode = 'list' | 'calendar';
type TopTab = 'dates' | 'happyhours';

const CATEGORY_CONFIG: Record<DateCategory, { label: string; icon: typeof UtensilsCrossed; color: string; bgColor: string }> = {
  dinner: { label: 'Dinner', icon: UtensilsCrossed, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-950' },
  movie: { label: 'Movie', icon: Film, color: 'text-violet-600 dark:text-violet-400', bgColor: 'bg-violet-50 dark:bg-violet-950' },
  activity: { label: 'Activity', icon: Ticket, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-950' },
  outdoor: { label: 'Outdoor', icon: TreePine, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-950' },
  home: { label: 'Home', icon: Home, color: 'text-pink-600 dark:text-pink-400', bgColor: 'bg-pink-50 dark:bg-pink-950' },
  travel: { label: 'Travel', icon: Plane, color: 'text-cyan-600 dark:text-cyan-400', bgColor: 'bg-cyan-50 dark:bg-cyan-950' },
  event: { label: 'Event', icon: PartyPopper, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-950' },
  other: { label: 'Other', icon: HelpCircle, color: 'text-neutral-600 dark:text-neutral-400', bgColor: 'bg-neutral-50 dark:bg-neutral-800' },
};

const STATUS_CONFIG: Record<DateStatus, { label: string; color: string; icon: typeof Lightbulb }> = {
  idea: { label: 'Idea', color: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300', icon: Lightbulb },
  planned: { label: 'Planned', color: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300', icon: CalendarCheck },
  booked: { label: 'Booked', color: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300', icon: BookOpen },
  completed: { label: 'Completed', color: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300', icon: XCircle },
};

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

function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={cn('w-3 h-3', s <= value ? 'fill-amber-400 text-amber-400' : 'text-neutral-300 dark:text-neutral-600')} />
      ))}
    </div>
  );
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return { firstDay, daysInMonth };
}

// --- Main Component ---

export function DateNightsClient({ dateNights, happyHourDeals, itineraryItems, today }: Props) {
  const [isPending, startTransition] = useTransition();
  const [topTab, setTopTab] = useState<TopTab>('dates');
  const [view, setView] = useState<ViewMode>('list');
  const [statusFilter, setStatusFilter] = useState<DateStatus | 'all'>('all');

  // Calendar state
  const todayDate = new Date(today + 'T00:00:00');
  const [calYear, setCalYear] = useState(todayDate.getFullYear());
  const [calMonth, setCalMonth] = useState(todayDate.getMonth());

  // Itinerary state
  const [expandedItinerary, setExpandedItinerary] = useState<Set<number>>(new Set());
  const [showItineraryModal, setShowItineraryModal] = useState(false);
  const [itineraryForDateId, setItineraryForDateId] = useState<number | null>(null);
  const [itiType, setItiType] = useState<ItineraryType>('activity');
  const [itiTitle, setItiTitle] = useState('');
  const [itiDate, setItiDate] = useState('');
  const [itiStartTime, setItiStartTime] = useState('');
  const [itiEndTime, setItiEndTime] = useState('');
  const [itiLocation, setItiLocation] = useState('');
  const [itiProvider, setItiProvider] = useState('');
  const [itiConfirmation, setItiConfirmation] = useState('');
  const [itiCost, setItiCost] = useState('');
  const [itiNotes, setItiNotes] = useState('');
  const [itiStatus, setItiStatus] = useState<ItineraryStatus>('pending');

  // Build itinerary map: dateNightId -> items[]
  const itineraryMap = useMemo(() => {
    const map = new Map<number, DateItineraryItem[]>();
    for (const item of itineraryItems) {
      const existing = map.get(item.dateNightId) || [];
      existing.push(item);
      map.set(item.dateNightId, existing);
    }
    return map;
  }, [itineraryItems]);

  const toggleItinerary = (id: number) => {
    setExpandedItinerary((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetItineraryForm = () => {
    setItiType('activity'); setItiTitle(''); setItiDate(''); setItiStartTime('');
    setItiEndTime(''); setItiLocation(''); setItiProvider(''); setItiConfirmation('');
    setItiCost(''); setItiNotes(''); setItiStatus('pending');
  };

  const openAddItinerary = (dateNightId: number) => {
    setItineraryForDateId(dateNightId);
    resetItineraryForm();
    // Pre-fill date from the date night
    const dn = dateNights.find((d) => d.id === dateNightId);
    if (dn?.date) setItiDate(dn.date);
    setShowItineraryModal(true);
  };

  const handleSaveItinerary = () => {
    if (!itiTitle.trim() || !itineraryForDateId) { toast.error('Title is required'); return; }
    const existingItems = itineraryMap.get(itineraryForDateId) || [];
    startTransition(async () => {
      await addItineraryItem({
        dateNightId: itineraryForDateId,
        sortOrder: existingItems.length,
        type: itiType,
        title: itiTitle.trim(),
        date: itiDate || undefined,
        startTime: itiStartTime || undefined,
        endTime: itiEndTime || undefined,
        location: itiLocation.trim() || undefined,
        provider: itiProvider.trim() || undefined,
        confirmationNumber: itiConfirmation.trim() || undefined,
        cost: itiCost ? parseFloat(itiCost) : undefined,
        notes: itiNotes.trim() || undefined,
        status: itiStatus,
      });
      toast.success('Itinerary item added!');
      setShowItineraryModal(false);
      // Auto-expand
      setExpandedItinerary((prev) => new Set(prev).add(itineraryForDateId));
    });
  };

  const handleDeleteItineraryItem = (itemId: number) => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) startTransition(async () => { await deleteItineraryItem(itemId); });
    }, 5000);
    toast('Itinerary item removed', {
      duration: 5000,
      action: { label: 'Undo', onClick: () => { cancelled = true; clearTimeout(timer); } },
    });
  };

  const handleItineraryStatusChange = (itemId: number, status: ItineraryStatus) => {
    startTransition(async () => {
      await updateItineraryItem(itemId, { status });
      toast.success(`Updated to ${ITINERARY_STATUS_CONFIG[status].label}`);
    });
  };

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [dnTitle, setDnTitle] = useState('');
  const [dnDate, setDnDate] = useState('');
  const [dnTime, setDnTime] = useState('');
  const [dnLocation, setDnLocation] = useState('');
  const [dnDistance, setDnDistance] = useState('');
  const [dnCategory, setDnCategory] = useState<DateCategory>('dinner');
  const [dnDescription, setDnDescription] = useState('');
  const [dnEstCost, setDnEstCost] = useState('');
  const [dnDeals, setDnDeals] = useState('');
  const [dnReservation, setDnReservation] = useState('');
  const [dnStatus, setDnStatus] = useState<DateStatus>('idea');
  const [dnNotes, setDnNotes] = useState('');

  // Complete modal (after a date)
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [completeActualCost, setCompleteActualCost] = useState('');
  const [completeRating, setCompleteRating] = useState(4);
  const [completeNotes, setCompleteNotes] = useState('');

  // Computed
  const filteredDates = useMemo(() =>
    statusFilter === 'all' ? dateNights : dateNights.filter((d) => d.status === statusFilter),
    [dateNights, statusFilter],
  );

  const upcoming = dateNights.filter((d) => d.date && d.date >= today && d.status !== 'completed' && d.status !== 'cancelled');
  const ideas = dateNights.filter((d) => d.status === 'idea');
  const totalSpent = dateNights.filter((d) => d.status === 'completed').reduce((s, d) => s + (d.actualCost || d.estimatedCost || 0), 0);

  // Calendar data
  const { firstDay, daysInMonth } = getMonthDays(calYear, calMonth);
  const calDates = useMemo(() => {
    const map = new Map<string, DateNight[]>();
    for (const dn of dateNights) {
      if (!dn.date) continue;
      const existing = map.get(dn.date) || [];
      existing.push(dn);
      map.set(dn.date, existing);
    }
    return map;
  }, [dateNights]);

  const resetAddForm = () => {
    setDnTitle(''); setDnDate(''); setDnTime(''); setDnLocation(''); setDnDistance('');
    setDnCategory('dinner'); setDnDescription(''); setDnEstCost('');
    setDnDeals(''); setDnReservation(''); setDnStatus('idea'); setDnNotes('');
  };

  const handleSave = () => {
    if (!dnTitle.trim()) { toast.error('Title is required'); return; }
    startTransition(async () => {
      await addDateNight({
        title: dnTitle.trim(),
        date: dnDate || undefined,
        time: dnTime || undefined,
        location: dnLocation.trim() || undefined,
        distance: dnDistance ? parseFloat(dnDistance) : undefined,
        category: dnCategory,
        description: dnDescription.trim() || undefined,
        estimatedCost: dnEstCost ? parseFloat(dnEstCost) : undefined,
        deals: dnDeals.trim() || undefined,
        reservationInfo: dnReservation.trim() || undefined,
        status: dnStatus,
        notes: dnNotes.trim() || undefined,
      });
      toast.success('Date night saved!');
      setShowAddModal(false);
      resetAddForm();
    });
  };

  const handleStatusChange = (id: number, status: DateStatus) => {
    if (status === 'completed') {
      const dn = dateNights.find((d) => d.id === id);
      setCompletingId(id);
      setCompleteActualCost(dn?.estimatedCost?.toString() || '');
      setCompleteRating(4);
      setCompleteNotes('');
      setShowCompleteModal(true);
      return;
    }
    startTransition(async () => {
      await updateDateNight(id, { status });
      toast.success(`Status updated to ${STATUS_CONFIG[status].label}`);
    });
  };

  const handleComplete = () => {
    if (!completingId) return;
    startTransition(async () => {
      await updateDateNight(completingId, {
        status: 'completed',
        actualCost: completeActualCost ? parseFloat(completeActualCost) : undefined,
        rating: completeRating,
        notes: completeNotes.trim() || undefined,
      });
      toast.success('Date night completed! How was it?');
      setShowCompleteModal(false);
      setCompletingId(null);
    });
  };

  const handleDelete = (id: number) => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) startTransition(async () => { await deleteDateNight(id); });
    }, 5000);
    toast('Date night removed', {
      duration: 5000,
      action: { label: 'Undo', onClick: () => { cancelled = true; clearTimeout(timer); } },
    });
  };

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(calYear - 1); setCalMonth(11); }
    else setCalMonth(calMonth - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(calYear + 1); setCalMonth(0); }
    else setCalMonth(calMonth + 1);
  };

  const monthName = new Date(calYear, calMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
            Date Night &amp; Happy Hours
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {upcoming.length} upcoming dates &bull; {happyHourDeals.length} happy hour spots
          </p>
        </div>
      </div>

      {/* Top-level tab bar */}
      <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTopTab('dates')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all',
            topTab === 'dates'
              ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white'
              : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300',
          )}
        >
          <Heart className="w-4 h-4" /> Date Nights
        </button>
        <button
          onClick={() => setTopTab('happyhours')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all',
            topTab === 'happyhours'
              ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white'
              : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300',
          )}
        >
          <Wine className="w-4 h-4" /> Happy Hours
        </button>
      </div>

      {/* ==================== HAPPY HOURS TAB ==================== */}
      {topTab === 'happyhours' && (
        <HappyHoursClient deals={happyHourDeals} today={today} />
      )}

      {/* ==================== DATE NIGHTS TAB ==================== */}
      {topTab === 'dates' && (<>

      {/* Sub-controls: view toggle + filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button onClick={() => { resetAddForm(); setShowAddModal(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Plan a Date
          </Button>
          <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
            <Button variant={view === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setView('list')}>
              List
            </Button>
            <Button variant={view === 'calendar' ? 'default' : 'ghost'} size="sm" onClick={() => setView('calendar')}>
              Calendar
            </Button>
          </div>
        </div>
        {view === 'list' && (
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setStatusFilter('all')}
              className={cn('px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors',
                statusFilter === 'all' ? 'bg-[#E07A3A]/10 text-[#E07A3A]' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700')}
            >
              All
            </button>
            {(Object.entries(STATUS_CONFIG) as [DateStatus, typeof STATUS_CONFIG[DateStatus]][]).map(([key, cfg]) => (
              <button key={key}
                onClick={() => setStatusFilter(key)}
                className={cn('px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors',
                  statusFilter === key ? cfg.color : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700')}
              >
                {cfg.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ==================== CALENDAR VIEW ==================== */}
      {view === 'calendar' && (
        <Card className="!p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>{monthName}</h2>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center text-[10px] font-medium text-neutral-400 py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const events = calDates.get(dateStr) || [];
              const isToday = dateStr === today;
              return (
                <div
                  key={day}
                  className={cn(
                    'aspect-square rounded-lg p-1 text-xs relative overflow-hidden',
                    isToday && 'ring-2 ring-[#E07A3A]',
                    events.length > 0 ? 'bg-pink-50 dark:bg-pink-950/30' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800',
                  )}
                >
                  <span className={cn('text-[10px] font-medium', isToday && 'text-[#E07A3A]')}>{day}</span>
                  {events.slice(0, 2).map((ev) => {
                    const catCfg = CATEGORY_CONFIG[ev.category as DateCategory];
                    return (
                      <div key={ev.id} className={cn('mt-0.5 px-1 py-0.5 rounded text-[8px] font-medium truncate', catCfg.bgColor, catCfg.color)}>
                        {ev.title}
                      </div>
                    );
                  })}
                  {events.length > 2 && (
                    <p className="text-[8px] text-neutral-400 mt-0.5">+{events.length - 2} more</p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ==================== LIST VIEW ==================== */}
      {view === 'list' && (
        <div className="space-y-3">
          {filteredDates.length === 0 ? (
            <Card className="!p-8 text-center">
              <Heart className="w-10 h-10 mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
              <p className="text-neutral-500 dark:text-neutral-400">
                {statusFilter === 'all' ? 'No date nights yet. Plan your first one!' : `No ${STATUS_CONFIG[statusFilter as DateStatus].label.toLowerCase()} dates.`}
              </p>
            </Card>
          ) : (
            filteredDates.map((dn) => {
              const catCfg = CATEGORY_CONFIG[dn.category as DateCategory];
              const statusCfg = STATUS_CONFIG[(dn.status as DateStatus) || 'idea'];
              const CatIcon = catCfg.icon;
              const isPast = dn.date && dn.date < today && dn.status !== 'completed' && dn.status !== 'cancelled';
              return (
                <Card key={dn.id} className={cn('!p-4', dn.status === 'cancelled' && 'opacity-50')}>
                  <div className="flex items-start gap-3">
                    {/* Category icon */}
                    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', catCfg.bgColor)}>
                      <CatIcon className={cn('w-5 h-5', catCfg.color)} />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>{dn.title}</h3>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold', statusCfg.color)}>
                              {statusCfg.label}
                            </span>
                            <Badge variant="secondary" className="text-[10px]">{catCfg.label}</Badge>
                            {isPast && (
                              <span className="text-[10px] text-amber-500 font-medium">Past due — mark complete?</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(dn.id)}
                          disabled={isPending}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400 flex-wrap">
                        {dn.date && (
                          <span className="flex items-center gap-0.5">
                            <Calendar className="w-3 h-3" /> {formatDate(dn.date)}
                          </span>
                        )}
                        {dn.time && (
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-3 h-3" /> {dn.time}
                          </span>
                        )}
                        {dn.location && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-3 h-3" /> {dn.location}
                          </span>
                        )}
                        {dn.distance != null && (
                          <span className="flex items-center gap-0.5 text-[#E07A3A]">
                            <MapPin className="w-3 h-3" /> {dn.distance.toFixed(1)} mi
                          </span>
                        )}
                      </div>

                      {dn.description && (
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">{dn.description}</p>
                      )}

                      <div className="flex items-center gap-3 text-xs flex-wrap">
                        {dn.estimatedCost && (
                          <span className="flex items-center gap-0.5 text-neutral-500">
                            <DollarSign className="w-3 h-3" /> Est. {formatCurrency(dn.estimatedCost)}
                          </span>
                        )}
                        {dn.actualCost && (
                          <span className="flex items-center gap-0.5 text-green-600 dark:text-green-400 font-medium">
                            <DollarSign className="w-3 h-3" /> Actual: {formatCurrency(dn.actualCost)}
                          </span>
                        )}
                        {dn.deals && (
                          <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                            <Tag className="w-3 h-3" /> {dn.deals}
                          </span>
                        )}
                      </div>

                      {dn.reservationInfo && (
                        <p className="text-[10px] text-blue-500">📋 {dn.reservationInfo}</p>
                      )}

                      {dn.rating && dn.rating > 0 && (
                        <StarDisplay value={dn.rating} />
                      )}

                      {dn.notes && (
                        <p className="text-xs text-neutral-400 italic">{dn.notes}</p>
                      )}

                      {/* Status actions */}
                      {dn.status !== 'completed' && dn.status !== 'cancelled' && (
                        <div className="flex gap-1.5 pt-1">
                          {dn.status === 'idea' && (
                            <Button size="sm" variant="outline" className="text-[10px] h-6 px-2"
                              onClick={() => handleStatusChange(dn.id, 'planned')} disabled={isPending}>
                              Plan it
                            </Button>
                          )}
                          {(dn.status === 'planned' || dn.status === 'idea') && (
                            <Button size="sm" variant="outline" className="text-[10px] h-6 px-2"
                              onClick={() => handleStatusChange(dn.id, 'booked')} disabled={isPending}>
                              Book it
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="text-[10px] h-6 px-2 text-green-600 border-green-300"
                            onClick={() => handleStatusChange(dn.id, 'completed')} disabled={isPending}>
                            <CheckCircle2 className="w-3 h-3" /> Done
                          </Button>
                          <Button size="sm" variant="outline" className="text-[10px] h-6 px-2 text-red-500 border-red-300"
                            onClick={() => handleStatusChange(dn.id, 'cancelled')} disabled={isPending}>
                            Cancel
                          </Button>
                        </div>
                      )}

                      {/* Itinerary section */}
                      {(() => {
                        const items = itineraryMap.get(dn.id) || [];
                        const isExpanded = expandedItinerary.has(dn.id);
                        const itineraryCost = items.reduce((sum, it) => sum + (it.cost || 0), 0);

                        // Group items by date for multi-day trips
                        const groupedByDate = new Map<string, DateItineraryItem[]>();
                        for (const item of items) {
                          const key = item.date || 'unscheduled';
                          const existing = groupedByDate.get(key) || [];
                          existing.push(item);
                          groupedByDate.set(key, existing);
                        }
                        const sortedDates = [...groupedByDate.keys()].sort((a, b) => a.localeCompare(b));
                        const isMultiDay = sortedDates.filter((d) => d !== 'unscheduled').length > 1;

                        return (
                          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
                            <button
                              onClick={() => toggleItinerary(dn.id)}
                              className="flex items-center gap-2 w-full text-left group"
                            >
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <CalendarCheck className="w-3.5 h-3.5 text-[#E07A3A]" />
                                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                                  Itinerary
                                </span>
                                {items.length > 0 && (
                                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                                    {items.length} stop{items.length !== 1 ? 's' : ''}
                                  </Badge>
                                )}
                                {itineraryCost > 0 && (
                                  <span className="text-[10px] text-neutral-400 ml-auto mr-2">
                                    {formatCurrency(itineraryCost)} total
                                  </span>
                                )}
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                              )}
                            </button>

                            {isExpanded && (
                              <div className="mt-3 space-y-4">
                                {items.length === 0 ? (
                                  <div className="text-center py-4">
                                    <CalendarCheck className="w-8 h-8 mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
                                    <p className="text-xs text-neutral-400">No itinerary yet</p>
                                    <p className="text-[10px] text-neutral-400 mt-0.5">Add flights, hotels, restaurants & more</p>
                                  </div>
                                ) : (
                                  sortedDates.map((dateKey) => {
                                    const dayItems = groupedByDate.get(dateKey) || [];
                                    const dayNum = dateKey !== 'unscheduled' && sortedDates.filter((d) => d !== 'unscheduled').indexOf(dateKey) + 1;
                                    return (
                                      <div key={dateKey}>
                                        {/* Day header for multi-day trips */}
                                        {(isMultiDay || dateKey !== 'unscheduled') && (
                                          <div className="flex items-center gap-2 mb-2">
                                            {isMultiDay && dayNum !== false && dayNum > 0 && (
                                              <span className="text-[10px] font-bold text-white bg-[#E07A3A] rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                                                {dayNum}
                                              </span>
                                            )}
                                            <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
                                              {dateKey === 'unscheduled' ? 'Unscheduled' : formatDate(dateKey)}
                                            </span>
                                            <div className="flex-1 border-b border-dashed border-neutral-200 dark:border-neutral-700" />
                                          </div>
                                        )}

                                        {/* Timeline */}
                                        <div className="relative ml-2">
                                          {/* Vertical line */}
                                          <div className="absolute left-3 top-3 bottom-3 w-px bg-neutral-200 dark:bg-neutral-700" />

                                          <div className="space-y-2">
                                            {dayItems.map((item, idx) => {
                                              const typeCfg = ITINERARY_TYPE_CONFIG[item.type as ItineraryType] || ITINERARY_TYPE_CONFIG.other;
                                              const statusCfg = ITINERARY_STATUS_CONFIG[(item.status as ItineraryStatus) || 'pending'];
                                              const TypeIcon = typeCfg.icon;
                                              return (
                                                <div key={item.id} className="relative flex items-start gap-3 pl-0">
                                                  {/* Timeline dot */}
                                                  <div className={cn('relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ring-2 ring-white dark:ring-neutral-900', typeCfg.bgColor)}>
                                                    <TypeIcon className={cn('w-3 h-3', typeCfg.color)} />
                                                  </div>

                                                  {/* Content card */}
                                                  <div className="flex-1 min-w-0 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-2.5 group/item">
                                                    <div className="flex items-start justify-between gap-2">
                                                      <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                          <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                                                            {item.title}
                                                          </span>
                                                          <span className={cn('inline-flex px-1.5 py-0 rounded-full text-[8px] font-semibold', statusCfg.color)}>
                                                            {statusCfg.label}
                                                          </span>
                                                        </div>

                                                        <div className="flex items-center gap-2.5 mt-1 text-[10px] text-neutral-500 dark:text-neutral-400 flex-wrap">
                                                          {(item.startTime || item.endTime) && (
                                                            <span className="flex items-center gap-0.5">
                                                              <Clock className="w-2.5 h-2.5" />
                                                              {item.startTime || '?'}{item.endTime ? ` – ${item.endTime}` : ''}
                                                            </span>
                                                          )}
                                                          {item.location && (
                                                            <span className="flex items-center gap-0.5">
                                                              <MapPin className="w-2.5 h-2.5" /> {item.location}
                                                            </span>
                                                          )}
                                                          {item.provider && (
                                                            <span className="text-neutral-400">{item.provider}</span>
                                                          )}
                                                        </div>

                                                        {item.confirmationNumber && (
                                                          <div className="flex items-center gap-1 mt-1">
                                                            <Hash className="w-2.5 h-2.5 text-blue-500" />
                                                            <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400">
                                                              {item.confirmationNumber}
                                                            </span>
                                                            <button
                                                              onClick={() => {
                                                                navigator.clipboard.writeText(item.confirmationNumber || '');
                                                                toast.success('Copied!');
                                                              }}
                                                              className="p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                                                            >
                                                              <Copy className="w-2.5 h-2.5 text-neutral-400" />
                                                            </button>
                                                          </div>
                                                        )}

                                                        {item.notes && (
                                                          <p className="text-[10px] text-neutral-400 mt-1 italic">{item.notes}</p>
                                                        )}
                                                      </div>

                                                      <div className="flex items-center gap-1 shrink-0">
                                                        {item.cost != null && item.cost > 0 && (
                                                          <span className="text-[10px] font-semibold text-green-600 dark:text-green-400">
                                                            {formatCurrency(item.cost)}
                                                          </span>
                                                        )}
                                                        <div className="opacity-0 group-hover/item:opacity-100 transition-opacity flex gap-0.5">
                                                          {item.status !== 'confirmed' && item.status !== 'completed' && (
                                                            <button
                                                              onClick={() => handleItineraryStatusChange(item.id, 'confirmed')}
                                                              disabled={isPending}
                                                              className="p-1 rounded hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
                                                              title="Confirm"
                                                            >
                                                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                                                            </button>
                                                          )}
                                                          <button
                                                            onClick={() => handleDeleteItineraryItem(item.id)}
                                                            disabled={isPending}
                                                            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                                                            title="Remove"
                                                          >
                                                            <Trash2 className="w-3 h-3 text-neutral-400 hover:text-red-500" />
                                                          </button>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })
                                )}

                                {/* Add itinerary item button */}
                                <button
                                  onClick={() => openAddItinerary(dn.id)}
                                  disabled={isPending}
                                  className="flex items-center gap-1.5 text-[10px] font-medium text-[#E07A3A] hover:text-[#c96a2f] transition-colors mt-2"
                                >
                                  <Plus className="w-3 h-3" /> Add stop
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ==================== ADD DATE NIGHT MODAL ==================== */}
      </>)}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>Plan a Date Night</DialogTitle>
            <DialogDescription>Ideas, plans, and reservations all in one place</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <label className="text-sm font-medium mb-1 block">Title *</label>
              <Input placeholder="Sushi & Movie Night, Hiking + Brunch..." value={dnTitle} onChange={(e) => setDnTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <div className="grid grid-cols-4 gap-2">
                {(Object.entries(CATEGORY_CONFIG) as [DateCategory, typeof CATEGORY_CONFIG[DateCategory]][]).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <button key={key} type="button" onClick={() => setDnCategory(key)}
                      className={cn('flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-[10px] font-medium border transition-colors',
                        dnCategory === key
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                          : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800')}>
                      <Icon className="w-4 h-4" />{cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <div className="flex gap-2 flex-wrap">
                {(['idea', 'planned', 'booked'] as DateStatus[]).map((s) => {
                  const cfg = STATUS_CONFIG[s];
                  return (
                    <button key={s} type="button" onClick={() => setDnStatus(s)}
                      className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                        dnStatus === s ? cfg.color + ' border-transparent' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400')}>
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Date</label>
                <Input type="date" value={dnDate} onChange={(e) => setDnDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Time</label>
                <Input type="time" value={dnTime} onChange={(e) => setDnTime(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
              <div>
                <label className="text-sm font-medium mb-1 block">Location</label>
                <Input placeholder="Restaurant, venue, park..." value={dnLocation} onChange={(e) => setDnLocation(e.target.value)} />
              </div>
              <div className="w-28">
                <label className="text-sm font-medium mb-1 block">Distance (mi)</label>
                <Input type="number" step="0.1" min="0" placeholder="3.2" value={dnDistance} onChange={(e) => setDnDistance(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Textarea placeholder="What's the plan?" value={dnDescription} onChange={(e) => setDnDescription(e.target.value)} rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Estimated Cost ($)</label>
              <Input type="number" step="0.01" min="0" placeholder="75.00" value={dnEstCost} onChange={(e) => setDnEstCost(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Deals / Coupons</label>
              <Input placeholder="Happy hour, Groupon, BOGO..." value={dnDeals} onChange={(e) => setDnDeals(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Reservation Info</label>
              <Input placeholder="Confirmation #, party size, special requests..." value={dnReservation} onChange={(e) => setDnReservation(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Textarea placeholder="Dress code, parking, ideas..." value={dnNotes} onChange={(e) => setDnNotes(e.target.value)} rows={2} />
            </div>
            <Button onClick={handleSave} disabled={isPending} className="w-full">
              {isPending ? 'Saving...' : 'Save Date Night'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== COMPLETE DATE MODAL ==================== */}
      <Dialog open={showCompleteModal} onOpenChange={setShowCompleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>How was the date?</DialogTitle>
            <DialogDescription>Rate it and log what you actually spent</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Rating</label>
              <StarRating value={completeRating} onChange={setCompleteRating} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Actual Cost ($)</label>
              <Input type="number" step="0.01" min="0" placeholder="80.00" value={completeActualCost} onChange={(e) => setCompleteActualCost(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Textarea placeholder="Great vibes, try the pasta next time..." value={completeNotes} onChange={(e) => setCompleteNotes(e.target.value)} rows={3} />
            </div>
            <Button onClick={handleComplete} disabled={isPending} className="w-full">
              {isPending ? 'Saving...' : 'Complete!'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== ADD ITINERARY ITEM MODAL ==================== */}
      <Dialog open={showItineraryModal} onOpenChange={setShowItineraryModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>Add Itinerary Stop</DialogTitle>
            <DialogDescription>
              {itineraryForDateId ? `Adding to: ${dateNights.find((d) => d.id === itineraryForDateId)?.title || 'Date Night'}` : 'Add a stop to your itinerary'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* Type selector */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Type</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.entries(ITINERARY_TYPE_CONFIG) as [ItineraryType, typeof ITINERARY_TYPE_CONFIG[ItineraryType]][]).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <button key={key} type="button" onClick={() => setItiType(key)}
                      className={cn('flex flex-col items-center gap-0.5 px-1.5 py-2 rounded-lg text-[9px] font-medium border transition-all',
                        itiType === key
                          ? 'border-[#E07A3A] bg-[#E07A3A]/5 text-[#E07A3A] shadow-sm'
                          : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800')}>
                      <Icon className="w-3.5 h-3.5" />{cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="text-sm font-medium mb-1 block">Title *</label>
              <Input
                placeholder={
                  itiType === 'flight' ? 'Spirit Airlines to LAX' :
                  itiType === 'hotel' ? 'The Venetian Resort' :
                  itiType === 'car_rental' ? 'Enterprise midsize SUV' :
                  itiType === 'restaurant' ? 'Gordon Ramsay Steak' :
                  'Description of this stop'
                }
                value={itiTitle}
                onChange={(e) => setItiTitle(e.target.value)}
              />
            </div>

            {/* Date + Times */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Date</label>
                <Input type="date" value={itiDate} onChange={(e) => setItiDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Start</label>
                <Input type="time" value={itiStartTime} onChange={(e) => setItiStartTime(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">End</label>
                <Input type="time" value={itiEndTime} onChange={(e) => setItiEndTime(e.target.value)} />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="text-sm font-medium mb-1 block">Location</label>
              <Input placeholder="Address or venue" value={itiLocation} onChange={(e) => setItiLocation(e.target.value)} />
            </div>

            {/* Provider + Confirmation */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Provider</label>
                <Input
                  placeholder={
                    itiType === 'flight' ? 'Spirit Airlines' :
                    itiType === 'hotel' ? 'Marriott' :
                    itiType === 'car_rental' ? 'Enterprise' :
                    'Company name'
                  }
                  value={itiProvider}
                  onChange={(e) => setItiProvider(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Confirmation #</label>
                <Input placeholder="ABC123" value={itiConfirmation} onChange={(e) => setItiConfirmation(e.target.value)} />
              </div>
            </div>

            {/* Cost + Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Cost ($)</label>
                <Input type="number" step="0.01" min="0" placeholder="150.00" value={itiCost} onChange={(e) => setItiCost(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <div className="flex gap-1.5 flex-wrap">
                  {(['pending', 'confirmed'] as ItineraryStatus[]).map((s) => {
                    const cfg = ITINERARY_STATUS_CONFIG[s];
                    return (
                      <button key={s} type="button" onClick={() => setItiStatus(s)}
                        className={cn('px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors',
                          itiStatus === s ? cfg.color + ' border-transparent' : 'border-neutral-200 dark:border-neutral-700 text-neutral-500')}>
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Textarea placeholder="Terminal 3, early check-in, window seat..." value={itiNotes} onChange={(e) => setItiNotes(e.target.value)} rows={2} />
            </div>

            <Button onClick={handleSaveItinerary} disabled={isPending} className="w-full">
              {isPending ? 'Saving...' : 'Add to Itinerary'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
