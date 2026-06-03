// Liveness probe. No dependencies, no upstream calls.

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true, ts: new Date().toISOString() });
}
