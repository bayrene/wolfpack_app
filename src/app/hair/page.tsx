import { getAllHaircuts, getAllHairHealthLogs, getAllHairInspo } from '@/db/queries/hair';
import { HairClient } from '@/components/hair/hair-client';
import { todayISO } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function HairPage() {
  const [haircuts, healthLogs, inspoPhotos] = await Promise.all([
    getAllHaircuts(),
    getAllHairHealthLogs(),
    getAllHairInspo(),
  ]);
  const today = todayISO();
  return <HairClient haircuts={haircuts} healthLogs={healthLogs} inspoPhotos={inspoPhotos} today={today} />;
}
