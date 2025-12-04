import { NextResponse } from 'next/server';

/**
 * Health check endpoint for Railway deployment
 * Used for monitoring application health and container orchestration
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    runtime: 'bun',
  })
}
