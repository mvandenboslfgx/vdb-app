#!/usr/bin/env node
/**
 * Lightweight secret scan for CI. Exits 1 if high-risk patterns appear outside allowlists.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT =
  path.dirname(fileURLToPath(new URL('.', import.meta.url))) === path.join(process.cwd(), 'scripts')
    ? process.cwd()
    : process.cwd();

const SKIP_DIRS = new Set(['node_modules', '.git', '.expo', 'dist', 'coverage', 'android', 'ios']);

const PATTERNS = [
  { name: 'supabase_service_role', re: /SERVICE_ROLE_KEY\s*[:=]\s*['"]eyJ/i },
  { name: 'mollie_live_key', re: /live_[A-Za-z0-9]{20,}/ },
  { name: 'private_key_block', re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'aws_access_key', re: /AKIA[0-9A-Z]{16}/ },
];

const ALLOW = [/\.env\.example$/, /^docs\//, /scripts\/secret-scan\.mjs$/, /^maestro\//];

let findings = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!/\.(ts|tsx|js|jsx|mjs|cjs|json|md|yml|yaml|env|toml)$/i.test(entry.name)) continue;
    const rel = path.relative(ROOT, full).replace(/\\/g, '/');
    if (ALLOW.some((re) => re.test(rel))) continue;
    const text = fs.readFileSync(full, 'utf8');
    for (const pattern of PATTERNS) {
      if (pattern.re.test(text)) {
        console.error(`[secret-scan] ${pattern.name} in ${rel}`);
        findings += 1;
      }
    }
  }
}

walk(ROOT);
if (findings > 0) {
  console.error(`secret-scan failed with ${findings} finding(s)`);
  process.exit(1);
}
console.log('secret-scan: no high-risk patterns found');
