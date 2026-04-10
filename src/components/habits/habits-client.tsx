'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { VitaminsClient } from '@/components/vitamins/vitamins-client';
import { SmokingClient } from '@/components/smoking/smoking-client';
import { ExerciseClient } from '@/components/exercise/exercise-client';
import { SleepClient } from '@/components/sleep/sleep-client';
import type { Supplement, SmokingLogEntry, Strain, Exercise, ExerciseLogEntry, PainLogEntry, MedicalRecord, RepCounter, SleepLog } from '@/db/schema';

interface SupplementLogEntry {
  id: number;
  supplementId: number;
  date: string;
  time: string;
  dose: number;
  person: string;
  situation: string;
  sideEffects: string | null;
  effectivenessRating: number | null;
  notes: string | null;
  supplementName: string;
  supplementBrand: string;
  doseUnit: string;
}

type HabitsTab = 'vitamins' | 'sleep' | 'exercise' | 'smoking';

interface Props {
  supplements: Supplement[];
  todaySupLogs: SupplementLogEntry[];
  recentSupLogs: SupplementLogEntry[];
  smokingLogs: SmokingLogEntry[];
  strains: Strain[];
  exercises: Exercise[];
  exerciseLogs: ExerciseLogEntry[];
  painLogs: PainLogEntry[];
  records: MedicalRecord[];
  repCounts: RepCounter[];
  sleepLogs: SleepLog[];
  today: string;
}

export function HabitsClient({
  supplements,
  todaySupLogs,
  recentSupLogs,
  smokingLogs,
  strains,
  exercises,
  exerciseLogs,
  painLogs,
  records,
  repCounts,
  sleepLogs,
  today,
}: Props) {
  const [tab, setTab] = useState<HabitsTab>('vitamins');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24 md:pb-8 space-y-6">
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
        >
          Wellness
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
          Supplements, exercise & smoking
        </p>
      </div>

      <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
        {([
          { key: 'vitamins' as HabitsTab, label: 'Supplements' },
          { key: 'sleep' as HabitsTab, label: 'Sleep' },
          { key: 'exercise' as HabitsTab, label: 'Exercise' },
          { key: 'smoking' as HabitsTab, label: 'Smoking' },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              tab === t.key
                ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white'
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'vitamins' && (
        <VitaminsClient
          supplements={supplements}
          todayLogs={todaySupLogs}
          recentLogs={recentSupLogs}
          today={today}
          embedded
        />
      )}

      {tab === 'sleep' && (
        <SleepClient logs={sleepLogs} today={today} embedded />
      )}

      {tab === 'exercise' && (
        <ExerciseClient
          exercises={exercises}
          logs={exerciseLogs}
          painLogs={painLogs}
          records={records}
          repCounts={repCounts}
          today={today}
          embedded
        />
      )}

      {tab === 'smoking' && (
        <SmokingClient
          logs={smokingLogs}
          strains={strains}
          today={today}
          embedded
        />
      )}
    </div>
  );
}
