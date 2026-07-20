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
  // Never fall back to demo merely because Supabase is unreachable / unset in non-dev.
  const useMockData = demoAllowed && !input.hasSupabaseConfig;

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

  return {
    ...env,
    hasSupabaseConfig: hasSupabase,
    demoAllowed,
    useMockData,
  };
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
};
