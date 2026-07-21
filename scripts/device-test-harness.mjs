/**
 * Device test harness — local Supabase + adb reverse helpers.
 * Never targets production.
 *
 * Hard requirements for device validation:
 * - only project_id vdb-digital-mobile-local on :54321/:54322
 * - competing stacks (esp. vdbdigital2) fail the gate
 * - health gate before suite / reset completion
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const cmd = process.argv[2] ?? 'help';

const EXPECTED_PROJECT = 'vdb-digital-mobile-local';
const FORBIDDEN_STACKS = ['vdbdigital2'];
const APP_PACKAGE = 'nl.vdbdigital.app';
const APP_APK =
  process.env.VDB_APP_APK ||
  path.resolve('android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const APP_APK_SHA_FILE = path.resolve('tmp-maestro-apks', 'app-debug.sha256');

function run(command, args, opts = {}) {
  const useShell = opts.shell === true || (opts.shell !== false && /^(npx|npm)$/i.test(command));
  const res = spawnSync(command, args, {
    stdio: 'inherit',
    shell: useShell,
    ...opts,
    // Force boolean after spread so callers cannot accidentally leave docker/adb broken on Windows.
    shell: useShell,
  });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

function runQuiet(command, args, opts = {}) {
  // Never use shell:true for docker/adb/curl — Windows mangles {{.Names}} and flag parsing.
  const useShell = opts.shell === true || (opts.shell !== false && /^(npx|npm)$/i.test(command));
  return spawnSync(command, args, { encoding: 'utf8', shell: useShell, ...opts, shell: useShell });
}

function httpCode(url, extraArgs = []) {
  const health = runQuiet('curl.exe', ['-s', '-o', 'NUL', '-w', '%{http_code}', ...extraArgs, url]);
  return (health.stdout ?? '').trim();
}

function dockerNames(filter) {
  const res = runQuiet('docker', ['ps', '-a', '--filter', filter, '--format', '{{.Names}}']);
  return (res.stdout ?? '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function sha256File(filePath) {
  const hash = createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

/** Fail hard when a forbidden stack (e.g. vdbdigital2) is present or owns API ports. */
function assertNoForbiddenStacks() {
  const all = runQuiet('docker', ['ps', '-a', '--format', '{{.Names}}']);
  const names = (all.stdout ?? '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const offenders = names.filter((n) => FORBIDDEN_STACKS.some((s) => n.includes(s)));
  if (offenders.length > 0) {
    console.error('INFRASTRUCTURE BLOCKED: forbidden Supabase stack containers present:');
    for (const n of offenders) console.error(`  - ${n}`);
    console.error(
      `Stop with: npx supabase stop --project-id vdbdigital2  (from that project), then remove leftover containers.`,
    );
    process.exit(2);
  }
}

function assertCorrectKong() {
  const kongRunning = runQuiet('docker', [
    'ps',
    '--filter',
    'name=supabase_kong',
    '--format',
    '{{.Names}}\t{{.Ports}}',
  ]);
  const lines = (kongRunning.stdout ?? '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  // Match host publish of 54321 (IPv4 or IPv6 forms).
  const on54321 = lines.filter((l) => /(?:^|[\s,])(?:0\.0\.0\.0:|\[::\]:|:)?54321->/.test(l) || /:54321->/.test(l));
  if (on54321.length === 0) {
    console.error('INFRASTRUCTURE BLOCKED: no Kong listening on host :54321');
    console.error(kongRunning.stdout || '(no kong containers)');
    process.exit(2);
  }
  if (on54321.length > 1) {
    console.error('INFRASTRUCTURE BLOCKED: multiple Kong containers bound to :54321');
    console.error(on54321.join('\n'));
    process.exit(2);
  }
  const kongName = on54321[0].split('\t')[0];
  if (!kongName.includes(EXPECTED_PROJECT)) {
    console.error(
      `INFRASTRUCTURE BLOCKED: wrong stack on :54321 (${kongName}). Expected *${EXPECTED_PROJECT}*`,
    );
    process.exit(2);
  }
  return kongName;
}

function assertDbHealthy() {
  const dbName = `supabase_db_${EXPECTED_PROJECT}`;
  const inspect = runQuiet('docker', [
    'inspect',
    '--format',
    '{{.State.Status}}|{{.State.ExitCode}}|{{.State.OOMKilled}}|{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}',
    dbName,
  ]);
  if ((inspect.status ?? 1) !== 0) {
    console.error(`INFRASTRUCTURE BLOCKED: missing DB container ${dbName}`);
    process.exit(2);
  }
  const raw = (inspect.stdout ?? '').trim();
  const [status, exitCode, oom, health] = raw.split('|');
  if (status !== 'running' || health !== 'healthy') {
    console.error(
      `INFRASTRUCTURE BLOCKED: DB ${dbName} status=${status} health=${health} exit=${exitCode} oom=${oom}`,
    );
    process.exit(2);
  }
  if (oom === 'true') {
    console.error(`INFRASTRUCTURE BLOCKED: DB ${dbName} was OOMKilled`);
    process.exit(2);
  }
  return { status, exitCode, oom, health };
}

function assertAppPackageInstalled() {
  const serial = process.env.ANDROID_SERIAL;
  const serialArgs = serial ? ['-s', serial] : [];
  const check = runQuiet('adb', [...serialArgs, 'shell', 'pm', 'path', APP_PACKAGE]);
  const out = `${check.stdout ?? ''}${check.stderr ?? ''}`;
  if (!out.includes(`package:`)) {
    return false;
  }
  return true;
}

function ensureAppApkInstalled() {
  if (!fs.existsSync(APP_APK)) {
    console.error(`INFRASTRUCTURE BLOCKED: app APK missing at ${APP_APK}`);
    process.exit(2);
  }
  const sha = sha256File(APP_APK);
  fs.mkdirSync(path.dirname(APP_APK_SHA_FILE), { recursive: true });
  const prev = fs.existsSync(APP_APK_SHA_FILE) ? fs.readFileSync(APP_APK_SHA_FILE, 'utf8').trim() : '';
  if (prev && prev !== sha) {
    console.error(
      `INFRASTRUCTURE BLOCKED: APK SHA-256 changed (expected ${prev}, got ${sha}). Rebuild or restore artifact.`,
    );
    process.exit(2);
  }
  if (!prev) fs.writeFileSync(APP_APK_SHA_FILE, `${sha}\n`, 'utf8');

  if (assertAppPackageInstalled()) {
    console.log(`App package ${APP_PACKAGE} already installed (sha256=${sha.slice(0, 12)}…).`);
    return sha;
  }

  console.log(`Installing app APK (${sha.slice(0, 12)}…)…`);
  const serial = process.env.ANDROID_SERIAL;
  const serialArgs = serial ? ['-s', serial] : [];
  const install = runQuiet('adb', [...serialArgs, 'install', '-r', '-t', APP_APK]);
  const combined = `${install.stdout ?? ''}\n${install.stderr ?? ''}`;
  if ((install.status ?? 1) !== 0 || !/Success/i.test(combined)) {
    console.error('INFRASTRUCTURE BLOCKED: adb install failed for app APK');
    console.error(combined.slice(-1500));
    process.exit(2);
  }
  // Wait for package manager
  for (let i = 0; i < 20; i += 1) {
    if (assertAppPackageInstalled()) break;
    spawnSync(process.platform === 'win32' ? 'timeout' : 'sleep', process.platform === 'win32' ? ['/t', '1', '/nobreak'] : ['1'], {
      shell: true,
      stdio: 'ignore',
    });
  }
  if (!assertAppPackageInstalled()) {
    console.error(`INFRASTRUCTURE BLOCKED: package ${APP_PACKAGE} not visible after install`);
    process.exit(2);
  }
  console.log(`Installed ${APP_PACKAGE}`);
  return sha;
}

function clearAppData() {
  const serial = process.env.ANDROID_SERIAL;
  const serialArgs = serial ? ['-s', serial] : [];
  if (!assertAppPackageInstalled()) {
    ensureAppApkInstalled();
  }
  console.log(`Clearing app data for ${APP_PACKAGE}…`);
  const res = runQuiet('adb', [...serialArgs, 'shell', 'pm', 'clear', APP_PACKAGE]);
  const out = `${res.stdout ?? ''}${res.stderr ?? ''}`.trim();
  if (!/Success/i.test(out)) {
    console.error(`INFRASTRUCTURE BLOCKED: pm clear failed: ${out}`);
    process.exit(2);
  }
}

function setTestLocale() {
  const serial = process.env.ANDROID_SERIAL;
  const serialArgs = serial ? ['-s', serial] : [];
  // Best-effort; do not fail the gate if OEM blocks locale change
  runQuiet('adb', [...serialArgs, 'shell', 'settings', 'put', 'system', 'system_locales', 'nl-NL']);
}

/** Full pre-flow / pre-suite health gate. */
export function assertDeviceHealthGate({ requireMetro = true, requireApp = true } = {}) {
  stopForbiddenStacks();
  assertNoForbiddenStacks();
  const kong = assertCorrectKong();
  const db = assertDbHealthy();

  const auth = httpCode('http://127.0.0.1:54321/auth/v1/health');
  if (auth !== '200') {
    console.error(`INFRASTRUCTURE BLOCKED: auth health HTTP ${auth || 'none'}`);
    process.exit(2);
  }

  const rest = httpCode('http://127.0.0.1:54321/rest/v1/', [
    '-H',
    'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
    '-H',
    'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  ]);
  // REST may return 200 (empty) or 400/406 without Accept — any connection proving reachability OK if not 000
  if (!rest || rest === '000') {
    console.error(`INFRASTRUCTURE BLOCKED: REST unreachable (HTTP ${rest || 'none'})`);
    process.exit(2);
  }

  const reverse = runQuiet('adb', ['reverse', '--list']);
  const revOut = reverse.stdout ?? '';
  if (!revOut.includes('tcp:54321') || !revOut.includes('tcp:8081')) {
    console.error('INFRASTRUCTURE BLOCKED: adb reverse missing for 54321 and/or 8081');
    console.error(revOut || '(empty)');
    process.exit(2);
  }

  if (requireMetro) {
    const metro = httpCode('http://127.0.0.1:8081/status');
    if (metro !== '200') {
      console.error(`INFRASTRUCTURE BLOCKED: Metro not reachable on :8081 (HTTP ${metro || 'none'})`);
      process.exit(2);
    }
  }

  let apkSha = null;
  if (requireApp) {
    apkSha = ensureAppApkInstalled();
  }

  console.log(
    `HEALTH_GATE_OK project=${EXPECTED_PROJECT} kong=${kong} db=${db.health} auth=200 rest=${rest} apk=${apkSha ? apkSha.slice(0, 12) + '…' : 'n/a'}`,
  );
  return { kong, db, auth, rest, apkSha };
}

function ensureExpectedStackRunning() {
  stopForbiddenStacks();
  const kongCheck = runQuiet('docker', [
    'ps',
    '--filter',
    'name=supabase_kong',
    '--format',
    '{{.Names}}\t{{.Ports}}',
  ]);
  const lines = (kongCheck.stdout ?? '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((l) => /:54321->/.test(l));
  const ok = lines.length === 1 && lines[0].includes(EXPECTED_PROJECT);
  if (ok) return;
  console.log(`Starting ${EXPECTED_PROJECT} (current kong: ${kongCheck.stdout?.trim() || 'none'})…`);
  run('npx', ['supabase', 'start']);
  waitForAuthHealthy(180_000);
  const again = runQuiet('docker', [
    'ps',
    '--filter',
    'name=supabase_kong',
    '--format',
    '{{.Names}}\t{{.Ports}}',
  ]);
  const lines2 = (again.stdout ?? '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((l) => /:54321->/.test(l));
  if (lines2.length !== 1 || !lines2[0].includes(EXPECTED_PROJECT)) {
    console.error(
      `INFRASTRUCTURE BLOCKED: expected ${EXPECTED_PROJECT} on :54321 after start. Kong:\n${again.stdout}`,
    );
    process.exit(2);
  }
}

function waitForDbHealthy(timeoutMs = 120_000) {
  const dbName = `supabase_db_${EXPECTED_PROJECT}`;
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const inspect = runQuiet('docker', [
      'inspect',
      '--format',
      '{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}|{{.State.OOMKilled}}',
      dbName,
    ]);
    if ((inspect.status ?? 1) === 0) {
      const [status, health, oom] = (inspect.stdout ?? '').trim().split('|');
      if (status === 'running' && health === 'healthy' && oom !== 'true') {
        console.log(`DB healthy (${dbName}).`);
        return;
      }
    }
    spawnSync(
      process.platform === 'win32' ? 'timeout' : 'sleep',
      process.platform === 'win32' ? ['/t', '2', '/nobreak'] : ['2'],
      { shell: true, stdio: 'ignore' },
    );
  }
  console.error(`INFRASTRUCTURE BLOCKED: DB ${dbName} not healthy in time`);
  process.exit(2);
}

function resetDatabaseWithRetry(attempts = 3) {
  let lastStatus = 1;
  for (let i = 1; i <= attempts; i += 1) {
    stopForbiddenStacks();
    waitForDbHealthy();
    waitForAuthHealthy();
    console.log(`supabase db reset attempt ${i}/${attempts}…`);
    const res = spawnSync('npx', ['supabase', 'db', 'reset'], {
      encoding: 'utf8',
      shell: true,
      stdio: 'inherit',
    });
    lastStatus = res.status ?? 1;
    if (lastStatus === 0) {
      waitForAuthHealthy();
      waitForDbHealthy();
      return;
    }
    console.warn(`db reset failed (exit ${lastStatus}); ensuring stack and retrying…`);
    ensureExpectedStackRunning();
  }
  console.error(`INFRASTRUCTURE BLOCKED: supabase db reset failed after ${attempts} attempts`);
  process.exit(lastStatus || 1);
}

function waitForAuthHealthy(timeoutMs = 120_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const code = httpCode('http://127.0.0.1:54321/auth/v1/health');
    if (code === '200') {
      console.log('Auth healthy after reset.');
      return;
    }
    spawnSync(
      process.platform === 'win32' ? 'timeout' : 'sleep',
      process.platform === 'win32' ? ['/t', '2', '/nobreak'] : ['2'],
      { shell: true, stdio: 'ignore' },
    );
  }
  console.error('INFRASTRUCTURE BLOCKED: auth did not become healthy after db reset');
  process.exit(2);
}

/** Wake, unlock, keep screen on — Maestro fails on lockscreen/notification shade. */
function prepareDevice() {
  console.log('Preparing device (wake/unlock/stay-on/collapse shade)...');
  runQuiet('adb', ['shell', 'input', 'keyevent', 'KEYCODE_WAKEUP']);
  runQuiet('adb', ['shell', 'wm', 'dismiss-keyguard']);
  runQuiet('adb', ['shell', 'svc', 'power', 'stayon', 'usb']);
  runQuiet('adb', ['shell', 'settings', 'put', 'system', 'screen_off_timeout', '1800000']);
  runQuiet('adb', ['shell', 'cmd', 'statusbar', 'collapse']);
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

function assertLocalStackHealthy() {
  assertDeviceHealthGate({ requireMetro: true, requireApp: true });
}

function stopForbiddenStacks() {
  // Only remove containers that belong to forbidden project ids — never docker stop $(docker ps -q)
  // and never `supabase stop` from this repo (CLI may ignore --project-id and stop mobile-local).
  for (const stack of FORBIDDEN_STACKS) {
    const names = dockerNames(`name=${stack}`);
    for (const name of names) {
      // Guard: never touch the expected project even if a name substring overlaps.
      if (name.includes(EXPECTED_PROJECT)) continue;
      console.log(`Stopping forbidden container ${name}…`);
      runQuiet('docker', ['update', '--restart=no', name]);
      runQuiet('docker', ['stop', name]);
      runQuiet('docker', ['rm', '-f', name]);
    }
  }
  assertNoForbiddenStacks();
}

switch (cmd) {
  case 'prepare':
    prepareDevice();
    reversePorts();
    setTestLocale();
    assertLocalStackHealthy();
    break;
  case 'reset':
    prepareDevice();
    ensureExpectedStackRunning();
    waitForDbHealthy();
    resetDatabaseWithRetry(3);
    run('node', ['scripts/seed-local-identities.mjs']);
    run('node', ['scripts/verify-local-passwords.mjs']);
    ensureAppApkInstalled();
    clearAppData();
    reversePorts();
    setTestLocale();
    assertLocalStackHealthy();
    console.log('device:test:reset complete — suite may start');
    break;
  case 'seed':
    run('node', ['scripts/seed-local-identities.mjs']);
    break;
  case 'reverse':
    reversePorts();
    break;
  case 'health':
    prepareDevice();
    reversePorts();
    assertLocalStackHealthy();
    break;
  case 'ensure-apk':
    ensureAppApkInstalled();
    break;
  case 'stop-forbidden':
    stopForbiddenStacks();
    break;
  case 'customer':
  case 'partner':
  case 'admin':
    prepareDevice();
    reversePorts();
    assertLocalStackHealthy();
    console.log(`Ready for ${cmd} flows. Use local test password from seed (not logged).`);
    console.log('Ensure: supabase up, adb device, Metro, then npm run device:test:maestro');
    break;
  default:
    console.log(
      `Usage: node scripts/device-test-harness.mjs <prepare|reset|seed|reverse|health|ensure-apk|stop-forbidden|customer|partner|admin>`,
    );
    process.exit(cmd === 'help' ? 0 : 1);
}
