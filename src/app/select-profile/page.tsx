'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type Profile = 'me' | 'wife';

interface ProfileCard {
  id: Profile;
  name: string;
  subtitle: string;
  hoverBorder: string;
  hoverBg: string;
}

const PROFILES: ProfileCard[] = [
  {
    id: 'me',
    name: 'Rene',
    subtitle: 'Your dashboard',
    hoverBorder: 'hover:border-amber-500',
    hoverBg: 'hover:bg-amber-500/10',
  },
  {
    id: 'wife',
    name: 'Wife',
    subtitle: 'Her dashboard',
    hoverBorder: 'hover:border-pink-500',
    hoverBg: 'hover:bg-pink-500/10',
  },
];

function SelectProfileForm() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<Profile | null>(null);

  const from = searchParams.get('from') ?? '/';

  async function handleSelect(profile: Profile) {
    if (loading) return;
    setLoading(profile);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      });

      if (res.ok) {
        window.location.href = from;
      } else {
        setLoading(null);
      }
    } catch {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center">
        <h1
          className="text-2xl font-bold text-white"
          style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
        >
          Who&apos;s checking in?
        </h1>
      </div>

      <div className="flex gap-4">
        {PROFILES.map((profile) => (
          <button
            key={profile.id}
            onClick={() => handleSelect(profile.id)}
            disabled={loading !== null}
            className={[
              'flex flex-col items-center justify-center gap-3',
              'w-[120px] h-[140px] rounded-2xl',
              'bg-neutral-900 border border-neutral-800',
              'transition-all duration-150',
              profile.hoverBorder,
              profile.hoverBg,
              'disabled:opacity-50 disabled:cursor-not-allowed',
              loading === profile.id ? 'opacity-70 scale-95' : 'cursor-pointer',
            ].join(' ')}
          >
            <span className="text-4xl" aria-hidden="true">
              👤
            </span>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-white font-bold text-base leading-tight">
                {profile.name}
              </span>
              <span className="text-neutral-500 text-xs leading-tight">
                {profile.subtitle}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SelectProfilePage() {
  return (
    <Suspense>
      <SelectProfileForm />
    </Suspense>
  );
}
