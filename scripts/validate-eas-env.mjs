/**
 * Local preflight for EAS preview/production env — NO remote build.
 *
 * Usage:
 *   node scripts/validate-eas-env.mjs
 *   node scripts/validate-eas-env.mjs --env=preview
 *
 * Fails when:
 * - APP_ENV is preview/production and URL is localhost / 127.0.0.1
 * - demo mode is enabled outside development/test
 * - required public vars missing for non-development profiles (when provided via env)
 * - production candidate URL is not nhsrdnjfsxfikfbdmdfj
 * - preview candidate URL is not kjricvicakvsreuytvra (or is production)
 *
 * Does not read secrets from EAS cloud. Safe for CI / local gates.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
  '..',
);
const easPath = path.join(root, 'eas.json');
const eas = JSON.parse(fs.readFileSync(easPath, 'utf8'));

const PRODUCTION_REF = 'nhsrdnjfsxfikfbdmdfj';
const PREVIEW_REF = 'kjricvicakvsreuytvra';
const LEGACY_STAGING_REF = 'qzekuvmgfekzsowdecyk';

const profileArg = process.argv.find((a) => a.startsWith('--env='));
const profileName = profileArg ? profileArg.slice('--env='.length) : '';

function isLocalhost(url) {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0';
  } catch {
    return /localhost|127\.0\.0\.1/i.test(url);
  }
}

function projectRefFromUrl(url) {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase().split('.')[0] || null;
  } catch {
    return null;
  }
}

function checkProfile(name, profile) {
  const errors = [];
  const env = profile.env ?? {};
  const appEnv = env.EXPO_PUBLIC_APP_ENV ?? '';
  const demo = String(env.EXPO_PUBLIC_ENABLE_DEMO_MODE ?? 'false').toLowerCase();

  if (!['development', 'preview', 'production'].includes(appEnv)) {
    errors.push(`${name}: EXPO_PUBLIC_APP_ENV missing or invalid (${appEnv || 'empty'})`);
  }

  if (appEnv === 'preview' || appEnv === 'production') {
    if (demo === 'true' || demo === '1') {
      errors.push(`${name}: EXPO_PUBLIC_ENABLE_DEMO_MODE must be false`);
    }
    if (profile.developmentClient === true) {
      errors.push(`${name}: developmentClient must be false for standalone preview/production`);
    }
  }

  if (
    (name === 'production' || name === 'production-apk') &&
    profile.environment !== 'production'
  ) {
    errors.push(`${name}: eas profile.environment must be "production"`);
  }
  if (name === 'preview' && profile.environment && profile.environment !== 'preview') {
    errors.push(`${name}: eas profile.environment must be "preview"`);
  }

  const candidateUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    process.env[`EAS_${name.toUpperCase().replace(/-/g, '_')}_SUPABASE_URL`] ||
    '';
  if ((appEnv === 'preview' || appEnv === 'production') && candidateUrl) {
    if (isLocalhost(candidateUrl)) {
      errors.push(`${name}: candidate EXPO_PUBLIC_SUPABASE_URL must not be localhost`);
    }
    const ref = projectRefFromUrl(candidateUrl);
    if (appEnv === 'production' && ref !== PRODUCTION_REF) {
      errors.push(
        `${name}: production candidate URL ref must be ${PRODUCTION_REF} (got ${ref || 'unparsed'})`,
      );
    }
    if (appEnv === 'preview') {
      if (ref === PRODUCTION_REF) {
        errors.push(`${name}: preview candidate URL must not use production ref ${PRODUCTION_REF}`);
      } else if (ref === LEGACY_STAGING_REF) {
        errors.push(
          `${name}: preview candidate URL must not use legacy staging ref ${LEGACY_STAGING_REF}`,
        );
      } else if (ref !== PREVIEW_REF) {
        errors.push(
          `${name}: preview candidate URL ref must be ${PREVIEW_REF} (got ${ref || 'unparsed'})`,
        );
      }
    }
  }

  return errors;
}

const profiles = profileName ? { [profileName]: eas.build?.[profileName] } : (eas.build ?? {});

const allErrors = [];
for (const [name, profile] of Object.entries(profiles)) {
  if (!profile) {
    allErrors.push(`Unknown EAS profile: ${name}`);
    continue;
  }
  allErrors.push(...checkProfile(name, profile));
}

if (!eas.build?.preview) {
  allErrors.push('eas.json missing preview profile');
}
if (!eas.build?.production) {
  allErrors.push('eas.json missing production profile');
}
if (!eas.build?.['production-apk']) {
  allErrors.push('eas.json missing production-apk profile (internal installable APK)');
}
if (eas.build?.preview && eas.build.preview.developmentClient !== false) {
  allErrors.push('preview.developmentClient must be explicitly false');
}
if (eas.build?.production && eas.build.production.developmentClient !== false) {
  allErrors.push('production.developmentClient must be explicitly false');
}

if (allErrors.length) {
  console.error('EAS_ENV_VALIDATION_FAILED');
  for (const e of allErrors) console.error(` - ${e}`);
  process.exit(1);
}

console.log('EAS_ENV_VALIDATION_OK profiles=', Object.keys(profiles).join(','));
console.log(
  'NOTE: Supabase URL/anon must be injected via EAS Secrets at build time — never commit secrets.',
);
console.log(`PIN production_ref=${PRODUCTION_REF} preview_ref=${PREVIEW_REF}`);
