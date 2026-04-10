'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RecipeGrid } from '@/components/recipes/recipe-grid';
import { IngredientsClient } from '@/components/ingredients/ingredients-client';
import { Input } from '@/components/ui/input';
import type { Recipe, Ingredient, PriceHistoryEntry } from '@/db/schema';

interface PriceWithIngredient {
  price: PriceHistoryEntry;
  ingredient: { id: number; name: string; category: string };
}

interface Props {
  recipes: Recipe[];
  ingredients: Ingredient[];
  recentPrices: PriceWithIngredient[];
}

type Tab = 'recipes' | 'ingredients';

const CATEGORIES = ['all', 'breakfast', 'lunch', 'dinner', 'snack'] as const;
const CATEGORY_LABELS: Record<string, string> = {
  all: 'All',
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export function RecipesPageClient({ recipes, ingredients, recentPrices }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('recipes');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredRecipes = useMemo(() => {
    let list = recipes;
    if (categoryFilter !== 'all') {
      list = list.filter((r) => r.category === categoryFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.description ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [recipes, search, categoryFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
          >
            Recipes
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
            {activeTab === 'recipes'
              ? `${filteredRecipes.length} of ${recipes.length} recipes`
              : `${ingredients.length} ingredients tracked`}
          </p>
        </div>
        {activeTab === 'recipes' && (
          <Link
            href="/recipes/new"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#E07A3A] text-white text-sm font-medium hover:bg-[#c96a2f] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Recipe
          </Link>
        )}
      </div>

      <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('recipes')}
          className={cn(
            'flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors',
            activeTab === 'recipes'
              ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white'
              : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          )}
        >
          Recipes
        </button>
        <button
          onClick={() => setActiveTab('ingredients')}
          className={cn(
            'flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors',
            activeTab === 'ingredients'
              ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white'
              : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          )}
        >
          Ingredients
        </button>
      </div>

      {activeTab === 'recipes' && (
        <>
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              placeholder="Search recipes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category filter pills */}
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                  categoryFilter === cat
                    ? 'bg-[#E07A3A] border-[#E07A3A] text-white'
                    : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-[#E07A3A] hover:text-[#E07A3A]'
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
                <button
                  onClick={() => { setSearch(''); setCategoryFilter('all'); }}
                  className="mt-2 text-sm text-[#E07A3A] hover:underline"
                >
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
        <IngredientsClient
          ingredients={ingredients}
          recentPrices={recentPrices}
          embedded
        />
      )}
    </div>
  );
}
