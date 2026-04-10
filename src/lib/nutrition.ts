export interface MacroSummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export function emptyMacros(): MacroSummary {
  return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
}

export function addMacros(a: MacroSummary, b: MacroSummary): MacroSummary {
  return {
    calories: a.calories + b.calories,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
    fiber: a.fiber + b.fiber,
  };
}

export function scaleMacros(macros: MacroSummary, factor: number): MacroSummary {
  return {
    calories: Math.round(macros.calories * factor),
    protein: Math.round(macros.protein * factor * 10) / 10,
    carbs: Math.round(macros.carbs * factor * 10) / 10,
    fat: Math.round(macros.fat * factor * 10) / 10,
    fiber: Math.round(macros.fiber * factor * 10) / 10,
  };
}

export function macroPercentages(macros: MacroSummary): { protein: number; carbs: number; fat: number } {
  const totalCals = macros.protein * 4 + macros.carbs * 4 + macros.fat * 9;
  if (totalCals === 0) return { protein: 0, carbs: 0, fat: 0 };
  return {
    protein: Math.round((macros.protein * 4 / totalCals) * 100),
    carbs: Math.round((macros.carbs * 4 / totalCals) * 100),
    fat: Math.round((macros.fat * 9 / totalCals) * 100),
  };
}
