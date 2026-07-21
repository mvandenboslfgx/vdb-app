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

switch (cmd) {
  case 'reset':
    run('npx', ['supabase', 'db', 'reset']);
    run('node', ['scripts/seed-local-identities.mjs']);
    break;
  case 'seed':
    run('node', ['scripts/seed-local-identities.mjs']);
    break;
  case 'reverse':
    run('adb', ['reverse', 'tcp:54321', 'tcp:54321']);
    run('adb', ['reverse', 'tcp:8081', 'tcp:8081']);
    run('adb', ['reverse', '--list']);
    break;
  case 'customer':
  case 'partner':
  case 'admin':
    console.log(`Ready for ${cmd} flows. Password: LocalTestVdb2026 (local only).`);
    console.log('Ensure: supabase up, adb device, Metro, then maestro test maestro/...');
    break;
  default:
    console.log(`Usage: node scripts/device-test-harness.mjs <reset|seed|reverse|customer|partner|admin>`);
    process.exit(cmd === 'help' ? 0 : 1);
}
