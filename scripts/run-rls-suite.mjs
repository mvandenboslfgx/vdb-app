/**
 * Run local RLS suites against supabase_db_vdb-digital-mobile-local.
 * Parses PASS/FAIL notices; exits non-zero on failures.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const DB_CONTAINER = process.env.SUPABASE_DB_CONTAINER || 'supabase_db_vdb-digital-mobile-local';

function dockerPsql(sqlFile) {
  const abs = resolve(root, sqlFile);
  if (!existsSync(abs)) throw new Error(`Missing ${abs}`);
  const sql = readFileSync(abs, 'utf8');
  const result = spawnSync(
    'docker',
    [
      'exec',
      '-i',
      DB_CONTAINER,
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=0',
    ],
    { input: sql, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
  );
  const out = `${result.stdout || ''}\n${result.stderr || ''}`;
  return { code: result.status ?? 1, out };
}

function parseSuite(out) {
  const passes = [...out.matchAll(/\bPASS\s+([a-z0-9_]+)/gi)].map((m) => m[1]);
  const fails = [...out.matchAll(/\bFAIL\s+([a-z0-9_]+)/gi)].map((m) => m[1]);
  const skips = [...out.matchAll(/\bSKIP\s+([a-z0-9_]+)/gi)].map((m) => m[1]);
  const summary = out.match(
    /RLS_SUITE_SUMMARY tests=(\d+) passed=(\d+) failed=(\d+) skipped=(\d+)/,
  );
  return {
    passes,
    fails,
    skips,
    summary: summary
      ? {
          tests: Number(summary[1]),
          passed: Number(summary[2]),
          failed: Number(summary[3]),
          skipped: Number(summary[4]),
        }
      : null,
  };
}

function main() {
  console.log(`DB container: ${DB_CONTAINER}`);

  console.log('\n=== rls_smoke.sql ===');
  const smoke = dockerPsql('supabase/tests/rls_smoke.sql');
  process.stdout.write(smoke.out);
  if (smoke.code !== 0 && /ERROR:/i.test(smoke.out)) {
    console.error('Smoke suite reported errors');
  }

  console.log('\n=== rls_multi_user.sql ===');
  const multi = dockerPsql('supabase/tests/rls_multi_user.sql');
  process.stdout.write(multi.out);

  const parsed = parseSuite(multi.out);
  const tests =
    parsed.summary?.tests ?? parsed.passes.length + parsed.fails.length + parsed.skips.length;
  const passed = parsed.summary?.passed ?? parsed.passes.length;
  const failed = parsed.summary?.failed ?? parsed.fails.length;
  const skipped = parsed.summary?.skipped ?? parsed.skips.length;

  console.log('\n=== SUMMARY ===');
  console.log(
    JSON.stringify(
      {
        tests,
        passed,
        failed,
        skipped,
        failNames: parsed.fails,
        skipNames: parsed.skips,
      },
      null,
      2,
    ),
  );

  if (failed > 0 || /RLS suite failed/i.test(multi.out)) {
    process.exit(1);
  }
  if (!parsed.summary && passed === 0) {
    console.error('No PASS lines found — suite may not have run');
    process.exit(1);
  }
}

main();
