import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

/**
 * create-checkout — Mollie Hosted Checkout for portal invoices (server-side).
 *
 * Staging test-mode only. Never trusts client amount/currency/status.
 * Does not enable public CHECKOUT_ENABLED.
 */

type Json = Record<string, unknown>;

const STAGING_REF = 'kjricvicakvsreuytvra';
const PROD_REF = 'nhsrdnjfsxfikfbdmdfj';
const PAYABLE = new Set(['OPEN', 'ISSUED', 'PARTIALLY_PAID', 'OVERDUE']);

function json(body: Json, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function keyShape(key: string | undefined): 'missing' | 'test' | 'live' | 'invalid' {
  if (!key?.trim()) return 'missing';
  if (key.startsWith('test_')) return 'test';
  if (key.startsWith('live_')) return 'live';
  return 'invalid';
}

function supabaseRef(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    const m = host.match(/^([a-z0-9]+)\.supabase\.co$/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

function mask(id: string): string {
  return id.length <= 8 ? `${id.slice(0, 2)}…` : `${id.slice(0, 8)}…`;
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const appEnv = (Deno.env.get('APP_ENV') ?? '').trim().toLowerCase();
  const testCheckout = (Deno.env.get('MOLLIE_TEST_CHECKOUT_ENABLED') ?? '').trim().toLowerCase();
  const checkoutEnabled = (Deno.env.get('CHECKOUT_ENABLED') ?? '').trim().toLowerCase();
  const mollieKey = Deno.env.get('MOLLIE_API_KEY')?.trim();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  const webhookBase =
    Deno.env.get('MOLLIE_WEBHOOK_BASE_URL')?.trim() ||
    Deno.env.get('OWNER_APP_URL')?.trim() ||
    Deno.env.get('NEXT_PUBLIC_APP_URL')?.trim();
  const webhookToken = Deno.env.get('MOLLIE_WEBHOOK_TOKEN')?.trim();
  const redirectBase = Deno.env.get('MOLLIE_REDIRECT_BASE_URL')?.trim() || webhookBase;

  if (appEnv !== 'staging' || (testCheckout !== 'true' && testCheckout !== '1')) {
    return json(
      {
        error: 'FEATURE_NOT_CONFIGURED',
        feature: 'mollie_test_checkout',
        message: 'Staging test checkout is not enabled',
      },
      503,
    );
  }

  if (checkoutEnabled === 'true' || checkoutEnabled === '1') {
    return json(
      {
        error: 'FEATURE_NOT_CONFIGURED',
        feature: 'public_checkout_forbidden',
        message: 'Public CHECKOUT_ENABLED must remain off',
      },
      503,
    );
  }

  const ref = supabaseRef(supabaseUrl);
  if (ref === PROD_REF) {
    return json({ error: 'FORBIDDEN', message: 'production_ref_denied' }, 403);
  }
  if (ref && ref !== STAGING_REF) {
    return json({ error: 'FORBIDDEN', message: 'staging_ref_required' }, 403);
  }

  const shape = keyShape(mollieKey);
  if (shape === 'live') {
    return json({ error: 'TEST_MODE_REQUIRED' }, 403);
  }
  if (shape !== 'test') {
    return json(
      {
        error: 'FEATURE_NOT_CONFIGURED',
        feature: 'mollie_checkout',
        message: 'Mollie test API key is not configured',
      },
      503,
    );
  }

  if (!supabaseUrl || !serviceKey) {
    return json(
      {
        error: 'FEATURE_NOT_CONFIGURED',
        feature: 'checkout_persistence',
        message: 'Supabase service role is not configured',
      },
      503,
    );
  }

  if (!webhookBase || !webhookToken || !redirectBase) {
    return json(
      {
        error: 'FEATURE_NOT_CONFIGURED',
        feature: 'webhook_redirect',
        message: 'Webhook/redirect base URL or token missing',
      },
      503,
    );
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'FORBIDDEN' }, 401);
  }

  const body = (await req.json().catch(() => null)) as {
    invoiceId?: string;
    idempotencyKey?: string;
    expectedAmountCents?: number;
    productCategory?: string;
    platform?: string;
  } | null;

  const invoiceId = body?.invoiceId?.trim();
  if (!invoiceId) {
    return json({ error: 'NOT_FOUND' }, 404);
  }

  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? serviceKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) {
    return json({ error: 'FORBIDDEN' }, 401);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: memberships, error: memErr } = await admin
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('status', 'ACTIVE');
  if (memErr) {
    return json({ error: 'PROVIDER_UNAVAILABLE' }, 503);
  }
  const orgIds = new Set((memberships ?? []).map((m) => m.organization_id as string));

  const { data: invoice, error: invErr } = await admin
    .from('portal_invoices')
    .select(
      'id, organization_id, status, currency, total_cents, amount_paid_cents, amount_due_cents, invoice_number, external_payment_reference',
    )
    .eq('id', invoiceId)
    .maybeSingle();

  if (invErr) {
    return json({ error: 'PROVIDER_UNAVAILABLE' }, 503);
  }
  if (!invoice) {
    return json({ error: 'NOT_FOUND' }, 404);
  }
  if (!orgIds.has(invoice.organization_id as string)) {
    return json({ error: 'FORBIDDEN' }, 403);
  }
  if ((invoice.status as string) === 'PAID' || (invoice.amount_due_cents as number) <= 0) {
    return json({ error: 'ALREADY_PAID' }, 409);
  }
  if (!PAYABLE.has(invoice.status as string)) {
    return json({ error: 'FORBIDDEN' }, 403);
  }

  const due = invoice.amount_due_cents as number;
  if (!Number.isInteger(due) || due <= 0 || due > 5_000_000) {
    return json({ error: 'FORBIDDEN' }, 403);
  }
  if (String(invoice.currency).toUpperCase() !== 'EUR') {
    return json({ error: 'CURRENCY_MISMATCH' }, 400);
  }
  if (typeof body?.expectedAmountCents === 'number' && body.expectedAmountCents !== due) {
    return json({ error: 'AMOUNT_MISMATCH' }, 400);
  }

  const webhookUrl = `${webhookBase.replace(/\/$/, '')}/api/webhooks/mollie?token=${encodeURIComponent(webhookToken)}`;
  const redirectUrl = `${redirectBase.replace(/\/$/, '')}/portal/invoices/return?invoice=${invoiceId}`;

  // Reuse open payment when present.
  const existingId = invoice.external_payment_reference as string | null;
  if (existingId) {
    const existingRes = await fetch(`https://api.mollie.com/v2/payments/${existingId}`, {
      headers: { Authorization: `Bearer ${mollieKey}` },
    });
    if (existingRes.ok) {
      const existing = await existingRes.json();
      const link = existing?._links?.checkout?.href as string | undefined;
      if (link && (existing.status === 'open' || existing.status === 'pending')) {
        return json({
          checkoutUrl: link,
          status: existing.status,
          paymentRef: mask(existingId),
          amountCents: due,
          currency: 'EUR',
          reused: true,
          payment: {
            id: mask(existingId),
            invoiceId,
            status: existing.status === 'paid' ? 'open' : existing.status,
            amountCents: due,
            currency: 'EUR',
          },
        });
      }
    }
  }

  const createRes = await fetch('https://api.mollie.com/v2/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${mollieKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: { currency: 'EUR', value: (due / 100).toFixed(2) },
      description: `Invoice ${invoice.invoice_number}`.slice(0, 255),
      redirectUrl,
      cancelUrl: `${redirectUrl}&canceled=1`,
      webhookUrl,
      metadata: {
        invoiceId,
        kind: 'portal_invoice',
        userIdPrefix: user.id.slice(0, 8),
        idempotencyKey: body?.idempotencyKey ?? undefined,
      },
    }),
  });

  if (!createRes.ok) {
    return json({ error: 'PROVIDER_UNAVAILABLE' }, 503);
  }

  const created = await createRes.json();
  if (created.mode && created.mode !== 'test') {
    return json({ error: 'TEST_MODE_REQUIRED' }, 403);
  }

  const checkoutUrl = created?._links?.checkout?.href as string | undefined;
  const paymentId = created?.id as string | undefined;
  if (!checkoutUrl || !paymentId) {
    return json({ error: 'PROVIDER_UNAVAILABLE' }, 503);
  }

  await admin
    .from('portal_invoices')
    .update({
      external_payment_reference: paymentId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', invoiceId);

  return json({
    checkoutUrl,
    status: created.status ?? 'open',
    paymentRef: mask(paymentId),
    amountCents: due,
    currency: 'EUR',
    reused: false,
    payment: {
      id: mask(paymentId),
      invoiceId,
      status: created.status === 'paid' ? 'open' : (created.status ?? 'open'),
      amountCents: due,
      currency: 'EUR',
    },
  });
});
