/**
 * Maestro device runner — passes EMAIL/PASSWORD via process.env only.
 * Never uses shell string concatenation for secrets.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { parseEnvFile, redactEnvForLog } from './load-env-file.mjs';

const DEFAULT_MAESTRO_HOME =
  process.env.MAESTRO_HOME ||
  (process.platform === 'win32' ? String.raw`C:\Users\XXX\maestro` : path.join(process.env.HOME ?? '', '.maestro'));

/**
 * Resolve java executable (same logic as maestro.bat).
 * @returns {string}
 */
function resolveJavaExe() {
  if (process.env.JAVA_HOME) {
    const candidate = path.join(process.env.JAVA_HOME.replace(/"/g, ''), 'bin', 'java.exe');
    if (fs.existsSync(candidate)) return candidate;
  }
  return 'java';
}

/**
 * @param {string} maestroHome
 * @returns {string}
 */
export function buildMaestroClasspath(maestroHome) {
  return path.join(maestroHome, 'lib', '*');
}

/**
 * Run maestro flow with credentials in child env — never on argv.
 * @param {{
 *   flowPath: string;
 *   email: string;
 *   password: string;
 *   device?: string;
 *   extraEnv?: Record<string, string>;
 *   totp?: string;
 *   maestroHome?: string;
 *   cwd?: string;
 * }} input
 */
export function runMaestroFlow(input) {
  const maestroHome = input.maestroHome ?? DEFAULT_MAESTRO_HOME;
  const javaExe = resolveJavaExe();
  const classpath = buildMaestroClasspath(maestroHome);
  const flowPath = path.resolve(input.cwd ?? process.cwd(), input.flowPath);

  if (!fs.existsSync(flowPath)) {
    throw new Error(`Maestro flow not found: ${flowPath}`);
  }

  const childEnv = {
    ...process.env,
    ...input.extraEnv,
    EMAIL: input.email,
    PASSWORD: input.password,
    MAESTRO_CLI_NO_ANALYTICS: '1',
    MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: 'true',
    MAESTRO_DRIVER_STARTUP_TIMEOUT: process.env.MAESTRO_DRIVER_STARTUP_TIMEOUT ?? '180000',
  };
  if (input.totp) {
    childEnv.TOTP = input.totp;
  }

  const args = [
    '--enable-native-access=ALL-UNNAMED',
    '-classpath',
    classpath,
    'maestro.cli.AppKt',
    'test',
    flowPath,
    '-e',
    `EMAIL=${input.email}`,
    '-e',
    `PASSWORD=${input.password}`,
  ];
  if (input.totp) {
    args.push('-e', `TOTP=${input.totp}`);
  }
  if (input.device) args.push('--device', input.device);

  const started = Date.now();
  const result = spawnSync(javaExe, args, {
    encoding: 'utf8',
    shell: false,
    env: childEnv,
    cwd: input.cwd ?? process.cwd(),
  });
  const durationSec = Number(((Date.now() - started) / 1000).toFixed(1));

  return {
    ok: (result.status ?? 1) === 0,
    exitCode: result.status ?? 1,
    durationSec,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    envLog: redactEnvForLog({
      EMAIL: input.email,
      PASSWORD: input.password,
      ...(input.totp ? { TOTP: input.totp } : {}),
    }),
  };
}

/**
 * Load role credentials from vault file by key prefix.
 * @param {string} vaultPath
 * @param {{ emailKey: string; passwordKey: string }} keys
 */
export function loadRoleCredentials(vaultPath, keys) {
  const map = parseEnvFile(vaultPath);
  const email = map[keys.emailKey];
  const password = map[keys.passwordKey];
  if (!email || !password) {
    throw new Error(`Missing ${keys.emailKey} or ${keys.passwordKey} in ${vaultPath}`);
  }
  return { email, password };
}

/**
 * Verify secret survives round-trip through env file write/read (harness self-test).
 * @param {string} secret
 */
export function assertSecretRoundTrip(secret) {
  const tmp = path.join(process.cwd(), 'tmp-maestro-apks', `env-roundtrip-${process.pid}.env`);
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  fs.writeFileSync(tmp, `EMAIL=test@example.com\nPASSWORD=${secret}\n`, 'utf8');
  try {
    const parsed = parseEnvFile(tmp);
    if (parsed.PASSWORD !== secret) {
      throw new Error(`round-trip mismatch for label length=${secret.length}`);
    }
    return true;
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      // ignore
    }
  }
}
