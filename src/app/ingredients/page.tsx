import { getAllIngredients } from '@/db/queries/ingredients';
import { getAllPriceHistory } from '@/db/queries/prices';
import { IngredientsClient } from '@/components/ingredients/ingredients-client';

export const dynamic = 'force-dynamic';

export default async function IngredientsPage() {
  const [ingredients, priceHistory] = await Promise.all([
    getAllIngredients(),
    getAllPriceHistory(),
  ]);

  return (
    <IngredientsClient
      ingredients={ingredients}
      recentPrices={priceHistory}
    />
  );
}
