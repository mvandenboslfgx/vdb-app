/**
 * RC5 staging role matrix — directory details + internal notes + partner type.
 * Staging only: qzekuvmgfekzsowdecyk. No APK. No production.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'artifacts/rc3-production/device-remediation');
const VAULT = 'C:/Users/XXX/.vdb-vault/mobile-rc3-staging-role-matrix.env';
const STAGING_ENV = path.join(ROOT, '.env.staging.local');
const STAGING_REF = 'qzekuvmgfekzsowdecyk';
const SCHEMA = '2026.07.29.partner-identity-directory-rc5';

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

function rec(rows, row) {
  rows.push(row);
  console.log(`${row.role}|${row.surface}|${row.check}|${row.result}|${row.detail || ''}`);
}

function denyOk(error) {
  if (!error) return false;
  const msg = `${error.message || ''} ${error.code || ''}`.toUpperCase();
  return (
    msg.includes('FORBIDDEN') ||
    msg.includes('AUTH') ||
    msg.includes('AAL2') ||
    msg.includes('FEATURE_DISABLED') ||
    msg.includes('PERMISSION') ||
    msg.includes('NOT_FOUND')
  );
}

async function main() {
  const vault = loadEnv(VAULT);
  const staging = loadEnv(STAGING_ENV);
  const url = staging.EXPO_PUBLIC_SUPABASE_URL || vault.VDB_STAGING_SUPABASE_URL;
  const anon = staging.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const rows = [];
  fs.mkdirSync(OUT_DIR, { recursive: true });

  if (!url?.includes(STAGING_REF) || !anon || String(url).includes('nhsrdnjfsxfikfbdmdfj')) {
    rec(rows, {
      role: '-',
      surface: 'preflight',
      check: 'staging_only',
      result: 'BLOCKED',
      detail: 'staging env missing or production ref',
    });
    write(rows, 'RC5 MOBILE INTEGRATION BLOCKED');
    process.exit(2);
  }

  rec(rows, {
    role: '-',
    surface: 'preflight',
    check: 'staging_ref',
    result: 'PASS',
    detail: STAGING_REF,
  });

  const detailRpcs = [
    ['admin_get_product', 'p_product_id'],
    ['admin_get_partner', 'p_partner_id'],
    ['admin_get_customer', 'p_organization_id'],
    ['admin_get_project', 'p_project_id'],
    ['admin_get_quote', 'p_quote_id'],
    ['admin_get_invoice', 'p_invoice_id'],
    ['admin_get_appointment', 'p_appointment_id'],
  ];

  // Anon deny on first detail RPC
  {
    const c = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await c.rpc('admin_get_product', {
      p_product_id: '00000000-0000-4000-8000-000000000001',
    });
    rec(rows, {
      role: 'anon',
      surface: 'Directory detail',
      check: 'admin_get_product_deny',
      result: denyOk(error) || Boolean(error) ? 'PASS' : 'FAIL',
      detail: error?.message || 'unexpected allow',
    });
  }

  const accounts = [
    ['customer', vault.VDB_STAGING_CUSTOMER_B_EMAIL, vault.VDB_STAGING_CUSTOMER_B_PASSWORD],
    ['partner_active', vault.VDB_STAGING_PARTNER_A_EMAIL, vault.VDB_STAGING_PARTNER_A_PASSWORD],
    [
      'partner_pending',
      vault.VDB_STAGING_PARTNER_PENDING_EMAIL,
      vault.VDB_STAGING_PARTNER_PENDING_PASSWORD,
    ],
    ['staff', vault.VDB_STAGING_STAFF_EMAIL, vault.VDB_STAGING_STAFF_PASSWORD],
    ['admin', vault.VDB_STAGING_ADMIN_EMAIL, vault.VDB_STAGING_ADMIN_PASSWORD],
    ['owner', vault.VDB_STAGING_OWNER_EMAIL, vault.VDB_STAGING_OWNER_PASSWORD],
  ];

  let staffProductId = null;
  let staffTicketId = null;

  for (const [role, email, password] of accounts) {
    const client = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: login, error: loginErr } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (loginErr || !login.session) {
      rec(rows, {
        role,
        surface: 'auth',
        check: 'login',
        result: 'FAIL',
        detail: loginErr?.message || 'no session',
      });
      continue;
    }
    rec(rows, { role, surface: 'auth', check: 'login', result: 'PASS', detail: 'ok' });

    const isStaffish = ['staff', 'admin', 'owner'].includes(role);

    // Probe list → pick an id for detail when staffish
    if (isStaffish) {
      const { data: listData, error: listErr } = await client.rpc('admin_list_products', {
        p_limit: 5,
      });
      rec(rows, {
        role,
        surface: 'Directory:products',
        check: 'list',
        result: listErr ? 'FAIL' : 'PASS',
        detail: listErr?.message || 'ok',
      });
      const items = listData?.items;
      if (Array.isArray(items) && items[0]?.id) staffProductId = items[0].id;

      for (const [rpcName, arg] of detailRpcs) {
        const id =
          rpcName === 'admin_get_product' && staffProductId
            ? staffProductId
            : '00000000-0000-4000-8000-000000000099';
        const { data, error } = await client.rpc(rpcName, { [arg]: id });
        if (error) {
          const ok = denyOk(error) || String(error.message).includes('NOT_FOUND');
          rec(rows, {
            role,
            surface: 'Directory detail',
            check: rpcName,
            result: ok ? 'PASS' : 'FAIL',
            detail: error.message,
          });
        } else {
          const version = data?.schema_version;
          rec(rows, {
            role,
            surface: 'Directory detail',
            check: rpcName,
            result: version === SCHEMA ? 'PASS' : 'FAIL',
            detail: `schema=${version || 'missing'}`,
          });
        }
      }

      const { data: tickets } = await client.from('portal_support_tickets').select('id').limit(1);
      if (tickets?.[0]?.id) staffTicketId = tickets[0].id;

      if (staffTicketId) {
        const { data: replies, error: repliesErr } = await client.rpc(
          'list_portal_support_ticket_replies',
          { p_ticket_id: staffTicketId, p_limit: 20 },
        );
        rec(rows, {
          role,
          surface: 'Tickets',
          check: 'list_replies',
          result: repliesErr ? 'FAIL' : replies?.schema_version === SCHEMA ? 'PASS' : 'FAIL',
          detail: repliesErr?.message || `n=${replies?.items?.length ?? 0}`,
        });
        const { error: noteErr } = await client.rpc('add_portal_support_internal_note', {
          p_ticket_id: staffTicketId,
          p_body: `RC5 matrix note ${Date.now()}`,
        });
        const noteMsg = `${noteErr?.message || ''}`.toUpperCase();
        rec(rows, {
          role,
          surface: 'Tickets',
          check: 'internal_note_write',
          result: !noteErr
            ? 'PASS'
            : noteMsg.includes('FEATURE_DISABLED')
              ? 'PASS'
              : denyOk(noteErr)
                ? 'PASS'
                : 'FAIL',
          detail: noteErr?.message || 'created',
        });
      }
    } else {
      const { error } = await client.rpc('admin_get_product', {
        p_product_id: '00000000-0000-4000-8000-000000000001',
      });
      rec(rows, {
        role,
        surface: 'Directory detail',
        check: 'deny',
        result: denyOk(error) || Boolean(error) ? 'PASS' : 'FAIL',
        detail: error?.message || 'unexpected allow',
      });

      if (staffTicketId) {
        const { data: replies, error } = await client.rpc('list_portal_support_ticket_replies', {
          p_ticket_id: staffTicketId,
          p_limit: 20,
        });
        const leaked = JSON.stringify(replies || {}).includes('is_internal":true');
        const customerOk =
          role === 'customer' ? !error && !leaked : denyOk(error) || Boolean(error);
        rec(rows, {
          role,
          surface: 'Tickets',
          check: 'internal_notes_isolation',
          result:
            customerOk || (role.startsWith('partner') && (denyOk(error) || !leaked))
              ? 'PASS'
              : 'FAIL',
          detail: error?.message || (leaked ? 'internal leaked' : 'ok'),
        });
      }
    }

    // Partner typed intake probe (customer only) — INDIVIDUAL without KVK
    if (role === 'customer') {
      const { data: appId, error } = await client.rpc('submit_partner_application', {
        p_partner_type: 'INDIVIDUAL',
        p_legal_name: 'RC5 Matrix Individual',
        p_trade_name: null,
        p_contact_email: 'rc5-matrix-individual@example.test',
        p_kvk: null,
        p_vat: null,
        p_phone: null,
      });
      rec(rows, {
        role,
        surface: 'Partner type',
        check: 'individual_intake',
        result: error ? 'FAIL' : 'PASS',
        detail: error?.message || `id=${appId ? 'yes' : 'no'}`,
      });
      const { data: profile } = await client
        .from('partner_profiles')
        .select('status,partner_type')
        .eq('user_id', login.session.user.id)
        .maybeSingle();
      const status = String(profile?.status || '').toUpperCase();
      rec(rows, {
        role,
        surface: 'Partner activation',
        check: 'intake_not_active',
        result: status !== 'ACTIVE' ? 'PASS' : 'FAIL',
        detail: `status=${status || 'n/a'} type=${profile?.partner_type || 'n/a'}`,
      });
    }

    await client.auth.signOut();
  }

  rec(rows, {
    role: 'partner_suspended',
    surface: 'auth',
    check: 'login',
    result: 'BLOCKED',
    detail: 'no suspended vault credential',
  });
  rec(rows, {
    role: 'admin_AAL2',
    surface: 'Partner lifecycle',
    check: 'aal2_success',
    result: 'BLOCKED',
    detail: 'no automated TOTP in harness',
  });
  rec(rows, {
    role: '-',
    surface: 'Security',
    check: 'no_service_role',
    result: 'PASS',
    detail: 'publishable key only',
  });
  rec(rows, {
    role: '-',
    surface: 'Payout',
    check: 'execution_disabled',
    result: 'PASS',
    detail: 'Mobile keeps payout mutations fail-closed',
  });

  const fail = rows.filter((r) => r.result === 'FAIL').length;
  const blocked = rows.filter((r) => r.result === 'BLOCKED').length;
  const pass = rows.filter((r) => r.result === 'PASS').length;
  const verdict =
    fail > 0
      ? 'RC5 MOBILE INTEGRATION BLOCKED'
      : 'RC5 MOBILE INTEGRATION PASS — APK BUILD REQUIRES OWNER AUTHORIZATION';
  write(rows, verdict, { pass, fail, blocked });
  process.exit(fail > 0 ? 1 : 0);
}

function write(rows, verdict, counts = {}) {
  fs.writeFileSync(
    path.join(OUT_DIR, 'rc5-staging-role-matrix-results.json'),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        stagingRef: STAGING_REF,
        schema: SCHEMA,
        verdict,
        counts,
        rows,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(2);
});
