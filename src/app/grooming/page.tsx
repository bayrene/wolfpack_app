import { getAllHaircuts, getAllHairHealthLogs, getAllHairInspo } from '@/db/queries/hair';
import { getAllDentalProducts, getAllDentalLogs, getAllDentalCheckups, getAllGumHealthLogs, getAllDentalDocuments, getAllDentalContacts } from '@/db/queries/dental';
import { getSkinSettings, getSkinDayLogs, getSkinProducts, getSkinProductUsage } from '@/db/queries/skin';
import { GroomingClient } from '@/components/grooming/grooming-client';
import { todayISO } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function GroomingPage() {
  const today = todayISO();
  const [haircuts, healthLogs, inspoPhotos, products, dentalLogs, checkups, gumLogs, documents, contacts, skinSettings, skinDayLogs, skinProducts, skinProductUsage] = await Promise.all([
    getAllHaircuts(),
    getAllHairHealthLogs(),
    getAllHairInspo(),
    getAllDentalProducts(),
    getAllDentalLogs(),
    getAllDentalCheckups(),
    getAllGumHealthLogs(),
    getAllDentalDocuments(),
    getAllDentalContacts(),
    getSkinSettings(),
    getSkinDayLogs(),
    getSkinProducts(),
    getSkinProductUsage(),
  ]);
  return (
    <GroomingClient
      haircuts={haircuts} healthLogs={healthLogs} inspoPhotos={inspoPhotos}
      products={products} dentalLogs={dentalLogs} checkups={checkups} gumLogs={gumLogs}
      documents={documents} contacts={contacts}
      skinSettings={skinSettings} skinDayLogs={skinDayLogs} skinProducts={skinProducts} skinProductUsage={skinProductUsage}
      today={today}
    />
  );
}
