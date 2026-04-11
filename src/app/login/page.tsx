'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
      window.location.href = `/select-profile?from=${encodeURIComponent(from)}`;
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
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-sm px-6 py-10 rounded-2xl bg-neutral-950/60 backdrop-blur-xl border border-white/[0.06] shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
            The Wolf Pack
          </h1>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
