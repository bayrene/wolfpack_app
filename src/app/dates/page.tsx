import { getAllDateNights, getAllItineraryItems } from '@/db/queries/date-nights';
import { getAllHappyHours } from '@/db/queries/happy-hours';
import { DateNightsClient } from '@/components/dates/dates-client';
import { todayISO } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function DateNightsPage() {
  const [dateNights, happyHourDeals, itineraryItems] = await Promise.all([
    getAllDateNights(),
    getAllHappyHours(),
    getAllItineraryItems(),
  ]);
  const today = todayISO();
  return <DateNightsClient dateNights={dateNights} happyHourDeals={happyHourDeals} itineraryItems={itineraryItems} today={today} />;
}
