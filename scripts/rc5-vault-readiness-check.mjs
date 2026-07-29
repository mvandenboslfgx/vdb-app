/**
 * RC5 staging APK readiness — vault safety checks (no secrets printed).
 * Confirms MFA operator vault + suspended fixture vault have the expected
 * non-secret metadata fields without ever logging passwords/emails/TOTP.
 * Reads from local vault paths; never commits vault files.
 */
import fs from 'node:fs';

function loadEnv(filePath) {
  const map = {};
  if (!fs.existsSync(filePath)) return null;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx < 1) continue;
    let v = line.slice(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    map[line.slice(0, idx).trim()] = v;
  }
  return map;
}

const MFA_VAULT = 'C:/Users/XXX/.vdb-vault/owner-staging-mfa-operator-rc5.env';
const SUS_VAULT = 'C:/Users/XXX/.vdb-vault/partner-staging-suspended-rc5.env';
const STAGING_REF = 'qzekuvmgfekzsowdecyk';
const EXPECTED_FINGERPRINT_MFA = '0b8bcb2be814';
const EXPECTED_FINGERPRINT_SUS = '099764f54e18';
const EXPECTED_FACTOR_PREFIX = '51ee4626';

const mfa = loadEnv(MFA_VAULT);
const sus = loadEnv(SUS_VAULT);

const results = {};

if (!mfa) {
  results.mfa_vault_exists = false;
} else {
  results.mfa_vault_exists = true;
  results.mfa_staging_ref_matches = mfa.VDB_STAGING_PROJECT_REF === STAGING_REF;
  results.mfa_role_is_admin = mfa.VDB_STAGING_OPERATOR_ROLE === 'ADMIN';
  results.mfa_aal_target_is_aal2 = mfa.VDB_STAGING_OPERATOR_AAL_TARGET === 'aal2';
  results.mfa_fingerprint_matches =
    (mfa.VDB_STAGING_OPERATOR_FINGERPRINT || '').trim() === EXPECTED_FINGERPRINT_MFA;
  results.mfa_factor_id_prefix_matches =
    (mfa.VDB_STAGING_OPERATOR_FACTOR_ID_PREFIX || '').trim() === EXPECTED_FACTOR_PREFIX;
  results.mfa_factor_id_starts_with_prefix = (mfa.VDB_STAGING_OPERATOR_FACTOR_ID || '').startsWith(
    mfa.VDB_STAGING_OPERATOR_FACTOR_ID_PREFIX || '__NO_PREFIX__',
  );
  results.mfa_has_email = Boolean(
    mfa.VDB_STAGING_OPERATOR_EMAIL || mfa.OPERATOR_EMAIL || mfa.EMAIL,
  );
  results.mfa_has_password = Boolean(
    mfa.VDB_STAGING_OPERATOR_PASSWORD || mfa.OPERATOR_PASSWORD || mfa.PASSWORD,
  );
  // Production ref must not appear in staging vault
  results.mfa_no_production_ref = !JSON.stringify(mfa).includes('nhsrdnjfsxfikfbdmdfj');
}

if (!sus) {
  results.sus_vault_exists = false;
} else {
  results.sus_vault_exists = true;
  results.sus_staging_ref_matches =
    (sus.VDB_STAGING_PROJECT_REF || '').includes(STAGING_REF) ||
    (sus.VDB_STAGING_SUPABASE_URL || '').includes(STAGING_REF);
  results.sus_fixture_kind_matches =
    (sus.VDB_STAGING_SUSPENDED_FIXTURE_KIND || '').trim() === 'SUSPENDED_PARTNER_RC5';
  results.sus_fingerprint_matches =
    (sus.VDB_STAGING_SUSPENDED_FINGERPRINT || '').trim() === EXPECTED_FINGERPRINT_SUS;
  results.sus_no_production_ref = !JSON.stringify(sus).includes('nhsrdnjfsxfikfbdmdfj');
}

const allPass = Object.values(results).every(Boolean);
console.log(JSON.stringify({ checks: results, allPass }, null, 2));
process.exit(allPass ? 0 : 1);
