import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

type Json = Record<string, unknown>;
type Body = {
  token?: string;
  platform?: 'android' | 'ios';
  deviceId?: string | null;
  appVersion?: string | null;
  active?: boolean;
};

function json(body: Json, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isExpoPushToken(value: string): boolean {
  return /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(value);
}

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')?.trim();
  if (!supabaseUrl || !serviceKey || !anonKey) {
    return json({ error: 'FEATURE_NOT_CONFIGURED', feature: 'push_notifications' }, 503);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'FORBIDDEN' }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: 'FORBIDDEN' }, 401);

  const body = (await req.json().catch(() => null)) as Body | null;
  const token = body?.token?.trim() ?? '';
  const platform = body?.platform;
  const active = body?.active !== false;
  if (!isExpoPushToken(token) || (platform !== 'android' && platform !== 'ios')) {
    return json({ error: 'VALIDATION_FAILED' }, 400);
  }
  if ((body?.deviceId?.length ?? 0) > 255 || (body?.appVersion?.length ?? 0) > 64) {
    return json({ error: 'VALIDATION_FAILED' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Revocation must remain available even after push delivery is disabled.
  // Identity is still proven by the user's bearer JWT and the update is scoped to that user.
  if (!active) {
    const { error } = await admin
      .from('push_tokens')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('token', token)
      .eq('user_id', user.id);
    if (error) return json({ error: 'PERSISTENCE_UNAVAILABLE' }, 503);
    return json({ ok: true, active: false });
  }

  const { data: flag, error: flagError } = await admin
    .from('feature_flags')
    .select('enabled')
    .eq('key', 'push_notifications')
    .maybeSingle();
  if (flagError || flag?.enabled !== true) {
    return json({ error: 'FEATURE_NOT_CONFIGURED', feature: 'push_notifications' }, 503);
  }

  // Service-side claim intentionally supports account changes on one installation.
  // A token can only be claimed by the user proven by the bearer JWT above.
  const now = new Date().toISOString();
  const { data: existing, error: lookupError } = await admin
    .from('push_tokens')
    .select('id')
    .eq('token', token)
    .maybeSingle();
  if (lookupError) return json({ error: 'PERSISTENCE_UNAVAILABLE' }, 503);

  if (existing?.id) {
    const { error } = await admin
      .from('push_tokens')
      .update({
        user_id: user.id,
        platform,
        device_id: body?.deviceId?.trim() || null,
        app_version: body?.appVersion?.trim() || null,
        is_active: true,
        last_seen_at: now,
        updated_at: now,
      })
      .eq('id', existing.id);
    if (error) return json({ error: 'PERSISTENCE_UNAVAILABLE' }, 503);
    return json({ ok: true, active: true, reused: true });
  }

  const { error: insertError } = await admin.from('push_tokens').insert({
    user_id: user.id,
    token,
    platform,
    device_id: body?.deviceId?.trim() || null,
    app_version: body?.appVersion?.trim() || null,
    is_active: true,
    last_seen_at: now,
  });
  if (insertError) return json({ error: 'PERSISTENCE_UNAVAILABLE' }, 503);

  return json({ ok: true, active: true, reused: false });
});
