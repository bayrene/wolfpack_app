'use server';

import { db } from '@/db';
import { exercises, exerciseLog, painLog, medicalRecords, repCounters } from '@/db/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// --- Exercise Library ---

export async function getAllExercises() {
  return db.select().from(exercises).orderBy(exercises.category, exercises.name).all();
}

export async function addExercise(data: {
  name: string;
  category: 'pilates' | 'yoga' | 'stretch' | 'strength' | 'mobility' | 'posture' | 'breathing' | 'other';
  targetArea: 'neck' | 'upper_back' | 'lower_back' | 'shoulders' | 'full_spine' | 'core' | 'hips' | 'full_body' | 'other';
  purpose?: string;
  instructions?: string;
  duration?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  videoUrl?: string;
  photo?: string;
  notes?: string;
}) {
  await db.insert(exercises).values(data).run();
  revalidatePath('/exercise');
}

export async function toggleExerciseFavorite(id: number) {
  const item = await db.select().from(exercises).where(eq(exercises.id, id)).get();
  if (!item) return;
  await db.update(exercises).set({ favorite: !item.favorite }).where(eq(exercises.id, id)).run();
  revalidatePath('/exercise');
}

export async function deleteExercise(id: number) {
  await db.delete(exercises).where(eq(exercises.id, id)).run();
  revalidatePath('/exercise');
}

// --- Exercise Log ---

export async function getAllExerciseLogs() {
  return db.select().from(exerciseLog).orderBy(desc(exerciseLog.date)).all();
}

export async function addExerciseLog(data: {
  date: string;
  exerciseId?: number;
  customName?: string;
  category?: string;
  targetArea?: string;
  duration?: number;
  sets?: number;
  reps?: number;
  painBefore?: number;
  painAfter?: number;
  feltGood?: boolean;
  notes?: string;
}) {
  await db.insert(exerciseLog).values(data).run();
  revalidatePath('/exercise');
}

export async function deleteExerciseLog(id: number) {
  await db.delete(exerciseLog).where(eq(exerciseLog.id, id)).run();
  revalidatePath('/exercise');
}

// --- Pain Log ---

export async function getAllPainLogs() {
  return db.select().from(painLog).orderBy(desc(painLog.date), desc(painLog.time)).all();
}

export async function addPainLog(data: {
  date: string;
  time?: string;
  area: 'neck' | 'upper_back' | 'lower_back' | 'shoulders' | 'left_shoulder' | 'right_shoulder' | 'hips' | 'other';
  severity: number;
  type?: 'ache' | 'sharp' | 'stiffness' | 'burning' | 'radiating' | 'tingling' | 'other';
  trigger?: string;
  relief?: string;
  notes?: string;
}) {
  await db.insert(painLog).values(data).run();
  revalidatePath('/exercise');
}

export async function deletePainLog(id: number) {
  await db.delete(painLog).where(eq(painLog.id, id)).run();
  revalidatePath('/exercise');
}

// --- Medical Records ---

export async function getAllMedicalRecords() {
  return db.select().from(medicalRecords).orderBy(desc(medicalRecords.date)).all();
}

export async function addMedicalRecord(data: {
  date: string;
  type: 'mri' | 'xray' | 'ct_scan' | 'report' | 'referral' | 'other';
  title: string;
  provider?: string;
  findings?: string;
  file?: string;
  fileName?: string;
  notes?: string;
}) {
  await db.insert(medicalRecords).values(data).run();
  revalidatePath('/exercise');
}

export async function deleteMedicalRecord(id: number) {
  await db.delete(medicalRecords).where(eq(medicalRecords.id, id)).run();
  revalidatePath('/exercise');
}

// --- Rep Counters (Pushups, Pull-ups) ---

export async function getAllRepCounters() {
  return db.select().from(repCounters).orderBy(desc(repCounters.date), desc(repCounters.time)).all();
}

export async function addRepCounter(data: {
  date: string;
  time?: string;
  exerciseType: 'pushups' | 'pullups';
  reps: number;
  notes?: string;
}) {
  await db.insert(repCounters).values(data).run();
  revalidatePath('/exercise');
}

export async function deleteRepCounter(id: number) {
  await db.delete(repCounters).where(eq(repCounters.id, id)).run();
  revalidatePath('/exercise');
}
