import { getActiveGroceryList } from '@/db/queries/grocery';
import { getAllRecipes } from '@/db/queries/recipes';
import { getFreezerInventory } from '@/db/queries/freezer';
import { getAllIngredients } from '@/db/queries/ingredients';
import { getAllPriceHistory } from '@/db/queries/prices';
import { KitchenClient } from '@/components/kitchen/kitchen-client';
import { daysUntil, todayISO } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function KitchenPage() {
  const today = todayISO();

  const [groceryList, recipes, freezerItems, ingredients, priceHistory] = await Promise.all([
    getActiveGroceryList(),
    getAllRecipes(),
    getFreezerInventory(),
    getAllIngredients(),
    getAllPriceHistory(),
  ]);

  const freezerData = freezerItems.map(({ item, recipe }) => ({
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

  return (
    <KitchenClient
      groceryList={groceryList}
      recipes={recipes}
      freezerData={freezerData}
      ingredients={ingredients}
      recentPrices={priceHistory}
      today={today}
    />
  );
}
