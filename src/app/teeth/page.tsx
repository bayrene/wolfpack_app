import { getAllDentalProducts, getAllDentalLogs, getAllDentalCheckups, getAllGumHealthLogs, getAllDentalDocuments, getAllDentalContacts } from '@/db/queries/dental';
import { TeethClient } from '@/components/teeth/teeth-client';
import { todayISO } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function TeethPage() {
  const [products, logs, checkups, gumLogs, documents, contacts] = await Promise.all([
    getAllDentalProducts(),
    getAllDentalLogs(),
    getAllDentalCheckups(),
    getAllGumHealthLogs(),
    getAllDentalDocuments(),
    getAllDentalContacts(),
  ]);
  const today = todayISO();
  return (
    <TeethClient
      products={products}
      logs={logs}
      checkups={checkups}
      gumLogs={gumLogs}
      documents={documents}
      contacts={contacts}
      today={today}
    />
  );
}
