import { getAllSmokingLogs, getAllStrains } from '@/db/queries/smoking';
import { SmokingClient } from '@/components/smoking/smoking-client';
import { todayISO } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function SmokingPage() {
  const [logs, strains] = await Promise.all([
    getAllSmokingLogs(),
    getAllStrains(),
  ]);
  const today = todayISO();
  return (
    <SmokingClient
      logs={logs}
      strains={strains}
      today={today}
    />
  );
}
