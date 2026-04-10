import { todayISO } from '@/lib/utils';
import { SkinClient } from '@/components/skin/skin-client';
import { getSkinSettings, getSkinDayLogs, getSkinProducts, getSkinProductUsage } from '@/db/queries/skin';

export const dynamic = 'force-dynamic';

export default async function SkinPage() {
  const today = todayISO();
  const [settings, dayLogs, products, productUsage] = await Promise.all([
    getSkinSettings(),
    getSkinDayLogs(),
    getSkinProducts(),
    getSkinProductUsage(),
  ]);

  return (
    <SkinClient
      today={today}
      initialSettings={settings}
      initialDayLogs={dayLogs}
      initialProducts={products}
      initialProductUsage={productUsage}
    />
  );
}
