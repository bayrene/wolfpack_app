import { getAllDogs, getAllVetVisits, getAllBloodwork, getAllVetContacts } from '@/db/queries/vet';
import { VetClient } from '@/components/vet/vet-client';
import { todayISO } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function VetPage() {
  const [dogs, visits, bloodworkData, vetContacts] = await Promise.all([
    getAllDogs(),
    getAllVetVisits(),
    getAllBloodwork(),
    getAllVetContacts(),
  ]);
  const today = todayISO();
  return <VetClient dogs={dogs} visits={visits} bloodwork={bloodworkData} today={today} vetContacts={vetContacts} />;
}
