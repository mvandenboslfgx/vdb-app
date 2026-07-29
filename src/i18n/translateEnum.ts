import type { TFunction } from 'i18next';

/**
 * Translate a backend/portal enum value into a user-facing label.
 * Normalizes casing and separators; never returns namespaced raw keys like `leadStatus.NEW`.
 */
export function normalizeEnumKey(value: string | null | undefined): string {
  if (!value) return '';
  let raw = String(value).trim();
  // Strip accidental namespaced keys: leadStatus.NEW → NEW, categories.OTHER → OTHER
  const dotted = raw.match(
    /^(?:leadStatus|categories|priorities|status|appointments\.status)\.(.+)$/i,
  );
  if (dotted?.[1]) raw = dotted[1];
  return raw
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

/** Humanize an unknown enum for safe fallback (e.g. WAITING_ON_X → Waiting on x). */
export function humanizeEnumValue(value: string): string {
  const normalized = normalizeEnumKey(value).replace(/_/g, ' ');
  if (!normalized) return '';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

type TranslateFn = TFunction | ((key: string, options?: Record<string, unknown>) => string);

/**
 * @param t - namespaced i18n `t` (already bound to partners/support/customer/…)
 * @param group - key group inside that namespace, e.g. `leadStatus`, `categories`, `appointments.status`
 * @param value - raw backend enum (NEW, OTHER, SCHEDULED, …)
 */
export function translateEnum(
  t: TranslateFn,
  group: string,
  value: string | null | undefined,
  fallback?: string,
): string {
  const key = normalizeEnumKey(value);
  if (!key) return fallback ?? '';

  const fullKey = `${group}.${key}`;
  const translated = t(fullKey, { defaultValue: '' });
  if (translated && translated !== fullKey) {
    return translated;
  }

  // Also try without nested group if callers pass dotted groups partially resolved
  const alt = t(key, { defaultValue: '' });
  if (alt && alt !== key) return alt;

  return fallback ?? humanizeEnumValue(value ?? key);
}

/** Returns true when a string looks like a leaked i18n key or raw portal enum. */
export function looksLikeRawEnumOrI18nKey(text: string): boolean {
  if (!text) return false;
  if (/^(leadStatus|categories|status|priorities|appointments\.status)\./i.test(text)) return true;
  if (
    /^(NEW|CONTACTED|QUALIFIED|CONVERTED|REJECTED|INVALID|OTHER|SCHEDULED|CONFIRMED|COMPLETED|CANCELLED|NO_SHOW)$/.test(
      text,
    )
  ) {
    return true;
  }
  return false;
}

/** Route segments that must never appear as user-facing titles. */
export const FORBIDDEN_ROUTE_TITLES = ['index', '[id]', 'payouts', 'book', 'new'] as const;

export function isForbiddenRouteTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  return (FORBIDDEN_ROUTE_TITLES as readonly string[]).includes(title.trim());
}
