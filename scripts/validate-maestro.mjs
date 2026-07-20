/**
 * Validate Maestro YAML flow files (syntax / structure).
 * Does NOT execute on device — device execution remains BLOCKED without adb.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('maestro');
const REQUIRED = [
  '01-customer-auth.yaml',
  '02-project-request.yaml',
  '03-project-chat.yaml',
  '04-support-ticket.yaml',
  '05-document-review.yaml',
  '06-quote-acceptance.yaml',
  '07-test-checkout.yaml',
  '08-partner-application.yaml',
  '09-admin-partner-approval.yaml',
  '10-partner-lead.yaml',
  '11-commission-payout.yaml',
  '12-account-deletion.yaml',
];

let failed = 0;
let passed = 0;
let skipped = 0;

for (const name of REQUIRED) {
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
  if (!text.trim().startsWith('appId:') && !/^---/m.test(text)) {
    // allow frontmatter-less but require appId somewhere
  }
  if (!/launchApp|assertVisible|tapOn|inputText/.test(text)) {
    console.error(`FAIL ${name}: no actionable steps`);
    failed += 1;
    continue;
  }
  if (/BLOCKED|device execution/.test(text) && !/testID|id:/.test(text)) {
    console.warn(`WARN ${name}: marked blocked without testIDs`);
  }
  console.log(`PASS syntax ${name}`);
  passed += 1;
}

console.log(
  `\nMAESTRO_SYNTAX_SUMMARY tests=${REQUIRED.length} passed=${passed} failed=${failed} skipped=${skipped}`,
);
console.log('DEVICE_EXECUTION: BLOCKED (no claim — requires Android device + adb)');
if (failed > 0) process.exitCode = 1;
