/**
 * STATUS: NOT APPLIED / STUB ONLY — local proposal.
 * Enqueues/sends push + in-app notifications; records notification_deliveries.
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405 });
  }

  // TODO: service-role only; load push_tokens; fan-out; log delivery status
  return new Response(
    JSON.stringify({
      ok: false,
      stub: true,
      message: 'send-notification stub — not deployed; remote NOT APPLIED',
    }),
    { status: 501, headers: { 'Content-Type': 'application/json' } },
  );
});
