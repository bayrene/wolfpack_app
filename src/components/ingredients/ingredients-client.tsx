'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Search,
  DollarSign,
  Star,
  TrendingDown,
  TrendingUp,
  Package,
  Store,
  Filter,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Ingredient, PriceHistoryEntry } from '@/db/schema';
import Link from 'next/link';

interface PriceWithIngredient {
  price: PriceHistoryEntry;
  ingredient: { id: number; name: string; category: string };
}

interface Props {
  ingredients: Ingredient[];
  recentPrices: PriceWithIngredient[];
  embedded?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  protein: 'Protein',
  grain: 'Grains',
  dairy: 'Dairy',
  vegetable: 'Vegetables',
  fruit: 'Fruit',
  condiment: 'Condiments',
  spice: 'Spices',
  other: 'Other',
};

const CATEGORY_COLORS: Record<string, string> = {
  protein: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  grain: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  dairy: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  vegetable: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  fruit: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  condiment: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  spice: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

function QualityStars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-3 h-3 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300 dark:text-neutral-600'}`}
        />
      ))}
    </div>
  );
}

export function IngredientsClient({ ingredients, recentPrices, embedded }: Props) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filtered = ingredients.filter((ing) => {
    const matchesSearch = ing.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || ing.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const categories = [...new Set(ingredients.map((i) => i.category))].sort();

  // Price insights
  const pricesByIngredient = new Map<number, PriceWithIngredient[]>();
  for (const entry of recentPrices) {
    const id = entry.ingredient.id;
    if (!pricesByIngredient.has(id)) pricesByIngredient.set(id, []);
    pricesByIngredient.get(id)!.push(entry);
  }

  // Find best deals (lowest price store per ingredient)
  const bestDeals = new Map<number, { store: string; price: number }>();
  for (const [id, entries] of pricesByIngredient) {
    const cheapest = entries.reduce((min, e) => e.price.price < min.price.price ? e : min);
    bestDeals.set(id, { store: cheapest.price.store, price: cheapest.price.price });
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
            Ingredients & Prices
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
            {ingredients.length} ingredients tracked • {recentPrices.length} price records
          </p>
        </div>
      )}

      {/* Search and filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ingredients..."
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Button
            size="sm"
            variant={categoryFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setCategoryFilter('all')}
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={categoryFilter === cat ? 'default' : 'outline'}
              onClick={() => setCategoryFilter(cat)}
              className="whitespace-nowrap"
            >
              {CATEGORY_LABELS[cat] ?? cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Recent price activity */}
      {recentPrices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-[#3A8A5C]" />
              Recent Price Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {recentPrices.slice(0, 10).map((entry) => (
                <div
                  key={entry.price.id}
                  className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <Link
                        href={`/ingredients/${entry.ingredient.id}`}
                        className="text-sm font-medium hover:text-[#E07A3A] transition-colors truncate block"
                      >
                        {entry.ingredient.name}
                      </Link>
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <Store className="w-3 h-3" />
                        {entry.price.store}
                        {entry.price.unitPurchased && (
                          <>
                            <span className="text-neutral-300 dark:text-neutral-600">•</span>
                            <Package className="w-3 h-3" />
                            {entry.price.unitPurchased}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {entry.price.qualityRating && (
                      <QualityStars rating={entry.price.qualityRating} />
                    )}
                    <span className="font-semibold text-sm">{formatCurrency(entry.price.price)}</span>
                    <span className="text-xs text-neutral-400">{formatDate(entry.price.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ingredient list */}
      <div className="space-y-2">
        {filtered.map((ing) => {
          const prices = pricesByIngredient.get(ing.id);
          const bestDeal = bestDeals.get(ing.id);

          return (
            <Link key={ing.id} href={`/ingredients/${ing.id}`}>
              <Card className="hover:shadow-md transition-shadow duration-150 cursor-pointer mb-2">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-sm truncate">{ing.name}</h3>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[ing.category]}`}>
                          {CATEGORY_LABELS[ing.category]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-neutral-500">
                        <span>{ing.caloriesPerUnit} cal/{ing.defaultUnit}</span>
                        <span>{ing.proteinPerUnit}g P</span>
                        <span>{ing.carbsPerUnit}g C</span>
                        <span>{ing.fatPerUnit}g F</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {bestDeal ? (
                        <div className="text-right">
                          <p className="font-semibold text-sm">{formatCurrency(bestDeal.price)}</p>
                          <p className="text-[10px] text-[#3A8A5C] font-medium">{bestDeal.store}</p>
                        </div>
                      ) : ing.avgPrice ? (
                        <div className="text-right">
                          <p className="font-semibold text-sm">{formatCurrency(ing.avgPrice)}</p>
                          {ing.storePreference && (
                            <p className="text-[10px] text-neutral-500">{ing.storePreference}</p>
                          )}
                        </div>
                      ) : null}
                      {prices && prices.length > 0 && (
                        <Badge variant="secondary" className="text-[10px]">
                          {prices.length} price{prices.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}

        {filtered.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-neutral-500">No ingredients found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
