import { NextRequest, NextResponse } from 'next/server';

const AUTH_URL = process.env.AUTH_URL ?? 'http://localhost:8081';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const res = await fetch(`${AUTH_URL}/auth/me`, {
    headers: { authorization: auth },
  });
  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { 'content-type': 'application/json' },
  });
}
