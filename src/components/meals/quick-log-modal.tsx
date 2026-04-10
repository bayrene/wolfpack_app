'use client';

import React, { useState, useTransition, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { logMeal } from '@/db/queries/meals';
import { MEAL_TYPE_LABELS } from '@/lib/constants';
import { toast } from 'sonner';
import { Utensils, PenLine, Minus, Plus, Search, X, ScanBarcode, Loader2 } from 'lucide-react';
import type { Recipe } from '@/db/schema';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipes: Recipe[];
  defaultMealType: string;
  today: string;
}

type Step = 'source' | 'recipe' | 'servings' | 'custom' | 'barcode' | 'done';

export function QuickLogModal({ open, onOpenChange, recipes, defaultMealType, today }: Props) {
  const [step, setStep] = useState<Step>('source');
  const [isPending, startTransition] = useTransition();

  // Recipe selection state
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [servings, setServings] = useState(1);
  const [recipeSearch, setRecipeSearch] = useState('');

  // Custom entry state
  const [customName, setCustomName] = useState('');
  const [customCalories, setCustomCalories] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [customServings, setCustomServings] = useState(1);

  // Barcode state
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);

  const categoryMatches = recipes.filter((r) => r.category === defaultMealType);
  const baseList = categoryMatches.length > 0 ? categoryMatches : recipes;
  const filteredRecipes = recipeSearch.trim()
    ? recipes.filter((r) => r.name.toLowerCase().includes(recipeSearch.trim().toLowerCase()))
    : baseList;

  // Stop camera stream when leaving barcode step
  useEffect(() => {
    if (step !== 'barcode') {
      stopCamera();
    }
  }, [step]);

  function stopCamera() {
    scanningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      // Use BarcodeDetector if available
      if ('BarcodeDetector' in window) {
        scanningRef.current = true;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new (window as any).BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });
        const tick = async () => {
          if (!scanningRef.current || !videoRef.current) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              scanningRef.current = false;
              stopCamera();
              await lookupBarcode(barcodes[0].rawValue);
              return;
            }
          } catch { /* continue */ }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    } catch {
      toast.error('Camera access denied — use manual entry below');
    }
  }

  async function lookupBarcode(code: string) {
    setBarcodeLoading(true);
    try {
      const res = await fetch(`/api/barcode/${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Not found');
      setCustomName(data.name ?? '');
      setCustomCalories(data.calories != null ? String(Math.round(data.calories)) : '');
      setCustomProtein(data.protein != null ? String(data.protein) : '');
      setCustomCarbs(data.carbs != null ? String(data.carbs) : '');
      setCustomFat(data.fat != null ? String(data.fat) : '');
      setStep('custom');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Product not found');
    } finally {
      setBarcodeLoading(false);
    }
  }

  const reset = () => {
    setStep('source');
    setSelectedRecipe(null);
    setServings(1);
    setCustomName('');
    setCustomCalories('');
    setCustomProtein('');
    setCustomCarbs('');
    setCustomFat('');
    setCustomServings(1);
    setRecipeSearch('');
    setBarcodeInput('');
    stopCamera();
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const handleSelectRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setServings(1);
    setStep('servings');
  };

  const handleConfirmRecipe = () => {
    if (!selectedRecipe) return;
    startTransition(async () => {
      await logMeal({
        date: today,
        mealType: defaultMealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
        person: 'me' as const,
        recipeId: selectedRecipe.id,
        servingsConsumed: servings,
      });
      toast.success(`${servings}x ${selectedRecipe.name} logged!`);
      handleClose(false);
    });
  };

  const handleCustomSubmit = () => {
    if (!customName) return;
    startTransition(async () => {
      await logMeal({
        date: today,
        mealType: defaultMealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
        person: 'me' as const,
        customName,
        servingsConsumed: customServings,
        customCalories: customCalories ? parseFloat(customCalories) : undefined,
        customProtein: customProtein ? parseFloat(customProtein) : undefined,
        customCarbs: customCarbs ? parseFloat(customCarbs) : undefined,
        customFat: customFat ? parseFloat(customFat) : undefined,
      });
      toast.success(`${customServings}x ${customName} logged!`);
      handleClose(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Log {MEAL_TYPE_LABELS[defaultMealType]}
          </DialogTitle>
          <DialogDescription>
            {step === 'source' && 'Log from a recipe, scan a barcode, or quick entry'}
            {step === 'recipe' && 'Pick a recipe'}
            {step === 'servings' && `How many servings of ${selectedRecipe?.name}?`}
            {step === 'custom' && 'Quick entry'}
            {step === 'barcode' && 'Scan product barcode or enter manually'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Source */}
        {step === 'source' && (
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              size="xl"
              className="flex flex-col gap-1 h-20"
              onClick={() => setStep('recipe')}
            >
              <Utensils className="w-5 h-5" />
              My Recipes
            </Button>
            <Button
              variant="outline"
              size="xl"
              className="flex flex-col gap-1 h-20"
              onClick={() => { setStep('barcode'); setTimeout(startCamera, 100); }}
            >
              <ScanBarcode className="w-5 h-5" />
              Scan
            </Button>
            <Button
              variant="outline"
              size="xl"
              className="flex flex-col gap-1 h-20"
              onClick={() => setStep('custom')}
            >
              <PenLine className="w-5 h-5" />
              Quick Entry
            </Button>
          </div>
        )}

        {/* Step 3a: Recipe picker */}
        {step === 'recipe' && (
          <div className="space-y-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Search recipes…"
                value={recipeSearch}
                onChange={(e) => setRecipeSearch(e.target.value)}
                className="pl-9 pr-9 h-9"
                autoFocus
              />
              {recipeSearch && (
                <button
                  onClick={() => setRecipeSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="max-h-[40vh] overflow-y-auto space-y-1.5 pt-1">
              {filteredRecipes.map((recipe) => (
                <button
                  key={recipe.id}
                  className="w-full text-left p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
                  onClick={() => handleSelectRecipe(recipe)}
                  disabled={isPending}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{recipe.name}</p>
                      <p className="text-xs text-neutral-500">
                        {recipe.servings} servings{recipe.costPerServing ? ` • $${recipe.costPerServing}/serving` : ''}
                      </p>
                    </div>
                    <Badge variant={recipe.category as 'breakfast' | 'lunch' | 'dinner' | 'snack'}>
                      {MEAL_TYPE_LABELS[recipe.category]}
                    </Badge>
                  </div>
                </button>
              ))}
              {filteredRecipes.length === 0 && (
                <p className="text-sm text-neutral-500 text-center py-4">
                  {recipeSearch ? 'No recipes match your search.' : 'No recipes yet. Add some first!'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step: Servings picker for recipe */}
        {step === 'servings' && selectedRecipe && (
          <div className="space-y-5">
            <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
              <p className="font-medium text-sm">{selectedRecipe.name}</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                {selectedRecipe.servings} servings per batch
                {selectedRecipe.costPerServing ? ` • $${selectedRecipe.costPerServing}/serving` : ''}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-3 block text-center">How many servings?</label>
              <div className="flex items-center justify-center gap-4">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-12 w-12 rounded-xl"
                  onClick={() => setServings(Math.max(0.5, servings - 0.5))}
                >
                  <Minus className="w-5 h-5" />
                </Button>
                <div className="text-center min-w-[80px]">
                  <span className="text-3xl font-bold">{servings}</span>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {servings === 1 ? 'serving' : 'servings'}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-12 w-12 rounded-xl"
                  onClick={() => setServings(servings + 0.5)}
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
              {/* Quick picks */}
              <div className="flex justify-center gap-2 mt-3">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => setServings(n)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      servings === n
                        ? 'border-[#E07A3A] bg-[#E07A3A]/10 text-[#E07A3A]'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {n}x
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleConfirmRecipe}
              disabled={isPending}
              className="w-full"
              size="lg"
            >
              {isPending ? 'Logging...' : `Log ${servings}x ${selectedRecipe.name}`}
            </Button>
          </div>
        )}

        {/* Step: Custom entry */}
        {step === 'custom' && (
          <div className="space-y-3">
            <Input
              placeholder="What did you eat?"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              autoFocus
              className="text-base h-12"
            />
            {/* Servings for custom too */}
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">How many?</label>
              <div className="flex items-center gap-3">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 rounded-lg"
                  onClick={() => setCustomServings(Math.max(0.5, customServings - 0.5))}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-lg font-bold min-w-[40px] text-center">{customServings}</span>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 rounded-lg"
                  onClick={() => setCustomServings(customServings + 0.5)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <span className="text-xs text-neutral-500">{customServings === 1 ? 'serving' : 'servings'}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Calories (per serving)"
                type="number"
                value={customCalories}
                onChange={(e) => setCustomCalories(e.target.value)}
              />
              <Input
                placeholder="Protein (g)"
                type="number"
                value={customProtein}
                onChange={(e) => setCustomProtein(e.target.value)}
              />
              <Input
                placeholder="Carbs (g)"
                type="number"
                value={customCarbs}
                onChange={(e) => setCustomCarbs(e.target.value)}
              />
              <Input
                placeholder="Fat (g)"
                type="number"
                value={customFat}
                onChange={(e) => setCustomFat(e.target.value)}
              />
            </div>
            <Button
              onClick={handleCustomSubmit}
              disabled={!customName || isPending}
              className="w-full"
              size="lg"
            >
              {isPending ? 'Logging...' : `Log ${customServings > 1 ? customServings + 'x ' : ''}${customName || 'Meal'}`}
            </Button>
          </div>
        )}

        {/* Step: Barcode scanner */}
        {step === 'barcode' && (
          <div className="space-y-4">
            {typeof window !== 'undefined' && 'BarcodeDetector' in window ? (
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                {/* Scan overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-32 border-2 border-white/70 rounded-lg" />
                </div>
                {barcodeLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-neutral-500 text-center">Camera scanning not supported on this browser.</p>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Or enter barcode manually…"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && barcodeInput.trim()) lookupBarcode(barcodeInput.trim());
                }}
                className="flex-1"
              />
              <Button
                onClick={() => barcodeInput.trim() && lookupBarcode(barcodeInput.trim())}
                disabled={!barcodeInput.trim() || barcodeLoading}
                size="default"
              >
                {barcodeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Look up'}
              </Button>
            </div>
          </div>
        )}

        {/* Back button */}
        {step !== 'source' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (step === 'recipe' || step === 'custom' || step === 'barcode') setStep('source');
              if (step === 'servings') setStep('recipe');
            }}
          >
            ← Back
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
