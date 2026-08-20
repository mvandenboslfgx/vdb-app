#!/usr/bin/env node
/**
 * Read-only account inventory for staging (or linked project).
 * Never prints passwords, TOTP secrets, or tokens.
 *
 * Usage (staging):
 *   RC7_STAGING_ANON_KEY=... node scripts/rc7-account-inventory.mjs
 * Service role via: npx supabase projects api-keys (staging ref only).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const STAGING_REF = 'kjricvicakvsreuytvra';
const PRODUCTION_REF = 'nhsrdnjfsxfikfbdmdfj';
const OUT_DIR =
  process.env.RC7_EVIDENCE_DIR ||
  'C:/Users/XXX/vdb-full-staging-recovery-2026-07-29/samsung-s25-rc7-device-e2e';
const url = process.env.RC7_STAGING_URL || `https://${STAGING_REF}.supabase.co`;
const BOOTSTRAP = 'algemeen@vdbdigital.nl';

function fetchServiceRoleKey() {
  const raw = execFileSync(
    'npx',
    ['supabase', 'projects', 'api-keys', '--project-ref', STAGING_REF, '-o', 'json'],
    { encoding: 'utf8', shell: true },
  );
  const keys = JSON.parse(raw);
  const row = keys.find((k) => String(k.name ?? '').toLowerCase().includes('service'));
  if (!row?.api_key) throw new Error('service_role_unavailable');
  return row.api_key;
}

function maskId(id) {
  return id ? `${String(id).slice(0, 8)}…` : '';
}

async function main() {
  if (!url.includes(STAGING_REF) || url.includes(PRODUCTION_REF)) {
    throw new Error('ABORT: inventory only allowed against staging ref');
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const svc = createClient(url, fetchServiceRoleKey(), { auth: { persistSession: false } });

  const { data: listData, error: listErr } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listErr) throw listErr;
  const users = listData?.users ?? [];

  const { data: roles } = await svc.from('admin_roles').select('user_id, role');
  const roleByUser = new Map((roles ?? []).map((r) => [r.user_id, r.role]));

  const { data: partners } = await svc.from('partner_profiles').select('user_id, status, id');
  const partnerByUser = new Map((partners ?? []).map((p) => [p.user_id, p]));

  const { data: profiles } = await svc.from('profiles').select('id, email, is_active, full_name');
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const rows = users.map((u) => {
    const email = u.email ?? profileById.get(u.id)?.email ?? '';
    const adminRole = roleByUser.get(u.id) ?? null;
    const partner = partnerByUser.get(u.id);
    const profile = profileById.get(u.id);
    let functional = 'CUSTOMER';
    if (adminRole === 'OWNER') functional = 'OWNER';
    else if (adminRole) functional = `STAFF:${adminRole}`;
    else if (partner) functional = `PARTNER:${partner.status ?? 'UNKNOWN'}`;

    return {
      email,
      userIdPrefix: maskId(u.id),
      functionalRole: functional,
      adminRole,
      partnerStatus: partner?.status ?? null,
      profileActive: profile?.is_active !== false,
      emailConfirmed: Boolean(u.email_confirmed_at),
      banned: Boolean(u.banned_until),
      isBootstrapOwnerCandidate: email.toLowerCase() === BOOTSTRAP,
      lastSignInAt: u.last_sign_in_at ?? null,
      factors: (u.factors ?? []).map((f) => ({
        type: f.factor_type,
        status: f.status,
        idPrefix: maskId(f.id),
      })),
    };
  });

  const summary = {
    at: new Date().toISOString(),
    stagingRef: STAGING_REF,
    userCount: rows.length,
    owners: rows.filter((r) => r.adminRole === 'OWNER').map((r) => r.email),
    admins: rows.filter((r) => r.adminRole === 'ADMIN').map((r) => r.email),
    bootstrapPresent: rows.some((r) => r.isBootstrapOwnerCandidate),
    bootstrapIsOwner: rows.some(
      (r) => r.isBootstrapOwnerCandidate && r.adminRole === 'OWNER',
    ),
    rows,
  };

  const out = path.join(OUT_DIR, 'rc7-account-inventory-staging.json');
  fs.writeFileSync(out, JSON.stringify(summary, null, 2));
  console.log(
    JSON.stringify(
      {
        ok: true,
        userCount: summary.userCount,
        owners: summary.owners,
        adminsCount: summary.admins.length,
        bootstrapPresent: summary.bootstrapPresent,
        bootstrapIsOwner: summary.bootstrapIsOwner,
        out: path.basename(out),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(String(e.message ?? e).slice(0, 240));
  process.exit(1);
});
