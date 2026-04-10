import { getActiveGroceryList } from '@/db/queries/grocery';
import { getAllRecipes } from '@/db/queries/recipes';
import { GroceryClient } from '@/components/grocery/grocery-client';

export const dynamic = 'force-dynamic';

export default async function GroceryPage() {
  const [list, recipes] = await Promise.all([
    getActiveGroceryList(),
    getAllRecipes(),
  ]);

  return <GroceryClient list={list} recipes={recipes} />;
}
