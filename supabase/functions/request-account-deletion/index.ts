/**
 * STATUS: NOT APPLIED / STUB ONLY — local proposal.
 * Authenticated account deletion request. Creates account_deletion_requests row;
 * actual purge is an owner/staff-operated workflow (see docs/account-deletion.md).
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405 });
  }

  // TODO: verify JWT, insert account_deletion_requests, send confirmation email
  return new Response(
    JSON.stringify({
      ok: false,
      stub: true,
      message: "request-account-deletion stub — not deployed; remote NOT APPLIED",
    }),
    { status: 501, headers: { "Content-Type": "application/json" } },
  );
});
