#!/usr/bin/env node
/**
 * RC7 Phone Phase orchestrator — Samsung S25 physical device + staging API matrix.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { runMaestroFlow, loadRoleCredentials } from './lib/maestro-env.mjs';

const EVIDENCE =
  process.env.RC7_EVIDENCE_DIR ||
  'C:/Users/XXX/vdb-full-staging-recovery-2026-07-29/samsung-s25-rc7-device-e2e';
const VAULT = process.env.RC7_VAULT || 'C:/Users/XXX/.vdb-vault/rc7-staging-role-matrix.env';
const APP_PACKAGE = 'nl.vdbdigital.app';

/** @type {{ phase: string; result: string; detail?: string }[]} */
const log = [];

function note(phase, result, detail = '') {
  log.push({ phase, result, detail });
  console.log(`[${result}] ${phase}${detail ? ` — ${detail}` : ''}`);
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

function adb(args) {
  return spawnSync('adb', args, { encoding: 'utf8', shell: false });
}

function pullUi(name) {
  adb(['shell', 'uiautomator', 'dump', `/sdcard/${name}.xml`]);
  fs.mkdirSync(EVIDENCE, { recursive: true });
  adb(['pull', `/sdcard/${name}.xml`, path.join(EVIDENCE, `${name}.xml`)]);
}

function maestroRole(flow, emailKey, passwordKey, cold = false) {
  const { email, password } = loadRoleCredentials(VAULT, { emailKey, passwordKey });
  if (cold) {
    adb(['shell', 'am', 'force-stop', APP_PACKAGE]);
    adb(['shell', 'pm', 'clear', APP_PACKAGE]);
    adb(['shell', 'monkey', '-p', APP_PACKAGE, '-c', 'android.intent.category.LAUNCHER', '1']);
    spawnSync('powershell', ['-Command', 'Start-Sleep -Seconds 8'], { shell: false });
  }
  return runMaestroFlow({ flowPath: flow, email, password });
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

async function main() {
  fs.mkdirSync(EVIDENCE, { recursive: true });
  const devices = adb(['devices']).stdout ?? '';
  if (!devices.includes('device')) {
    note('preflight', 'FAIL', 'no adb device');
    process.exit(2);
  }

  const version = adb(['shell', 'dumpsys', 'package', APP_PACKAGE]).stdout ?? '';
  const versionCode = version.match(/versionCode=(\d+)/)?.[1] ?? '?';
  note('installed_release', 'INFO', `versionCode=${versionCode}`);

  // 1) Harness self-test via jest subset
  const harnessRes = spawnSync('npm', ['run', 'test:maestro:harness'], {
    encoding: 'utf8',
    shell: true,
    cwd: process.cwd(),
  });
  note('harness_unit_tests', harnessRes.status === 0 ? 'PASS' : 'FAIL');

  const customerCreds = loadRoleCredentials(VAULT, {
    emailKey: 'RC7_CUSTOMER_A_EMAIL',
    passwordKey: 'RC7_CUSTOMER_A_PASSWORD',
  });
  let r = maestroRole(
    'maestro/rc7-customer-a-login.yaml',
    'RC7_CUSTOMER_A_EMAIL',
    'RC7_CUSTOMER_A_PASSWORD',
    true,
  );
  note('customer_login_v5', r.ok ? 'PASS' : 'FAIL', `exit=${r.exitCode}`);
  pullUi('customer-after-login');

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

  // 3) Partner pending shell
  const partnerCreds = loadRoleCredentials(VAULT, {
    emailKey: 'RC7_PARTNER_A_EMAIL',
    passwordKey: 'RC7_PARTNER_A_PASSWORD',
  });
  r = maestroRole(
    'maestro/rc7-login-generic.yaml',
    'RC7_PARTNER_A_EMAIL',
    'RC7_PARTNER_A_PASSWORD',
    true,
  );
  note('partner_login_v5', r.ok ? 'PASS' : 'FAIL');
  r = runMaestroFlow({
    flowPath: 'maestro/rc7-partner-pending-shell.yaml',
    email: partnerCreds.email,
    password: partnerCreds.password,
  });
  note('partner_pending_shell', r.ok ? 'PASS' : 'FAIL', 'customer shell + no partner/admin switch');
  pullUi('partner-pending-shell');
  runMaestroFlow({
    flowPath: 'maestro/rc7-logout-current.yaml',
    email: partnerCreds.email,
    password: partnerCreds.password,
  });

  // 4) Admin login + logout
  const adminCreds = loadRoleCredentials(VAULT, {
    emailKey: 'RC7_ADMIN_A_EMAIL',
    passwordKey: 'RC7_ADMIN_A_PASSWORD',
  });
  r = maestroRole(
    'maestro/rc7-login-generic.yaml',
    'RC7_ADMIN_A_EMAIL',
    'RC7_ADMIN_A_PASSWORD',
    true,
  );
  note('admin_login_v5', r.ok ? 'PASS' : 'FAIL');
  pullUi('admin-after-login');
  spawnSync('powershell', ['-Command', 'Start-Sleep -Seconds 3'], { shell: false });
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

  // 5) API security matrix
  const anonKey = fetchAnonKey();
  const sec = runNode('scripts/rc7-staging-security-matrix.mjs', [], {
    RC7_STAGING_ANON_KEY: anonKey,
    RC7_EVIDENCE_DIR: EVIDENCE,
  });
  note('staging_security_matrix', sec.ok ? 'PASS' : 'FAIL');

  const summary = {
    at: new Date().toISOString(),
    versionCode,
    phases: log,
    pass: log.filter((x) => x.result === 'PASS').length,
    fail: log.filter((x) => x.result === 'FAIL').length,
  };
  fs.writeFileSync(path.join(EVIDENCE, 'rc7-phone-phase-summary.json'), JSON.stringify(summary, null, 2));

  const verdict =
    summary.fail === 0 && log.every((x) => x.result !== 'FAIL') ? 'PHONE PHASE — PARTIAL' : 'PHONE PHASE — PARTIAL';
  note('verdict', verdict);
  console.log(verdict);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
