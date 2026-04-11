'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GroceryClient } from '@/components/grocery/grocery-client';
import { FreezerClient } from '@/components/freezer/freezer-client';
import { RecipeGrid } from '@/components/recipes/recipe-grid';
import { IngredientsClient } from '@/components/ingredients/ingredients-client';
import { Input } from '@/components/ui/input';
import type { Recipe, PrepSession, GroceryItem, Ingredient, PriceHistoryEntry } from '@/db/schema';

interface GroceryListData {
  id: number;
  name: string | null;
  items: GroceryItem[];
}

interface FreezerData {
  id: number;
  recipeId: number;
  recipeName: string;
  quantity: number;
  dateFrozen: string;
  expiryDate: string;
  daysRemaining: number;
  totalDays: number;
  notes: string | null;
}

interface RecipeWithIngredients extends Recipe {
  ingredients: {
    id: number;
    amount: number;
    unit: string;
    ingredient: {
      id: number;
      name: string;
      defaultUnit: string;
      caloriesPerUnit: number;
      proteinPerUnit: number;
      carbsPerUnit: number;
      fatPerUnit: number;
      fiberPerUnit: number;
      category: string;
      avgPrice?: number | null;
      purchaseUnit?: string | null;
      storePreference?: string | null;
    };
  }[];
}

interface PriceWithIngredient {
  price: PriceHistoryEntry;
  ingredient: { id: number; name: string; category: string };
}

type Tab = 'recipes' | 'ingredients' | 'grocery' | 'freezer';

const TABS: { key: Tab; label: string }[] = [
  { key: 'recipes', label: 'Recipes' },
  { key: 'ingredients', label: 'Ingredients' },
  { key: 'grocery', label: 'Grocery' },
  { key: 'freezer', label: 'Freezer' },
];

const RECIPE_CATEGORIES = ['all', 'breakfast', 'lunch', 'dinner', 'snack'] as const;
const CATEGORY_LABELS: Record<string, string> = {
  all: 'All', breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack',
};

interface Props {
  groceryList: GroceryListData;
  recipes: Recipe[];
  freezerData: FreezerData[];
  ingredients: Ingredient[];
  recentPrices: PriceWithIngredient[];
  today: string;
}

export function KitchenClient({
  groceryList,
  recipes,
  freezerData,
  ingredients,
  recentPrices,
  today,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('recipes');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredRecipes = useMemo(() => {
    let list = recipes;
    if (categoryFilter !== 'all') list = list.filter(r => r.category === categoryFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(r => r.name.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q));
    }
    return list;
  }, [recipes, search, categoryFilter]);

  const subtitle = {
    recipes: `${filteredRecipes.length} of ${recipes.length} recipes`,
    ingredients: `${ingredients.length} ingredients tracked`,
    grocery: 'Shopping list',
    freezer: 'Freezer inventory',
  }[activeTab];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24 md:pb-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
            Kitchen
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">{subtitle}</p>
        </div>
        {activeTab === 'recipes' && (
          <Link
            href="/recipes/new"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#E07A3A] text-white text-sm font-medium hover:bg-[#c96a2f] transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Recipe
          </Link>
        )}
      </div>

      <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap',
              activeTab === tab.key
                ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white'
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'recipes' && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              placeholder="Search recipes…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {RECIPE_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                  categoryFilter === cat
                    ? 'bg-[#E07A3A] border-[#E07A3A] text-white'
                    : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-[#E07A3A] hover:text-[#E07A3A]',
                )}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
          {filteredRecipes.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              <p className="text-sm">No recipes match your search.</p>
              {(search || categoryFilter !== 'all') && (
                <button onClick={() => { setSearch(''); setCategoryFilter('all'); }} className="mt-2 text-sm text-[#E07A3A] hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <RecipeGrid recipes={filteredRecipes} />
          )}
        </>
      )}

      {activeTab === 'ingredients' && (
        <IngredientsClient ingredients={ingredients} recentPrices={recentPrices} embedded />
      )}

      {activeTab === 'grocery' && (
        <GroceryClient list={groceryList} recipes={recipes} embedded />
      )}

      {activeTab === 'freezer' && (
        <FreezerClient
          freezerData={freezerData}
          recipes={recipes}
          today={today}
          embedded
        />
      )}

    </div>
  );
}
