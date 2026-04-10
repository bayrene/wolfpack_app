import { getAllRecipes, getRecipeById } from '@/db/queries/recipes';
import { getPrepSessions } from '@/db/queries/prep';
import { PrepClient } from '@/components/prep/prep-client';
import { todayISO } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function PrepPage() {
  const [recipes, sessions] = await Promise.all([
    getAllRecipes(),
    getPrepSessions(),
  ]);

  // Get ingredients for each recipe
  const recipesWithIngredients = await Promise.all(
    recipes.map(async (r) => {
      const detail = await getRecipeById(r.id);
      return {
        ...r,
        ingredients: detail?.ingredients ?? [],
      };
    }),
  );

  return (
    <PrepClient
      recipes={recipesWithIngredients}
      sessions={sessions}
      today={todayISO()}
    />
  );
}
