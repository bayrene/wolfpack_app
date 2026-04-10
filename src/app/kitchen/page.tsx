import { getActiveGroceryList } from '@/db/queries/grocery';
import { getAllRecipes, getRecipeById } from '@/db/queries/recipes';
import { getFreezerInventory } from '@/db/queries/freezer';
import { getPrepSessions } from '@/db/queries/prep';
import { getAllIngredients } from '@/db/queries/ingredients';
import { getAllPriceHistory } from '@/db/queries/prices';
import { KitchenClient } from '@/components/kitchen/kitchen-client';
import { daysUntil, todayISO } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function KitchenPage() {
  const today = todayISO();

  const [groceryList, recipes, freezerItems, prepSessions, ingredients, priceHistory] = await Promise.all([
    getActiveGroceryList(),
    getAllRecipes(),
    getFreezerInventory(),
    getPrepSessions(),
    getAllIngredients(),
    getAllPriceHistory(),
  ]);

  // Transform freezer data (same as freezer/page.tsx)
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

  // Enrich recipes with ingredients for prep (same as prep/page.tsx)
  const prepRecipes = await Promise.all(
    recipes.map(async (r) => {
      const detail = await getRecipeById(r.id);
      return {
        ...r,
        ingredients: detail?.ingredients ?? [],
      };
    }),
  );

  return (
    <KitchenClient
      groceryList={groceryList}
      recipes={recipes}
      freezerData={freezerData}
      prepRecipes={prepRecipes}
      prepSessions={prepSessions}
      ingredients={ingredients}
      recentPrices={priceHistory}
      today={today}
    />
  );
}
