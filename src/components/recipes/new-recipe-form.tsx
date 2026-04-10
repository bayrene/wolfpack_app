'use client';

import React, { useState, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { createRecipe } from '@/db/queries/recipes';
import { createIngredient } from '@/db/queries/ingredients';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { Ingredient } from '@/db/schema';

const CATEGORIES = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

const DIFFICULTIES = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
];

interface RecipeIngredient {
  ingredientId: number;
  name: string;
  amount: number;
  unit: string;
}

interface InstructionStep {
  title: string;
  description: string;
  tip?: string;
  timer_seconds?: number;
}

export function NewRecipeForm({ ingredients }: { ingredients: Ingredient[] }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();

  // Step 1: Basic info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('dinner');
  const [difficulty, setDifficulty] = useState('beginner');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('4');
  const [freezerFriendly, setFreezerFriendly] = useState(false);
  const [freezerLifeDays, setFreezerLifeDays] = useState('90');
  const [fridgeLifeDays, setFridgeLifeDays] = useState('5');
  const [costPerServing, setCostPerServing] = useState('');

  // Step 2: Ingredients
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [ingAmount, setIngAmount] = useState('');
  const [ingUnit, setIngUnit] = useState('');

  // Step 3: Instructions
  const [instructions, setInstructions] = useState<InstructionStep[]>([]);
  const [stepTitle, setStepTitle] = useState('');
  const [stepDesc, setStepDesc] = useState('');
  const [stepTip, setStepTip] = useState('');
  const [stepTimer, setStepTimer] = useState('');

  const filteredIngredients = ingredients.filter((i) =>
    i.name.toLowerCase().includes(ingredientSearch.toLowerCase()),
  );

  const addIngredient = () => {
    if (!selectedIngredient || !ingAmount) return;
    setRecipeIngredients([
      ...recipeIngredients,
      {
        ingredientId: selectedIngredient.id,
        name: selectedIngredient.name,
        amount: parseFloat(ingAmount),
        unit: ingUnit || selectedIngredient.defaultUnit,
      },
    ]);
    setSelectedIngredient(null);
    setIngredientSearch('');
    setIngAmount('');
    setIngUnit('');
  };

  const addStep = () => {
    if (!stepTitle || !stepDesc) return;
    setInstructions([
      ...instructions,
      {
        title: stepTitle,
        description: stepDesc,
        tip: stepTip || undefined,
        timer_seconds: stepTimer ? parseInt(stepTimer) * 60 : undefined,
      },
    ]);
    setStepTitle('');
    setStepDesc('');
    setStepTip('');
    setStepTimer('');
  };

  const handleSubmit = () => {
    startTransition(async () => {
      const id = await createRecipe({
        name,
        description: description || undefined,
        category: category as 'breakfast' | 'lunch' | 'dinner' | 'snack',
        prepTimeMinutes: prepTime ? parseInt(prepTime) : undefined,
        cookTimeMinutes: cookTime ? parseInt(cookTime) : undefined,
        servings: parseInt(servings),
        freezerFriendly,
        freezerLifeDays: freezerFriendly ? parseInt(freezerLifeDays) : undefined,
        fridgeLifeDays: parseInt(fridgeLifeDays),
        costPerServing: costPerServing ? parseFloat(costPerServing) : undefined,
        difficulty: difficulty as 'beginner' | 'easy' | 'medium',
        instructions: JSON.stringify(
          instructions.map((s, i) => ({ step: i + 1, ...s })),
        ),
        ingredients: recipeIngredients,
      });
      toast.success('Recipe created!');
      router.push(`/recipes/${id}`);
    });
  };

  return (
    <div className="space-y-6">
      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                s === step
                  ? 'bg-[#E07A3A] text-white'
                  : s < step
                  ? 'bg-[#3A8A5C] text-white'
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'
              }`}
            >
              {s < step ? <Check className="w-4 h-4" /> : s}
            </div>
            {s < 4 && <div className="w-8 h-px bg-neutral-300 dark:bg-neutral-600" />}
          </div>
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Recipe Name *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Chicken Stir Fry" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Category *</label>
                <Select value={category} onChange={(e) => setCategory(e.target.value)} options={CATEGORIES} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Difficulty</label>
                <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} options={DIFFICULTIES} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Prep (min)</label>
                <Input type="number" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Cook (min)</label>
                <Input type="number" value={cookTime} onChange={(e) => setCookTime(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Servings *</label>
                <Input type="number" value={servings} onChange={(e) => setServings(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Cost per serving ($)</label>
                <Input type="number" step="0.01" value={costPerServing} onChange={(e) => setCostPerServing(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Fridge life (days)</label>
                <Input type="number" value={fridgeLifeDays} onChange={(e) => setFridgeLifeDays(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="freezer"
                checked={freezerFriendly}
                onChange={(e) => setFreezerFriendly(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <label htmlFor="freezer" className="text-sm font-medium">Freezer-friendly</label>
              {freezerFriendly && (
                <Input
                  type="number"
                  value={freezerLifeDays}
                  onChange={(e) => setFreezerLifeDays(e.target.value)}
                  className="w-24"
                  placeholder="days"
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Ingredients */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Ingredients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recipeIngredients.length > 0 && (
              <div className="space-y-2">
                {recipeIngredients.map((ri, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800">
                    <span className="text-sm">{ri.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{ri.amount} {ri.unit}</span>
                      <Button size="icon" variant="ghost" onClick={() => setRecipeIngredients(recipeIngredients.filter((_, j) => j !== i))}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2 border border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg p-3">
              <Input
                value={ingredientSearch}
                onChange={(e) => { setIngredientSearch(e.target.value); setSelectedIngredient(null); }}
                placeholder="Search ingredients..."
              />
              {ingredientSearch && !selectedIngredient && (
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {filteredIngredients.slice(0, 8).map((ing) => (
                    <button
                      key={ing.id}
                      className="w-full text-left px-2 py-1 text-sm rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      onClick={() => {
                        setSelectedIngredient(ing);
                        setIngredientSearch(ing.name);
                        setIngUnit(ing.defaultUnit);
                      }}
                    >
                      {ing.name} <span className="text-neutral-500">({ing.defaultUnit})</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedIngredient && (
                <div className="flex gap-2">
                  <Input type="number" value={ingAmount} onChange={(e) => setIngAmount(e.target.value)} placeholder="Amount" className="w-24" />
                  <Input value={ingUnit} onChange={(e) => setIngUnit(e.target.value)} placeholder="Unit" className="w-24" />
                  <Button onClick={addIngredient} disabled={!ingAmount}>
                    <Plus className="w-4 h-4" /> Add
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Instructions */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {instructions.length > 0 && (
              <div className="space-y-3">
                {instructions.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-neutral-100 dark:border-neutral-800">
                    <div className="w-6 h-6 rounded-full bg-[#E07A3A] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{s.title}</p>
                      <p className="text-xs text-neutral-500 line-clamp-2">{s.description}</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => setInstructions(instructions.filter((_, j) => j !== i))}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2 border border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg p-3">
              <Input value={stepTitle} onChange={(e) => setStepTitle(e.target.value)} placeholder="Step title (e.g., 'Cook the chicken')" />
              <Textarea value={stepDesc} onChange={(e) => setStepDesc(e.target.value)} placeholder="Detailed instructions..." />
              <div className="grid grid-cols-2 gap-2">
                <Input value={stepTip} onChange={(e) => setStepTip(e.target.value)} placeholder="Tip (optional)" />
                <Input type="number" value={stepTimer} onChange={(e) => setStepTimer(e.target.value)} placeholder="Timer (minutes, optional)" />
              </div>
              <Button onClick={addStep} disabled={!stepTitle || !stepDesc} variant="outline">
                <Plus className="w-4 h-4" /> Add Step
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Save</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-neutral-500">Recipe Name</p>
              <p className="font-semibold">{name}</p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-neutral-500">Category</p>
                <Badge variant={category as 'breakfast' | 'lunch' | 'dinner' | 'snack'}>{category}</Badge>
              </div>
              <div>
                <p className="text-neutral-500">Servings</p>
                <p className="font-medium">{servings}</p>
              </div>
              <div>
                <p className="text-neutral-500">Difficulty</p>
                <p className="font-medium">{difficulty}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-neutral-500">Ingredients ({recipeIngredients.length})</p>
              <ul className="text-sm mt-1 space-y-1">
                {recipeIngredients.map((ri, i) => (
                  <li key={i}>{ri.amount} {ri.unit} {ri.name}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm text-neutral-500">Steps ({instructions.length})</p>
              <ul className="text-sm mt-1 space-y-1">
                {instructions.map((s, i) => (
                  <li key={i}>{i + 1}. {s.title}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        {step < 4 ? (
          <Button onClick={() => setStep(step + 1)} disabled={step === 1 && !name}>
            Next <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isPending || !name}>
            {isPending ? 'Saving...' : 'Save Recipe'}
          </Button>
        )}
      </div>
    </div>
  );
}
