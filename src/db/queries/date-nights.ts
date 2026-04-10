'use server';

import { db } from '@/db';
import { dateNights, dateItineraryItems } from '@/db/schema';
import { eq, desc, asc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getAllDateNights() {
  return db.select().from(dateNights).orderBy(desc(dateNights.date)).all();
}

export async function addDateNight(data: {
  title: string;
  date?: string;
  time?: string;
  location?: string;
  category: 'dinner' | 'movie' | 'activity' | 'outdoor' | 'home' | 'travel' | 'event' | 'other';
  description?: string;
  estimatedCost?: number;
  deals?: string;
  reservationInfo?: string;
  status?: 'idea' | 'planned' | 'booked' | 'completed' | 'cancelled';
  distance?: number;
  notes?: string;
}) {
  await db.insert(dateNights).values(data).run();
  revalidatePath('/dates');
}

export async function updateDateNight(id: number, data: Partial<{
  title: string;
  date: string;
  time: string;
  location: string;
  category: 'dinner' | 'movie' | 'activity' | 'outdoor' | 'home' | 'travel' | 'event' | 'other';
  description: string;
  estimatedCost: number;
  actualCost: number;
  deals: string;
  reservationInfo: string;
  status: 'idea' | 'planned' | 'booked' | 'completed' | 'cancelled';
  rating: number;
  distance: number;
  notes: string;
}>) {
  await db.update(dateNights).set(data).where(eq(dateNights.id, id)).run();
  revalidatePath('/dates');
}

export async function deleteDateNight(id: number) {
  await db.delete(dateNights).where(eq(dateNights.id, id)).run();
  revalidatePath('/dates');
}

// --- Itinerary Items ---

export async function getItineraryForDateNight(dateNightId: number) {
  return db.select().from(dateItineraryItems)
    .where(eq(dateItineraryItems.dateNightId, dateNightId))
    .orderBy(asc(dateItineraryItems.date), asc(dateItineraryItems.sortOrder))
    .all();
}

export async function getAllItineraryItems() {
  return db.select().from(dateItineraryItems)
    .orderBy(asc(dateItineraryItems.dateNightId), asc(dateItineraryItems.date), asc(dateItineraryItems.sortOrder))
    .all();
}

export async function addItineraryItem(data: {
  dateNightId: number;
  sortOrder?: number;
  type: 'flight' | 'car_rental' | 'hotel' | 'restaurant' | 'activity' | 'show' | 'bar' | 'spa' | 'shopping' | 'transport' | 'checkout' | 'other';
  title: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  provider?: string;
  confirmationNumber?: string;
  cost?: number;
  details?: string;
  notes?: string;
  status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}) {
  await db.insert(dateItineraryItems).values(data).run();
  revalidatePath('/dates');
}

export async function updateItineraryItem(id: number, data: Partial<{
  sortOrder: number;
  type: 'flight' | 'car_rental' | 'hotel' | 'restaurant' | 'activity' | 'show' | 'bar' | 'spa' | 'shopping' | 'transport' | 'checkout' | 'other';
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  provider: string;
  confirmationNumber: string;
  cost: number;
  details: string;
  notes: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}>) {
  await db.update(dateItineraryItems).set(data).where(eq(dateItineraryItems.id, id)).run();
  revalidatePath('/dates');
}

export async function deleteItineraryItem(id: number) {
  await db.delete(dateItineraryItems).where(eq(dateItineraryItems.id, id)).run();
  revalidatePath('/dates');
}
