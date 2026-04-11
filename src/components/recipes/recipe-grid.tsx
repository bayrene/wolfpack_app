'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Snowflake, DollarSign, Flame, Trash2 } from 'lucide-react';
import { MEAL_TYPE_LABELS, DIFFICULTY_LABELS } from '@/lib/constants';
import { deleteRecipe } from '@/db/queries/recipes';
import type { Recipe } from '@/db/schema';

export function RecipeGrid({ recipes: initialRecipes }: { recipes: Recipe[] }) {
  const [recipes, setRecipes] = useState(initialRecipes);

  async function handleDelete(e: React.MouseEvent, id: number) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this recipe?')) return;
    setRecipes(r => r.filter(x => x.id !== id));
    await deleteRecipe(id);
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {recipes.map((recipe, i) => (
        <Link key={recipe.id} href={`/recipes/${recipe.id}`}>
          <Card className={`h-full hover:shadow-md transition-shadow duration-150 cursor-pointer animate-fade-in stagger-${Math.min(i + 1, 6)}`}>
            <CardContent className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-base leading-tight" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                  {recipe.name}
                </h3>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant={recipe.category as 'breakfast' | 'lunch' | 'dinner' | 'snack'}>
                    {MEAL_TYPE_LABELS[recipe.category]}
                  </Badge>
                  <button
                    onClick={(e) => handleDelete(e, recipe.id)}
                    className="p-1 rounded text-neutral-500 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {recipe.description && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2">
                  {recipe.description}
                </p>
              )}

              <div className="flex flex-wrap gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                {recipe.cookTimeMinutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {(recipe.prepTimeMinutes ?? 0) + recipe.cookTimeMinutes} min
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" />
                  {recipe.servings} servings
                </span>
                {recipe.costPerServing && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    ${recipe.costPerServing}/serving
                  </span>
                )}
                {recipe.freezerFriendly && (
                  <span className="flex items-center gap-1 text-blue-500">
                    <Snowflake className="w-3.5 h-3.5" />
                    Freezer
                  </span>
                )}
              </div>

              {recipe.difficulty && (
                <Badge variant="secondary" className="text-xs">
                  {DIFFICULTY_LABELS[recipe.difficulty]}
                </Badge>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
