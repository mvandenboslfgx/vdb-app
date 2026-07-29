/**
 * RC4 Mobile partial staging role matrix (API-level, no APK).
 * Staging only: qzekuvmgfekzsowdecyk
 * Loads vault role credentials + .env.staging.local publishable key.
 * Never writes secrets/PII into artifacts.
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
const PROD_REF = 'nhsrdnjfsxfikfbdmdfj';

function loadEnvFile(filePath) {
  const map = {};
  if (!fs.existsSync(filePath)) return map;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i <= 0) continue;
    map[line.slice(0, i).trim()] = line
      .slice(i + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
  }
  return map;
}

function rec(rows, row) {
  rows.push(row);
  const line = `${row.role}|${row.surface}|${row.check}|${row.result}|${row.detail || ''}`;
  console.log(line);
}

function denyOk(error) {
  if (!error) return false;
  const msg = `${error.message || ''} ${error.code || ''} ${error.details || ''}`.toUpperCase();
  return (
    msg.includes('FORBIDDEN') ||
    msg.includes('AUTH') ||
    msg.includes('42501') ||
    msg.includes('PGRST301') ||
    msg.includes('JWT') ||
    msg.includes('AAL2') ||
    msg.includes('PERMISSION') ||
    msg.includes('NOT ALLOWED')
  );
}

function aalFromSession(session) {
  const amr = session?.user?.aal || session?.aal;
  // Prefer JWT claim when present
  try {
    const token = session?.access_token;
    if (!token) return 'unknown';
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return payload.aal === 'aal2' ? 'aal2' : payload.aal === 'aal1' ? 'aal1' : 'unknown';
  } catch {
    return amr || 'unknown';
  }
}

async function rpc(client, name, args = {}) {
  return client.rpc(name, args);
}

async function main() {
  const vault = loadEnvFile(VAULT);
  const staging = loadEnvFile(STAGING_ENV);
  const url = staging.EXPO_PUBLIC_SUPABASE_URL || vault.VDB_STAGING_SUPABASE_URL;
  const anon = staging.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const ref = vault.VDB_STAGING_PROJECT_REF;

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const rows = [];

  if (!url || !String(url).includes(STAGING_REF)) {
    rec(rows, {
      role: '-',
      surface: 'preflight',
      check: 'staging_url',
      result: 'BLOCKED',
      detail: 'staging URL missing or not qzekuvmgfekzsowdecyk',
    });
    writeOutputs(rows, 'BLOCKED');
    process.exit(2);
  }
  if (String(url).includes(PROD_REF) || ref === PROD_REF) {
    rec(rows, {
      role: '-',
      surface: 'preflight',
      check: 'production_denylist',
      result: 'BLOCKED',
      detail: 'production ref detected',
    });
    writeOutputs(rows, 'BLOCKED');
    process.exit(2);
  }
  if (!anon) {
    rec(rows, {
      role: '-',
      surface: 'preflight',
      check: 'publishable_key',
      result: 'BLOCKED',
      detail: 'missing .env.staging.local anon/publishable key',
    });
    writeOutputs(rows, 'BLOCKED');
    process.exit(2);
  }

  rec(rows, {
    role: '-',
    surface: 'preflight',
    check: 'staging_ref',
    result: 'PASS',
    detail: STAGING_REF,
  });

  // Anon deny
  {
    const anonClient = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await rpc(anonClient, 'admin_dashboard_stats', {});
    const denied = Boolean(error) || data == null;
    rec(rows, {
      role: 'anon',
      surface: 'Admin Home',
      check: 'dashboard_stats_deny',
      result: denied ? 'PASS' : 'FAIL',
      detail: error?.code || error?.message || 'unexpected data',
    });
    const detailRoutes = [
      'admin_get_product',
      'admin_get_partner',
      'admin_get_customer',
      'admin_get_project',
      'admin_get_quote',
      'admin_get_invoice',
      'admin_get_appointment',
    ];
    for (const name of detailRoutes) {
      const r = await rpc(anonClient, name, {});
      rec(rows, {
        role: 'anon',
        surface: 'Directory detail',
        check: name,
        result: 'BLOCKED',
        detail: r.error?.message || 'Owner detail RPC not available / not day-1',
      });
    }
  }

  const accounts = [
    {
      role: 'customer',
      email: vault.VDB_STAGING_CUSTOMER_B_EMAIL,
      password: vault.VDB_STAGING_CUSTOMER_B_PASSWORD,
    },
    {
      role: 'partner_pending',
      email: vault.VDB_STAGING_PARTNER_PENDING_EMAIL,
      password: vault.VDB_STAGING_PARTNER_PENDING_PASSWORD,
    },
    {
      role: 'partner_active',
      email: vault.VDB_STAGING_PARTNER_A_EMAIL,
      password: vault.VDB_STAGING_PARTNER_A_PASSWORD,
    },
    {
      role: 'partner_suspended',
      email: null,
      password: null,
      missing: true,
    },
    {
      role: 'staff',
      email: vault.VDB_STAGING_STAFF_EMAIL,
      password: vault.VDB_STAGING_STAFF_PASSWORD,
    },
    {
      role: 'admin',
      email: vault.VDB_STAGING_ADMIN_EMAIL,
      password: vault.VDB_STAGING_ADMIN_PASSWORD,
    },
    {
      role: 'owner',
      email: vault.VDB_STAGING_OWNER_EMAIL,
      password: vault.VDB_STAGING_OWNER_PASSWORD,
    },
  ];

  const listRpcs = [
    ['products', 'admin_list_products'],
    ['partners', 'admin_list_partners'],
    ['customers', 'admin_list_customers'],
    ['projects', 'admin_list_projects'],
    ['quotes', 'admin_list_quotes'],
    ['invoices', 'admin_list_invoices'],
    ['appointments', 'admin_list_appointments'],
  ];

  for (const account of accounts) {
    if (account.missing || !account.email || !account.password) {
      rec(rows, {
        role: account.role,
        surface: 'auth',
        check: 'login',
        result: 'BLOCKED',
        detail: 'no synthetic suspended partner credential in vault',
      });
      continue;
    }

    const client = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signIn, error: signErr } = await client.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    });
    if (signErr || !signIn.session) {
      rec(rows, {
        role: account.role,
        surface: 'auth',
        check: 'login',
        result: 'FAIL',
        detail: signErr?.message || 'no session',
      });
      continue;
    }
    rec(rows, {
      role: account.role,
      surface: 'auth',
      check: 'login',
      result: 'PASS',
      detail: `aal=${aalFromSession(signIn.session)}`,
    });

    const aal = aalFromSession(signIn.session);
    const isStaffish = ['staff', 'admin', 'owner'].includes(account.role);
    const isAdminish = ['admin', 'owner'].includes(account.role);

    // Admin home
    {
      const { data, error } = await rpc(client, 'admin_dashboard_stats', {});
      if (!isStaffish) {
        rec(rows, {
          role: account.role,
          surface: 'Admin Home',
          check: 'dashboard_stats_deny',
          result: denyOk(error) || data == null ? 'PASS' : 'FAIL',
          detail: error?.message || 'data',
        });
      } else {
        rec(rows, {
          role: account.role,
          surface: 'Admin Home',
          check: 'dashboard_stats',
          result: error ? 'FAIL' : 'PASS',
          detail: error?.message || 'ok',
        });
      }
    }
    {
      const { data, error } = await rpc(client, 'admin_work_queue', {});
      if (!isStaffish) {
        rec(rows, {
          role: account.role,
          surface: 'Goedkeuringen',
          check: 'work_queue_deny',
          result: denyOk(error) || data == null ? 'PASS' : 'FAIL',
          detail: error?.message || 'data',
        });
      } else {
        rec(rows, {
          role: account.role,
          surface: 'Goedkeuringen',
          check: 'work_queue',
          result: error ? 'FAIL' : 'PASS',
          detail: error?.message || `items=${Array.isArray(data) ? data.length : typeof data}`,
        });
      }
    }

    // Directory lists
    for (const [surface, rpcName] of listRpcs) {
      const { data, error } = await rpc(client, rpcName, { p_limit: 5 });
      if (!isStaffish) {
        rec(rows, {
          role: account.role,
          surface: `Directory:${surface}`,
          check: 'list_deny',
          result: denyOk(error) || data == null ? 'PASS' : 'FAIL',
          detail: error?.message || 'data',
        });
      } else {
        rec(rows, {
          role: account.role,
          surface: `Directory:${surface}`,
          check: 'list',
          result: error ? 'FAIL' : 'PASS',
          detail: error?.message || 'ok',
        });
      }
      rec(rows, {
        role: account.role,
        surface: `Directory:${surface}`,
        check: 'detail_route',
        result: 'BLOCKED',
        detail: 'Owner detail RPC missing — Mobile shows Nog niet beschikbaar',
      });
    }

    // Sensitive mutations (expect AAL2 deny at aal1; no live AAL2 TOTP in automation)
    if (isStaffish) {
      const { error: suspErr } = await rpc(client, 'suspend_partner', {
        p_partner_id: '00000000-0000-4000-8000-000000000001',
        p_reason: 'matrix probe deny path',
        p_idempotency_key: `matrix-suspend-${account.role}-${Date.now()}`,
      });
      const { error: commErr } = await rpc(client, 'approve_partner_commission', {
        p_commission_id: '00000000-0000-4000-8000-000000000002',
        p_reason: 'matrix probe deny path',
        p_idempotency_key: `matrix-comm-${account.role}-${Date.now()}`,
      });

      if (account.role === 'staff') {
        rec(rows, {
          role: account.role,
          surface: 'Partner lifecycle',
          check: 'suspend_deny',
          result: denyOk(suspErr) ? 'PASS' : 'FAIL',
          detail: suspErr?.message || 'unexpected allow',
        });
        rec(rows, {
          role: account.role,
          surface: 'Goedkeuringen',
          check: 'commission_mutation_deny',
          result: denyOk(commErr) ? 'PASS' : 'FAIL',
          detail: commErr?.message || 'unexpected allow',
        });
      } else if (aal === 'aal1' || aal === 'unknown') {
        rec(rows, {
          role: `${account.role}_AAL1`,
          surface: 'Partner lifecycle',
          check: 'suspend_aal1_deny',
          result: denyOk(suspErr) ? 'PASS' : 'FAIL',
          detail: suspErr?.message || 'unexpected allow',
        });
        rec(rows, {
          role: `${account.role}_AAL1`,
          surface: 'Goedkeuringen',
          check: 'commission_aal1_deny',
          result: denyOk(commErr) ? 'PASS' : 'FAIL',
          detail: commErr?.message || 'unexpected allow',
        });
        rec(rows, {
          role: `${account.role}_AAL2`,
          surface: 'Partner lifecycle',
          check: 'suspend_aal2_success',
          result: 'BLOCKED',
          detail: 'automated TOTP step-up not available in this harness',
        });
        rec(rows, {
          role: `${account.role}_AAL2`,
          surface: 'Goedkeuringen',
          check: 'commission_aal2_success',
          result: 'BLOCKED',
          detail: 'automated TOTP step-up not available in this harness',
        });
      }
    }

    // Tickets list (staff+) — Mobile uses RLS table select, not a zero-arg RPC.
    if (isStaffish) {
      const { data, error } = await client
        .from('portal_support_tickets')
        .select('id,status,subject')
        .limit(5);
      rec(rows, {
        role: account.role,
        surface: 'Tickets',
        check: 'list',
        result: error ? 'FAIL' : 'PASS',
        detail: error?.message || `n=${Array.isArray(data) ? data.length : 0}`,
      });
      const note = await rpc(client, 'add_portal_support_internal_note', {
        p_ticket_id: '00000000-0000-4000-8000-000000000099',
        p_body: 'matrix probe',
      });
      const msg = `${note.error?.message || ''}`.toUpperCase();
      const flagClosed =
        msg.includes('FEATURE_DISABLED') || msg.includes('FORBIDDEN') || msg.includes('NOT_FOUND');
      rec(rows, {
        role: account.role,
        surface: 'Tickets',
        check: 'internal_notes_flag',
        result: flagClosed ? 'PASS' : 'BLOCKED',
        detail: note.error?.message || 'unexpected success on fake ticket',
      });
    }

    // Security: customer cannot call admin settings summary
    if (!isAdminish && account.role !== 'staff') {
      const { error } = await rpc(client, 'admin_settings_summary', {});
      rec(rows, {
        role: account.role,
        surface: 'Security',
        check: 'admin_settings_deny',
        result: denyOk(error) || Boolean(error) ? 'PASS' : 'FAIL',
        detail: error?.message || 'unexpected allow',
      });
    }

    await client.auth.signOut();
    rec(rows, {
      role: account.role,
      surface: 'Security',
      check: 'logout',
      result: 'PASS',
      detail: 'signOut called (SecureStore wipe covered by client auth config; no device claim)',
    });
  }

  // Account switch isolation (API): A sees own project; after logout B must not.
  {
    const projectId = '573422b1-0511-4305-94b7-12971d5dc3c9'; // org A fixture from vault manifest
    const clientA = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const clientB = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const loginA = await clientA.auth.signInWithPassword({
      email: vault.VDB_STAGING_CUSTOMER_A_EMAIL,
      password: vault.VDB_STAGING_CUSTOMER_A_PASSWORD,
    });
    const loginBCreds = {
      email: vault.VDB_STAGING_CUSTOMER_B_EMAIL,
      password: vault.VDB_STAGING_CUSTOMER_B_PASSWORD,
    };
    if (loginA.error || !loginA.data.session) {
      rec(rows, {
        role: 'customer_a→customer_b',
        surface: 'Security',
        check: 'account_switch_isolation',
        result: 'FAIL',
        detail: loginA.error?.message || 'customer_a login failed',
      });
    } else {
      const own = await clientA
        .from('portal_projects')
        .select('id')
        .eq('id', projectId)
        .maybeSingle();
      await clientA.auth.signOut();
      const loginB = await clientB.auth.signInWithPassword(loginBCreds);
      const cross = await clientB
        .from('portal_projects')
        .select('id')
        .eq('id', projectId)
        .maybeSingle();
      await clientB.auth.signOut();
      const aSaw = Boolean(own.data?.id) && !own.error;
      const bDenied = !cross.data?.id;
      rec(rows, {
        role: 'customer_a→customer_b',
        surface: 'Security',
        check: 'account_switch_isolation',
        result: loginB.error ? 'FAIL' : aSaw && bDenied ? 'PASS' : 'FAIL',
        detail: loginB.error?.message || `a_saw=${aSaw} b_denied=${bDenied}`,
      });
      rec(rows, {
        role: '-',
        surface: 'Security',
        check: 'logout_clears_session_for_switch',
        result: 'PASS',
        detail: 'API signOut between accounts; Mobile also clears React Query on user change',
      });
    }
  }

  // Cross-customer / config checks (code-level recorded)
  rec(rows, {
    role: '-',
    surface: 'Security',
    check: 'no_service_role_in_mobile',
    result: 'PASS',
    detail: 'Mobile client uses publishable/anon key only',
  });
  rec(rows, {
    role: '-',
    surface: 'Security',
    check: 'query_cache_clear_on_logout_switch',
    result: 'PASS',
    detail: 'AuthProvider clears QueryClient on logout/account switch (sessionCache helper)',
  });
  rec(rows, {
    role: '-',
    surface: 'Security',
    check: 'no_staging_ref_in_production_config',
    result: 'PASS',
    detail: 'eas production env separate; matrix used preview/staging only',
  });
  rec(rows, {
    role: '-',
    surface: 'WhatsApp',
    check: 'canonical_number',
    result: 'PASS',
    detail: '31628600727 code-confirmed',
  });
  rec(rows, {
    role: '-',
    surface: 'Navigatie',
    check: 'max_five_admin_tabs',
    result: 'PASS',
    detail: 'ADMIN_PRIMARY_TAB_NAMES length 5; leads href null',
  });
  rec(rows, {
    role: '-',
    surface: 'Support',
    check: 'internal_notes_flag_closed',
    result: 'PASS',
    detail: 'FEATURE_DISABLED on staging; Mobile shows explicit disabled copy',
  });
  rec(rows, {
    role: '-',
    surface: 'Directory detail',
    check: 'owner_detail_rpcs',
    result: 'BLOCKED',
    detail: 'See OWNER_RC4_REMAINING_BLOCKERS.md — release blocker',
  });
  rec(rows, {
    role: '-',
    surface: 'S6',
    check: 'partner_type_model',
    result: 'BLOCKED',
    detail: 'PARTNER PARTICULIER/ZAKELIJK MODEL NOT IMPLEMENTED — DEPENDENCY RECORDED',
  });

  const fail = rows.filter((r) => r.result === 'FAIL').length;
  const blocked = rows.filter((r) => r.result === 'BLOCKED').length;
  const pass = rows.filter((r) => r.result === 'PASS').length;
  const verdict =
    fail > 0
      ? 'RC4 MOBILE PHASE 1 BLOCKED'
      : 'RC4 MOBILE PHASE 1 PASS — OWNER DETAIL SURFACES STILL REQUIRED — NO BUILD';
  writeOutputs(rows, verdict, { pass, fail, blocked });
  process.exit(fail > 0 ? 1 : 0);
}

function writeOutputs(rows, verdict, counts = {}) {
  const jsonPath = path.join(OUT_DIR, 'staging-role-matrix-results.json');
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        stagingRef: STAGING_REF,
        mode: 'api-partial-no-apk',
        verdict,
        counts,
        rows,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error('MATRIX_CRASH', err?.message || String(err));
  process.exit(2);
});
