import { NextRequest, NextResponse } from 'next/server';

const DAILY_URL = process.env.DAILY_URL ?? 'http://localhost:8083';

async function proxy(req: NextRequest, params: { path: string[] }) {
  const path = params.path.join('/');
  const url = `${DAILY_URL}/api/daily/${path}${req.nextUrl.search}`;
  const headers: HeadersInit = { 'content-type': 'application/json' };
  const auth = req.headers.get('authorization');
  if (auth) headers['authorization'] = auth;

  const init: RequestInit = { method: req.method, headers };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.text();
  }
  const res = await fetch(url, init);
  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}
