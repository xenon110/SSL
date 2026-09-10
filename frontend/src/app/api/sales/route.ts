import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // DEPRECATED: Frontend now fetches /api/dashboard directly to avoid Next.js internal fetch deadlocks.
  return NextResponse.json({ message: "Deprecated. Use /api/dashboard directly." });
}

// export const runtime = 'edge';
