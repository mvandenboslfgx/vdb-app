import {
  ConfigurationError,
  SUPABASE_PROJECT_REFS,
  assertSupabaseProjectRefForAppEnv,
  extractSupabaseProjectRef,
} from '@/config/env';

describe('Supabase project ref environment guards', () => {
  const prodUrl = `https://${SUPABASE_PROJECT_REFS.production}.supabase.co`;
  const stagingUrl = `https://${SUPABASE_PROJECT_REFS.preview}.supabase.co`;
  const unknownUrl = 'https://aaaaaaaaaaaaaaaaaaaa.supabase.co';

  it('extracts project ref from supabase hostname', () => {
    expect(extractSupabaseProjectRef(prodUrl)).toBe(SUPABASE_PROJECT_REFS.production);
    expect(extractSupabaseProjectRef(stagingUrl)).toBe(SUPABASE_PROJECT_REFS.preview);
  });

  it('production accepts only the production project ref', () => {
    expect(() => assertSupabaseProjectRefForAppEnv('production', prodUrl)).not.toThrow();
  });

  it('production rejects staging ref', () => {
    expect(() => assertSupabaseProjectRefForAppEnv('production', stagingUrl)).toThrow(
      ConfigurationError,
    );
  });

  it('production rejects unknown ref', () => {
    expect(() => assertSupabaseProjectRefForAppEnv('production', unknownUrl)).toThrow(
      /rejects project ref/,
    );
  });

  it('production rejects missing url', () => {
    expect(() => assertSupabaseProjectRefForAppEnv('production', '')).toThrow(ConfigurationError);
  });

  it('preview accepts only the staging project ref', () => {
    expect(() => assertSupabaseProjectRefForAppEnv('preview', stagingUrl)).not.toThrow();
  });

  it('preview hard-rejects production ref', () => {
    expect(() => assertSupabaseProjectRefForAppEnv('preview', prodUrl)).toThrow(
      /rejects production project ref/,
    );
  });

  it('preview rejects unknown ref', () => {
    expect(() => assertSupabaseProjectRefForAppEnv('preview', unknownUrl)).toThrow(
      ConfigurationError,
    );
  });

  it('development does not enforce project ref allowlist', () => {
    expect(() => assertSupabaseProjectRefForAppEnv('development', unknownUrl)).not.toThrow();
    expect(() => assertSupabaseProjectRefForAppEnv('test', prodUrl)).not.toThrow();
  });
});
