import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { profile } = await req.json();
  if (profile !== 'me' && profile !== 'wife') {
    return NextResponse.json({ error: 'Invalid profile' }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set('profile', profile, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
  return res;
}
