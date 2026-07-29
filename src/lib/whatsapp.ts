import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Alert } from 'react-native';

import { buildConfiguredWhatsAppUrl, getWhatsAppConfig } from '@/config/whatsapp';
import { getCurrentLanguage } from '@/i18n';

export {
  buildConfiguredWhatsAppUrl,
  getWhatsAppConfig,
  getWhatsAppMessageForLocale,
  isValidWhatsAppNumber,
  WHATSAPP_CANONICAL_NUMBER,
  WHATSAPP_MESSAGE_EN,
  WHATSAPP_MESSAGE_NL,
} from '@/config/whatsapp';

/**
 * @deprecated Prefer buildConfiguredWhatsAppUrl — kept for callers that pass an explicit number.
 * Digits-only; strips non-digits. Returns null when empty/invalid.
 */
export function buildWhatsAppUrl(
  number?: string | null,
  contextMessage?: string | null,
): string | null {
  const raw = (number?.trim() || getWhatsAppConfig().number || '').replace(/[^\d]/g, '');
  if (!raw || raw.length < 8) {
    return null;
  }

  const base = `https://wa.me/${raw}`;
  const text = contextMessage?.trim();
  if (!text) {
    return base;
  }
  return `${base}?text=${encodeURIComponent(text)}`;
}

export type OpenWhatsAppResult =
  { ok: true; method: 'linking' | 'browser' } | { ok: false; reason: 'disabled' | 'open_failed' };

/**
 * Opens the configured WhatsApp chat. Tries native Linking first, then in-app browser.
 * Never embeds PII — uses central templates only.
 */
export async function openConfiguredWhatsApp(options?: {
  locale?: string | null;
  onUnavailable?: (reason: 'disabled' | 'open_failed') => void;
}): Promise<OpenWhatsAppResult> {
  const locale = options?.locale ?? getCurrentLanguage();
  const url = buildConfiguredWhatsAppUrl(locale);
  if (!url) {
    options?.onUnavailable?.('disabled');
    return { ok: false, reason: 'disabled' };
  }

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return { ok: true, method: 'linking' };
    }
  } catch {
    // fall through to browser
  }

  try {
    await WebBrowser.openBrowserAsync(url);
    return { ok: true, method: 'browser' };
  } catch {
    options?.onUnavailable?.('open_failed');
    return { ok: false, reason: 'open_failed' };
  }
}

/** Show a localized Alert when WhatsApp cannot be opened. */
export function alertWhatsAppUnavailable(
  reason: 'disabled' | 'open_failed',
  copy: { disabledTitle: string; disabledBody: string; failedTitle: string; failedBody: string },
): void {
  if (reason === 'disabled') {
    Alert.alert(copy.disabledTitle, copy.disabledBody);
    return;
  }
  Alert.alert(copy.failedTitle, copy.failedBody);
}
