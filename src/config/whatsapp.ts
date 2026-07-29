/**
 * Central WhatsApp contact configuration for Mobile.
 * Single source of truth — do not hardcode number/templates in screens.
 *
 * Number may be overridden by EXPO_PUBLIC_WHATSAPP_NUMBER (digits only).
 * Canonical default is the Owner-approved NL mobile: 31628600727.
 */

import { clientEnv } from '@/config/env';
import { getCurrentLanguage } from '@/i18n';

/** Owner-approved digits-only E.164 without plus: NL 06 28 60 07 27 → 31628600727 */
export const WHATSAPP_CANONICAL_NUMBER = '31628600727';

export const WHATSAPP_MESSAGE_NL = 'Hallo VDB Digital, ik heb een vraag via de VDB Digital-app.';

export const WHATSAPP_MESSAGE_EN = 'Hello VDB Digital, I have a question via the VDB Digital app.';

const DIGITS_ONLY = /^\d{8,15}$/;

export type WhatsAppConfig = {
  number: string;
  enabled: boolean;
  messageNl: string;
  messageEn: string;
};

/** Resolve active WhatsApp config. Empty/invalid override disables the feature. */
export function getWhatsAppConfig(): WhatsAppConfig {
  const fromEnv = (clientEnv.whatsappNumber || '').replace(/[^\d]/g, '');
  const number = fromEnv || WHATSAPP_CANONICAL_NUMBER;
  const enabled = DIGITS_ONLY.test(number);
  return {
    number: enabled ? number : '',
    enabled,
    messageNl: WHATSAPP_MESSAGE_NL,
    messageEn: WHATSAPP_MESSAGE_EN,
  };
}

export function getWhatsAppMessageForLocale(locale?: string | null): string {
  const lang = (locale ?? getCurrentLanguage() ?? 'nl').toLowerCase();
  return lang.startsWith('en') ? WHATSAPP_MESSAGE_EN : WHATSAPP_MESSAGE_NL;
}

/**
 * Build wa.me URL. Never appends PII — only the approved template text.
 * Returns null when disabled / invalid.
 */
export function buildConfiguredWhatsAppUrl(locale?: string | null): string | null {
  const config = getWhatsAppConfig();
  if (!config.enabled || !config.number) return null;
  const text = getWhatsAppMessageForLocale(locale);
  return `https://wa.me/${config.number}?text=${encodeURIComponent(text)}`;
}

export function isValidWhatsAppNumber(raw: string | null | undefined): boolean {
  const digits = (raw ?? '').replace(/[^\d]/g, '');
  return DIGITS_ONLY.test(digits);
}
