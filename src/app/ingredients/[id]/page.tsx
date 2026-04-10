import { db } from '@/db';
import { ingredients } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getPriceHistory } from '@/db/queries/prices';
import { IngredientDetail } from '@/components/ingredients/ingredient-detail';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function IngredientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ingredient = await db.select().from(ingredients).where(eq(ingredients.id, parseInt(id))).get();

  if (!ingredient) {
    notFound();
  }

  const prices = await getPriceHistory(ingredient.id);

  return <IngredientDetail ingredient={ingredient} prices={prices} />;
}
