'use client';

import React, { useState, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Plus,
  Star,
  Store,
  Package,
  Calendar,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Trash2,
} from 'lucide-react';
import { addPriceEntry, deletePriceEntry } from '@/db/queries/prices';
import { formatCurrency, formatDate, todayISO } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { Ingredient, PriceHistoryEntry } from '@/db/schema';

interface Props {
  ingredient: Ingredient;
  prices: PriceHistoryEntry[];
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="p-0.5"
        >
          <Star
            className={`w-6 h-6 transition-colors ${
              star <= value
                ? 'fill-amber-400 text-amber-400'
                : 'text-neutral-300 dark:text-neutral-600 hover:text-amber-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export function IngredientDetail({ ingredient, prices }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [price, setPrice] = useState('');
  const [store, setStore] = useState('');
  const [date, setDate] = useState(todayISO());
  const [unitPurchased, setUnitPurchased] = useState(ingredient.purchaseUnit ?? '');
  const [qualityRating, setQualityRating] = useState(4);
  const [notes, setNotes] = useState('');

  // Compute price stats
  const avgPrice = prices.length > 0
    ? prices.reduce((sum, p) => sum + p.price, 0) / prices.length
    : null;
  const minPrice = prices.length > 0
    ? prices.reduce((min, p) => p.price < min.price ? p : min, prices[0])
    : null;
  const maxPrice = prices.length > 0
    ? prices.reduce((max, p) => p.price > max.price ? p : max, prices[0])
    : null;

  // Price by store
  const storeMap = new Map<string, { total: number; count: number; avgRating: number; ratingCount: number }>();
  for (const p of prices) {
    if (!storeMap.has(p.store)) storeMap.set(p.store, { total: 0, count: 0, avgRating: 0, ratingCount: 0 });
    const s = storeMap.get(p.store)!;
    s.total += p.price;
    s.count += 1;
    if (p.qualityRating) {
      s.avgRating += p.qualityRating;
      s.ratingCount += 1;
    }
  }

  const storeComparison = Array.from(storeMap.entries()).map(([storeName, data]) => ({
    store: storeName,
    avgPrice: Math.round((data.total / data.count) * 100) / 100,
    count: data.count,
    avgRating: data.ratingCount > 0 ? Math.round((data.avgRating / data.ratingCount) * 10) / 10 : null,
  })).sort((a, b) => a.avgPrice - b.avgPrice);

  // Chart data
  const chartData = [...prices].reverse().map((p) => ({
    date: p.date,
    price: p.price,
    store: p.store,
  }));

  const handleSubmit = () => {
    if (!price || !store) return;
    startTransition(async () => {
      await addPriceEntry({
        ingredientId: ingredient.id,
        price: parseFloat(price),
        store,
        date,
        unitPurchased: unitPurchased || undefined,
        qualityRating,
        notes: notes || undefined,
      });
      toast.success('Price logged!');
      setPrice('');
      setNotes('');
      setShowAddForm(false);
    });
  };

  const handleDelete = (id: number) => {
    startTransition(async () => {
      await deletePriceEntry(id);
      toast.success('Price entry removed');
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/ingredients" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
        <ArrowLeft className="w-4 h-4" /> Back to ingredients
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
          {ingredient.name}
        </h1>
        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-neutral-500">
          <span>Per {ingredient.defaultUnit}:</span>
          <span className="font-medium text-neutral-700 dark:text-neutral-300">{ingredient.caloriesPerUnit} cal</span>
          <span>{ingredient.proteinPerUnit}g protein</span>
          <span>{ingredient.carbsPerUnit}g carbs</span>
          <span>{ingredient.fatPerUnit}g fat</span>
          <span>{ingredient.fiberPerUnit}g fiber</span>
        </div>
        {ingredient.purchaseUnit && (
          <p className="text-sm text-neutral-500 mt-1 flex items-center gap-1">
            <Package className="w-3.5 h-3.5" /> Typically sold as: {ingredient.purchaseUnit}
          </p>
        )}
      </div>

      {/* Price stats */}
      {prices.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-xs text-neutral-500 mb-1">Average</p>
              <p className="text-xl font-bold">{avgPrice ? formatCurrency(avgPrice) : '—'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-xs text-[#3A8A5C] mb-1 flex items-center justify-center gap-1">
                <TrendingDown className="w-3 h-3" /> Best Price
              </p>
              <p className="text-xl font-bold text-[#3A8A5C]">
                {minPrice ? formatCurrency(minPrice.price) : '—'}
              </p>
              {minPrice && <p className="text-[10px] text-neutral-500">{minPrice.store}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-xs text-red-500 mb-1 flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3" /> Highest
              </p>
              <p className="text-xl font-bold text-red-500">
                {maxPrice ? formatCurrency(maxPrice.price) : '—'}
              </p>
              {maxPrice && <p className="text-[10px] text-neutral-500">{maxPrice.store}</p>}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Store comparison */}
      {storeComparison.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Store className="w-4 h-4" /> Store Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {storeComparison.map((s, idx) => (
                <div key={s.store} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {idx === 0 && <Badge variant="success" className="text-[10px]">Best Price</Badge>}
                    <span className="text-sm font-medium">{s.store}</span>
                    <span className="text-xs text-neutral-500">({s.count} purchase{s.count !== 1 ? 's' : ''})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.avgRating && (
                      <div className="flex items-center gap-1 text-xs">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {s.avgRating}
                      </div>
                    )}
                    <span className={`font-semibold text-sm ${idx === 0 ? 'text-[#3A8A5C]' : ''}`}>
                      {formatCurrency(s.avgPrice)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Price chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Price History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="date" tickFormatter={(d) => formatDate(d)} fontSize={11} />
                  <YAxis fontSize={12} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), 'Price']}
                    labelFormatter={(d) => formatDate(d as string)}
                  />
                  <Bar dataKey="price" fill="#E07A3A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log a price */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Log a Purchase
            </CardTitle>
            {!showAddForm && (
              <Button size="sm" onClick={() => setShowAddForm(true)}>
                <Plus className="w-4 h-4" /> Add Price
              </Button>
            )}
          </div>
        </CardHeader>
        {showAddForm && (
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Price *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="$0.00"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Store *</label>
                <Input
                  value={store}
                  onChange={(e) => setStore(e.target.value)}
                  placeholder="Walmart, Costco, etc."
                  list="store-suggestions"
                />
                <datalist id="store-suggestions">
                  <option value="Walmart" />
                  <option value="Costco" />
                  <option value="WinCo" />
                  <option value="Target" />
                  <option value="Kroger" />
                  <option value="Amazon" />
                  <option value="Aldi" />
                  <option value="Sam's Club" />
                </datalist>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Date</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Unit purchased</label>
                <Input
                  value={unitPurchased}
                  onChange={(e) => setUnitPurchased(e.target.value)}
                  placeholder="e.g., 2 lb tub"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Quality</label>
              <StarRating value={qualityRating} onChange={setQualityRating} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="On sale, bulk deal, brand comparison..."
                className="min-h-[60px]"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={!price || !store || isPending}>
                {isPending ? 'Saving...' : 'Log Price'}
              </Button>
              <Button variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Price history list */}
      {prices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {prices.map((p) => (
                <div
                  key={p.id}
                  className="flex items-start justify-between py-3 border-b border-neutral-100 dark:border-neutral-800 last:border-0"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{formatCurrency(p.price)}</span>
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">at {p.store}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <Calendar className="w-3 h-3" />
                      {formatDate(p.date)}
                      {p.unitPurchased && (
                        <>
                          <span className="text-neutral-300">•</span>
                          <Package className="w-3 h-3" />
                          {p.unitPurchased}
                        </>
                      )}
                    </div>
                    {p.qualityRating && (
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3 h-3 ${star <= p.qualityRating! ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'}`}
                          />
                        ))}
                      </div>
                    )}
                    {p.notes && (
                      <p className="text-xs text-neutral-500 italic">{p.notes}</p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-neutral-400 hover:text-red-500"
                    onClick={() => handleDelete(p.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
