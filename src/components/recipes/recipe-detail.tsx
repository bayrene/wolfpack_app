'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Clock,
  Snowflake,
  DollarSign,
  Lightbulb,
  Timer,
  Play,
  Pause,
  RotateCcw,
  ShoppingCart,
  ChefHat,
  ArrowLeft,
  Minus,
  Plus,
  Pencil,
  X,
  Save,
  Trash2,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { MEAL_TYPE_LABELS, DIFFICULTY_LABELS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import { addToFreezer } from '@/db/queries/freezer';
import { addRecipeToGroceryList, getActiveGroceryList } from '@/db/queries/grocery';
import { updateRecipe, deleteRecipe } from '@/db/queries/recipes';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import type { InstructionStep } from '@/lib/types';

interface RecipeIngredient {
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
}

interface RecipeData {
  id: number;
  name: string;
  description: string | null;
  category: string;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  servings: number | null;
  freezerFriendly: boolean | null;
  freezerLifeDays: number | null;
  fridgeLifeDays: number | null;
  costPerServing: number | null;
  difficulty: string | null;
  instructions: string | null;
  notes: string | null;
  ingredients: RecipeIngredient[];
}

function StepTimer({ seconds }: { seconds: number }) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || timeLeft <= 0) return;
    const interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [running, timeLeft]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg px-3 py-1.5 font-mono text-lg min-w-[80px] text-center">
        {mins}:{secs.toString().padStart(2, '0')}
      </div>
      {timeLeft > 0 ? (
        <Button size="icon" variant="outline" onClick={() => setRunning(!running)}>
          {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
      ) : (
        <Badge variant="success">Done!</Badge>
      )}
      <Button size="icon" variant="ghost" onClick={() => { setTimeLeft(seconds); setRunning(false); }}>
        <RotateCcw className="w-4 h-4" />
      </Button>
    </div>
  );
}

export function RecipeDetail({ recipe }: { recipe: RecipeData }) {
  const router = useRouter();
  const [servingsMultiplier, setServingsMultiplier] = useState(1);
  const [isPending, startTransition] = useTransition();

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState(recipe.name);
  const [editDescription, setEditDescription] = useState(recipe.description ?? '');
  const [editCategory, setEditCategory] = useState(recipe.category);
  const [editPrepTime, setEditPrepTime] = useState(String(recipe.prepTimeMinutes ?? ''));
  const [editCookTime, setEditCookTime] = useState(String(recipe.cookTimeMinutes ?? ''));
  const [editServings, setEditServings] = useState(String(recipe.servings ?? 4));
  const [editDifficulty, setEditDifficulty] = useState(recipe.difficulty ?? '');
  const [editCostPerServing, setEditCostPerServing] = useState(String(recipe.costPerServing ?? ''));
  const [editNotes, setEditNotes] = useState(recipe.notes ?? '');
  const [editFreezerFriendly, setEditFreezerFriendly] = useState(recipe.freezerFriendly ?? false);
  const [editFreezerLife, setEditFreezerLife] = useState(String(recipe.freezerLifeDays ?? ''));
  const [editFridgeLife, setEditFridgeLife] = useState(String(recipe.fridgeLifeDays ?? ''));

  const handleSaveEdit = () => {
    startTransition(async () => {
      await updateRecipe(recipe.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        category: editCategory as 'breakfast' | 'lunch' | 'dinner' | 'snack',
        prepTimeMinutes: editPrepTime ? parseInt(editPrepTime) : undefined,
        cookTimeMinutes: editCookTime ? parseInt(editCookTime) : undefined,
        servings: editServings ? parseInt(editServings) : undefined,
        difficulty: editDifficulty as 'beginner' | 'easy' | 'medium' | undefined,
        costPerServing: editCostPerServing ? parseFloat(editCostPerServing) : undefined,
        notes: editNotes.trim() || undefined,
        freezerFriendly: editFreezerFriendly,
        freezerLifeDays: editFreezerLife ? parseInt(editFreezerLife) : undefined,
        fridgeLifeDays: editFridgeLife ? parseInt(editFridgeLife) : undefined,
      });
      toast.success('Recipe updated!');
      setEditMode(false);
    });
  };

  const handleDeleteRecipe = () => {
    let cancelled = false;
    router.push('/recipes');
    const timer = setTimeout(() => {
      if (!cancelled) startTransition(async () => { await deleteRecipe(recipe.id); });
    }, 5000);
    toast('Recipe deleted', {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => {
          cancelled = true;
          clearTimeout(timer);
          router.push(`/recipes/${recipe.id}`);
        },
      },
    });
  };

  const baseServings = recipe.servings ?? 1;
  const adjustedServings = baseServings * servingsMultiplier;

  const instructions: InstructionStep[] = recipe.instructions ? JSON.parse(recipe.instructions) : [];

  // Calculate nutrition per serving
  let totalCal = 0, totalPro = 0, totalCarb = 0, totalFat = 0, totalFiber = 0;
  for (const ri of recipe.ingredients) {
    totalCal += ri.ingredient.caloriesPerUnit * ri.amount;
    totalPro += ri.ingredient.proteinPerUnit * ri.amount;
    totalCarb += ri.ingredient.carbsPerUnit * ri.amount;
    totalFat += ri.ingredient.fatPerUnit * ri.amount;
    totalFiber += ri.ingredient.fiberPerUnit * ri.amount;
  }
  const perServing = {
    calories: Math.round(totalCal / baseServings),
    protein: Math.round(totalPro / baseServings),
    carbs: Math.round(totalCarb / baseServings),
    fat: Math.round(totalFat / baseServings),
    fiber: Math.round(totalFiber / baseServings),
  };

  const handlePrepRecipe = () => {
    startTransition(async () => {
      const today = new Date().toISOString().split('T')[0];
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + (recipe.freezerLifeDays ?? 90));

      await addToFreezer({
        recipeId: recipe.id,
        quantity: adjustedServings,
        dateFrozen: today,
        expiryDate: expiryDate.toISOString().split('T')[0],
      });
      toast.success(`Added ${adjustedServings} servings to freezer!`);
    });
  };

  const handleAddToGrocery = () => {
    startTransition(async () => {
      const list = await getActiveGroceryList();
      const items = recipe.ingredients.map((ri) => ({
        ingredientId: ri.ingredient.id,
        name: ri.ingredient.name,
        amount: ri.amount * servingsMultiplier,
        unit: ri.unit,
        estimatedCost: ri.ingredient.avgPrice ?? undefined,
        store: ri.ingredient.storePreference ?? undefined,
      }));
      await addRecipeToGroceryList(list.id, items);
      toast.success('Added ingredients to grocery list!');
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back link */}
      <Link href="/recipes" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
        <ArrowLeft className="w-4 h-4" /> Back to recipes
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
            {recipe.name}
          </h1>
          <div className="flex items-center gap-2">
            <Badge variant={recipe.category as 'breakfast' | 'lunch' | 'dinner' | 'snack'}>
              {MEAL_TYPE_LABELS[recipe.category]}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditMode((v) => !v)}
              className="text-neutral-400 hover:text-[#E07A3A]"
            >
              {editMode ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        {recipe.description && !editMode && (
          <p className="text-neutral-500 dark:text-neutral-400 mt-2">{recipe.description}</p>
        )}
      </div>

      {/* Edit Panel */}
      {editMode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit Recipe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Name</label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Description</label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  placeholder="Brief description…"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-[#232321] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E07A3A]"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Difficulty</label>
                <select
                  value={editDifficulty}
                  onChange={(e) => setEditDifficulty(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-[#232321] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E07A3A]"
                >
                  <option value="">—</option>
                  <option value="beginner">Beginner</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Prep time (min)</label>
                <Input type="number" value={editPrepTime} onChange={(e) => setEditPrepTime(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Cook time (min)</label>
                <Input type="number" value={editCookTime} onChange={(e) => setEditCookTime(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Servings</label>
                <Input type="number" value={editServings} onChange={(e) => setEditServings(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Cost/serving ($)</label>
                <Input type="number" step="0.01" value={editCostPerServing} onChange={(e) => setEditCostPerServing(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Fridge life (days)</label>
                <Input type="number" value={editFridgeLife} onChange={(e) => setEditFridgeLife(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Freezer life (days)</label>
                <Input type="number" value={editFreezerLife} onChange={(e) => setEditFreezerLife(e.target.value)} />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="freezer-friendly"
                  checked={editFreezerFriendly}
                  onChange={(e) => setEditFreezerFriendly(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="freezer-friendly" className="text-sm font-medium">Freezer friendly</label>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Notes</label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  placeholder="Meal prep tips, variations…"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSaveEdit} disabled={isPending} className="flex-1">
                <Save className="w-4 h-4" /> {isPending ? 'Saving…' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={() => setEditMode(false)}>
                <X className="w-4 h-4" /> Cancel
              </Button>
              <Button variant="ghost" onClick={handleDeleteRecipe} disabled={isPending} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!editMode && <div>

        {/* Meta info */}
        <div className="flex flex-wrap gap-3 mt-4 text-sm">
          {recipe.prepTimeMinutes && (
            <span className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400">
              <Clock className="w-4 h-4" /> Prep: {recipe.prepTimeMinutes} min
            </span>
          )}
          {recipe.cookTimeMinutes && (
            <span className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400">
              <Clock className="w-4 h-4" /> Cook: {recipe.cookTimeMinutes} min
            </span>
          )}
          {recipe.costPerServing && (
            <span className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400">
              <DollarSign className="w-4 h-4" /> {formatCurrency(recipe.costPerServing)}/serving
            </span>
          )}
          {recipe.freezerFriendly && (
            <span className="flex items-center gap-1 text-blue-500">
              <Snowflake className="w-4 h-4" /> Freezer-friendly ({recipe.freezerLifeDays} days)
            </span>
          )}
          {recipe.difficulty && (
            <Badge variant="secondary">{DIFFICULTY_LABELS[recipe.difficulty]}</Badge>
          )}
        </div>
      </div>}

      {/* Servings adjuster */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <span className="font-medium">Servings</span>
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant="outline"
              onClick={() => setServingsMultiplier(Math.max(0.5, servingsMultiplier - 0.5))}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="text-lg font-bold min-w-[40px] text-center">{adjustedServings}</span>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setServingsMultiplier(servingsMultiplier + 0.5)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Nutrition per serving */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nutrition per Serving</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4 text-center">
            {[
              { label: 'Calories', value: perServing.calories, unit: '' },
              { label: 'Protein', value: perServing.protein, unit: 'g' },
              { label: 'Carbs', value: perServing.carbs, unit: 'g' },
              { label: 'Fat', value: perServing.fat, unit: 'g' },
              { label: 'Fiber', value: perServing.fiber, unit: 'g' },
            ].map(({ label, value, unit }) => (
              <div key={label}>
                <p className="text-2xl font-bold">{value}<span className="text-sm font-normal text-neutral-500">{unit}</span></p>
                <p className="text-xs text-neutral-500">{label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ingredients */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ingredients</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {recipe.ingredients.map((ri) => (
              <li key={ri.id} className="flex items-center justify-between py-1.5 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                <span className="text-sm">{ri.ingredient.name}</span>
                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  {Math.round(ri.amount * servingsMultiplier * 100) / 100} {ri.unit}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Instructions - Stepper */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {instructions.map((step, idx) => (
              <div key={step.step} className="relative pl-10">
                {/* Step number */}
                <div className="absolute left-0 top-0 w-7 h-7 rounded-full bg-[#E07A3A] text-white flex items-center justify-center text-sm font-bold">
                  {step.step}
                </div>
                {/* Connector line */}
                {idx < instructions.length - 1 && (
                  <div className="absolute left-3.5 top-8 w-px h-[calc(100%-8px)] bg-neutral-200 dark:bg-neutral-700" />
                )}

                <div className="space-y-2">
                  <h4 className="font-semibold text-base" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                    {step.title}
                  </h4>
                  <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                    {step.description}
                  </p>

                  {step.tip && (
                    <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-2">
                      <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-800 dark:text-amber-300">{step.tip}</p>
                    </div>
                  )}

                  {step.timer_seconds && (
                    <StepTimer seconds={step.timer_seconds} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {recipe.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-line">{recipe.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {recipe.freezerFriendly && (
          <Button size="lg" onClick={handlePrepRecipe} disabled={isPending} className="flex-1">
            <ChefHat className="w-4 h-4" />
            {isPending ? 'Logging...' : `Prep this recipe (${adjustedServings} servings → freezer)`}
          </Button>
        )}
        <Button size="lg" variant="outline" onClick={handleAddToGrocery} disabled={isPending} className="flex-1">
          <ShoppingCart className="w-4 h-4" />
          Add to grocery list
        </Button>
      </div>
    </div>
  );
}
