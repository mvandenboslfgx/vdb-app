/**
 * STATUS: NOT APPLIED / STUB ONLY — local proposal.
 * Mollie webhook handler. Idempotent; re-fetches payment from Mollie before mutating state.
 * Never trust client-reported payment status.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405 });
  }

  // TODO: verify signature/idempotency key, insert payment_webhook_events,
  // re-fetch Mollie payment, update payment_events + invoices/orders in a transaction,
  // advance commission statuses only when payment_received is confirmed.
  return new Response(
    JSON.stringify({
      ok: false,
      stub: true,
      message: "mollie-webhook stub — not deployed; remote NOT APPLIED",
    }),
    { status: 501, headers: { "Content-Type": "application/json" } },
  );
});
