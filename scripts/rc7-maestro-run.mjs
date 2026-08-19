#!/usr/bin/env node
/**
 * RC7 Maestro flow runner — safe credential passing for physical device tests.
 *
 * Usage:
 *   node scripts/rc7-maestro-run.mjs --flow=maestro/rc7-customer-a-login.yaml \
 *     --email-key=RC7_CUSTOMER_A_EMAIL --password-key=RC7_CUSTOMER_A_PASSWORD
 *
 * Optional: --vault=path --device=SERIAL --cold-start
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { loadRoleCredentials, runMaestroFlow } from './lib/maestro-env.mjs';
import { redactEnvForLog } from './lib/load-env-file.mjs';

const APP_PACKAGE = 'nl.vdbdigital.app';
const DEFAULT_VAULT = 'C:/Users/XXX/.vdb-vault/rc7-staging-role-matrix.env';

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : process.env[`RC7_${name.toUpperCase()}`] ?? '';
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function adb(args) {
  const serial = arg('device');
  const full = serial ? ['-s', serial, ...args] : args;
  return spawnSync('adb', full, { encoding: 'utf8', shell: false });
}

function coldStart() {
  adb(['shell', 'am', 'force-stop', APP_PACKAGE]);
  adb(['shell', 'pm', 'clear', APP_PACKAGE]);
  adb(['shell', 'monkey', '-p', APP_PACKAGE, '-c', 'android.intent.category.LAUNCHER', '1']);
  spawnSync('powershell', ['-Command', 'Start-Sleep -Seconds 8'], { shell: false });
}

async function main() {
  const flow = arg('flow');
  if (!flow) {
    console.error('Missing --flow=maestro/....yaml');
    process.exit(1);
  }
  const vault = arg('vault') || DEFAULT_VAULT;
  const emailKey = arg('email-key') || 'RC7_CUSTOMER_A_EMAIL';
  const passwordKey = arg('password-key') || 'RC7_CUSTOMER_A_PASSWORD';
  const { email, password } = loadRoleCredentials(vault, { emailKey, passwordKey });

  console.log('RC7_MAESTRO_RUN', {
    flow,
    vault: path.basename(vault),
    credentials: redactEnvForLog({ EMAIL: email, PASSWORD: password }),
    coldStart: hasFlag('cold-start'),
  });

  if (hasFlag('cold-start')) {
    coldStart();
  }

  const result = runMaestroFlow({
    flowPath: flow,
    email,
    password,
    device: arg('device') || undefined,
  });

  const tail = `${result.stdout}\n${result.stderr}`.trim().slice(-4000);
  if (tail) console.log(tail);

  console.log(
    `RC7_MAESTRO_RESULT ok=${result.ok} exit=${result.exitCode} durationSec=${result.durationSec}`,
  );
  process.exit(result.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
