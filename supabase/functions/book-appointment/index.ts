/**
 * STATUS: NOT APPLIED / STUB ONLY — local proposal.
 * Transactional appointment booking against availability_slots to prevent double-booking.
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405 });
  }

  // TODO: SELECT ... FOR UPDATE on slot, insert appointment, notify parties
  return new Response(
    JSON.stringify({
      ok: false,
      stub: true,
      message: 'book-appointment stub — not deployed; remote NOT APPLIED',
    }),
    { status: 501, headers: { 'Content-Type': 'application/json' } },
  );
});
