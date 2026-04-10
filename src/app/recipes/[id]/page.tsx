import { getRecipeById } from '@/db/queries/recipes';
import { RecipeDetail } from '@/components/recipes/recipe-detail';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = await getRecipeById(parseInt(id));

  if (!recipe) {
    notFound();
  }

  return <RecipeDetail recipe={recipe} />;
}
