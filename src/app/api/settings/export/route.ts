import { NextResponse } from 'next/server';
import { db } from '@/db';
import { recipes, ingredients, recipeIngredients, mealLog, prepSessions, freezerInventory, groceryLists, groceryItems, priceHistory } from '@/db/schema';

export async function GET() {
  const data = {
    exportDate: new Date().toISOString(),
    recipes: db.select().from(recipes).all(),
    ingredients: db.select().from(ingredients).all(),
    recipeIngredients: db.select().from(recipeIngredients).all(),
    mealLog: db.select().from(mealLog).all(),
    prepSessions: db.select().from(prepSessions).all(),
    freezerInventory: db.select().from(freezerInventory).all(),
    groceryLists: db.select().from(groceryLists).all(),
    groceryItems: db.select().from(groceryItems).all(),
    priceHistory: db.select().from(priceHistory).all(),
  };

  return NextResponse.json(data);
}
