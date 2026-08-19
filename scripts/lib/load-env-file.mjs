/**
 * Parse KEY=VALUE env files without shell interpolation.
 * Values may contain &, %, !, ^, spaces, quotes — never logged by callers.
 */
import fs from 'node:fs';

/**
 * @param {string} filePath
 * @returns {Record<string, string>}
 */
export function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Env file not found: ${filePath}`);
  }
  /** @type {Record<string, string>} */
  const map = {};
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = rawLine.indexOf('=');
    if (idx < 1) continue;
    const key = rawLine.slice(0, idx).trim();
    let value = rawLine.slice(idx + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    map[key] = value;
  }
  return map;
}

/** @param {Record<string, string>} env */
export function redactEnvForLog(env) {
  const sensitive = new Set([
    'PASSWORD',
    'PASS',
    'SECRET',
    'TOKEN',
    'ANON_KEY',
    'SERVICE_ROLE',
    'TOTP',
  ]);
  /** @type {Record<string, string>} */
  const out = {};
  for (const [key, value] of Object.entries(env)) {
    const upper = key.toUpperCase();
    if (sensitive.has(key) || [...sensitive].some((s) => upper.includes(s))) {
      out[key] = `[redacted len=${value.length}]`;
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Test vectors for harness regression — not real credentials.
 * @type {readonly { label: string; secret: string }[]}
 */
export const METACHAR_TEST_VECTORS = [
  { label: 'ampersand', secret: 'a&b' },
  { label: 'percent', secret: '100%' },
  { label: 'bang', secret: 'x!y' },
  { label: 'caret', secret: 'a^b' },
  { label: 'space', secret: 'hello world' },
  { label: 'double-quote', secret: 'say"hi' },
  { label: 'single-quote', secret: "it's" },
  { label: 'combo', secret: 'c3LQww^JS&9Mw-[v#]@Gs' },
];
