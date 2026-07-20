import { z } from 'zod';

const appEnvSchema = z.enum(['development', 'preview', 'production']);

const clientEnvSchema = z.object({
  EXPO_PUBLIC_APP_ENV: appEnvSchema.default('development'),
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

function readRawEnv(): Record<string, string | undefined> {
  return {
    EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_SITE_URL: process.env.EXPO_PUBLIC_SITE_URL,
    EXPO_PUBLIC_SUPPORT_EMAIL: process.env.EXPO_PUBLIC_SUPPORT_EMAIL,
    EXPO_PUBLIC_WHATSAPP_NUMBER: process.env.EXPO_PUBLIC_WHATSAPP_NUMBER,
    EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
    EXPO_PUBLIC_EAS_PROJECT_ID: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
  };
}

function validateEnv(): ClientEnv {
  const raw = readRawEnv();
  const parsed = clientEnvSchema.safeParse(raw);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  const env = parsed.data;
  const isProduction = env.EXPO_PUBLIC_APP_ENV === 'production';
  const hasSupabase =
    Boolean(env.EXPO_PUBLIC_SUPABASE_URL) && Boolean(env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

  if (isProduction && !hasSupabase) {
    throw new Error(
      'Missing required production env: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY',
    );
  }

  return env;
}

const env = validateEnv();

export const isDevelopment = env.EXPO_PUBLIC_APP_ENV === 'development';
export const isProduction = env.EXPO_PUBLIC_APP_ENV === 'production';

export const hasSupabaseConfig = Boolean(
  env.EXPO_PUBLIC_SUPABASE_URL &&
    env.EXPO_PUBLIC_SUPABASE_ANON_KEY &&
    env.EXPO_PUBLIC_SUPABASE_URL !== PLACEHOLDER_URL,
);

export const clientEnv = {
  appEnv: env.EXPO_PUBLIC_APP_ENV,
  supabaseUrl: env.EXPO_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL,
  supabaseAnonKey: env.EXPO_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_KEY,
  siteUrl: env.EXPO_PUBLIC_SITE_URL,
  supportEmail: env.EXPO_PUBLIC_SUPPORT_EMAIL || 'info@vdbdigital.nl',
  whatsappNumber: env.EXPO_PUBLIC_WHATSAPP_NUMBER || '',
  sentryDsn: env.EXPO_PUBLIC_SENTRY_DSN || '',
  easProjectId: env.EXPO_PUBLIC_EAS_PROJECT_ID || '',
  useMockData: !hasSupabaseConfig,
} as const;

export type ResolvedClientEnv = typeof clientEnv;
