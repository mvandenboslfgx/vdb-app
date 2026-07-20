/**
 * Fail if generated DB types are stale vs local schema.
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = resolve(root, 'src/types/database.generated.ts');

if (!existsSync(outPath)) {
  console.error('Missing src/types/database.generated.ts — run node scripts/gen-db-types.mjs');
  process.exit(1);
}

const headerRe = /^\/\*\*[\s\S]*?\*\/\s*/;
const current = readFileSync(outPath, 'utf8').replace(headerRe, '').trim();

let fresh;
try {
  fresh = execSync('npx supabase gen types typescript --local', {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 20 * 1024 * 1024,
  }).trim();
} catch (err) {
  console.error('Failed to generate types for comparison');
  console.error(err.stderr || err.message);
  process.exit(1);
}

if (current !== fresh) {
  console.error('database.generated.ts is out of date. Run: node scripts/gen-db-types.mjs');
  process.exit(1);
}

console.log('database.generated.ts is up to date.');
