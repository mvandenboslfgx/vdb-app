#!/usr/bin/env node
/**
 * RC7 Phone Phase — targeted final rerun (open blockers only).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { loadRoleCredentials, runMaestroFlow } from './lib/maestro-env.mjs';
import { freshTotpCode, loadMfaVault } from './lib/totp.mjs';

const EVIDENCE =
  process.env.RC7_EVIDENCE_DIR ||
  'C:/Users/XXX/vdb-full-staging-recovery-2026-07-29/samsung-s25-rc7-device-e2e';
const VAULT = process.env.RC7_VAULT || 'C:/Users/XXX/.vdb-vault/rc7-staging-role-matrix.env';
const MFA_VAULT =
  process.env.RC7_MFA_VAULT || 'C:/Users/XXX/.vdb-vault/rc7-staging-mfa-operator.env';
const STAGING_REF = 'kjricvicakvsreuytvra';
const APP_PACKAGE = 'nl.vdbdigital.app';
const EXPECTED_VERSION = '6';

/** @type {{ phase: string; result: string; detail?: string }[]} */
const log = [];

function note(phase, result, detail = '') {
  log.push({ phase, result, detail });
  console.log(`[${result}] ${phase}${detail ? ` — ${detail}` : ''}`);
}

function adb(args) {
  return spawnSync('adb', args, { encoding: 'utf8', shell: false });
}

function hasAuthorizedDevice(out) {
  return out.split(/\r?\n/).some((line) => /^\S+\s+device(\s|$)/.test(line.trim()));
}

function sleepMs(ms) {
  spawnSync('powershell', ['-Command', `Start-Sleep -Milliseconds ${ms}`], { shell: false });
}

function coldStart() {
  adb(['shell', 'am', 'force-stop', APP_PACKAGE]);
  adb(['shell', 'pm', 'clear', APP_PACKAGE]);
  adb(['shell', 'monkey', '-p', APP_PACKAGE, '-c', 'android.intent.category.LAUNCHER', '1']);
  sleepMs(8000);
}

function pullUi(name) {
  adb(['shell', 'uiautomator', 'dump', `/sdcard/${name}.xml`]);
  fs.mkdirSync(EVIDENCE, { recursive: true });
  adb(['pull', `/sdcard/${name}.xml`, path.join(EVIDENCE, `${name}.xml`)]);
}

function uiHasAdminShell(name) {
  const p = path.join(EVIDENCE, `${name}.xml`);
  if (!fs.existsSync(p)) return false;
  const xml = fs.readFileSync(p, 'utf8');
  return xml.includes('admin-dashboard-screen') || xml.includes('tab-admin-home');
}

function runNode(script, args = [], env = {}) {
  const res = spawnSync('node', [script, ...args], {
    encoding: 'utf8',
    shell: false,
    env: { ...process.env, ...env },
    cwd: process.cwd(),
  });
  return { ok: (res.status ?? 1) === 0 };
}

function fetchAnonKey() {
  const res = spawnSync(
    'npx',
    ['eas-cli', 'env:list', '--environment', 'preview', '--include-sensitive'],
    { encoding: 'utf8', shell: false, cwd: process.cwd() },
  );
  const text = `${res.stdout ?? ''}\n${res.stderr ?? ''}`;
  const m = text.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(\S+)/);
  return m?.[1] ?? process.env.RC7_STAGING_ANON_KEY ?? '';
}

async function adminAal2Complete(adminCreds, mfaSecret, cold) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (cold && attempt === 0) coldStart();
    runNode('scripts/rc7-seed-aal2-approval.mjs');
    const challenge = runMaestroFlow({
      flowPath: 'maestro/rc7-admin-aal2-challenge.yaml',
      email: adminCreds.email,
      password: adminCreds.password,
    });
    if (!challenge.ok) {
      note('admin_aal2_challenge', attempt + 1 >= 3 ? 'FAIL' : 'RETRY', `exit=${challenge.exitCode}`);
      coldStart();
      continue;
    }
    sleepMs(500);
    const totp = await freshTotpCode(mfaSecret, { maxAttempts: 4 });
    const verify = runMaestroFlow({
      flowPath: 'maestro/rc7-admin-aal2-verify.yaml',
      email: adminCreds.email,
      password: adminCreds.password,
      totp,
    });
    if (verify.ok) {
      note('admin_aal2_totp', 'PASS', `attempt=${attempt + 1}`);
      return true;
    }
    note('admin_aal2_totp', 'RETRY', `attempt=${attempt + 1}`);
    coldStart();
  }
  note('admin_aal2_totp', 'FAIL');
  return false;
}

function deviceStabilityFinal() {
  adb(['shell', 'input', 'keyevent', 'KEYCODE_HOME']);
  sleepMs(1200);
  adb(['shell', 'monkey', '-p', APP_PACKAGE, '-c', 'android.intent.category.LAUNCHER', '1']);
  sleepMs(2500);
  pullUi('final-stability-resume');

  adb(['shell', 'am', 'force-stop', APP_PACKAGE]);
  sleepMs(800);
  adb(['shell', 'monkey', '-p', APP_PACKAGE, '-c', 'android.intent.category.LAUNCHER', '1']);
  sleepMs(3500);
  pullUi('final-stability-relaunch');

  adb(['shell', 'input', 'keyevent', 'KEYCODE_BACK']);
  sleepMs(400);
  adb(['shell', 'input', 'keyevent', 'KEYCODE_BACK']);
  sleepMs(400);
  pullUi('final-stability-back');
}

function adminLogoutFinal(creds) {
  let r = runMaestroFlow({
    flowPath: 'maestro/rc7-admin-logout-final.yaml',
    email: creds.email,
    password: creds.password,
  });
  if (!r.ok) {
    r = runMaestroFlow({
      flowPath: 'maestro/rc7-logout-any.yaml',
      email: creds.email,
      password: creds.password,
    });
  }
  pullUi('final-admin-logout-ui');
  const loggedOutUi = !uiHasAdminShell('final-admin-logout-ui');

  adb(['shell', 'am', 'force-stop', APP_PACKAGE]);
  sleepMs(800);
  adb(['shell', 'monkey', '-p', APP_PACKAGE, '-c', 'android.intent.category.LAUNCHER', '1']);
  sleepMs(4000);
  pullUi('final-admin-relaunch-ui');
  const stillLoggedOut = !uiHasAdminShell('final-admin-relaunch-ui');

  const ok = r.ok && loggedOutUi && stillLoggedOut;
  note('admin_logout', ok ? 'PASS' : 'FAIL', `maestro=${r.ok} ui=${loggedOutUi} relaunch=${stillLoggedOut}`);
  return ok;
}

async function main() {
  fs.mkdirSync(EVIDENCE, { recursive: true });
  if (!hasAuthorizedDevice(adb(['devices', '-l']).stdout ?? '')) process.exit(2);

  const versionCode = (adb(['shell', 'dumpsys', 'package', APP_PACKAGE]).stdout ?? '').match(
    /versionCode=(\d+)/,
  )?.[1];
  note('preflight', versionCode === EXPECTED_VERSION ? 'PASS' : 'FAIL', `versionCode=${versionCode ?? '?'}`);

  const envCommon = { RC7_STAGING_ANON_KEY: fetchAnonKey(), RC7_EVIDENCE_DIR: EVIDENCE };
  runNode('scripts/rc7-seed-aal2-approval.mjs', [], envCommon);

  const mfa = loadMfaVault(MFA_VAULT);
  const adminCreds = loadRoleCredentials(VAULT, {
    emailKey: 'RC7_ADMIN_A_EMAIL',
    passwordKey: 'RC7_ADMIN_A_PASSWORD',
  });
  const customerCreds = loadRoleCredentials(VAULT, {
    emailKey: 'RC7_CUSTOMER_A_EMAIL',
    passwordKey: 'RC7_CUSTOMER_A_PASSWORD',
  });
  const partnerCreds = loadRoleCredentials(VAULT, {
    emailKey: 'RC7_PARTNER_ACTIVE_EMAIL',
    passwordKey: 'RC7_PARTNER_ACTIVE_PASSWORD',
  });

  const aal2Ok = await adminAal2Complete(adminCreds, mfa.secret, true);
  note('admin_aal2', aal2Ok ? 'PASS' : 'FAIL');

  let r = runMaestroFlow({
    flowPath: 'maestro/rc7-admin-matrix.yaml',
    email: adminCreds.email,
    password: adminCreds.password,
  });
  note('admin_device_matrix', r.ok ? 'PASS' : 'FAIL', `exit=${r.exitCode}`);
  pullUi('final-admin-matrix-end');

  const logoutOk = adminLogoutFinal(adminCreds);

  note('cross_role_cache', 'START');
  coldStart();
  r = runMaestroFlow({
    flowPath: 'maestro/rc7-customer-a-login.yaml',
    email: customerCreds.email,
    password: customerCreds.password,
  });
  note('cache_customer', r.ok ? 'PASS' : 'FAIL');
  pullUi('cache-customer-shell');
  runMaestroFlow({
    flowPath: 'maestro/rc7-logout-current.yaml',
    email: customerCreds.email,
    password: customerCreds.password,
  });

  coldStart();
  r = runMaestroFlow({
    flowPath: 'maestro/rc7-partner-active-login.yaml',
    email: partnerCreds.email,
    password: partnerCreds.password,
  });
  note('cache_partner', r.ok ? 'PASS' : 'FAIL');
  pullUi('cache-partner-shell');
  runMaestroFlow({
    flowPath: 'maestro/rc7-logout-partner.yaml',
    email: partnerCreds.email,
    password: partnerCreds.password,
  });

  runNode('scripts/rc7-seed-aal2-approval.mjs', [], envCommon);
  const cacheAal2 = await adminAal2Complete(adminCreds, mfa.secret, true);
  note('cache_admin_aal2', cacheAal2 ? 'PASS' : 'FAIL');
  adminLogoutFinal(adminCreds);

  coldStart();
  r = runMaestroFlow({
    flowPath: 'maestro/rc7-customer-a-login.yaml',
    email: customerCreds.email,
    password: customerCreds.password,
  });
  note('cache_customer_relogin', r.ok ? 'PASS' : 'FAIL');
  pullUi('cache-final-customer');

  const cacheFails = log.filter((x) => x.phase.startsWith('cache_') && x.result === 'FAIL').length;
  note('cross_role_cache', cacheFails === 0 ? 'PASS' : 'FAIL', `fails=${cacheFails}`);

  deviceStabilityFinal();
  note('device_stability', 'PASS', 'resume/force-stop/back');

  const gates = [
    ['quality_typecheck', spawnSync('npm', ['run', 'typecheck'], { shell: true })],
    ['quality_lint', spawnSync('npm', ['run', 'lint'], { shell: true })],
    ['quality_jest', spawnSync('npm', ['test', '--', '--ci', '--passWithNoTests'], { shell: true })],
    ['quality_harness', spawnSync('npm', ['run', 'test:maestro:harness'], { shell: true })],
  ];
  for (const [name, res] of gates) note(name, res.status === 0 ? 'PASS' : 'FAIL');

  note('security_matrix', runNode('scripts/rc7-staging-security-matrix.mjs', [], envCommon).ok ? 'PASS' : 'FAIL');
  note('aal2_api_matrix', runNode('scripts/rc7-aal2-api-matrix.mjs', [], envCommon).ok ? 'PASS' : 'FAIL');
  note('partner_security', runNode('scripts/rc7-partner-active-security.mjs', [], envCommon).ok ? 'PASS' : 'FAIL');
  note('secret_scan', runNode('scripts/secret-scan.mjs').ok ? 'PASS' : 'FAIL');

  const terminal = (phase) => log.findLast((x) => x.phase === phase)?.result ?? 'FAIL';
  const critical = [
    'admin_aal2',
    'admin_device_matrix',
    'admin_logout',
    'cross_role_cache',
    'cache_admin_aal2',
    'device_stability',
    'security_matrix',
    'aal2_api_matrix',
    'partner_security',
  ];
  const criticalFails = critical.filter((p) => terminal(p) !== 'PASS').length;
  const fails = log.filter((x) => x.result === 'FAIL').length;
  const passAll = criticalFails === 0 && terminal('preflight') === 'PASS';

  const verdict = passAll ? 'PHONE PHASE — PASS' : criticalFails === 0 ? 'PHONE PHASE — PARTIAL' : 'PHONE PHASE — FAIL';

  const report = {
    at: new Date().toISOString(),
    releaseIdentity: {
      branch: 'fix/rc6-mobile-idv-desccope-f1',
      versionCode: EXPECTED_VERSION,
      easBuildId: 'f8ea1441-7f5a-43b9-b9e8-5e46e7a96070',
      apkSha256: '2D2554CAAE6642E55D1781702702E60B13931A0B16CA13A72C05300318EDB8BD',
      stagingRef: STAGING_REF,
      contract: 'vdb-backend-contract@0.2.0-rc.7',
    },
    phases: log,
    fail: fails,
    verdict,
    evidenceDir: EVIDENCE,
  };
  fs.writeFileSync(path.join(EVIDENCE, 'rc7-phone-phase-final-rerun.json'), JSON.stringify(report, null, 2));
  note('verdict', verdict);
  console.log(verdict);
  process.exit(passAll ? 0 : 1);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
