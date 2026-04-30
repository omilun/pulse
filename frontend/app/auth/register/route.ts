import { NextRequest, NextResponse } from 'next/server';

const AUTH_URL = process.env.AUTH_URL ?? 'http://localhost:8081';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const res = await fetch(`${AUTH_URL}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });
  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { 'content-type': 'application/json' },
  });
}
