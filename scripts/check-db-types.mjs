/**
 * Fail if generated DB types are stale vs Mobile local schema on :54522.
 */
import { createRequire } from 'node:module';
import { readFileSync, existsSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateMobileDbTypes, stripGeneratedHeader } from './gen-db-types.mjs';

const require = createRequire(import.meta.url);
const {
  LocalDbTargetError,
  assertPlausibleMobileTypesOutput,
  redactSecrets,
} = require('./lib/local-db-target-guard.cjs');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = resolve(root, 'src/types/database.generated.ts');

try {
  if (!existsSync(outPath)) {
    throw new LocalDbTargetError(
      'Missing src/types/database.generated.ts — run: npm run db:types',
      'MISSING_TYPES_FILE',
    );
  }

  const currentRaw = readFileSync(outPath, 'utf8');
  assertPlausibleMobileTypesOutput(currentRaw, { path: outPath });
  const current = stripGeneratedHeader(currentRaw);

  const tmpOut = resolve(root, '.tmp', 'database.generated.check.ts');
  const fresh = generateMobileDbTypes({ outPath: tmpOut, quiet: true });
  const freshBody = stripGeneratedHeader(fresh.full);

  try {
    unlinkSync(tmpOut);
  } catch {
    /* ignore */
  }

  if (current !== freshBody) {
    console.error('database.generated.ts is out of date. Run: npm run db:types');
    console.error(
      `(checked against hostclass=${fresh.evidence.hostclass} port=${fresh.evidence.port} project=${fresh.evidence.localProjectId})`,
    );
    process.exit(1);
  }

  console.log(
    `database.generated.ts is up to date (hostclass=${fresh.evidence.hostclass}, port=${fresh.evidence.port}, project=${fresh.evidence.localProjectId}).`,
  );
} catch (err) {
  console.error(redactSecrets(err?.message || String(err)));
  process.exit(1);
}
