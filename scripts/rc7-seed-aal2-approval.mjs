#!/usr/bin/env node
/** Seed SUBMITTED partner application for AAL2 approval trigger — staging only. */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { parseEnvFile } from './lib/load-env-file.mjs';

const STAGING_REF = 'kjricvicakvsreuytvra';
const PRODUCTION_REF = 'nhsrdnjfsxfikfbdmdfj';
const VAULT = process.env.RC7_VAULT || 'C:/Users/XXX/.vdb-vault/rc7-staging-role-matrix.env';
const OUT_DIR =
  process.env.RC7_EVIDENCE_DIR ||
  'C:/Users/XXX/vdb-full-staging-recovery-2026-07-29/samsung-s25-rc7-device-e2e';
const url = process.env.RC7_STAGING_URL || `https://${STAGING_REF}.supabase.co`;

function fetchServiceRoleKey() {
  const raw = execFileSync(
    'npx',
    ['supabase', 'projects', 'api-keys', '--project-ref', STAGING_REF, '-o', 'json'],
    { encoding: 'utf8', shell: true },
  );
  const keys = JSON.parse(raw);
  const row = keys.find((k) => String(k.name ?? '').toLowerCase().includes('service'));
  if (!row?.api_key) throw new Error('service_role_key_unavailable');
  return row.api_key;
}

async function main() {
  if (!url.includes(STAGING_REF) || url.includes(PRODUCTION_REF)) process.exit(2);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const vault = parseEnvFile(VAULT);
  const partnerEmail = vault.RC7_PARTNER_A_EMAIL;
  if (!partnerEmail) throw new Error('missing RC7_PARTNER_A_EMAIL');

  const svc = createClient(url, fetchServiceRoleKey(), { auth: { persistSession: false } });
  const { data: users } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 });
  const partnerUser = users?.users?.find((u) => u.email === partnerEmail);
  if (!partnerUser) throw new Error('partner_a_user_missing');

  const { data: existing, error: readErr } = await svc
    .from('partner_applications')
    .select('id')
    .eq('user_id', partnerUser.id)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);

  const payload = {
    user_id: partnerUser.id,
    status: 'SUBMITTED',
    partner_type: 'BUSINESS',
    legal_name: 'RC7 Phone Phase AAL2 Queue',
    kvk_number: '99887766',
    submitted_at: new Date().toISOString(),
  };
  const { error } = existing?.id
    ? await svc.from('partner_applications').update(payload).eq('id', existing.id)
    : await svc.from('partner_applications').insert(payload);
  if (error) throw new Error(error.message);

  fs.writeFileSync(
    path.join(OUT_DIR, 'rc7-aal2-approval-seed.json'),
    JSON.stringify({ at: new Date().toISOString(), result: 'PASS', partnerEmailPrefix: partnerEmail.slice(0, 12) }, null, 2),
  );
  console.log('RC7_AAL2_APPROVAL_SEED PASS');
}

main().catch((e) => {
  console.error(String(e.message ?? e).slice(0, 200));
  process.exit(1);
});
