'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { HairClient } from '@/components/hair/hair-client';
import { TeethClient } from '@/components/teeth/teeth-client';
import { SkinClient } from '@/components/skin/skin-client';
import type {
  Haircut, HairHealthEntry, HairInspo,
  DentalProduct, DentalLogEntry, DentalCheckup, GumHealthEntry, DentalDocument, DentalContact,
  SkinSettingsRow, SkinDayLogRow, SkinProductRow, SkinProductUsageRow,
} from '@/db/schema';

type GroomingTab = 'hair' | 'teeth' | 'skin';

interface Props {
  haircuts: Haircut[];
  healthLogs: HairHealthEntry[];
  inspoPhotos: HairInspo[];
  products: DentalProduct[];
  dentalLogs: DentalLogEntry[];
  checkups: DentalCheckup[];
  gumLogs: GumHealthEntry[];
  documents: DentalDocument[];
  contacts: DentalContact[];
  skinSettings: SkinSettingsRow | null;
  skinDayLogs: SkinDayLogRow[];
  skinProducts: SkinProductRow[];
  skinProductUsage: SkinProductUsageRow[];
  today: string;
}

export function GroomingClient({
  haircuts, healthLogs, inspoPhotos,
  products, dentalLogs, checkups, gumLogs, documents, contacts,
  skinSettings, skinDayLogs, skinProducts, skinProductUsage,
  today,
}: Props) {
  const [tab, setTab] = useState<GroomingTab>('hair');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24 md:pb-8 space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
        >
          Self Care
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Hair, teeth & skin
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
        {([
          { key: 'hair' as GroomingTab, label: 'Hair' },
          { key: 'teeth' as GroomingTab, label: 'Teeth' },
          { key: 'skin' as GroomingTab, label: 'Skin' },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors',
              tab === t.key
                ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white'
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'hair' && (
        <HairClient
          haircuts={haircuts}
          healthLogs={healthLogs}
          inspoPhotos={inspoPhotos}
          today={today}
          embedded
        />
      )}
      {tab === 'teeth' && (
        <TeethClient
          products={products}
          logs={dentalLogs}
          checkups={checkups}
          gumLogs={gumLogs}
          documents={documents}
          contacts={contacts}
          today={today}
          embedded
        />
      )}
      {tab === 'skin' && (
        <SkinClient
          today={today}
          initialSettings={skinSettings}
          initialDayLogs={skinDayLogs}
          initialProducts={skinProducts}
          initialProductUsage={skinProductUsage}
          embedded
        />
      )}
    </div>
  );
}
