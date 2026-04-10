import { getActiveSupplements, getSupplementLogs, getSupplementLogsForRange } from '@/db/queries/supplements';
import { VitaminsClient } from '@/components/vitamins/vitamins-client';
import { todayISO } from '@/lib/utils';
import { format, subDays } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function VitaminsPage() {
  const today = todayISO();
  const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');

  const [supplements, todayLogs, recentLogs] = await Promise.all([
    getActiveSupplements(),
    getSupplementLogs(today),
    getSupplementLogsForRange(sevenDaysAgo, today),
  ]);

  return (
    <VitaminsClient
      supplements={supplements}
      todayLogs={todayLogs.map(({ log, supplement }) => ({
        ...log,
        supplementName: supplement.name,
        supplementBrand: supplement.brand,
        doseUnit: supplement.doseUnit,
      }))}
      recentLogs={recentLogs.map(({ log, supplement }) => ({
        ...log,
        supplementName: supplement.name,
        supplementBrand: supplement.brand,
        doseUnit: supplement.doseUnit,
      }))}
      today={today}
    />
  );
}
