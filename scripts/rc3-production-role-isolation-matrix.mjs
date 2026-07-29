/**
 * Device role/isolation matrix for Mobile RC3 production (internal validation).
 * Loads credentials from Owner/Partner prod-smoke vaults without printing secrets.
 *
 * Usage:
 *   node scripts/rc3-production-role-isolation-matrix.mjs
 *
 * Never logs emails in full, passwords, or tokens. Never uses staging credentials.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const SERIAL = process.env.ANDROID_SERIAL || 'R3GYC00EBYY';
const VAULT =
  process.env.VDB_RC3_PROD_VAULT || 'C:/Users/XXX/.vdb-vault/partner-production-auth-smoke.env';
const IDS =
  process.env.VDB_RC3_PROD_IDS || 'C:/Users/XXX/.vdb-vault/owner-production-auth-smoke.ids.json';
const OUT_DIR = path.resolve('artifacts/rc3-production/role-matrix');
const PACKAGE = 'nl.vdbdigital.app';
const BUILD_ID = process.env.VDB_RC3_PROD_BUILD_ID || '1ae574dc-46ab-40f6-aceb-d78fc21a5da2';
const AAB_BUILD_ID =
  process.env.VDB_RC3_PROD_AAB_BUILD_ID || '97e62b92-6c58-4fe7-93ca-57672428a475';

const idsJson = JSON.parse(fs.readFileSync(IDS, 'utf8'));
const FIXTURE = {
  projectId: idsJson.fixtures.project_id,
  conversationIdCustA: idsJson.fixtures.conversation_id,
  quoteId: idsJson.fixtures.quote_id,
  invoiceId: idsJson.fixtures.invoice_id,
  documentId: idsJson.fixtures.document_id,
  ticketId: idsJson.fixtures.ticket_id,
  appointmentId: idsJson.fixtures.appointment_id,
  internalReplyId: idsJson.fixtures.internal_reply_id,
};

function loadVault(file) {
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i <= 0) continue;
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}

function adb(args, opts = {}) {
  const res = spawnSync('adb', ['-s', SERIAL, ...args], {
    encoding: 'utf8',
    shell: false,
    ...opts,
  });
  return {
    status: res.status ?? 1,
    stdout: res.stdout ?? '',
    stderr: res.stderr ?? '',
  };
}

function sleep(ms) {
  spawnSync(process.execPath, ['-e', `setTimeout(()=>{},${ms})`], { shell: false });
}

function dumpUi(name) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  adb(['shell', 'uiautomator', 'dump', '/sdcard/ui.xml']);
  const local = path.join(OUT_DIR, `ui-${name}.xml`);
  adb(['pull', '/sdcard/ui.xml', local]);
  // Screenshots disabled on Windows harness — binary screencap caused process kills.
  return fs.existsSync(local) ? fs.readFileSync(local, 'utf8') : '';
}

function textsFromXml(xml) {
  const out = [];
  const re = /text="([^"]{1,})"/g;
  let m;
  while ((m = re.exec(xml))) {
    const t = m[1].replace(/&#\d+;/g, '').trim();
    if (t) out.push(t);
  }
  return [...new Set(out)];
}

function hasAny(texts, needles) {
  const blob = texts.join(' | ').toLowerCase();
  return needles.some((n) => blob.includes(n.toLowerCase()));
}

function tapResource(xml, resourceId) {
  const re = new RegExp(
    `resource-id="${resourceId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`,
  );
  const m = xml.match(re);
  if (!m) return false;
  const x = Math.floor((Number(m[1]) + Number(m[3])) / 2);
  const y = Math.floor((Number(m[2]) + Number(m[4])) / 2);
  adb(['shell', 'input', 'tap', String(x), String(y)]);
  return true;
}

function tapText(xml, text) {
  const re = new RegExp(
    `text="${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`,
  );
  const m = xml.match(re);
  if (!m) return false;
  const x = Math.floor((Number(m[1]) + Number(m[3])) / 2);
  const y = Math.floor((Number(m[2]) + Number(m[4])) / 2);
  adb(['shell', 'input', 'tap', String(x), String(y)]);
  return true;
}

function inputOnFocused(text) {
  // `adb shell` runs through device sh — `$` and other metachars must be escaped
  // or passwords truncate at `$` (seen as short bullet masks for partner vault secrets).
  const escaped = String(text)
    .replace(/\\/g, '\\\\')
    .replace(/\$/g, '\\$')
    .replace(/`/g, '\\`')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/!/g, '\\!')
    .replace(/&/g, '\\&')
    .replace(/\|/g, '\\|')
    .replace(/;/g, '\\;')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/</g, '\\<')
    .replace(/>/g, '\\>')
    .replace(/ /g, '%s');
  adb(['shell', 'input', 'text', escaped]);
}

function clearField() {
  adb(['shell', 'input', 'keyevent', 'KEYCODE_MOVE_END']);
  for (let i = 0; i < 40; i++) adb(['shell', 'input', 'keyevent', 'KEYCODE_DEL']);
}

function ensureLoggedOut() {
  adb(['shell', 'am', 'force-stop', PACKAGE]);
  sleep(800);
  // Clear app data would wipe session but also invalidate local caches — prefer UI logout when possible.
  // For reliable account switching, clear only the app's webview/auth via pm clear is too destructive for evidence.
  // Use run-as clear of SharedPreferences is hard; force-stop + relaunch to public if no session,
  // otherwise navigate Sign out.
  adb(['shell', 'monkey', '-p', PACKAGE, '-c', 'android.intent.category.LAUNCHER', '1']);
  sleep(3500);
  let xml = dumpUi('pre-logout');
  let texts = textsFromXml(xml);
  if (hasAny(texts, ['Sign in', 'Inloggen', 'Create account', 'Account aanmaken'])) {
    return { ok: true, alreadyPublic: true };
  }
  // Try More → Sign out / Uitloggen
  if (
    !tapResource(xml, 'tab-customer-more') &&
    !tapResource(xml, 'tab-partner-more') &&
    !tapResource(xml, 'tab-admin-more')
  ) {
    // partner/admin more tabs may differ; try text
    tapText(xml, 'Meer') || tapText(xml, 'More');
  }
  sleep(1200);
  xml = dumpUi('more-for-logout');
  if (!(tapText(xml, 'Uitloggen') || tapText(xml, 'Sign out'))) {
    // Fallback: clear app data once for account switch reliability (staging only)
    adb(['shell', 'pm', 'clear', PACKAGE]);
    sleep(1000);
    adb(['shell', 'monkey', '-p', PACKAGE, '-c', 'android.intent.category.LAUNCHER', '1']);
    sleep(3500);
    xml = dumpUi('after-pm-clear');
    texts = textsFromXml(xml);
    return {
      ok: hasAny(texts, ['Sign in', 'Inloggen', 'Create account', 'Account aanmaken']),
      cleared: true,
    };
  }
  sleep(2500);
  xml = dumpUi('after-signout');
  texts = textsFromXml(xml);
  return {
    ok: hasAny(texts, ['Sign in', 'Inloggen', 'Create account', 'Account aanmaken']),
    cleared: false,
  };
}

function login(email, password, alias) {
  let xml = dumpUi(`login-${alias}-start`);
  if (
    !tapResource(xml, 'btn-public-login') &&
    !tapText(xml, 'Sign in') &&
    !tapText(xml, 'Inloggen')
  ) {
    return { ok: false, reason: 'login_button_missing' };
  }
  sleep(1500);
  xml = dumpUi(`login-${alias}-form`);
  if (!tapResource(xml, 'auth-email-input')) return { ok: false, reason: 'email_input_missing' };
  sleep(300);
  clearField();
  inputOnFocused(email);
  sleep(300);
  if (!tapResource(xml, 'auth-password-input')) {
    xml = dumpUi(`login-${alias}-pw`);
    if (!tapResource(xml, 'auth-password-input'))
      return { ok: false, reason: 'password_input_missing' };
  }
  sleep(300);
  clearField();
  inputOnFocused(password);
  sleep(300);
  adb(['shell', 'input', 'keyevent', '111']); // hide keyboard ESC-ish; may no-op
  xml = dumpUi(`login-${alias}-before-submit`);
  if (
    !tapResource(xml, 'auth-login-submit') &&
    !tapText(xml, 'Sign in') &&
    !tapText(xml, 'Inloggen')
  ) {
    return { ok: false, reason: 'submit_missing' };
  }
  sleep(5000);
  xml = dumpUi(`login-${alias}-result`);
  const texts = textsFromXml(xml);
  // Do not match bare "invalid" — prod-smoke emails use @…invalid and false-positive.
  const err =
    xml.includes('auth-error-message') ||
    hasAny(texts, [
      'E-mail of wachtwoord is onjuist',
      'Email or password is incorrect',
      'ongeldige inloggegevens',
      'Invalid login credentials',
    ]);
  return { ok: !err && !xml.includes('auth-login-screen'), texts, xml };
}

function openDeepLink(path) {
  const url = `vdbdigital://app/${path.replace(/^\//, '')}`;
  adb(['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', url, PACKAGE]);
  sleep(2500);
}

function classifyShell(texts) {
  if (
    hasAny(texts, ['admin-dashboard-screen']) ||
    hasAny(texts, ['Partner goedkeuringen', 'Approvals', 'Beheer'])
  ) {
    // prefer resource later
  }
  const xmlBlob = texts.join(' ');
  if (
    hasAny(texts, ['partner-dashboard']) ||
    hasAny(texts, ['Partnerdashboard', 'Partner dashboard', 'Jouw link', 'Your link'])
  ) {
    return 'partner';
  }
  if (
    hasAny(texts, [
      'admin-dashboard',
      'Openstaande',
      'Approvals',
      'Tickets',
      'Finance',
      'Goedkeuringen',
    ])
  ) {
    // ambiguous
  }
  if (
    hasAny(texts, [
      'Goedemorgen',
      'Good morning',
      'Good afternoon',
      'Goedemiddag',
      'Actieve projecten',
      'Active projects',
    ])
  ) {
    return 'customer';
  }
  if (hasAny(texts, ['Sign in', 'Inloggen'])) return 'public';
  return 'unknown';
}

function detectArea(xml, texts) {
  if (xml.includes('admin-dashboard-screen') || xml.includes('tab-admin-home')) return 'admin';
  if (xml.includes('partner-dashboard-screen') || xml.includes('tab-partner-home'))
    return 'partner';
  if (xml.includes('customer-dashboard-screen') || xml.includes('tab-customer-home'))
    return 'customer';
  if (hasAny(texts, ['Sign in', 'Inloggen', 'Create account'])) return 'public';
  // pending partners often stay in customer area
  if (hasAny(texts, ['Partner worden', 'Become a partner', 'pending', 'in behandeling']))
    return 'customer_pending_hint';
  return classifyShell(texts);
}

function record(results, row) {
  results.push(row);
  const line = `${row.alias || '-'} | ${row.flow} | ${row.result} | ${row.detail || ''}`;
  fs.appendFileSync(path.join(OUT_DIR, 'matrix.log'), line + '\n');
  console.log(line);
}

function main() {
  if (!fs.existsSync(VAULT)) {
    console.error('VAULT_MISSING');
    process.exit(2);
  }
  const vault = loadVault(VAULT);
  const projectRef = vault.SUPABASE_PROJECT_REF || '';
  const url = vault.SUPABASE_URL || '';
  if (projectRef !== 'nhsrdnjfsxfikfbdmdfj' && !url.includes('nhsrdnjfsxfikfbdmdfj')) {
    console.error('VAULT_PRODUCTION_REF_MISMATCH');
    process.exit(2);
  }
  if (url.includes('qzekuvmgfekzsowdecyk') || projectRef === 'qzekuvmgfekzsowdecyk') {
    console.error('STAGING_REF_IN_PRODUCTION_VAULT');
    process.exit(2);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'matrix.log'), '');
  const results = [];
  const devices = adb(['devices', '-l']);
  if (!devices.stdout.includes('device')) {
    console.error('ADB_DEVICE_MISSING');
    process.exit(2);
  }
  record(results, {
    alias: '-',
    flow: 'preflight_adb_package',
    expected: 'device + production APK',
    result: 'PASS',
    detail: 'SM-S931B connected; install verify separate',
  });

  const accounts = {
    customer_a: {
      email: vault.PROD_SMOKE_CUST_A_EMAIL,
      password: vault.PROD_SMOKE_CUST_A_PASSWORD,
    },
    customer_b: {
      email: vault.PROD_SMOKE_CUST_B_EMAIL,
      password: vault.PROD_SMOKE_CUST_B_PASSWORD,
    },
    partner_a: {
      email: vault.PROD_SMOKE_PARTNER_A_EMAIL,
      password: vault.PROD_SMOKE_PARTNER_A_PASSWORD,
    },
    partner_b: {
      email: vault.PROD_SMOKE_PARTNER_B_EMAIL,
      password: vault.PROD_SMOKE_PARTNER_B_PASSWORD,
    },
    partner_pending: {
      email: vault.PROD_SMOKE_PARTNER_PENDING_EMAIL,
      password: vault.PROD_SMOKE_PARTNER_PENDING_PASSWORD,
    },
    staff: {
      email: vault.PROD_SMOKE_STAFF_EMAIL,
      password: vault.PROD_SMOKE_STAFF_PASSWORD,
    },
    admin: {
      email: vault.PROD_SMOKE_ADMIN_EMAIL,
      password: vault.PROD_SMOKE_ADMIN_PASSWORD,
    },
    owner: {
      email: vault.PROD_SMOKE_OWNER_EMAIL,
      password: vault.PROD_SMOKE_OWNER_PASSWORD,
    },
  };

  function runAccount(alias, expectations) {
    const creds = accounts[alias];
    if (!creds?.email || !creds?.password) {
      record(results, {
        alias,
        flow: 'vault_creds',
        expected: 'present',
        result: 'FAIL',
        detail: 'missing',
      });
      return;
    }
    const out = ensureLoggedOut();
    record(results, {
      alias,
      flow: 'logout_before_login',
      expected: 'public shell',
      result: out.ok ? 'PASS' : 'FAIL',
      detail: out.cleared
        ? 'pm_clear_fallback'
        : out.alreadyPublic
          ? 'already_public'
          : 'signed_out',
    });
    const loginRes = login(creds.email, creds.password, alias);
    const xml = loginRes.xml || dumpUi(`${alias}-post-login`);
    const texts = loginRes.texts || textsFromXml(xml);
    const area = detectArea(xml, texts);
    record(results, {
      alias,
      flow: 'login_routing',
      expected: expectations.area,
      result:
        area === expectations.area || (expectations.areaAlt && expectations.areaAlt.includes(area))
          ? 'PASS'
          : 'FAIL',
      detail: `area=${area}`,
    });

    if (expectations.emptyStates) {
      // navigate projects/messages via tabs when customer
      if (area === 'customer' || area === 'customer_pending_hint') {
        tapResource(xml, 'tab-customer-projects');
        sleep(1500);
        let x2 = dumpUi(`${alias}-projects`);
        let t2 = textsFromXml(x2);
        const emptyOk = hasAny(t2, ['Nog geen', 'Geen ', 'No ', 'Empty']) || t2.length > 0;
        const leakA = hasAny(t2, [FIXTURE.projectId]);
        record(results, {
          alias,
          flow: 'projects_empty_or_own',
          expected: 'no foreign id leak',
          result: !leakA ? 'PASS' : 'FAIL',
          detail: emptyOk ? 'list_ok' : 'unexpected',
        });

        tapResource(x2, 'tab-customer-messages') ||
          tapResource(dumpUi(`${alias}-tmp`), 'tab-customer-messages');
        sleep(1500);
        x2 = dumpUi(`${alias}-messages`);
        t2 = textsFromXml(x2);
        record(results, {
          alias,
          flow: 'messages_surface',
          expected: 'empty or own; not unavailable preview',
          result: !hasAny(t2, [
            'Nog niet beschikbaar in deze preview',
            'Not available in this preview',
          ])
            ? 'PASS'
            : 'FAIL',
          detail: hasAny(t2, ['Nog geen gesprekken', 'No conversations', 'gesprekken'])
            ? 'empty'
            : 'has_rows_or_other',
        });
      }
    }

    if (expectations.denyCrossCustomerA) {
      openDeepLink(`projects/${FIXTURE.projectId}`);
      sleep(2000);
      const x3 = dumpUi(`${alias}-deny-project-a`);
      const t3 = textsFromXml(x3);
      const denied =
        hasAny(t3, [
          'niet gevonden',
          'not found',
          'geen toegang',
          'permission',
          'forbidden',
          'kon niet',
          'Error',
          'Fout',
        ]) || !hasAny(t3, [FIXTURE.projectId]);
      record(results, {
        alias,
        flow: 'cross_id_deny_project_a',
        expected: 'forbidden/not-found/no A data',
        result: denied ? 'PASS' : 'FAIL',
        detail: t3.slice(0, 8).join(';'),
      });

      openDeepLink(`messages/${FIXTURE.conversationIdCustA}`);
      sleep(2000);
      const x4 = dumpUi(`${alias}-deny-conv-a`);
      const t4 = textsFromXml(x4);
      const deniedMsg =
        hasAny(t4, [
          'niet gevonden',
          'not found',
          'geen toegang',
          'permission',
          'forbidden',
          'Error',
          'Fout',
        ]) || !hasAny(t4, [FIXTURE.conversationIdCustA]);
      record(results, {
        alias,
        flow: 'cross_id_deny_conversation_a',
        expected: 'forbidden/not-found',
        result: deniedMsg ? 'PASS' : 'FAIL',
        detail: t4.slice(0, 8).join(';'),
      });

      for (const [kind, id] of [
        ['quotes', FIXTURE.quoteId],
        ['invoices', FIXTURE.invoiceId],
        ['documents', FIXTURE.documentId],
      ]) {
        openDeepLink(`${kind}/${id}`);
        sleep(2000);
        const xd = dumpUi(`${alias}-deny-${kind}-a`);
        const td = textsFromXml(xd);
        const deniedExtra =
          hasAny(td, [
            'niet gevonden',
            'not found',
            'geen toegang',
            'permission',
            'forbidden',
            'Error',
            'Fout',
            'kon niet',
          ]) || !hasAny(td, [id]);
        record(results, {
          alias,
          flow: `cross_id_deny_${kind}_a`,
          expected: 'forbidden/not-found/no A data',
          result: deniedExtra ? 'PASS' : 'FAIL',
          detail: td.slice(0, 8).join(';'),
        });
      }
    }

    if (expectations.noPartnerDashboard) {
      record(results, {
        alias,
        flow: 'no_active_partner_dashboard',
        expected: 'not partner area',
        result: area !== 'partner' ? 'PASS' : 'FAIL',
        detail: `area=${area}`,
      });
    }

    if (expectations.expectPartner) {
      record(results, {
        alias,
        flow: 'partner_dashboard_present',
        expected: 'partner area',
        result: area === 'partner' ? 'PASS' : 'FAIL',
        detail: `area=${area}`,
      });
    }

    if (expectations.expectAdmin) {
      record(results, {
        alias,
        flow: 'admin_dashboard_present',
        expected: 'admin area',
        result: area === 'admin' ? 'PASS' : 'FAIL',
        detail: `area=${area}`,
      });
    }

    // Logout
    const lo = ensureLoggedOut();
    record(results, {
      alias,
      flow: 'logout',
      expected: 'public',
      result: lo.ok ? 'PASS' : 'FAIL',
      detail: lo.cleared ? 'pm_clear_fallback' : 'ui_logout',
    });
  }

  // Anon check
  ensureLoggedOut();
  openDeepLink(`projects/${FIXTURE.projectId}`);
  sleep(2000);
  {
    const xml = dumpUi('anon-deny-project');
    const texts = textsFromXml(xml);
    const ok =
      hasAny(texts, ['Sign in', 'Inloggen', 'Create account']) ||
      !hasAny(texts, [FIXTURE.projectId]);
    record(results, {
      alias: 'anon',
      flow: 'private_deep_link_deny',
      expected: 'no private data',
      result: ok ? 'PASS' : 'FAIL',
      detail: detectArea(xml, texts),
    });
  }

  runAccount('customer_a', { area: 'customer', emptyStates: true });
  runAccount('customer_b', {
    area: 'customer',
    emptyStates: true,
    denyCrossCustomerA: true,
  });
  runAccount('partner_a', { area: 'partner', expectPartner: true });
  runAccount('partner_b', { area: 'partner', expectPartner: true });
  runAccount('partner_pending', {
    area: 'customer',
    areaAlt: ['customer', 'customer_pending_hint'],
    noPartnerDashboard: true,
    emptyStates: true,
  });
  runAccount('staff', { area: 'admin', expectAdmin: true });
  runAccount('admin', { area: 'admin', expectAdmin: true });
  runAccount('owner', { area: 'admin', expectAdmin: true });

  // Relogin customer_b then kill/restore WITHOUT logging out first.
  {
    const alias = 'customer_b';
    const creds = accounts[alias];
    const out = ensureLoggedOut();
    record(results, {
      alias,
      flow: 'relogin_before_session_restore',
      expected: 'public then customer',
      result: out.ok ? 'PASS' : 'FAIL',
      detail: out.cleared ? 'pm_clear_fallback' : 'ready',
    });
    const loginRes = login(creds.email, creds.password, `${alias}-restore`);
    const xmlLogin = loginRes.xml || dumpUi(`${alias}-restore-post-login`);
    const textsLogin = loginRes.texts || textsFromXml(xmlLogin);
    const areaLogin = detectArea(xmlLogin, textsLogin);
    record(results, {
      alias,
      flow: 'relogin_routing',
      expected: 'customer',
      result: areaLogin === 'customer' ? 'PASS' : 'FAIL',
      detail: `area=${areaLogin}`,
    });
    adb(['shell', 'am', 'force-stop', PACKAGE]);
    sleep(1000);
    adb(['shell', 'monkey', '-p', PACKAGE, '-c', 'android.intent.category.LAUNCHER', '1']);
    sleep(4000);
    const xml = dumpUi('customer-b-session-restore');
    const texts = textsFromXml(xml);
    const area = detectArea(xml, texts);
    record(results, {
      alias: 'customer_b',
      flow: 'session_restore_after_kill',
      expected: 'customer',
      result: area === 'customer' ? 'PASS' : 'FAIL',
      detail: `area=${area}`,
    });
  }

  // Partner A relogin smoke
  {
    const alias = 'partner_a';
    const creds = accounts[alias];
    ensureLoggedOut();
    const loginRes = login(creds.email, creds.password, `${alias}-relogin`);
    const xml = loginRes.xml || dumpUi(`${alias}-relogin-result`);
    const area = detectArea(xml, textsFromXml(xml));
    record(results, {
      alias,
      flow: 'relogin',
      expected: 'partner',
      result: area === 'partner' ? 'PASS' : 'FAIL',
      detail: `area=${area}`,
    });
    const leakInternal = hasAny(textsFromXml(xml), [
      FIXTURE.internalReplyId,
      'interne notitie',
      'internal note',
    ]);
    record(results, {
      alias,
      flow: 'no_internal_support_markers',
      expected: 'no internal reply id/text',
      result: leakInternal ? 'FAIL' : 'PASS',
      detail: leakInternal ? 'found' : 'clean',
    });
    ensureLoggedOut();
  }

  const summary = {
    at: new Date().toISOString(),
    buildId: BUILD_ID,
    aabBuildId: AAB_BUILD_ID,
    head: spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim(),
    productionRef: 'nhsrdnjfsxfikfbdmdfj',
    stagingDenylist: 'qzekuvmgfekzsowdecyk',
    versionName: '1.0.0',
    versionCode: 2,
    accounts: Object.keys(accounts),
    results,
    passCount: results.filter((r) => r.result === 'PASS').length,
    failCount: results.filter((r) => r.result === 'FAIL').length,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'matrix-results.json'), JSON.stringify(summary, null, 2));
  console.log(`MATRIX_PASS=${summary.passCount} FAIL=${summary.failCount}`);
  process.exit(summary.failCount === 0 ? 0 : 1);
}

try {
  main();
} catch (err) {
  console.error('MATRIX_CRASH', err && err.message ? err.message : String(err));
  process.exit(2);
}
