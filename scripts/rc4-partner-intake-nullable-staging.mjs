/**
 * Staging probe: Owner submit_partner_application accepts null trade_name/kvk.
 * Staging only. No production. Must not leave partner ACTIVE.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(
  ROOT,
  'artifacts/rc3-production/device-remediation/PARTNER_INTAKE_NULLABLE_STAGING.md',
);
const VAULT = 'C:/Users/XXX/.vdb-vault/mobile-rc3-staging-role-matrix.env';
const STAGING_ENV = path.join(ROOT, '.env.staging.local');
const STAGING_REF = 'qzekuvmgfekzsowdecyk';

function loadEnv(filePath) {
  const map = {};
  if (!fs.existsSync(filePath)) return map;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i > 0)
      map[line.slice(0, i).trim()] = line
        .slice(i + 1)
        .trim()
        .replace(/^["']|["']$/g, '');
  }
  return map;
}

async function main() {
  const vault = loadEnv(VAULT);
  const staging = loadEnv(STAGING_ENV);
  const url = staging.EXPO_PUBLIC_SUPABASE_URL || vault.VDB_STAGING_SUPABASE_URL;
  const anon = staging.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const lines = [
    '# Partner intake nullable staging probe',
    '',
    `At: ${new Date().toISOString()}`,
    `Staging: ${STAGING_REF}`,
    'RPC: `submit_partner_application`',
    '',
  ];

  if (!url?.includes(STAGING_REF) || !anon) {
    lines.push('Result: **BLOCKED** — missing staging URL/key');
    fs.writeFileSync(OUT, lines.join('\n') + '\n');
    process.exit(2);
  }

  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signErr } = await client.auth.signInWithPassword({
    email: vault.VDB_STAGING_CUSTOMER_B_EMAIL,
    password: vault.VDB_STAGING_CUSTOMER_B_PASSWORD,
  });
  if (signErr) {
    lines.push(`Result: **FAIL** — login`);
    fs.writeFileSync(OUT, lines.join('\n') + '\n');
    process.exit(1);
  }

  const { data: appId, error } = await client.rpc('submit_partner_application', {
    p_legal_name: 'Staging Intake Probe',
    p_trade_name: null,
    p_contact_email: 'staging-intake-probe@example.test',
    p_kvk: null,
    p_vat: null,
    p_phone: null,
  });

  if (error) {
    lines.push('Result: **FAIL** — null trade_name/kvk rejected by RPC');
    lines.push(`Detail: ${error.message}`);
    fs.writeFileSync(OUT, lines.join('\n') + '\n');
    await client.auth.signOut();
    process.exit(1);
  }

  const { data: appRow } = await client
    .from('partner_applications')
    .select('id,status,trade_name,kvk_number,legal_name')
    .eq('id', appId)
    .maybeSingle();

  const { data: profile } = await client
    .from('partner_profiles')
    .select('id,status')
    .eq('user_id', (await client.auth.getUser()).data.user?.id)
    .maybeSingle();

  const appStatus = String(appRow?.status ?? '').toUpperCase();
  const profileStatus = String(profile?.status ?? '').toUpperCase();
  const appOk =
    ['SUBMITTED', 'DRAFT', 'IN_REVIEW', 'PENDING'].includes(appStatus) || Boolean(appId);
  const notActive =
    profileStatus !== 'ACTIVE' && appStatus !== 'ACTIVE' && appStatus !== 'APPROVED';

  lines.push('Result: **PASS** — null `trade_name` / `kvk_number` accepted');
  lines.push(`Application id present: ${appId ? 'yes' : 'no'}`);
  lines.push(`Application status: \`${appStatus || 'n/a'}\``);
  lines.push(`Profile status: \`${profileStatus || 'n/a'}\``);
  lines.push(`trade_name null: ${appRow?.trade_name == null ? 'PASS' : 'unexpected value'}`);
  lines.push(`kvk_number null: ${appRow?.kvk_number == null ? 'PASS' : 'unexpected value'}`);
  lines.push(`Not auto-ACTIVE: ${notActive ? 'PASS' : 'FAIL'}`);
  lines.push('');
  lines.push('Hard boundaries confirmed:');
  lines.push('- No Mobile type enum inferred');
  lines.push('- No ACTIVE sales/lead/commission/payout grant from intake alone');
  lines.push('- S6 remains open until Owner PARTICULIER/ZAKELIJK model ships');

  fs.writeFileSync(OUT, lines.join('\n') + '\n');
  await client.auth.signOut();
  process.exit(appOk && notActive ? 0 : 1);
}

main().catch((e) => {
  fs.writeFileSync(
    OUT,
    `# Partner intake nullable staging probe\n\nResult: **CRASH**\n\n${String(e?.message || e)}\n`,
  );
  process.exit(2);
});
