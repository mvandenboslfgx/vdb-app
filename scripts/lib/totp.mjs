/**
 * RFC 6238 TOTP (SHA-1, 30s) — process-local only; never log secrets or codes.
 */
import crypto from 'node:crypto';
import { parseEnvFile } from './load-env-file.mjs';

/**
 * @param {string} secretBase32
 */
export function decodeBase32(secretBase32) {
  const cleaned = secretBase32.replace(/=+$/g, '').replace(/\s+/g, '').toUpperCase();
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const char of cleaned) {
    const val = alphabet.indexOf(char);
    if (val === -1) throw new Error('invalid_base32');
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

/**
 * @param {string} secretBase32
 * @param {number} [nowMs]
 */
export function generateTotpCode(secretBase32, nowMs = Date.now()) {
  const key = decodeBase32(secretBase32);
  const counter = Math.floor(nowMs / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, '0');
}

/**
 * @param {number} ms
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Prefer a code from the middle of the 30s window; wait if near rollover.
 * @param {string} secretBase32
 * @param {{ maxAttempts?: number }} [opts]
 */
export async function freshTotpCode(secretBase32, opts = {}) {
  const maxAttempts = opts.maxAttempts ?? 2;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const now = Date.now();
    const secInWindow = Math.floor(now / 1000) % 30;
    if (secInWindow >= 28 && attempt + 1 < maxAttempts) {
      await sleep((30 - secInWindow) * 1000 + 500);
      continue;
    }
    return generateTotpCode(secretBase32, Date.now());
  }
  return generateTotpCode(secretBase32, Date.now());
}

/**
 * @param {string} mfaVaultPath
 */
export function loadMfaVault(mfaVaultPath) {
  const map = parseEnvFile(mfaVaultPath);
  const secret = map.RC7_MFA_TOTP_SECRET;
  const factorPrefix = map.RC7_MFA_FACTOR_ID_PREFIX ?? map.RC7_MFA_FACTOR_ID?.slice(0, 8);
  const email = map.RC7_MFA_OPERATOR_EMAIL;
  if (!secret || !email) {
    throw new Error('missing MFA vault fields');
  }
  return { secret, factorPrefix, email, factorId: map.RC7_MFA_FACTOR_ID };
}
