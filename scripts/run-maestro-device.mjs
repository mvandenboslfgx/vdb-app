/**
 * Run executable Maestro flows on a connected Android device.
 * Flow list is auto-discovered (see scripts/maestro-suite-manifest.mjs).
 * Reports X/X with X from discovery — never a hard-coded denominator.
 *
 * Local Supabase + adb reverse only — never production.
 *
 * Samsung/physical devices: Maestro uninstalls its driver APKs on session
 * close. Pre-install them via adb before each maestro invocation so driver
 * startup does not race USB install against MAESTRO_DRIVER_STARTUP_TIMEOUT.
 *
 * App package nl.vdbdigital.app is checked before every flow; missing package
 * is INFRASTRUCTURE BLOCKED (not a UI fail).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { listExecutableFlowNames, writeSuiteManifestMarkdown } from './maestro-suite-manifest.mjs';

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

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`Usage:
  node scripts/run-maestro-device.mjs [--suite] [--from=<flow.yaml>] [ANDROID_SERIAL]
  npm run device:test:maestro
  npm run device:test:maestro:from-16
Denominator is auto-discovered from maestro/<NN>-*.yaml.`);
  process.exit(0);
}

const FLOWS = listExecutableFlowNames();
const TOTAL = FLOWS.length;

const device =
  process.env.ANDROID_SERIAL ||
  process.argv.find((a, i) => i >= 2 && !a.startsWith('-')) ||
  '';
const mode = process.env.MAESTRO_MODE || (process.argv.includes('--suite') ? 'suite' : 'per-flow');
const fromArg = process.argv.find((a) => a.startsWith('--from='));
const fromFlow = fromArg ? fromArg.slice('--from='.length) : process.env.MAESTRO_FROM || '';
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

function syncDeviceSuiteYaml(flowNames) {
  const target = path.resolve('maestro', 'device-suite.yaml');
  const body = [
    `# Single Maestro session for all ${flowNames.length} discovered device flows.`,
    '# Auto-synced by scripts/run-maestro-device.mjs — do not hand-edit the flow list.',
    '# One driver session avoids USB flakiness from per-flow install/uninstall.',
    'appId: nl.vdbdigital.app',
    '---',
    ...flowNames.map((f) => `- runFlow: ${f}`),
    '',
  ].join('\n');
  fs.writeFileSync(target, body, 'utf8');
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

function healthGate() {
  const res = run('node', ['scripts/device-test-harness.mjs', 'prepare'], { stdio: 'inherit' });
  if ((res.status ?? 1) !== 0) {
    console.error('INFRASTRUCTURE BLOCKED: health gate failed — suite aborted');
    process.exit(res.status === 2 ? 2 : res.status ?? 1);
  }
}

if (TOTAL === 0) {
  console.error('No executable Maestro flows discovered under maestro/');
  process.exit(1);
}

writeSuiteManifestMarkdown(path.resolve('docs', 'maestro-suite-manifest.md'));
syncDeviceSuiteYaml(FLOWS);
console.log(`SUITE_DENOMINATOR=${TOTAL} (auto-discovered)`);
console.log(FLOWS.map((f, i) => `  ${i + 1}. ${f}`).join('\n'));

let selected = FLOWS;
if (fromFlow) {
  const idx = FLOWS.findIndex((f) => f === fromFlow || f.startsWith(fromFlow) || f.includes(fromFlow));
  if (idx < 0) {
    console.error(`--from=${fromFlow} did not match any discovered flow`);
    process.exit(1);
  }
  selected = FLOWS.slice(idx);
  console.log(`Running subset from ${selected[0]} (${selected.length}/${TOTAL})`);
}

healthGate();
installDriverApks();

/** @type {{ flow: string; result: 'PASS'|'FAIL'|'BLOCKED'|'INFRA'; durationSec: number; note: string }[]} */
const results = [];
const suiteStartedAt = new Date().toISOString();

if (mode === 'suite' && !fromFlow) {
  console.log(`\n=== device-suite.yaml (single driver session, ${TOTAL} flows) ===`);
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
      .find((l) => /Element not|Assertion|FAILED|Error|Unable|Parse|not found|Timeout|driver|INFRASTRUCTURE/i.test(l)) ??
    `exit ${res.status}`
  ).slice(0, 200);

  for (const flow of FLOWS) {
    const stem = flow.replace(/\.yaml$/, '');
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
  for (const flow of selected) {
    healthGate();
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

const suiteEndedAt = new Date().toISOString();
const passed = results.filter((r) => r.result === 'PASS').length;
const failed = results.filter((r) => r.result === 'FAIL').length;
const blocked = results.filter((r) => r.result === 'BLOCKED' || r.result === 'INFRA').length;
const runTotal = results.length;
const label = `${passed}/${TOTAL}`;

const summary = {
  at: suiteEndedAt,
  startedAt: suiteStartedAt,
  endedAt: suiteEndedAt,
  mode: fromFlow ? `per-flow-from:${fromFlow}` : mode,
  denominator: TOTAL,
  scoreLabel: label,
  passed,
  failed,
  blocked,
  total: runTotal,
  flowsDiscovered: FLOWS,
  results,
};

fs.writeFileSync(
  path.resolve('docs', 'maestro-device-results.latest.json'),
  JSON.stringify(summary, null, 2),
);

console.log(`\nMAESTRO_DEVICE_SUMMARY ${label} passed=${passed} failed=${failed} blocked=${blocked} denominator=${TOTAL}`);
if (failed > 0 || blocked > 0 || passed < TOTAL && !fromFlow) process.exitCode = 1;
if (fromFlow && (failed > 0 || blocked > 0)) process.exitCode = 1;
