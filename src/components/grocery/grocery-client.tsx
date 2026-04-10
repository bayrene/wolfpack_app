'use client';

import React, { useState, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Check,
  DollarSign,
  StickyNote,
} from 'lucide-react';
import { toggleGroceryItem, deleteGroceryItem, addGroceryItem } from '@/db/queries/grocery';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import type { Recipe, GroceryItem } from '@/db/schema';

interface GroceryListData {
  id: number;
  name: string | null;
  items: GroceryItem[];
}

interface Props {
  list: GroceryListData;
  recipes: Recipe[];
  embedded?: boolean;
}

export function GroceryClient({ list, recipes, embedded }: Props) {
  const [isPending, startTransition] = useTransition();
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('');
  const [dealNotes, setDealNotes] = useState('');

  const uncheckedItems = list.items.filter((i) => !i.checked);
  const checkedItems = list.items.filter((i) => i.checked);

  const estimatedTotal = list.items
    .filter((i) => !i.checked)
    .reduce((sum, i) => sum + (i.estimatedCost ?? 0), 0);

  // Group by store
  const groupedItems = new Map<string, GroceryItem[]>();
  for (const item of uncheckedItems) {
    const store = item.store ?? 'Other';
    if (!groupedItems.has(store)) groupedItems.set(store, []);
    groupedItems.get(store)!.push(item);
  }

  const handleToggle = (id: number) => {
    startTransition(async () => {
      await toggleGroceryItem(id);
    });
  };

  const handleDelete = (id: number) => {
    startTransition(async () => {
      await deleteGroceryItem(id);
      toast.success('Item removed');
    });
  };

  const handleAddItem = () => {
    if (!newItemName) return;
    startTransition(async () => {
      await addGroceryItem({
        listId: list.id,
        name: newItemName,
        amount: newItemAmount ? parseFloat(newItemAmount) : undefined,
        unit: newItemUnit || undefined,
      });
      setNewItemName('');
      setNewItemAmount('');
      setNewItemUnit('');
      toast.success('Item added');
    });
  };

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
              Grocery List
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
              {uncheckedItems.length} items remaining
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <DollarSign className="w-4 h-4 text-[#3A8A5C]" />
            <span>Est. {formatCurrency(estimatedTotal)}</span>
          </div>
        </div>
      )}

      {/* Deal notes */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-start gap-2">
            <StickyNote className="w-4 h-4 text-amber-500 mt-1 flex-shrink-0" />
            <Textarea
              value={dealNotes}
              onChange={(e) => setDealNotes(e.target.value)}
              placeholder="Deal notes — e.g., 'Walmart has chicken thighs at $0.99/lb this week'"
              className="min-h-[60px] text-sm border-0 p-0 focus-visible:ring-0 resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Add item */}
      <Card>
        <CardContent className="py-3">
          <div className="flex gap-2">
            <Input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Add an item..."
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
            />
            <Input
              value={newItemAmount}
              onChange={(e) => setNewItemAmount(e.target.value)}
              placeholder="Qty"
              type="number"
              className="w-20"
            />
            <Input
              value={newItemUnit}
              onChange={(e) => setNewItemUnit(e.target.value)}
              placeholder="Unit"
              className="w-20"
            />
            <Button onClick={handleAddItem} disabled={!newItemName || isPending}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Items grouped by store */}
      {Array.from(groupedItems.entries()).map(([store, items]) => (
        <Card key={store}>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-neutral-500 uppercase tracking-wider">
              {store}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0"
                >
                  <button
                    onClick={() => handleToggle(item.id)}
                    className="w-6 h-6 rounded-md border-2 border-neutral-300 dark:border-neutral-600 flex items-center justify-center hover:border-[#3A8A5C] transition-colors flex-shrink-0"
                  >
                    {item.checked && <Check className="w-4 h-4 text-[#3A8A5C]" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    {item.amount && (
                      <p className="text-xs text-neutral-500">
                        {item.amount} {item.unit}
                      </p>
                    )}
                  </div>
                  {item.estimatedCost && (
                    <span className="text-xs text-neutral-500">{formatCurrency(item.estimatedCost)}</span>
                  )}
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-neutral-400" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {uncheckedItems.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <ShoppingCart className="w-10 h-10 mx-auto text-neutral-300 mb-2" />
            <p className="text-neutral-500">Your grocery list is empty</p>
            <p className="text-sm text-neutral-400">Add items above or generate from a recipe</p>
          </CardContent>
        </Card>
      )}

      {/* Checked items */}
      {checkedItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-neutral-500">
              Checked ({checkedItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {checkedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-1.5"
                >
                  <button
                    onClick={() => handleToggle(item.id)}
                    className="w-6 h-6 rounded-md border-2 border-[#3A8A5C] bg-[#3A8A5C] flex items-center justify-center flex-shrink-0"
                  >
                    <Check className="w-4 h-4 text-white" />
                  </button>
                  <span className="text-sm text-neutral-400 line-through">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
