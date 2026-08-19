import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  METACHAR_TEST_VECTORS,
  parseEnvFile,
  redactEnvForLog,
} from '../lib/load-env-file.mjs';
import { assertSecretRoundTrip, loadRoleCredentials } from '../lib/maestro-env.mjs';

test('parses shell metacharacters literally', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'maestro-env-'));
  const file = path.join(dir, 'test.env');
  const secret = 'c3LQww^JS&9Mw-[vZMZNgCWxtW#]9mWXBJSXT@Gs';
  fs.writeFileSync(file, `RC7_CUSTOMER_A_EMAIL=customer.a@example.com\nRC7_CUSTOMER_A_PASSWORD=${secret}\n`);
  const parsed = parseEnvFile(file);
  assert.equal(parsed.RC7_CUSTOMER_A_EMAIL, 'customer.a@example.com');
  assert.equal(parsed.RC7_CUSTOMER_A_PASSWORD, secret);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('redacts secrets without leaking values', () => {
  const secret = 'a&b!^%"quote';
  const redacted = redactEnvForLog({ EMAIL: 'a@b.com', PASSWORD: secret });
  assert.equal(redacted.EMAIL, 'a@b.com');
  assert.equal(redacted.PASSWORD, `[redacted len=${secret.length}]`);
  assert.ok(!JSON.stringify(redacted).includes('a&b'));
});

test('round-trips metachar vectors', () => {
  for (const vector of METACHAR_TEST_VECTORS) {
    assert.equal(assertSecretRoundTrip(vector.secret), true);
  }
});

test('loads role credentials from vault keys', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'maestro-vault-'));
  const vault = path.join(dir, 'vault.env');
  fs.writeFileSync(
    vault,
    'RC7_PARTNER_A_EMAIL=partner@example.com\nRC7_PARTNER_A_PASSWORD=p&ss!^"\n',
  );
  const creds = loadRoleCredentials(vault, {
    emailKey: 'RC7_PARTNER_A_EMAIL',
    passwordKey: 'RC7_PARTNER_A_PASSWORD',
  });
  assert.equal(creds.email, 'partner@example.com');
  assert.equal(creds.password, 'p&ss!^"');
  fs.rmSync(dir, { recursive: true, force: true });
});
