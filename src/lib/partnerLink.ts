import { clientEnv } from '@/config/env';

export type PartnerLinkBuildResult =
  | { ok: true; url: string; code: string }
  | { ok: false; reason: 'missing_code' | 'missing_base_url' | 'invalid_url' };

/**
 * Canonical partner referral URL: `{EXPO_PUBLIC_SITE_URL}/r/{CODE}`.
 * Matches existing mock/docs pattern. Does not invent alternate routes.
 */
export function buildPartnerReferralUrl(
  code: string | null | undefined,
  siteUrl: string = clientEnv.siteUrl,
): PartnerLinkBuildResult {
  const trimmedCode = String(code ?? '').trim();
  if (!trimmedCode) return { ok: false, reason: 'missing_code' };

  const base = String(siteUrl ?? '')
    .trim()
    .replace(/\/+$/, '');
  if (!base) return { ok: false, reason: 'missing_base_url' };

  let url: string;
  try {
    url = new URL(`/r/${encodeURIComponent(trimmedCode)}`, `${base}/`).toString();
  } catch {
    return { ok: false, reason: 'invalid_url' };
  }

  if (!/^https:\/\//i.test(url)) {
    return { ok: false, reason: 'invalid_url' };
  }

  return { ok: true, url, code: trimmedCode };
}

export function isValidPartnerLinkUrl(url: string | null | undefined): boolean {
  if (!url || !String(url).trim()) return false;
  try {
    const parsed = new URL(String(url).trim());
    return parsed.protocol === 'https:' && parsed.pathname.length > 1;
  } catch {
    return false;
  }
}
