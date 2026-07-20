import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

/**
 * create-checkout — Mollie Hosted Checkout (server-side only).
 *
 * - Never accepts client-reported payment success
 * - Enforces payment policy gate before creating a payment
 * - Returns 503 FEATURE_NOT_CONFIGURED when MOLLIE_API_KEY is missing
 * - Production live keys must not be used from development/staging profiles
 */

type Json = Record<string, unknown>;

function json(body: Json, status = 200): Response {
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
  const appEnv = Deno.env.get('APP_ENV') ?? 'development';

  if (!mollieKey) {
    return json(
      {
        error: 'FEATURE_NOT_CONFIGURED',
        feature: 'mollie_checkout',
        message: 'Mollie API key is not configured on the server',
      },
      503,
    );
  }

  if (appEnv !== 'production' && mollieKey.startsWith('live_')) {
    return json(
      {
        error: 'live_key_forbidden',
        message: 'Live Mollie keys are forbidden outside production',
      },
      403,
    );
  }

  // Full Mollie create-payment + policy checks land here when key is present.
  // Until wired to Supabase service role + policy tables, refuse unsafe partial deploy.
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return json(
      {
        error: 'FEATURE_NOT_CONFIGURED',
        feature: 'checkout_persistence',
        message: 'Supabase service role is not configured for checkout persistence',
      },
      503,
    );
  }

  return json(
    {
      error: 'FEATURE_NOT_CONFIGURED',
      feature: 'mollie_checkout_wiring',
      message:
        'Checkout adapter is present but not fully wired to policy + Mollie createPayment in this revision. Use fake provider in automated tests.',
    },
    503,
  );
});
