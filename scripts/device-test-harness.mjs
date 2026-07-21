/**
 * Device test harness — local Supabase + adb reverse helpers.
 * Never targets production.
 */
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const cmd = process.argv[2] ?? 'help';

function run(command, args, opts = {}) {
  const res = spawnSync(command, args, { stdio: 'inherit', shell: true, ...opts });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

function runQuiet(command, args) {
  return spawnSync(command, args, { encoding: 'utf8', shell: true });
}

/** Wake, unlock, keep screen on — Maestro fails on lockscreen/notification shade. */
function prepareDevice() {
  console.log('Preparing device (wake/unlock/stay-on/collapse shade)...');
  runQuiet('adb', ['shell', 'input', 'keyevent', 'KEYCODE_WAKEUP']);
  runQuiet('adb', ['shell', 'wm', 'dismiss-keyguard']);
  runQuiet('adb', ['shell', 'svc', 'power', 'stayon', 'usb']);
  runQuiet('adb', ['shell', 'settings', 'put', 'system', 'screen_off_timeout', '1800000']);
  runQuiet('adb', ['shell', 'cmd', 'statusbar', 'collapse']);
  // Single gentle unlock swipe (avoid storm between Maestro sessions)
  runQuiet('adb', ['shell', 'input', 'swipe', '540', '2000', '540', '800', '300']);
  const devices = runQuiet('adb', ['devices']);
  const out = devices.stdout ?? '';
  if (!/\tdevice\b/.test(out)) {
    console.error('No adb device in "device" state:\n', out);
    process.exit(1);
  }
  console.log(out.trim());
}

function reversePorts() {
  run('adb', ['reverse', 'tcp:54321', 'tcp:54321']);
  run('adb', ['reverse', 'tcp:8081', 'tcp:8081']);
  run('adb', ['reverse', '--list']);
}

switch (cmd) {
  case 'prepare':
    prepareDevice();
    reversePorts();
    break;
  case 'reset':
    prepareDevice();
    run('npx', ['supabase', 'db', 'reset']);
    run('node', ['scripts/seed-local-identities.mjs']);
    reversePorts();
    break;
  case 'seed':
    run('node', ['scripts/seed-local-identities.mjs']);
    break;
  case 'reverse':
    reversePorts();
    break;
  case 'customer':
  case 'partner':
  case 'admin':
    prepareDevice();
    reversePorts();
    console.log(`Ready for ${cmd} flows. Password: LocalTestVdb2026 (local only).`);
    console.log('Ensure: supabase up, adb device, Metro, then npm run device:test:maestro');
    break;
  default:
    console.log(
      `Usage: node scripts/device-test-harness.mjs <prepare|reset|seed|reverse|customer|partner|admin>`,
    );
    process.exit(cmd === 'help' ? 0 : 1);
}
