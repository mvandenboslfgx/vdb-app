/**
 * Run the 20 required Maestro flows on a connected Android device.
 * Reports per-flow PASS/FAIL with duration (no syntax-only claims).
 * Local Supabase + adb reverse only — never production.
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

function run(command, args, opts = {}) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    shell: true,
    env: {
      ...process.env,
      MAESTRO_CLI_NO_ANALYTICS: '1',
      MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: 'true',
    },
    ...opts,
  });
}

function prepare() {
  const res = run('node', ['scripts/device-test-harness.mjs', 'prepare'], { stdio: 'inherit' });
  if ((res.status ?? 1) !== 0) process.exit(res.status ?? 1);
}

prepare();

/** @type {{ flow: string; result: 'PASS'|'FAIL'|'BLOCKED'; durationSec: number; note: string }[]} */
const results = [];

for (const flow of FLOWS) {
  prepare();
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
        .find((l) => /Element not|Assertion|FAILED|Error|Unable|Parse|not found/i.test(l)) ??
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

const passed = results.filter((r) => r.result === 'PASS').length;
const failed = results.filter((r) => r.result === 'FAIL').length;
const blocked = results.filter((r) => r.result === 'BLOCKED').length;

const summary = {
  at: new Date().toISOString(),
  mode: 'per-flow',
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
