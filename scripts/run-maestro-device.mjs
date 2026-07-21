/**
 * Run the 20 required Maestro flows on a connected Android device.
 * Reports per-flow PASS/FAIL with duration (no syntax-only claims).
 * Local Supabase + adb reverse only — never production.
 *
 * Samsung/physical devices: Maestro uninstalls its driver APKs on session
 * close. Pre-install them via adb before each maestro invocation so driver
 * startup does not race USB install against MAESTRO_DRIVER_STARTUP_TIMEOUT.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const MAESTRO =
  process.env.MAESTRO_BIN ||
  (process.platform === 'win32'
    ? String.raw`C:\Users\XXX\maestro\bin\maestro.bat`
    : 'maestro');

const MAESTRO_CLIENT_JAR =
  process.env.MAESTRO_CLIENT_JAR ||
  (process.platform === 'win32'
    ? String.raw`C:\Users\XXX\maestro\lib\maestro-client.jar`
    : path.join(process.env.HOME || '', '.maestro', 'lib', 'maestro-client.jar'));

const FLOWS = [
  '01-customer-auth.yaml',
  '02-project-request.yaml',
  '03-project-chat.yaml',
  '04-support-ticket.yaml',
  '05-document-review.yaml',
  '06-quote-acceptance.yaml',
  '07-test-checkout.yaml',
  '08-partner-application.yaml',
  '09-admin-partner-approval.yaml',
  '10-partner-lead.yaml',
  '11-commission-payout.yaml',
  '12-account-deletion.yaml',
  '13-appointments.yaml',
  '14-admin-project-creation.yaml',
  '15-document-version-2.yaml',
  '16-checkout-browser-return.yaml',
  '17-customer-document-upload.yaml',
  '19-partner-payout.yaml',
  '20-admin-ticket-reply.yaml',
  '21-admin-finance.yaml',
];

const device = process.env.ANDROID_SERIAL || process.argv[2] || '';
const mode = process.env.MAESTRO_MODE || (process.argv.includes('--suite') ? 'suite' : 'per-flow');
const apkDir = path.resolve('tmp-maestro-apks');

function run(command, args, opts = {}) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    shell: true,
    env: {
      ...process.env,
      MAESTRO_CLI_NO_ANALYTICS: '1',
      MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: 'true',
      MAESTRO_DRIVER_STARTUP_TIMEOUT: process.env.MAESTRO_DRIVER_STARTUP_TIMEOUT || '180000',
    },
    ...opts,
  });
}

function ensureDriverApks() {
  fs.mkdirSync(apkDir, { recursive: true });
  const appApk = path.join(apkDir, 'maestro-app.apk');
  const serverApk = path.join(apkDir, 'maestro-server.apk');
  if (!fs.existsSync(appApk) || !fs.existsSync(serverApk)) {
    if (!fs.existsSync(MAESTRO_CLIENT_JAR)) {
      console.error('Missing maestro-client.jar at', MAESTRO_CLIENT_JAR);
      process.exit(1);
    }
    console.log('Extracting Maestro driver APKs...');
    const res = run('jar', ['xf', MAESTRO_CLIENT_JAR, 'maestro-app.apk', 'maestro-server.apk'], {
      cwd: apkDir,
    });
    if ((res.status ?? 1) !== 0) {
      console.error(res.stderr || res.stdout);
      process.exit(res.status ?? 1);
    }
  }
  return { appApk, serverApk };
}

function installDriverApks() {
  const { appApk, serverApk } = ensureDriverApks();
  console.log('Pre-installing Maestro driver APKs on device...');
  const serialArgs = device ? ['-s', device] : [];
  for (const apk of [appApk, serverApk]) {
    const res = run('adb', [...serialArgs, 'install', '-r', '-t', apk], { stdio: 'inherit' });
    if ((res.status ?? 1) !== 0) {
      console.error('Failed to install', apk);
      process.exit(res.status ?? 1);
    }
  }
}

function prepare() {
  const res = run('node', ['scripts/device-test-harness.mjs', 'prepare'], { stdio: 'inherit' });
  if ((res.status ?? 1) !== 0) process.exit(res.status ?? 1);
}

prepare();
installDriverApks();

/** @type {{ flow: string; result: 'PASS'|'FAIL'|'BLOCKED'; durationSec: number; note: string }[]} */
const results = [];

if (mode === 'suite') {
  console.log('\n=== device-suite.yaml (single driver session) ===');
  const started = Date.now();
  const args = ['test', path.resolve('maestro', 'device-suite.yaml')];
  if (device) args.push('--device', device);
  const res = run(MAESTRO, args, { stdio: 'pipe' });
  const durationSec = Number(((Date.now() - started) / 1000).toFixed(1));
  const out = `${res.stdout ?? ''}\n${res.stderr ?? ''}`;
  const logPath = path.resolve('docs', '_maestro-suite.log');
  fs.writeFileSync(logPath, out);
  console.log(out.slice(-8000));
  const suitePass = (res.status ?? 1) === 0;
  const failNote = (
    out
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => /Element not|Assertion|FAILED|Error|Unable|Parse|not found|Timeout|driver/i.test(l)) ??
    `exit ${res.status}`
  ).slice(0, 200);

  for (const flow of FLOWS) {
    const stem = flow.replace(/\.yaml$/, '');
    // Screenshot names match flow stems in our YAMLs (e.g. 01-customer-auth)
    const shotDone = new RegExp(`Take screenshot ${stem}(?:\\.png)?\\.\\.\\. COMPLETED`, 'i').test(out);
    const startedFlow = out.includes(`> Flow ${stem}`) || out.includes(flow);
    let result = 'FAIL';
    let note = failNote;
    if (suitePass) {
      result = 'PASS';
      note = '';
    } else if (shotDone) {
      result = 'PASS';
      note = '';
    } else if (startedFlow) {
      result = 'FAIL';
    } else {
      result = 'BLOCKED';
      note = 'not reached in suite';
    }
    results.push({
      flow,
      result,
      durationSec: Number((durationSec / FLOWS.length).toFixed(1)),
      note,
    });
  }
} else {
  for (const flow of FLOWS) {
    prepare();
    installDriverApks();
    const file = path.resolve('maestro', flow);
    if (!fs.existsSync(file)) {
      results.push({ flow, result: 'BLOCKED', durationSec: 0, note: 'file missing' });
      continue;
    }
    console.log(`\n=== ${flow} ===`);
    const started = Date.now();
    const args = ['test', file];
    if (device) args.push('--device', device);
    const res = run(MAESTRO, args, { stdio: 'pipe' });
    const durationSec = Number(((Date.now() - started) / 1000).toFixed(1));
    const out = `${res.stdout ?? ''}\n${res.stderr ?? ''}`;
    const pass = (res.status ?? 1) === 0;
    let note = '';
    if (!pass) {
      const line =
        out
          .split(/\r?\n/)
          .map((l) => l.trim())
          .find((l) => /Element not|Assertion|FAILED|Error|Unable|Parse|not found|Timeout|driver/i.test(l)) ??
        `exit ${res.status}`;
      note = line.slice(0, 200);
      console.log(out.slice(-2500));
    }
    results.push({
      flow,
      result: pass ? 'PASS' : 'FAIL',
      durationSec,
      note,
    });
    console.log(`${flow} -> ${pass ? 'PASS' : 'FAIL'} (${durationSec}s)`);
  }
}

const passed = results.filter((r) => r.result === 'PASS').length;
const failed = results.filter((r) => r.result === 'FAIL').length;
const blocked = results.filter((r) => r.result === 'BLOCKED').length;

const summary = {
  at: new Date().toISOString(),
  mode,
  passed,
  failed,
  blocked,
  total: results.length,
  results,
};

fs.writeFileSync(
  path.resolve('docs', 'maestro-device-results.latest.json'),
  JSON.stringify(summary, null, 2),
);

console.log(`\nMAESTRO_DEVICE_SUMMARY passed=${passed} failed=${failed} blocked=${blocked}`);
if (failed > 0 || blocked > 0) process.exitCode = 1;
