/**
 * STATUS: NOT APPLIED / STUB ONLY — local proposal.
 * Play Store / product policy gate for in-app Mollie checkout.
 * Blocks digital_good / external_subscription / restricted unless flags + policy allow.
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

type ProductCategoryPolicy =
  | 'service'
  | 'physical_product'
  | 'custom_project'
  | 'digital_good'
  | 'external_subscription'
  | 'restricted'
  | 'manual_review_required';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405 });
  }

  let body: {
    product_category_policy?: ProductCategoryPolicy;
    feature_flags?: Record<string, boolean>;
  } = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400 });
  }

  const policy = body.product_category_policy ?? 'manual_review_required';
  const flags = body.feature_flags ?? {};

  const blockedByDefault: ProductCategoryPolicy[] = [
    'digital_good',
    'external_subscription',
    'restricted',
    'manual_review_required',
  ];

  const allowed =
    !blockedByDefault.includes(policy) &&
    (flags['mollie_checkout'] === true || flags['payments.mollie_checkout'] === true) &&
    (policy !== 'digital_good' ||
      flags['digital_product_checkout'] === true ||
      flags['payments.digital_goods_checkout'] === true) &&
    (policy !== 'external_subscription' ||
      flags['digital_product_checkout'] === true ||
      flags['payments.external_subscription_checkout'] === true);

  return new Response(
    JSON.stringify({
      ok: true,
      stub: true,
      allowed,
      policy,
      reason: allowed
        ? 'policy_allows_checkout'
        : 'blocked_by_play_store_policy_gate_or_feature_flag',
      message: 'payment-policy-gate stub — evaluate locally; remote NOT APPLIED',
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
