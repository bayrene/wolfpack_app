import { getAllSleepLogs } from '@/db/queries/sleep';
import { SleepClient } from '@/components/sleep/sleep-client';
import { todayISO } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function SleepPage() {
  const [logs] = await Promise.all([getAllSleepLogs()]);
  const today = todayISO();
  return <SleepClient logs={logs} today={today} />;
}
