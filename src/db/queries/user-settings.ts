'use server';

import { db } from '@/db';
import { userSettings } from '@/db/schema';
import { revalidatePath } from 'next/cache';

async function ensureRow() {
  const existing = await db.select().from(userSettings).get();
  if (!existing) {
    await db.insert(userSettings).values({}).run();
  }
}

export async function getUserSettings() {
  await ensureRow();
  return (await db.select().from(userSettings).get())!;
}

export async function updateUserSettings(data: Partial<{
  name: string;
  dob: string;
  heightIn: number;
  weightLbs: number;
  sex: 'male' | 'female';
  caloriesTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  fiberTarget: number;
  vitaminATarget: number;
  vitaminCTarget: number;
  vitaminDTarget: number;
  vitaminB12Target: number;
  ironTarget: number;
  zincTarget: number;
  calciumTarget: number;
  magnesiumTarget: number;
  potassiumTarget: number;
  fastFoodWeeklyBaseline: number;
}>) {
  await ensureRow();
  await db.update(userSettings).set({ ...data, updatedAt: new Date().toISOString() }).run();
  revalidatePath('/');
  revalidatePath('/meals');
  revalidatePath('/settings');
}
