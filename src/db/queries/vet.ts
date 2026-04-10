'use server';

import { db } from '@/db';
import { dogs, vetVisits, bloodwork, vetContacts } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// --- Dogs ---

export async function getAllDogs() {
  return db.select().from(dogs).orderBy(dogs.name).all();
}

export async function addDog(data: {
  name: string;
  breed?: string;
  sex?: 'male' | 'female';
  dob?: string;
  weight?: number;
  photo?: string;
  spayed?: boolean;
  spayDate?: string;
  akcCert?: string;
  microchipId?: string;
  rabiesVaccineDate?: string;
  rabiesVaccineDue?: string;
  rabiesVetName?: string;
  rabiesVetContact?: string;
  rabiesLotNumber?: string;
  notes?: string;
}) {
  await db.insert(dogs).values(data).run();
  revalidatePath('/vet');
}

export async function updateDog(id: number, data: Partial<{
  name: string;
  breed: string;
  sex: 'male' | 'female';
  dob: string;
  weight: number;
  photo: string;
  spayed: boolean;
  spayDate: string;
  akcCert: string;
  microchipId: string;
  rabiesVaccineDate: string;
  rabiesVaccineDue: string;
  rabiesVetName: string;
  rabiesVetContact: string;
  rabiesLotNumber: string;
  notes: string;
}>) {
  await db.update(dogs).set(data).where(eq(dogs.id, id)).run();
  revalidatePath('/vet');
}

export async function deleteDog(id: number) {
  await db.delete(dogs).where(eq(dogs.id, id)).run();
  revalidatePath('/vet');
}

// --- Vet Visits ---

export async function getAllVetVisits() {
  return db.select().from(vetVisits).orderBy(desc(vetVisits.date)).all();
}

export async function getVetVisitsForDog(dogId: number) {
  return db.select().from(vetVisits).where(eq(vetVisits.dogId, dogId)).orderBy(desc(vetVisits.date)).all();
}

export async function addVetVisit(data: {
  dogId: number;
  date: string;
  vetName?: string;
  location?: string;
  type: 'checkup' | 'vaccination' | 'dental' | 'procedure' | 'emergency' | 'grooming' | 'other';
  procedures?: string;
  teethExtracted?: number;
  cost?: number;
  insuranceCovered?: number;
  receipt?: string;
  lineItems?: string;
  medications?: string;
  recommendations?: string;
  nextAppointment?: string;
  notes?: string;
}) {
  await db.insert(vetVisits).values(data).run();
  revalidatePath('/vet');
}

export async function updateVetVisit(id: number, data: Partial<{
  receipt: string;
  cost: number;
  insuranceCovered: number;
  notes: string;
  lineItems: string;
  nextAppointment: string;
}>) {
  await db.update(vetVisits).set(data).where(eq(vetVisits.id, id)).run();
  revalidatePath('/vet');
}

export async function deleteVetVisit(id: number) {
  await db.delete(vetVisits).where(eq(vetVisits.id, id)).run();
  revalidatePath('/vet');
}

// --- Bloodwork ---

export async function getAllBloodwork() {
  return db.select().from(bloodwork).orderBy(desc(bloodwork.date)).all();
}

export async function getBloodworkForDog(dogId: number) {
  return db.select().from(bloodwork).where(eq(bloodwork.dogId, dogId)).orderBy(desc(bloodwork.date)).all();
}

export async function addBloodwork(data: {
  dogId: number;
  date: string;
  vetName?: string;
  orderId?: string;
  testName: string;
  results?: string;
  notes?: string;
}) {
  await db.insert(bloodwork).values(data).run();
  revalidatePath('/vet');
}

export async function deleteBloodwork(id: number) {
  await db.delete(bloodwork).where(eq(bloodwork.id, id)).run();
  revalidatePath('/vet');
}

// --- Vet Contacts ---

export async function getAllVetContacts() {
  return db.select().from(vetContacts).orderBy(vetContacts.name).all();
}

export async function addVetContact(data: {
  name: string;
  type: 'vet' | 'groomer' | 'specialist' | 'emergency';
  address?: string;
  phone?: string;
  website?: string;
  doctors?: string;
  notes?: string;
  favorite?: boolean;
  lastVisited?: string;
}) {
  await db.insert(vetContacts).values(data).run();
  revalidatePath('/vet');
}

export async function updateVetContact(id: number, data: Partial<{
  name: string;
  type: 'vet' | 'groomer' | 'specialist' | 'emergency';
  address: string;
  phone: string;
  website: string;
  doctors: string;
  notes: string;
  favorite: boolean;
}>) {
  await db.update(vetContacts).set(data).where(eq(vetContacts.id, id)).run();
  revalidatePath('/vet');
}

export async function toggleVetContactFavorite(id: number, favorite: boolean) {
  await db.update(vetContacts).set({ favorite }).where(eq(vetContacts.id, id)).run();
  revalidatePath('/vet');
}

export async function deleteVetContact(id: number) {
  await db.delete(vetContacts).where(eq(vetContacts.id, id)).run();
  revalidatePath('/vet');
}
