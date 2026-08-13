import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

/**
 * STATUS: NOT DEPLOYED — code-complete proposal.
 * Server-only fan-out for in-app + Expo push notifications.
 * Requires the push_notifications feature flag AND NOTIFICATION_DISPATCH_SECRET.
 */

type Json = Record<string, unknown>;
type DispatchBody = {
  userId?: string;
  title?: string;
  body?: string;
  category?: string;
  data?: Record<string, unknown>;
  deepLink?: string;
  idempotencyKey?: string;
};

type ExpoTicket = {
  status?: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
};

function json(body: Json, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function secureEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < length; i += 1) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isExpoPushToken(value: string): boolean {
  return /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(value);
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  const dispatchSecret = Deno.env.get('NOTIFICATION_DISPATCH_SECRET')?.trim();
  const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN')?.trim();

  if (!supabaseUrl || !serviceKey || !dispatchSecret) {
    return json({ error: 'FEATURE_NOT_CONFIGURED', feature: 'push_notifications' }, 503);
  }

  const suppliedSecret = req.headers.get('x-vdb-notification-secret')?.trim() ?? '';
  if (!suppliedSecret || !secureEqual(suppliedSecret, dispatchSecret)) {
    return json({ error: 'FORBIDDEN' }, 403);
  }

  const payload = (await req.json().catch(() => null)) as DispatchBody | null;
  const userId = payload?.userId?.trim() ?? '';
  const title = payload?.title?.trim() ?? '';
  const body = payload?.body?.trim() ?? '';
  const idempotencyKey = payload?.idempotencyKey?.trim() ?? '';

  if (!isUuid(userId) || !title || !body || !idempotencyKey) {
    return json({ error: 'VALIDATION_FAILED' }, 400);
  }
  if (title.length > 180 || body.length > 2000 || idempotencyKey.length > 200) {
    return json({ error: 'VALIDATION_FAILED' }, 400);
  }
  if (payload?.deepLink && payload.deepLink.length > 1000) {
    return json({ error: 'VALIDATION_FAILED' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: flag, error: flagError } = await admin
    .from('feature_flags')
    .select('enabled')
    .eq('key', 'push_notifications')
    .maybeSingle();
  if (flagError || flag?.enabled !== true) {
    return json({ error: 'FEATURE_NOT_CONFIGURED', feature: 'push_notifications' }, 503);
  }

  const { data: existing, error: existingError } = await admin
    .from('notifications')
    .select('id')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  if (existingError) return json({ error: 'PERSISTENCE_UNAVAILABLE' }, 503);
  if (existing?.id) {
    return json({ ok: true, duplicate: true, notificationId: existing.id });
  }

  const { data: notification, error: notificationError } = await admin
    .from('notifications')
    .insert({
      user_id: userId,
      title,
      body,
      category: payload?.category?.trim() || null,
      data: payload?.data ?? {},
      deep_link: payload?.deepLink?.trim() || null,
      idempotency_key: idempotencyKey,
    })
    .select('id')
    .single();

  if (notificationError) {
    if (notificationError.code === '23505') {
      const { data: replay } = await admin
        .from('notifications')
        .select('id')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      if (replay?.id) return json({ ok: true, duplicate: true, notificationId: replay.id });
    }
    return json({ error: 'PERSISTENCE_UNAVAILABLE' }, 503);
  }

  const notificationId = notification.id as string;
  const { data: tokenRows, error: tokenError } = await admin
    .from('push_tokens')
    .select('id, token')
    .eq('user_id', userId)
    .eq('is_active', true);
  if (tokenError) return json({ error: 'PERSISTENCE_UNAVAILABLE' }, 503);

  const validTokens = (tokenRows ?? []).filter((row) => isExpoPushToken(String(row.token)));
  if (validTokens.length === 0) {
    await admin.from('notification_deliveries').insert({
      notification_id: notificationId,
      channel: 'push',
      status: 'skipped',
      error_message: 'no_active_push_tokens',
      attempted_at: new Date().toISOString(),
    });
    return json({ ok: true, notificationId, queued: 0, sent: 0, failed: 0 });
  }

  let sent = 0;
  let failed = 0;

  for (const batch of chunks(validTokens, 100)) {
    const deliveryRows = batch.map((token) => ({
      notification_id: notificationId,
      channel: 'push',
      push_token_id: token.id,
      status: 'queued',
    }));
    const { data: deliveries, error: deliveryError } = await admin
      .from('notification_deliveries')
      .insert(deliveryRows)
      .select('id, push_token_id');
    if (deliveryError || !deliveries) return json({ error: 'PERSISTENCE_UNAVAILABLE' }, 503);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    };
    if (expoAccessToken) headers.Authorization = `Bearer ${expoAccessToken}`;

    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers,
      body: JSON.stringify(
        batch.map((token) => ({
          to: token.token,
          sound: 'default',
          title,
          body,
          data: {
            ...(payload?.data ?? {}),
            notificationId,
            deepLink: payload?.deepLink ?? null,
          },
        })),
      ),
    });

    if (!expoResponse.ok) {
      failed += batch.length;
      await admin
        .from('notification_deliveries')
        .update({
          status: 'failed',
          error_message: `expo_http_${expoResponse.status}`,
          attempted_at: new Date().toISOString(),
        })
        .in(
          'id',
          deliveries.map((row) => row.id),
        );
      continue;
    }

    const result = (await expoResponse.json().catch(() => null)) as { data?: ExpoTicket[] } | null;
    const tickets = Array.isArray(result?.data) ? result!.data! : [];

    for (let i = 0; i < batch.length; i += 1) {
      const ticket = tickets[i];
      const delivery = deliveries[i];
      const token = batch[i];
      const ok = ticket?.status === 'ok';
      if (ok) sent += 1;
      else failed += 1;

      await admin
        .from('notification_deliveries')
        .update({
          status: ok ? 'sent' : 'failed',
          provider_message_id: ticket?.id ?? null,
          error_message: ok ? null : ticket?.details?.error ?? ticket?.message ?? 'expo_rejected',
          attempted_at: new Date().toISOString(),
        })
        .eq('id', delivery.id);

      if (!ok && ticket?.details?.error === 'DeviceNotRegistered') {
        await admin
          .from('push_tokens')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', token.id);
      }
    }
  }

  return json({
    ok: true,
    duplicate: false,
    notificationId,
    queued: validTokens.length,
    sent,
    failed,
  });
});
