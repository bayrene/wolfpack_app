'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QuickLogModal } from '@/components/meals/quick-log-modal';
import { MEAL_TYPE_LABELS, MEAL_TYPE_COLORS } from '@/lib/constants';
import { format, addDays, parseISO } from 'date-fns';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { deleteMealLog } from '@/db/queries/meals';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Recipe } from '@/db/schema';

interface MealEntry {
  id: number;
  date: string;
  mealType: string;
  person: string;
  recipeName: string;
  servingsConsumed: number | null;
  customCalories: number | null;
  customProtein: number | null;
  customCarbs: number | null;
  customFat: number | null;
  notes: string | null;
  recipeCostPerServing: number | null;
}

interface Props {
  today: string;
  weekStart: string;
  weekEnd: string;
  weekOffset?: number;
  meals: MealEntry[];
  recipes: Recipe[];
  embedded?: boolean;
}

export function MealLogClient({ today, weekStart, weekEnd, weekOffset = 0, meals, recipes, embedded }: Props) {
  const router = useRouter();
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(() => {
    // If viewing a past/future week, default to the first day of that week
    if (weekOffset !== 0) return weekStart;
    return today;
  });
  const [mealType, setMealType] = useState<string>('breakfast');

  const goToPrevWeek = () => router.push(`/meals?offset=${weekOffset - 1}`);
  const goToNextWeek = () => {
    if (weekOffset < 0) router.push(`/meals?offset=${weekOffset + 1}`);
    else if (weekOffset === 0) return; // Can't go to future
    else router.push(`/meals?offset=${weekOffset + 1}`);
  };
  const goToCurrentWeek = () => router.push('/meals');

  const weekStartDate = parseISO(weekStart);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));

  const selectedDayMeals = meals.filter((m) => m.date === selectedDay);

  const handleDelete = (id: number) => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) deleteMealLog(id);
    }, 5000);
    toast('Meal removed', {
      duration: 5000,
      action: { label: 'Undo', onClick: () => { cancelled = true; clearTimeout(timer); } },
    });
  };

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
              Meal Log
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
              Week of {format(weekStartDate, 'MMM d')}
            </p>
          </div>
          <Button onClick={() => { setMealType('breakfast'); setQuickLogOpen(true); }}>
            <Plus className="w-4 h-4" /> Log Meal
          </Button>
        </div>
      )}

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={goToPrevWeek}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Prev
        </button>

        <div className="text-center">
          <p className="text-sm font-semibold">
            {format(weekStartDate, 'MMM d')} – {format(parseISO(weekEnd), 'MMM d, yyyy')}
          </p>
          {weekOffset !== 0 && (
            <button
              onClick={goToCurrentWeek}
              className="text-xs text-[#E07A3A] hover:underline mt-0.5"
            >
              Back to this week
            </button>
          )}
        </div>

        <button
          onClick={goToNextWeek}
          disabled={weekOffset >= 0}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Week calendar strip */}
      <Card>
        <CardContent className="py-3">
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isSelected = dateStr === selectedDay;
              const isToday = dateStr === today;
              const dayMeals = meals.filter((m) => m.date === dateStr);

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDay(dateStr)}
                  className={`flex flex-col items-center py-2 px-1 rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-[#E07A3A] text-white'
                      : isToday
                      ? 'bg-[#E07A3A]/10 text-[#E07A3A]'
                      : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  <span className="text-xs font-medium">{format(day, 'EEE')}</span>
                  <span className="text-lg font-bold">{format(day, 'd')}</span>
                  <div className="flex gap-0.5 mt-1">
                    {dayMeals.length > 0 &&
                      [...new Set(dayMeals.map((m) => m.mealType))].map((type) => (
                        <div
                          key={type}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: isSelected ? '#fff' : MEAL_TYPE_COLORS[type] }}
                        />
                      ))}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected day meals */}
      <div>
        <h2 className="font-semibold mb-3" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
          {format(parseISO(selectedDay), 'EEEE, MMMM d')}
        </h2>

        {selectedDayMeals.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-neutral-500">No meals logged for this day</p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => { setMealType('breakfast'); setQuickLogOpen(true); }}
              >
                <Plus className="w-4 h-4" /> Log a meal
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => {
              const typeMeals = selectedDayMeals.filter((m) => m.mealType === type);
              if (typeMeals.length === 0) return null;

              return (
                <Card key={type}>
                  <CardContent className="py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={type}>{MEAL_TYPE_LABELS[type]}</Badge>
                    </div>
                    <div className="space-y-2">
                      {typeMeals.map((meal) => (
                        <div key={meal.id} className="flex items-center justify-between py-1">
                          <div>
                            <p className="text-sm font-medium">{meal.recipeName}</p>
                            <p className="text-xs text-neutral-500">
                              {meal.customCalories ? `${meal.customCalories} cal` : ''}
                              {meal.customCalories && meal.notes ? ' • ' : ''}{meal.notes ?? ''}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDelete(meal.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <QuickLogModal
        open={quickLogOpen}
        onOpenChange={setQuickLogOpen}
        recipes={recipes}
        defaultMealType={mealType}
        today={selectedDay}
      />
    </div>
  );
}
