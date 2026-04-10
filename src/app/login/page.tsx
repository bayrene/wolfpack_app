'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { WolfLogo } from '@/components/ui/wolf-logo';

function LoginForm() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      const from = searchParams.get('from') ?? '/';
      window.location.href = from;
    } else {
      setError('Wrong password. Try again.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoFocus
        className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#E07A3A] focus:border-transparent text-base"
      />
      {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      <button
        type="submit"
        disabled={!password || loading}
        className="w-full py-3 rounded-xl bg-[#E07A3A] hover:bg-[#c96a2e] text-white font-semibold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Entering...' : 'Enter'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950">
      <div className="w-full max-w-sm px-6">
        <div className="flex flex-col items-center mb-8">
          <WolfLogo className="w-16 h-16 mb-4" />
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
            Wolfpack
          </h1>
          <p className="text-neutral-500 text-sm mt-1">Personal dashboard</p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
