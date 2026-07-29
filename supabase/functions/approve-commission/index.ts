/**
 * STATUS: NOT APPLIED / STUB ONLY — local proposal.
 * Staff-only commission approval. Partners cannot call this successfully.
 * Writes commission_events + audit_logs; enforces payment_received + hold window.
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405 });
  }

  // TODO: verify staff role, four-eyes where required, transition under_review -> approved/payable
  return new Response(
    JSON.stringify({
      ok: false,
      stub: true,
      message: 'approve-commission stub — not deployed; remote NOT APPLIED',
    }),
    { status: 501, headers: { 'Content-Type': 'application/json' } },
  );
});
