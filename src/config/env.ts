import { z } from 'zod';

const appEnvSchema = z.enum(['development', 'preview', 'production', 'test']);

const boolFromEnv = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((value) => {
    if (typeof value === 'boolean') return value;
    if (value == null || value === '') return false;
    return value === 'true' || value === '1';
  });

const clientEnvSchema = z.object({
  EXPO_PUBLIC_APP_ENV: appEnvSchema.default('development'),
  EXPO_PUBLIC_ENABLE_DEMO_MODE: boolFromEnv,
  EXPO_PUBLIC_SUPABASE_URL: z.string().url().optional().or(z.literal('')),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().or(z.literal('')),
  EXPO_PUBLIC_SITE_URL: z.string().url().default('https://vdbdigital.nl'),
  EXPO_PUBLIC_SUPPORT_EMAIL: z.string().email().optional().or(z.literal('')),
  EXPO_PUBLIC_WHATSAPP_NUMBER: z.string().optional().or(z.literal('')),
  EXPO_PUBLIC_SENTRY_DSN: z.string().optional().or(z.literal('')),
  EXPO_PUBLIC_EAS_PROJECT_ID: z.string().optional().or(z.literal('')),
});

export type AppEnv = z.infer<typeof appEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

/** Canonical Supabase project refs — cross-env leakage is a hard configuration error. */
export const SUPABASE_PROJECT_REFS = {
  production: 'nhsrdnjfsxfikfbdmdfj',
  preview: 'qzekuvmgfekzsowdecyk',
} as const;

const PLACEHOLDER_URL = 'https://placeholder.supabase.local';
const PLACEHOLDER_KEY = 'public-anon-key-placeholder';

export class ConfigurationError extends Error {
  readonly code = 'CONFIGURATION_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

function readRawEnv(): Record<string, string | undefined> {
  return {
    EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
    EXPO_PUBLIC_ENABLE_DEMO_MODE: process.env.EXPO_PUBLIC_ENABLE_DEMO_MODE,
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_SITE_URL: process.env.EXPO_PUBLIC_SITE_URL,
    EXPO_PUBLIC_SUPPORT_EMAIL: process.env.EXPO_PUBLIC_SUPPORT_EMAIL,
    EXPO_PUBLIC_WHATSAPP_NUMBER: process.env.EXPO_PUBLIC_WHATSAPP_NUMBER,
    EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
    EXPO_PUBLIC_EAS_PROJECT_ID: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
  };
}

/**
 * Demo mode is ONLY allowed when BOTH:
 * - EXPO_PUBLIC_APP_ENV === 'development' (or 'test' for unit tests)
 * - EXPO_PUBLIC_ENABLE_DEMO_MODE === true
 *
 * Preview/production MUST hard-fail if demo is requested.
 * Missing Supabase in preview/production is a configuration error — never silent demo fallback.
 */
export function resolveDemoMode(input: {
  appEnv: AppEnv;
  enableDemoMode: boolean;
  hasSupabaseConfig: boolean;
}): { demoAllowed: boolean; useMockData: boolean } {
  const wantsDemo = input.enableDemoMode === true;
  const envAllowsDemo = input.appEnv === 'development' || input.appEnv === 'test';

  if (wantsDemo && !envAllowsDemo) {
    throw new ConfigurationError(
      `Demo mode is forbidden in APP_ENV=${input.appEnv}. Set EXPO_PUBLIC_ENABLE_DEMO_MODE=false.`,
    );
  }

  if (!input.hasSupabaseConfig && !envAllowsDemo) {
    throw new ConfigurationError(
      `Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY for APP_ENV=${input.appEnv}. Demo fallback is disabled.`,
    );
  }

  const demoAllowed = wantsDemo && envAllowsDemo;
  // Demo mode is an explicit developer choice — once allowed it always wins,
  // even if Supabase happens to be configured. The inverse (missing Supabase
  // without an explicit demo flag) must NEVER silently resolve to mock data;
  // callers (`getRepositoryAdapter` / `requireLiveSupabase`) are responsible
  // for throwing a ConfigurationError in that case instead.
  const useMockData = demoAllowed;

  return { demoAllowed, useMockData };
}

function validateEnv(): ClientEnv & {
  hasSupabaseConfig: boolean;
  demoAllowed: boolean;
  useMockData: boolean;
} {
  const raw = readRawEnv();
  const parsed = clientEnvSchema.safeParse(raw);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new ConfigurationError(`Invalid environment configuration: ${details}`);
  }

  const env = parsed.data;
  const hasSupabase = Boolean(
    env.EXPO_PUBLIC_SUPABASE_URL &&
    env.EXPO_PUBLIC_SUPABASE_ANON_KEY &&
    env.EXPO_PUBLIC_SUPABASE_URL !== PLACEHOLDER_URL,
  );

  const { demoAllowed, useMockData } = resolveDemoMode({
    appEnv: env.EXPO_PUBLIC_APP_ENV,
    enableDemoMode: Boolean(env.EXPO_PUBLIC_ENABLE_DEMO_MODE),
    hasSupabaseConfig: hasSupabase,
  });

  const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL || '';
  if (
    (env.EXPO_PUBLIC_APP_ENV === 'preview' || env.EXPO_PUBLIC_APP_ENV === 'production') &&
    hasSupabase &&
    isLocalhostUrl(supabaseUrl)
  ) {
    throw new ConfigurationError(
      `EXPO_PUBLIC_SUPABASE_URL must not use localhost/127.0.0.1 when APP_ENV=${env.EXPO_PUBLIC_APP_ENV}. Use the shared staging/production HTTPS URL.`,
    );
  }

  if (
    (env.EXPO_PUBLIC_APP_ENV === 'preview' || env.EXPO_PUBLIC_APP_ENV === 'production') &&
    hasSupabase
  ) {
    assertSupabaseProjectRefForAppEnv(env.EXPO_PUBLIC_APP_ENV, supabaseUrl);
  }

  return {
    ...env,
    hasSupabaseConfig: hasSupabase,
    demoAllowed,
    useMockData,
  };
}

function isLocalhostUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0';
  } catch {
    return /localhost|127\.0\.0\.1/i.test(url);
  }
}

/** Extract Supabase project ref from a project URL hostname (`<ref>.supabase.co`). */
export function extractSupabaseProjectRef(url: string): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (!host.endsWith('.supabase.co') && !host.endsWith('.supabase.in')) {
      return host.split('.')[0] || null;
    }
    return host.split('.')[0] || null;
  } catch {
    return null;
  }
}

/**
 * Preview may only use staging ref; production may only use production ref.
 * Unknown / missing / cross-env refs fail closed.
 */
export function assertSupabaseProjectRefForAppEnv(appEnv: AppEnv, supabaseUrl: string): void {
  if (appEnv !== 'preview' && appEnv !== 'production') {
    return;
  }
  if (!supabaseUrl || supabaseUrl === PLACEHOLDER_URL) {
    throw new ConfigurationError(
      `Missing EXPO_PUBLIC_SUPABASE_URL for APP_ENV=${appEnv}. Demo fallback is disabled.`,
    );
  }
  if (isLocalhostUrl(supabaseUrl)) {
    throw new ConfigurationError(
      `EXPO_PUBLIC_SUPABASE_URL must not use localhost/127.0.0.1 when APP_ENV=${appEnv}.`,
    );
  }
  const ref = extractSupabaseProjectRef(supabaseUrl);
  if (!ref) {
    throw new ConfigurationError(
      `Unable to parse Supabase project ref from EXPO_PUBLIC_SUPABASE_URL for APP_ENV=${appEnv}.`,
    );
  }
  if (appEnv === 'production') {
    if (ref !== SUPABASE_PROJECT_REFS.production) {
      throw new ConfigurationError(
        `Production APP_ENV rejects project ref "${ref}". Expected "${SUPABASE_PROJECT_REFS.production}".`,
      );
    }
    return;
  }
  // preview
  if (ref === SUPABASE_PROJECT_REFS.production) {
    throw new ConfigurationError(
      `Preview APP_ENV rejects production project ref "${SUPABASE_PROJECT_REFS.production}".`,
    );
  }
  if (ref !== SUPABASE_PROJECT_REFS.preview) {
    throw new ConfigurationError(
      `Preview APP_ENV rejects project ref "${ref}". Expected "${SUPABASE_PROJECT_REFS.preview}".`,
    );
  }
}

const env = validateEnv();

export const isDevelopment = env.EXPO_PUBLIC_APP_ENV === 'development';
export const isProduction = env.EXPO_PUBLIC_APP_ENV === 'production';
export const isPreview = env.EXPO_PUBLIC_APP_ENV === 'preview';
export const hasSupabaseConfig = env.hasSupabaseConfig;

export const clientEnv = {
  appEnv: env.EXPO_PUBLIC_APP_ENV,
  enableDemoMode: Boolean(env.EXPO_PUBLIC_ENABLE_DEMO_MODE),
  demoAllowed: env.demoAllowed,
  supabaseUrl: env.EXPO_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL,
  supabaseAnonKey: env.EXPO_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_KEY,
  siteUrl: env.EXPO_PUBLIC_SITE_URL,
  supportEmail: env.EXPO_PUBLIC_SUPPORT_EMAIL || 'info@vdbdigital.nl',
  // Empty env falls through to canonical default in src/config/whatsapp.ts
  whatsappNumber: env.EXPO_PUBLIC_WHATSAPP_NUMBER || '',
  sentryDsn: env.EXPO_PUBLIC_SENTRY_DSN || '',
  easProjectId: env.EXPO_PUBLIC_EAS_PROJECT_ID || '',
  useMockData: env.useMockData,
  hasSupabaseConfig,
} as const;

export type ResolvedClientEnv = typeof clientEnv;

/** Pure helper exported for unit tests without re-reading process.env. */
export const __testables = {
  resolveDemoMode,
  PLACEHOLDER_URL,
  isLocalhostUrl,
  extractSupabaseProjectRef,
  assertSupabaseProjectRefForAppEnv,
  SUPABASE_PROJECT_REFS,
};
