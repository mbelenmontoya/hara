// Health check endpoint for E2E tests
export async function GET() {
  return new Response('OK', { status: 200 })
}
