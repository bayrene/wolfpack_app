export interface InstructionStep {
  step: number;
  title: string;
  description: string;
  timer_seconds?: number;
  tip?: string;
}

export interface PrepRecipeEntry {
  recipe_id: number;
  batch_servings: number;
}

export interface RecipeWithIngredients {
  id: number;
  name: string;
  description: string | null;
  category: string;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  servings: number | null;
  freezerFriendly: boolean | null;
  freezerLifeDays: number | null;
  fridgeLifeDays: number | null;
  costPerServing: number | null;
  difficulty: string | null;
  instructions: string | null;
  notes: string | null;
  imageUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  ingredients: {
    id: number;
    amount: number;
    unit: string;
    ingredient: {
      id: number;
      name: string;
      defaultUnit: string;
      caloriesPerUnit: number;
      proteinPerUnit: number;
      carbsPerUnit: number;
      fatPerUnit: number;
      fiberPerUnit: number;
      category: string;
    };
  }[];
}

export interface NutritionTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface Settings {
  targets: NutritionTargets;
  personNames: { me: string };
  fastFoodBaseline: number;
  theme: 'light' | 'dark' | 'system';
}
