import { clientEnv } from '@/config/env';

/**
 * Build a wa.me deep link. Digits-only number; strips leading +.
 * Falls back to EXPO_PUBLIC_WHATSAPP_NUMBER when `number` is empty.
 */
export function buildWhatsAppUrl(
  number?: string | null,
  contextMessage?: string | null,
): string | null {
  const raw = (number?.trim() || clientEnv.whatsappNumber || '').replace(/[^\d]/g, '');
  if (!raw) {
    return null;
  }

  const base = `https://wa.me/${raw}`;
  const text = contextMessage?.trim();
  if (!text) {
    return base;
  }
  return `${base}?text=${encodeURIComponent(text)}`;
}
