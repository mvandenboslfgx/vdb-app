import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

/**
 * mollie-webhook — idempotent webhook handler.
 * Always re-fetches payment from Mollie; never trusts raw body status alone.
 */

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const mollieKey = Deno.env.get('MOLLIE_API_KEY')?.trim();
  if (!mollieKey) {
    return json(
      {
        error: 'FEATURE_NOT_CONFIGURED',
        feature: 'mollie_webhook',
        message: 'Mollie API key is not configured',
      },
      503,
    );
  }

  // Implementation: parse id → fetch payment from Mollie → upsert webhook_events
  // (provider, external_event_id) → transactional status update → commission hooks.
  return json(
    {
      error: 'FEATURE_NOT_CONFIGURED',
      feature: 'mollie_webhook_wiring',
      message: 'Webhook reducer is unit-tested in-app; Edge wiring awaits owner secrets + deploy approval',
    },
    503,
  );
});
