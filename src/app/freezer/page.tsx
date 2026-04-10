import { getFreezerInventory } from '@/db/queries/freezer';
import { getAllRecipes } from '@/db/queries/recipes';
import { FreezerClient } from '@/components/freezer/freezer-client';
import { daysUntil, todayISO } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function FreezerPage() {
  const [items, recipes] = await Promise.all([
    getFreezerInventory(),
    getAllRecipes(),
  ]);

  const freezerData = items.map(({ item, recipe }) => ({
    id: item.id,
    recipeId: item.recipeId,
    recipeName: recipe.name,
    quantity: item.quantity,
    dateFrozen: item.dateFrozen,
    expiryDate: item.expiryDate,
    daysRemaining: daysUntil(item.expiryDate),
    totalDays: recipe.freezerLifeDays ?? 90,
    notes: item.notes,
  }));

  return <FreezerClient freezerData={freezerData} recipes={recipes} today={todayISO()} />;
}
