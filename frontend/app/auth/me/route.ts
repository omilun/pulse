import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL ?? 'http://pulse-backend:8080';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const res = await fetch(`${BACKEND}/auth/me`, {
    headers: { authorization: auth },
  });
  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { 'content-type': 'application/json' },
  });
}
