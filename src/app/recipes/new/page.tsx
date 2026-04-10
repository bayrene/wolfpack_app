import { getAllIngredients } from '@/db/queries/ingredients';
import { NewRecipeForm } from '@/components/recipes/new-recipe-form';

export const dynamic = 'force-dynamic';

export default async function NewRecipePage() {
  const ingredients = await getAllIngredients();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
          Add New Recipe
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
          Build your recipe step by step
        </p>
      </div>
      <NewRecipeForm ingredients={ingredients} />
    </div>
  );
}
