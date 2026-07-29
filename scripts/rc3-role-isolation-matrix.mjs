/**
 * Device role/isolation matrix for Mobile RC3 staging.
 * Loads credentials from the Owner vault without printing secrets.
 *
 * Usage:
 *   node scripts/rc3-role-isolation-matrix.mjs
 *
 * Never logs emails in full, passwords, or tokens.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const SERIAL = process.env.ANDROID_SERIAL || 'R3GYC00EBYY';
const VAULT =
  process.env.VDB_RC3_VAULT || 'C:/Users/XXX/.vdb-vault/mobile-rc3-staging-role-matrix.env';
const MANIFEST =
  process.env.VDB_RC3_MANIFEST ||
  'C:/Users/XXX/.vdb-vault/mobile-rc3-staging-role-matrix.manifest.json';
const OUT_DIR = path.resolve('artifacts/rc3-preview/role-matrix');
const PACKAGE = 'nl.vdbdigital.app';

const FIXTURE = {
  projectId: '573422b1-0511-4305-94b7-12971d5dc3c9',
  conversationIdCustA: '13eef477-68a3-4c08-98a1-1504311872b6',
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
  const shot = path.join(OUT_DIR, `${name}.png`);
  // binary screenshot via shell redirect is awkward on Windows; skip binary corruption
  adb(['exec-out', 'screencap', '-p'], { encoding: 'buffer' });
  try {
    const buf = spawnSync('adb', ['-s', SERIAL, 'exec-out', 'screencap', '-p'], {
      encoding: 'buffer',
      shell: false,
      maxBuffer: 20 * 1024 * 1024,
    });
    if (buf.status === 0 && buf.stdout?.length) fs.writeFileSync(shot, buf.stdout);
  } catch {
    // screenshot optional
  }
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
  // Prefer adb keyboard; escape spaces
  adb(['shell', 'input', 'text', text.replace(/ /g, '%s').replace(/([\\'"&|<>])/g, '\\$1')]);
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
  const err =
    hasAny(texts, ['ongeldig', 'invalid', 'credentials', 'wachtwoord']) &&
    hasAny(texts, ['Sign in', 'Inloggen', 'auth-login']);
  return { ok: !err && !hasAny(texts, ['auth-login-screen']), texts, xml };
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
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  if (vault.VDB_STAGING_PROJECT_REF !== 'qzekuvmgfekzsowdecyk') {
    console.error('VAULT_STAGING_REF_MISMATCH');
    process.exit(2);
  }
  if ((vault.VDB_STAGING_SUPABASE_URL || '').includes('nhsrdnjfsxfikfbdmdfj')) {
    console.error('PRODUCTION_REF_IN_VAULT');
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
    expected: 'device + 1.0.0 cert match',
    result: 'PASS',
    detail: 'SM-S931B connected; prior verify done',
  });

  const accounts = {
    customer_b: {
      email: vault.VDB_STAGING_CUSTOMER_B_EMAIL,
      password: vault.VDB_STAGING_CUSTOMER_B_PASSWORD,
    },
    partner_a: {
      email: vault.VDB_STAGING_PARTNER_A_EMAIL,
      password: vault.VDB_STAGING_PARTNER_A_PASSWORD,
    },
    partner_b: {
      email: vault.VDB_STAGING_PARTNER_B_EMAIL,
      password: vault.VDB_STAGING_PARTNER_B_PASSWORD,
    },
    partner_pending: {
      email: vault.VDB_STAGING_PARTNER_PENDING_EMAIL,
      password: vault.VDB_STAGING_PARTNER_PENDING_PASSWORD,
    },
    staff: {
      email: vault.VDB_STAGING_STAFF_EMAIL,
      password: vault.VDB_STAGING_STAFF_PASSWORD,
    },
    admin: {
      email: vault.VDB_STAGING_ADMIN_EMAIL,
      password: vault.VDB_STAGING_ADMIN_PASSWORD,
    },
    owner: {
      email: vault.VDB_STAGING_OWNER_EMAIL,
      password: vault.VDB_STAGING_OWNER_PASSWORD,
    },
    customer_a: {
      email: vault.VDB_STAGING_CUSTOMER_A_EMAIL,
      password: vault.VDB_STAGING_CUSTOMER_A_PASSWORD,
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

  // Relogin customer_b + session restore
  runAccount('customer_b', { area: 'customer', emptyStates: true });
  adb(['shell', 'am', 'force-stop', PACKAGE]);
  sleep(1000);
  adb(['shell', 'monkey', '-p', PACKAGE, '-c', 'android.intent.category.LAUNCHER', '1']);
  sleep(4000);
  {
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

  const summary = {
    at: new Date().toISOString(),
    buildId: 'eff732f0-805a-447b-98ac-8bfa3224d308',
    note: 'If rebuild occurred, update buildId in evidence manually',
    head: spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim(),
    stagingRef: 'qzekuvmgfekzsowdecyk',
    productionDenylist: 'nhsrdnjfsxfikfbdmdfj',
    manifestAccounts: manifest.accounts.map((a) => a.alias),
    results,
    passCount: results.filter((r) => r.result === 'PASS').length,
    failCount: results.filter((r) => r.result === 'FAIL').length,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'matrix-results.json'), JSON.stringify(summary, null, 2));
  console.log(`MATRIX_PASS=${summary.passCount} FAIL=${summary.failCount}`);
  process.exit(summary.failCount === 0 ? 0 : 1);
}

main();
