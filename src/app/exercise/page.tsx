import { getAllExercises, getAllExerciseLogs, getAllPainLogs, getAllMedicalRecords, getAllRepCounters } from '@/db/queries/exercise';
import { ExerciseClient } from '@/components/exercise/exercise-client';
import { todayISO } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ExercisePage() {
  const [exercises, logs, painLogs, records, repCounts] = await Promise.all([
    getAllExercises(),
    getAllExerciseLogs(),
    getAllPainLogs(),
    getAllMedicalRecords(),
    getAllRepCounters(),
  ]);
  const today = todayISO();
  return (
    <ExerciseClient
      exercises={exercises}
      logs={logs}
      painLogs={painLogs}
      records={records}
      repCounts={repCounts}
      today={today}
    />
  );
}
