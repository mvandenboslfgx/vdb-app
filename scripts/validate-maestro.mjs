/**
 * Validate Maestro YAML flow files (syntax / structure).
 * Does NOT execute on device — device execution is separate.
 * Denominator = auto-discovered executable flows (see maestro-suite-manifest.mjs).
 */
import fs from 'node:fs';
import path from 'node:path';

import { getSuiteManifest, writeSuiteManifestMarkdown } from './maestro-suite-manifest.mjs';

const manifest = getSuiteManifest();
writeSuiteManifestMarkdown(path.resolve('docs', 'maestro-suite-manifest.md'));

const ROOT = manifest.root;
let failed = 0;
let passed = 0;

for (const name of manifest.flows) {
  const file = path.join(ROOT, name);
  if (!fs.existsSync(file)) {
    console.error(`FAIL missing ${name}`);
    failed += 1;
    continue;
  }
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes('appId:')) {
    console.error(`FAIL ${name}: missing appId`);
    failed += 1;
    continue;
  }
  if (!/launchApp|assertVisible|tapOn|inputText/.test(text)) {
    console.error(`FAIL ${name}: no actionable steps`);
    failed += 1;
    continue;
  }
  if (/^\s*-\s*#/.test(text)) {
    console.error(`FAIL ${name}: list-item comment (- #) is invalid YAML`);
    failed += 1;
    continue;
  }
  console.log(`PASS syntax ${name}`);
  passed += 1;
}

console.log(
  `\nMAESTRO_SYNTAX_SUMMARY tests=${manifest.count} passed=${passed} failed=${failed} label=${manifest.expectedScoreLabel}`,
);
if (failed > 0) process.exitCode = 1;
