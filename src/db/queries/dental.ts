'use server';

import { db } from '@/db';
import { dentalProducts, dentalLog, dentalCheckups, gumHealthLog, dentalDocuments, dentalContacts } from '@/db/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// --- Products ---

export async function getAllDentalProducts() {
  return db.select().from(dentalProducts).orderBy(desc(dentalProducts.createdAt)).all();
}

export async function addDentalProduct(data: {
  name: string;
  brand: string;
  category: 'toothbrush' | 'toothpaste' | 'water_flosser' | 'floss_pick' | 'whitener' | 'mouthwash' | 'other';
  model?: string;
  price?: number;
  purchaseDate?: string;
  replacementFrequencyDays?: number;
  notes?: string;
}) {
  await db.insert(dentalProducts).values(data).run();
  revalidatePath('/teeth');
}

export async function updateDentalProduct(id: number, data: Partial<{
  name: string;
  brand: string;
  category: 'toothbrush' | 'toothpaste' | 'water_flosser' | 'floss_pick' | 'whitener' | 'mouthwash' | 'other';
  model: string;
  price: number;
  purchaseDate: string;
  replacementFrequencyDays: number;
  notes: string;
  active: boolean;
}>) {
  await db.update(dentalProducts).set(data).where(eq(dentalProducts.id, id)).run();
  revalidatePath('/teeth');
  revalidatePath('/grooming');
}

export async function deleteDentalProduct(id: number) {
  await db.delete(dentalProducts).where(eq(dentalProducts.id, id)).run();
  revalidatePath('/teeth');
}

// --- Daily Log ---

export async function getDentalLogs(startDate: string, endDate: string) {
  return db
    .select()
    .from(dentalLog)
    .where(and(gte(dentalLog.date, startDate), lte(dentalLog.date, endDate)))
    .orderBy(desc(dentalLog.date), desc(dentalLog.time))
    .all();
}

export async function getAllDentalLogs() {
  return db.select().from(dentalLog).orderBy(desc(dentalLog.date), desc(dentalLog.time)).all();
}

export async function addDentalLog(data: {
  date: string;
  time: string;
  activity: 'brush' | 'water_flosser' | 'floss_pick' | 'whitener' | 'mouthwash';
  duration?: number;
  productId?: number;
  notes?: string;
}) {
  await db.insert(dentalLog).values(data).run();
  revalidatePath('/teeth');
}

export async function deleteDentalLog(id: number) {
  await db.delete(dentalLog).where(eq(dentalLog.id, id)).run();
  revalidatePath('/teeth');
}

// --- Checkups ---

export async function getAllDentalCheckups() {
  return db.select().from(dentalCheckups).orderBy(desc(dentalCheckups.date)).all();
}

export async function addDentalCheckup(data: {
  date: string;
  dentistName?: string;
  location?: string;
  type: 'cleaning' | 'exam' | 'procedure' | 'emergency' | 'other';
  cost?: number;
  insuranceCovered?: number;
  notes?: string;
  nextAppointment?: string;
}) {
  await db.insert(dentalCheckups).values(data).run();
  revalidatePath('/teeth');
}

export async function deleteDentalCheckup(id: number) {
  await db.delete(dentalCheckups).where(eq(dentalCheckups.id, id)).run();
  revalidatePath('/teeth');
}

// --- Gum Health ---

export async function getAllGumHealthLogs() {
  return db.select().from(gumHealthLog).orderBy(desc(gumHealthLog.date)).all();
}

export async function addGumHealthLog(data: {
  date: string;
  checkupId?: number;
  measurements?: string;
  overallScore?: number;
  bleedingOnProbing?: boolean;
  recession?: string;
  notes?: string;
}) {
  await db.insert(gumHealthLog).values(data).run();
  revalidatePath('/teeth');
}

export async function deleteGumHealthLog(id: number) {
  await db.delete(gumHealthLog).where(eq(gumHealthLog.id, id)).run();
  revalidatePath('/teeth');
}

// --- Documents ---

export async function getAllDentalDocuments() {
  return db.select().from(dentalDocuments).orderBy(desc(dentalDocuments.date)).all();
}

export async function addDentalDocument(data: {
  checkupId?: number;
  date: string;
  name: string;
  fileType: string;
  fileData: string;
  fileSize?: number;
  category?: 'xray' | 'treatment_plan' | 'invoice' | 'insurance' | 'lab_results' | 'referral' | 'other';
  notes?: string;
}) {
  await db.insert(dentalDocuments).values(data).run();
  revalidatePath('/teeth');
  revalidatePath('/grooming');
}

export async function deleteDentalDocument(id: number) {
  await db.delete(dentalDocuments).where(eq(dentalDocuments.id, id)).run();
  revalidatePath('/teeth');
  revalidatePath('/grooming');
}

// --- Contacts ---

export async function getAllDentalContacts() {
  return db.select().from(dentalContacts).orderBy(dentalContacts.name).all();
}

export async function addDentalContact(data: {
  name: string;
  type: 'general' | 'orthodontist' | 'oral_surgeon' | 'periodontist' | 'endodontist' | 'pediatric' | 'cosmetic';
  address?: string;
  phone?: string;
  website?: string;
  doctors?: string;
  insurance?: string;
  notes?: string;
  favorite?: boolean;
  lastVisited?: string;
}) {
  await db.insert(dentalContacts).values(data).run();
  revalidatePath('/teeth');
  revalidatePath('/grooming');
}

export async function toggleDentalContactFavorite(id: number, favorite: boolean) {
  await db.update(dentalContacts).set({ favorite }).where(eq(dentalContacts.id, id)).run();
  revalidatePath('/teeth');
  revalidatePath('/grooming');
}

export async function deleteDentalContact(id: number) {
  await db.delete(dentalContacts).where(eq(dentalContacts.id, id)).run();
  revalidatePath('/teeth');
  revalidatePath('/grooming');
}
