'use server';

import { db } from '@/db';
import { happyHourDeals } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getAllHappyHours() {
  return db.select().from(happyHourDeals).orderBy(desc(happyHourDeals.favorite), happyHourDeals.restaurant).all();
}

export async function addHappyHour(data: {
  restaurant: string;
  address?: string;
  distance?: number;
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  deals: string;
  drinkSpecials?: string;
  foodSpecials?: string;
  rating?: number;
  favorite?: boolean;
  website?: string;
  phone?: string;
  notes?: string;
  lastVisited?: string;
}) {
  await db.insert(happyHourDeals).values(data).run();
  revalidatePath('/dates');
}

export async function updateHappyHour(id: number, data: Partial<{
  restaurant: string;
  address: string;
  distance: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  deals: string;
  drinkSpecials: string;
  foodSpecials: string;
  rating: number;
  favorite: boolean;
  website: string;
  phone: string;
  notes: string;
  lastVisited: string;
}>) {
  await db.update(happyHourDeals).set(data).where(eq(happyHourDeals.id, id)).run();
  revalidatePath('/dates');
}

export async function toggleHappyHourFavorite(id: number, favorite: boolean) {
  await db.update(happyHourDeals).set({ favorite }).where(eq(happyHourDeals.id, id)).run();
  revalidatePath('/dates');
}

export async function deleteHappyHour(id: number) {
  await db.delete(happyHourDeals).where(eq(happyHourDeals.id, id)).run();
  revalidatePath('/dates');
}
