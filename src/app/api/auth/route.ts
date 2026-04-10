import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { password } = await req.json();
  const correct = process.env.AUTH_PASSWORD ?? 'Lobo';
  const secret = process.env.AUTH_SECRET ?? 'wolfpack-secret';

  if (password !== correct) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('auth', secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });
  return res;
}
