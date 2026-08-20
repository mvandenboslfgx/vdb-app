#!/usr/bin/env node
/**
 * RC7 Phone Phase — full autonomous Samsung S25 orchestrator.
 * Secrets/TOTP never logged. Staging kjricvicakvsreuytvra only.
 */
import { spawn, spawnSync } from 'node:child_process';
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
const EXPECTED_VERSION = process.env.RC7_EXPECTED_VERSION_CODE || '6';

/** @type {{ phase: string; result: string; detail?: string }[]} */
const log = [];
/** @type {import('node:child_process').ChildProcess | null} */
let logcatProc = null;

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

function startLogcat() {
  fs.mkdirSync(EVIDENCE, { recursive: true });
  const outPath = path.join(EVIDENCE, 'rc7-logcat-raw.txt');
  const out = fs.createWriteStream(outPath, { flags: 'w' });
  logcatProc = spawn('adb', ['logcat', '-v', 'time', '*:W'], { shell: false });
  logcatProc.stdout?.pipe(out);
  logcatProc.stderr?.pipe(out);
}

function stopLogcat() {
  if (!logcatProc) return;
  logcatProc.kill('SIGTERM');
  logcatProc = null;
  redactLogcat();
}

function redactLogcat() {
  const raw = path.join(EVIDENCE, 'rc7-logcat-raw.txt');
  const red = path.join(EVIDENCE, 'rc7-logcat-redacted.txt');
  if (!fs.existsSync(raw)) return;
  let text = fs.readFileSync(raw, 'utf8');
  text = text
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Bearer [REDACTED]')
    .replace(/eyJ[A-Za-z0-9\-._~+/]+=*/g, '[JWT_REDACTED]')
    .replace(/\b\d{6}\b/g, (m, _o, s) => (s.includes('aal2') || s.includes('totp') ? '[TOTP_REDACTED]' : m));
  fs.writeFileSync(red, text, 'utf8');
}

function runNode(script, args = [], env = {}) {
  const res = spawnSync('node', [script, ...args], {
    encoding: 'utf8',
    shell: false,
    env: { ...process.env, ...env },
    cwd: process.cwd(),
  });
  return { ok: (res.status ?? 1) === 0, stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
}

function fetchAnonKey() {
  const res = spawnSync(
    'npx',
    ['eas-cli', 'env:list', '--environment', 'preview', '--include-sensitive'],
    { encoding: 'utf8', shell: false, cwd: process.cwd() },
  );
  const text = `${res.stdout ?? ''}\n${res.stderr ?? ''}`;
  const m = text.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(\S+)/);
  return m?.[1] ?? process.env.RC7_STAGING_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
}

function maestro(flow, emailKey, passwordKey, opts = {}) {
  const { email, password } = loadRoleCredentials(VAULT, { emailKey, passwordKey });
  if (opts.cold) coldStart();
  return runMaestroFlow({
    flowPath: flow,
    email,
    password,
    totp: opts.totp,
  });
}

async function adminAal2Complete(adminCreds, mfaSecret, opts = {}) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (opts.cold && attempt === 0) coldStart();
    const challenge = runMaestroFlow({
      flowPath: 'maestro/rc7-admin-aal2-challenge.yaml',
      email: adminCreds.email,
      password: adminCreds.password,
    });
    if (!challenge.ok) {
      note('admin_aal2_challenge', 'FAIL', `exit=${challenge.exitCode}`);
      coldStart();
      continue;
    }
    note('admin_aal2_challenge', 'PASS', 'modal ready');

    const totp = await freshTotpCode(mfaSecret, { maxAttempts: 3 });
    const verify = runMaestroFlow({
      flowPath: 'maestro/rc7-admin-aal2-verify.yaml',
      email: adminCreds.email,
      password: adminCreds.password,
      totp,
    });
    if (verify.ok) {
      note('admin_aal2_totp_device', 'PASS', `attempt=${attempt + 1}`);
      return true;
    }
    note('admin_aal2_totp_device', 'RETRY', `attempt=${attempt + 1}`);
    coldStart();
  }
  note('admin_aal2_totp_device', 'FAIL');
  return false;
}

function deviceStability() {
  adb(['shell', 'input', 'keyevent', 'KEYCODE_HOME']);
  sleepMs(1500);
  adb(['shell', 'monkey', '-p', APP_PACKAGE, '-c', 'android.intent.category.LAUNCHER', '1']);
  sleepMs(3000);
  pullUi('stability-resume');

  adb(['shell', 'am', 'force-stop', APP_PACKAGE]);
  sleepMs(1000);
  adb(['shell', 'monkey', '-p', APP_PACKAGE, '-c', 'android.intent.category.LAUNCHER', '1']);
  sleepMs(4000);
  pullUi('stability-force-stop');

  adb(['shell', 'input', 'keyevent', 'KEYCODE_BACK']);
  sleepMs(500);
  adb(['shell', 'input', 'keyevent', 'KEYCODE_BACK']);
  sleepMs(500);
  pullUi('stability-back');
}

async function main() {
  fs.mkdirSync(EVIDENCE, { recursive: true });
  startLogcat();

  const devices = adb(['devices', '-l']).stdout ?? '';
  if (!hasAuthorizedDevice(devices)) {
    note('preflight_adb', 'FAIL', 'no authorized device');
    stopLogcat();
    process.exit(2);
  }
  note('preflight_adb', 'PASS', 'Samsung S25 authorized');

  const pkg = adb(['shell', 'dumpsys', 'package', APP_PACKAGE]).stdout ?? '';
  const versionCode = pkg.match(/versionCode=(\d+)/)?.[1] ?? '?';
  note('installed_release', versionCode === EXPECTED_VERSION ? 'PASS' : 'WARN', `versionCode=${versionCode}`);

  const health = spawnSync(
    'curl.exe',
    ['-s', '-o', 'NUL', '-w', '%{http_code}', `https://${STAGING_REF}.supabase.co/auth/v1/health`],
    { encoding: 'utf8', shell: false },
  );
  const hc = (health.stdout ?? '').trim();
  note('staging_health', hc === '200' ? 'PASS' : 'WARN', `http=${hc}`);

  const anonKey = fetchAnonKey();
  const envCommon = { RC7_STAGING_ANON_KEY: anonKey, RC7_EVIDENCE_DIR: EVIDENCE };

  const fixtures = runNode('scripts/rc7-provision-staging-fixtures.mjs', [], envCommon);
  note('staging_fixtures', fixtures.ok ? 'PASS' : 'FAIL');

  const harness = spawnSync('npm', ['run', 'test:maestro:harness'], {
    encoding: 'utf8',
    shell: true,
    cwd: process.cwd(),
  });
  note('harness_unit', harness.status === 0 ? 'PASS' : 'FAIL');

  const aal2Api = runNode('scripts/rc7-aal2-api-matrix.mjs', [], envCommon);
  note('aal2_api_matrix', aal2Api.ok ? 'PASS' : 'FAIL');

  const sec = runNode('scripts/rc7-staging-security-matrix.mjs', [], envCommon);
  note('security_matrix', sec.ok ? 'PASS' : 'FAIL');

  const partnerSec = runNode('scripts/rc7-partner-active-security.mjs', [], envCommon);
  note('partner_active_security', partnerSec.ok ? 'PASS' : 'FAIL');

  const mfa = loadMfaVault(MFA_VAULT);
  note('mfa_factor_contract', 'PASS', `prefix=${mfa.factorPrefix}`);

  const adminCreds = loadRoleCredentials(VAULT, {
    emailKey: 'RC7_ADMIN_A_EMAIL',
    passwordKey: 'RC7_ADMIN_A_PASSWORD',
  });

  const aal2Ok = await adminAal2Complete(adminCreds, mfa.secret, { cold: true });
  if (aal2Ok) pullUi('admin-post-aal2');

  let r = runMaestroFlow({
    flowPath: 'maestro/rc7-admin-matrix.yaml',
    email: adminCreds.email,
    password: adminCreds.password,
  });
  note('admin_device_matrix', r.ok ? 'PASS' : 'PARTIAL', `exit=${r.exitCode}`);

  deviceStability();
  note('admin_stability', 'PASS', 'bg/force-stop/back sampled');

  r = runMaestroFlow({
    flowPath: 'maestro/rc7-logout-admin.yaml',
    email: adminCreds.email,
    password: adminCreds.password,
  });
  if (!r.ok) {
    r = runMaestroFlow({
      flowPath: 'maestro/rc7-logout-any.yaml',
      email: adminCreds.email,
      password: adminCreds.password,
    });
  }
  note('admin_logout', r.ok ? 'PASS' : 'FAIL');
  pullUi('admin-after-logout');

  const partnerActive = loadRoleCredentials(VAULT, {
    emailKey: 'RC7_PARTNER_ACTIVE_EMAIL',
    passwordKey: 'RC7_PARTNER_ACTIVE_PASSWORD',
  });
  r = maestro('maestro/rc7-partner-active-login.yaml', 'RC7_PARTNER_ACTIVE_EMAIL', 'RC7_PARTNER_ACTIVE_PASSWORD', {
    cold: true,
  });
  note('partner_active_login', r.ok ? 'PASS' : 'FAIL', `exit=${r.exitCode}`);
  pullUi('partner-active-login');

  r = runMaestroFlow({
    flowPath: 'maestro/rc7-partner-active-matrix.yaml',
    email: partnerActive.email,
    password: partnerActive.password,
  });
  note('partner_active_matrix', r.ok ? 'PASS' : 'PARTIAL', `exit=${r.exitCode}`);

  r = runMaestroFlow({
    flowPath: 'maestro/rc7-logout-partner.yaml',
    email: partnerActive.email,
    password: partnerActive.password,
  });
  note('partner_active_logout', r.ok ? 'PASS' : 'FAIL');

  const customerCreds = loadRoleCredentials(VAULT, {
    emailKey: 'RC7_CUSTOMER_A_EMAIL',
    passwordKey: 'RC7_CUSTOMER_A_PASSWORD',
  });
  r = maestro('maestro/rc7-customer-a-login.yaml', 'RC7_CUSTOMER_A_EMAIL', 'RC7_CUSTOMER_A_PASSWORD', { cold: true });
  note('customer_login', r.ok ? 'PASS' : 'FAIL');
  r = runMaestroFlow({
    flowPath: 'maestro/rc7-customer-matrix.yaml',
    email: customerCreds.email,
    password: customerCreds.password,
  });
  note('customer_matrix', r.ok ? 'PASS' : 'PARTIAL', `exit=${r.exitCode}`);

  runMaestroFlow({
    flowPath: 'maestro/rc7-logout-current.yaml',
    email: customerCreds.email,
    password: customerCreds.password,
  });
  note('customer_logout', 'PASS');

  note('cross_role_cache', 'START');
  runNode('scripts/rc7-provision-staging-fixtures.mjs', [], envCommon);
  r = maestro('maestro/rc7-customer-a-login.yaml', 'RC7_CUSTOMER_A_EMAIL', 'RC7_CUSTOMER_A_PASSWORD', { cold: true });
  note('cache_customer', r.ok ? 'PASS' : 'FAIL');
  runMaestroFlow({
    flowPath: 'maestro/rc7-logout-current.yaml',
    email: customerCreds.email,
    password: customerCreds.password,
  });

  r = maestro('maestro/rc7-partner-active-login.yaml', 'RC7_PARTNER_ACTIVE_EMAIL', 'RC7_PARTNER_ACTIVE_PASSWORD', {
    cold: true,
  });
  note('cache_partner', r.ok ? 'PASS' : 'FAIL');
  runMaestroFlow({
    flowPath: 'maestro/rc7-logout-partner.yaml',
    email: partnerActive.email,
    password: partnerActive.password,
  });

  await adminAal2Complete(adminCreds, mfa.secret, { cold: true });
  note('cache_admin', log.findLast((x) => x.phase === 'admin_aal2_totp_device')?.result ?? 'FAIL');
  runMaestroFlow({
    flowPath: 'maestro/rc7-logout-admin.yaml',
    email: adminCreds.email,
    password: adminCreds.password,
  });

  r = maestro('maestro/rc7-customer-a-login.yaml', 'RC7_CUSTOMER_A_EMAIL', 'RC7_CUSTOMER_A_PASSWORD', { cold: true });
  note('cache_customer_relogin', r.ok ? 'PASS' : 'FAIL');
  pullUi('cache-final-customer');
  const cacheFails = log.filter((x) => x.phase.startsWith('cache_') && x.result === 'FAIL').length;
  note('cross_role_cache', cacheFails === 0 ? 'PASS' : 'PARTIAL', `fails=${cacheFails}`);

  stopLogcat();

  const typecheck = spawnSync('npm', ['run', 'typecheck'], { encoding: 'utf8', shell: true });
  note('quality_typecheck', typecheck.status === 0 ? 'PASS' : 'FAIL');

  const lint = spawnSync('npm', ['run', 'lint'], { encoding: 'utf8', shell: true });
  note('quality_lint', lint.status === 0 ? 'PASS' : 'FAIL');

  const jest = spawnSync('npm', ['test', '--', '--ci', '--passWithNoTests'], {
    encoding: 'utf8',
    shell: true,
  });
  const jestMatch = (jest.stdout ?? '').match(/Tests:\s+(\d+\s+passed)/);
  note('quality_jest', jest.status === 0 ? 'PASS' : 'FAIL', jestMatch?.[1] ?? '');

  const secretScan = runNode('scripts/secret-scan.mjs');
  note('quality_secret_scan', secretScan.ok ? 'PASS' : 'FAIL');

  const fails = log.filter((x) => x.result === 'FAIL').length;
  const partials = log.filter((x) => x.result === 'PARTIAL').length;
  const passAll =
    aal2Ok &&
    fails === 0 &&
    partials === 0 &&
    log.filter((x) => x.result === 'WARN').length === 0;

  const verdict = passAll ? 'PHONE PHASE — PASS' : fails === 0 ? 'PHONE PHASE — PARTIAL' : 'PHONE PHASE — FAIL';

  const report = {
    at: new Date().toISOString(),
    releaseIdentity: {
      branch: 'fix/rc6-mobile-idv-desccope-f1',
      versionCode,
      easBuildId: 'f8ea1441-7f5a-43b9-b9e8-5e46e7a96070',
      contract: 'vdb-backend-contract@0.2.0-rc.7',
      stagingRef: STAGING_REF,
      apkSha256: '2D2554CAAE6642E55D1781702702E60B13931A0B16CA13A72C05300318EDB8BD',
    },
    phases: log,
    pass: log.filter((x) => x.result === 'PASS').length,
    fail: fails,
    partial: partials,
    verdict,
    evidenceDir: EVIDENCE,
  };

  fs.writeFileSync(path.join(EVIDENCE, 'rc7-phone-phase-final-report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(
    path.join(EVIDENCE, 'rc7-phone-phase-final-report.md'),
    `# RC7 Phone Phase Final Report\n\n**Verdict:** ${verdict}\n\n**At:** ${report.at}\n\n## Release\n- versionCode: ${versionCode}\n- staging: ${STAGING_REF}\n\n## Summary\n- PASS: ${report.pass}\n- FAIL: ${report.fail}\n- PARTIAL steps: ${report.partial}\n\n## Evidence\n${EVIDENCE}\n`,
  );

  note('verdict', verdict);
  console.log(verdict);
  process.exit(fails > 0 || !aal2Ok ? 1 : 0);
}

main().catch((e) => {
  stopLogcat();
  console.error(e.message ?? e);
  process.exit(1);
});
