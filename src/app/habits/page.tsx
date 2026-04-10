import { getActiveSupplements, getSupplementLogs, getSupplementLogsForRange } from '@/db/queries/supplements';
import { getAllSmokingLogs, getAllStrains } from '@/db/queries/smoking';
import { getAllExercises, getAllExerciseLogs, getAllPainLogs, getAllMedicalRecords, getAllRepCounters } from '@/db/queries/exercise';
import { getAllSleepLogs } from '@/db/queries/sleep';
import { HabitsClient } from '@/components/habits/habits-client';
import { todayISO } from '@/lib/utils';
import { format, subDays } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function HabitsPage() {
  const today = todayISO();
  const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');

  const [supplements, todaySupLogs, recentSupLogs, smokingLogs, strains, exercises, exerciseLogs, painLogs, records, repCounts, sleepLogs] = await Promise.all([
    getActiveSupplements(),
    getSupplementLogs(today),
    getSupplementLogsForRange(sevenDaysAgo, today),
    getAllSmokingLogs(),
    getAllStrains(),
    getAllExercises(),
    getAllExerciseLogs(),
    getAllPainLogs(),
    getAllMedicalRecords(),
    getAllRepCounters(),
    getAllSleepLogs(),
  ]);

  return (
    <HabitsClient
      supplements={supplements}
      todaySupLogs={todaySupLogs.map(({ log, supplement }) => ({
        ...log,
        supplementName: supplement.name,
        supplementBrand: supplement.brand,
        doseUnit: supplement.doseUnit,
      }))}
      recentSupLogs={recentSupLogs.map(({ log, supplement }) => ({
        ...log,
        supplementName: supplement.name,
        supplementBrand: supplement.brand,
        doseUnit: supplement.doseUnit,
      }))}
      smokingLogs={smokingLogs}
      strains={strains}
      exercises={exercises}
      exerciseLogs={exerciseLogs}
      painLogs={painLogs}
      records={records}
      repCounts={repCounts}
      sleepLogs={sleepLogs}
      today={today}
    />
  );
}
