import { NextResponse } from 'next/server';

/**
 * Health-check endpoint — excluded from auth middleware.
 * Used by uptime monitors (e.g. UptimeRobot) to verify the app is reachable.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '0.1.0',
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
