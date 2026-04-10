'use client';

import React, { useState, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChefHat,
  Clock,
  DollarSign,
  ShoppingCart,
  Check,
  Plus,
} from 'lucide-react';
import { logPrepSession } from '@/db/queries/prep';
import { addToFreezer } from '@/db/queries/freezer';
import { addRecipeToGroceryList, getActiveGroceryList } from '@/db/queries/grocery';
import { formatCurrency, formatDate } from '@/lib/utils';
import { MEAL_TYPE_LABELS } from '@/lib/constants';
import { toast } from 'sonner';
import type { Recipe, PrepSession } from '@/db/schema';

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

interface Props {
  recipes: RecipeWithIngredients[];
  sessions: PrepSession[];
  today: string;
  embedded?: boolean;
}

export function PrepClient({ recipes, sessions, today, embedded }: Props) {
  const [isPending, startTransition] = useTransition();
  const [selectedRecipes, setSelectedRecipes] = useState<Set<number>>(new Set());

  const selected = recipes.filter((r) => selectedRecipes.has(r.id));

  const totalCost = selected.reduce((sum, r) => sum + (r.costPerServing ?? 0) * (r.servings ?? 1), 0);
  const totalTime = selected.reduce(
    (sum, r) => sum + (r.prepTimeMinutes ?? 0) + (r.cookTimeMinutes ?? 0),
    0,
  );
  const totalServings = selected.reduce((sum, r) => sum + (r.servings ?? 1), 0);

  // Combined ingredient list
  const combinedIngredients = new Map<string, { name: string; amount: number; unit: string; ingredientId: number; store?: string }>();
  for (const recipe of selected) {
    for (const ri of recipe.ingredients) {
      const key = `${ri.ingredient.id}-${ri.unit}`;
      if (combinedIngredients.has(key)) {
        combinedIngredients.get(key)!.amount += ri.amount;
      } else {
        combinedIngredients.set(key, {
          name: ri.ingredient.name,
          amount: ri.amount,
          unit: ri.unit,
          ingredientId: ri.ingredient.id,
          store: ri.ingredient.storePreference ?? undefined,
        });
      }
    }
  }

  const toggleRecipe = (id: number) => {
    const next = new Set(selectedRecipes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRecipes(next);
  };

  const handleLogPrep = () => {
    startTransition(async () => {
      // Log prep session
      await logPrepSession({
        date: today,
        recipesPrepped: JSON.stringify(
          selected.map((r) => ({ recipe_id: r.id, batch_servings: r.servings ?? 1 })),
        ),
        totalCost,
        totalTimeMinutes: totalTime,
      });

      // Add to freezer
      for (const r of selected) {
        if (r.freezerFriendly) {
          const expiry = new Date();
          expiry.setDate(expiry.getDate() + (r.freezerLifeDays ?? 90));
          await addToFreezer({
            recipeId: r.id,
            quantity: r.servings ?? 1,
            dateFrozen: today,
            expiryDate: expiry.toISOString().split('T')[0],
          });
        }
      }

      toast.success('Prep session logged! Freezer updated.');
      setSelectedRecipes(new Set());
    });
  };

  const handleAddToGrocery = () => {
    startTransition(async () => {
      const list = await getActiveGroceryList();
      const items = Array.from(combinedIngredients.values()).map((ing) => ({
        ingredientId: ing.ingredientId,
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        store: ing.store,
      }));
      await addRecipeToGroceryList(list.id, items);
      toast.success('All ingredients added to grocery list!');
    });
  };

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
            Prep Planner
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
            Select recipes to batch cook
          </p>
        </div>
      )}

      {/* Recipe selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Choose Recipes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recipes.map((recipe) => {
              const isSelected = selectedRecipes.has(recipe.id);
              return (
                <button
                  key={recipe.id}
                  onClick={() => toggleRecipe(recipe.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    isSelected
                      ? 'border-[#E07A3A] bg-[#E07A3A]/5'
                      : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center ${
                          isSelected ? 'bg-[#E07A3A]' : 'border-2 border-neutral-300 dark:border-neutral-600'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{recipe.name}</p>
                        <p className="text-xs text-neutral-500">
                          {recipe.servings} servings • {(recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0)} min
                          {recipe.costPerServing && ` • ${formatCurrency(recipe.costPerServing)}/serving`}
                        </p>
                      </div>
                    </div>
                    <Badge variant={recipe.category as 'breakfast' | 'lunch' | 'dinner' | 'snack'}>
                      {MEAL_TYPE_LABELS[recipe.category]}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Prep summary */}
      {selected.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Prep Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center mb-4">
                <div>
                  <p className="text-2xl font-bold">{totalServings}</p>
                  <p className="text-xs text-neutral-500">Total servings</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(totalCost)}</p>
                  <p className="text-xs text-neutral-500">Total cost</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalTime} min</p>
                  <p className="text-xs text-neutral-500">Total time</p>
                </div>
              </div>

              {/* Cook schedule suggestion */}
              <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Suggested Schedule
                </h4>
                <div className="space-y-2">
                  {selected.map((recipe, idx) => {
                    const startMin = selected.slice(0, idx).reduce(
                      (sum, r) => sum + (r.prepTimeMinutes ?? 0),
                      0,
                    );
                    return (
                      <div key={recipe.id} className="flex items-center gap-3 text-sm">
                        <span className="font-mono text-xs text-neutral-500 w-16">
                          +{startMin} min
                        </span>
                        <div className="w-2 h-2 rounded-full bg-[#E07A3A]" />
                        <span>
                          Start <span className="font-medium">{recipe.name}</span>
                          <span className="text-neutral-500"> ({(recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0)} min)</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Combined grocery list */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" /> Combined Ingredients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {Array.from(combinedIngredients.values()).map((ing, i) => (
                  <div key={i} className="flex justify-between py-1.5 border-b border-neutral-100 dark:border-neutral-800 last:border-0 text-sm">
                    <span>{ing.name}</span>
                    <span className="font-medium text-neutral-600 dark:text-neutral-400">
                      {Math.round(ing.amount * 100) / 100} {ing.unit}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" onClick={handleLogPrep} disabled={isPending} className="flex-1">
              <ChefHat className="w-4 h-4" />
              {isPending ? 'Logging...' : 'Log Prep Session'}
            </Button>
            <Button size="lg" variant="outline" onClick={handleAddToGrocery} disabled={isPending} className="flex-1">
              <ShoppingCart className="w-4 h-4" />
              Add All to Grocery List
            </Button>
          </div>
        </>
      )}

      {/* Prep history */}
      {sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prep History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sessions.map((session) => {
                const prepped = session.recipesPrepped ? JSON.parse(session.recipesPrepped) : [];
                return (
                  <div key={session.id} className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{formatDate(session.date)}</p>
                      <p className="text-xs text-neutral-500">
                        {prepped.length} recipes • {session.totalTimeMinutes ?? '?'} min
                      </p>
                    </div>
                    {session.totalCost && (
                      <span className="text-sm font-medium">{formatCurrency(session.totalCost)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
