/**
 * STATUS: NOT APPLIED / STUB ONLY — local proposal.
 * Server-side Mollie checkout creation. Never expose Mollie API keys to the client.
 *
 * Flow:
 * 1. Authenticate user (JWT)
 * 2. Load invoice/order + product_category_policy
 * 3. Call payment-policy-gate
 * 4. Create Mollie payment with redirectUrl + webhookUrl
 * 5. Persist payment_events (status=created/open)
 * 6. Return checkout URL
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405 });
  }

  // TODO: verify JWT, validate body, call Mollie, write payment_events via service role
  return new Response(
    JSON.stringify({
      ok: false,
      stub: true,
      message: "create-checkout stub — not deployed; remote NOT APPLIED",
    }),
    { status: 501, headers: { "Content-Type": "application/json" } },
  );
});
