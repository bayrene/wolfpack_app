'use client';

import React, { useState } from 'react';
import { MealLogClient } from '@/components/meals/meal-log-client';
import { NutritionClient } from '@/components/nutrition/nutrition-client';
import { QuickLogModal } from '@/components/meals/quick-log-modal';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
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

interface DayData {
  date: string;
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
  meals: { name: string; mealType: string; calories: number; protein: number; carbs: number; fat: number; servings: number }[];
  waterOz: number;
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

interface Props {
  today: string;
  weekStart: string;
  weekEnd: string;
  weekOffset: number;
  meals: MealEntry[];
  recipes: Recipe[];
  dailyData: DayData[];
  targets: { calories: number; protein: number; carbs: number; fat: number };
  microTargets: MicroTargets;
  fastFoodBaseline: number;
}

type Tab = 'log' | 'nutrition';

export function MealsWrapper({
  today,
  weekStart,
  weekEnd,
  weekOffset,
  meals,
  recipes,
  dailyData,
  targets,
  microTargets,
  fastFoodBaseline,
}: Props) {
  const [tab, setTab] = useState<Tab>('log');
  const [quickLogOpen, setQuickLogOpen] = useState(false);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24 md:pb-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
            Meals
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
            Log meals &amp; track nutrition
          </p>
        </div>
        <Button onClick={() => setQuickLogOpen(true)}>
          <Plus className="w-4 h-4" /> Log Meal
        </Button>
      </div>

      <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
        {([
          { key: 'log' as const, label: 'Log' },
          { key: 'nutrition' as const, label: 'Nutrition' },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              tab === key
                ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white'
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'log' && (
        <MealLogClient
          today={today}
          weekStart={weekStart}
          weekEnd={weekEnd}
          weekOffset={weekOffset}
          meals={meals}
          recipes={recipes}
          embedded
        />
      )}

      {tab === 'nutrition' && (
        <NutritionClient
          today={today}
          dailyData={dailyData}
          targets={targets}
          microTargets={microTargets}
          fastFoodBaseline={fastFoodBaseline}
          embedded
        />
      )}

      <QuickLogModal
        open={quickLogOpen}
        onOpenChange={setQuickLogOpen}
        recipes={recipes}
        defaultMealType="snack"
        today={today}
      />
    </div>
  );
}
