'use client';

import React, { useState, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Snowflake,
  Minus,
  Plus,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { decrementFreezerItem, deleteFreezerItem, addToFreezer } from '@/db/queries/freezer';
import { logMeal } from '@/db/queries/meals';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import type { Recipe } from '@/db/schema';

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

interface Props {
  freezerData: FreezerData[];
  recipes: Recipe[];
  today: string;
  embedded?: boolean;
}

export function FreezerClient({ freezerData, recipes, today, embedded }: Props) {
  const [isPending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [addQuantity, setAddQuantity] = useState('5');

  const expiring = freezerData.filter((item) => item.daysRemaining < 7 && item.daysRemaining >= 0);

  const getMealTypeForNow = (): 'breakfast' | 'lunch' | 'dinner' | 'snack' => {
    const hour = new Date().getHours();
    if (hour < 10) return 'breakfast';
    if (hour < 14) return 'lunch';
    if (hour < 20) return 'dinner';
    return 'snack';
  };

  const handleDecrement = (item: FreezerData) => {
    startTransition(async () => {
      await decrementFreezerItem(item.id);
      const mealType = getMealTypeForNow();
      // Auto-log as meal for today, using time of day
      await logMeal({
        date: today,
        mealType,
        person: 'me' as const,
        recipeId: item.recipeId,
        servingsConsumed: 1,
      });
      toast.success(`Used 1 ${item.recipeName} — logged as ${mealType}`);
    });
  };

  const handleDelete = (id: number) => {
    startTransition(async () => {
      await deleteFreezerItem(id);
      toast.success('Removed from freezer');
    });
  };

  const handleAdd = () => {
    if (!selectedRecipeId) return;
    const recipe = recipes.find((r) => r.id === parseInt(selectedRecipeId));
    if (!recipe) return;

    startTransition(async () => {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + (recipe.freezerLifeDays ?? 90));
      await addToFreezer({
        recipeId: recipe.id,
        quantity: parseInt(addQuantity),
        dateFrozen: today,
        expiryDate: expiry.toISOString().split('T')[0],
      });
      toast.success(`Added ${addQuantity} servings of ${recipe.name} to freezer`);
      setAddOpen(false);
    });
  };

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
              Freezer Inventory
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
              {freezerData.reduce((sum, item) => sum + item.quantity, 0)} total servings frozen
            </p>
          </div>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" /> Add to Freezer
          </Button>
        </div>
      )}

      {/* Expiring soon warning */}
      {expiring.length > 0 && (
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <CardContent className="py-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-700 dark:text-red-400 text-sm">
                {expiring.length} item{expiring.length > 1 ? 's' : ''} expiring within 7 days
              </p>
              <p className="text-xs text-red-600 dark:text-red-500">
                {expiring.map((i) => i.recipeName).join(', ')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Freezer grid */}
      {freezerData.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Snowflake className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
            <p className="text-neutral-500 text-lg font-medium">Freezer is empty</p>
            <p className="text-sm text-neutral-400 mt-1">Prep some recipes to stock up!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {freezerData.map((item) => {
            const freshness = Math.max(0, (item.daysRemaining / item.totalDays) * 100);
            const color =
              item.daysRemaining < 7 ? 'bg-red-500' :
              item.daysRemaining < 14 ? 'bg-amber-500' :
              'bg-[#3A8A5C]';

            return (
              <Card key={item.id} className="animate-fade-in">
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                        {item.recipeName}
                      </h3>
                      <p className="text-xs text-neutral-500">Frozen {formatDate(item.dateFrozen)}</p>
                    </div>
                    <Badge
                      variant={
                        item.daysRemaining < 7 ? 'destructive' :
                        item.daysRemaining < 14 ? 'warning' :
                        'success'
                      }
                    >
                      {item.daysRemaining < 0 ? 'Expired' : `${item.daysRemaining}d`}
                    </Badge>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-neutral-500 mb-1">
                      <span>Freshness</span>
                      <span>Expires {formatDate(item.expiryDate)}</span>
                    </div>
                    <Progress value={freshness} indicatorClassName={color} />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{item.quantity}</span>
                    <span className="text-sm text-neutral-500">servings</span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="lg"
                      variant="outline"
                      className="flex-1 text-base"
                      onClick={() => handleDecrement(item)}
                      disabled={isPending || item.quantity <= 0}
                    >
                      <Minus className="w-5 h-5" /> Use 1
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-red-500"
                      onClick={() => handleDelete(item.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add to freezer dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Freezer</DialogTitle>
            <DialogDescription>Log items you&apos;ve frozen</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              value={selectedRecipeId}
              onChange={(e) => setSelectedRecipeId(e.target.value)}
              options={recipes.filter((r) => r.freezerFriendly).map((r) => ({
                value: String(r.id),
                label: r.name,
              }))}
              placeholder="Select a recipe"
            />
            <div>
              <label className="text-sm font-medium mb-1 block">Quantity (servings)</label>
              <Input
                type="number"
                value={addQuantity}
                onChange={(e) => setAddQuantity(e.target.value)}
                min={1}
              />
            </div>
            <Button onClick={handleAdd} disabled={!selectedRecipeId || isPending} className="w-full">
              {isPending ? 'Adding...' : 'Add to Freezer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
