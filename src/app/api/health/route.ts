/**
 * Health check endpoint for Railway deployment
 * Used for monitoring application health and container orchestration
 */
export async function GET() {
  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    runtime: 'bun',
    version: process.env.npm_package_version || '0.0.1',
  })
}
