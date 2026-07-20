#!/usr/bin/env node
/**
 * Compare nl/en translation keys recursively. Exit 1 when keys diverge.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesRoot = join(__dirname, '..', 'src', 'i18n', 'locales');
const langs = ['nl', 'en'];

/** @param {unknown} value @param {string} prefix @returns {string[]} */
function flattenKeys(value, prefix = '') {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }
  /** @type {string[]} */
  const keys = [];
  for (const [key, child] of Object.entries(value)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (child !== null && typeof child === 'object' && !Array.isArray(child)) {
      keys.push(...flattenKeys(child, next));
    } else {
      keys.push(next);
    }
  }
  return keys;
}

function loadNamespace(lang, file) {
  const raw = readFileSync(join(localesRoot, lang, file), 'utf8');
  return JSON.parse(raw);
}

const nlFiles = readdirSync(join(localesRoot, 'nl')).filter((f) => f.endsWith('.json')).sort();
const enFiles = readdirSync(join(localesRoot, 'en')).filter((f) => f.endsWith('.json')).sort();

let failed = false;

const onlyNl = nlFiles.filter((f) => !enFiles.includes(f));
const onlyEn = enFiles.filter((f) => !nlFiles.includes(f));

if (onlyNl.length) {
  console.error('Missing EN namespace files:', onlyNl.join(', '));
  failed = true;
}
if (onlyEn.length) {
  console.error('Missing NL namespace files:', onlyEn.join(', '));
  failed = true;
}

for (const file of nlFiles.filter((f) => enFiles.includes(f))) {
  const nlKeys = new Set(flattenKeys(loadNamespace('nl', file)));
  const enKeys = new Set(flattenKeys(loadNamespace('en', file)));

  const missingInEn = [...nlKeys].filter((k) => !enKeys.has(k)).sort();
  const missingInNl = [...enKeys].filter((k) => !nlKeys.has(k)).sort();

  if (missingInEn.length || missingInNl.length) {
    failed = true;
    console.error(`\n[${file}]`);
    if (missingInEn.length) {
      console.error('  Missing in en:', missingInEn.join(', '));
    }
    if (missingInNl.length) {
      console.error('  Missing in nl:', missingInNl.join(', '));
    }
  }
}

if (failed) {
  console.error('\nTranslation key check failed.');
  process.exit(1);
}

console.log(`Translation keys match for ${langs.join(' / ')} (${nlFiles.length} namespaces).`);
process.exit(0);
