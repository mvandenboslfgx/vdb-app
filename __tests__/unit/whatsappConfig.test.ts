import {
  buildConfiguredWhatsAppUrl,
  buildWhatsAppUrl,
  getWhatsAppConfig,
  getWhatsAppMessageForLocale,
  isValidWhatsAppNumber,
  WHATSAPP_CANONICAL_NUMBER,
  WHATSAPP_MESSAGE_EN,
  WHATSAPP_MESSAGE_NL,
} from '@/lib/whatsapp';

describe('whatsapp central config', () => {
  it('uses canonical digits-only number 31628600727', () => {
    const config = getWhatsAppConfig();
    expect(config.number).toBe(WHATSAPP_CANONICAL_NUMBER);
    expect(config.number).toBe('31628600727');
    expect(config.enabled).toBe(true);
  });

  it('exposes NL and EN templates without PII placeholders', () => {
    expect(WHATSAPP_MESSAGE_NL).toBe('Hallo VDB Digital, ik heb een vraag via de VDB Digital-app.');
    expect(WHATSAPP_MESSAGE_EN).toBe(
      'Hello VDB Digital, I have a question via the VDB Digital app.',
    );
    for (const msg of [WHATSAPP_MESSAGE_NL, WHATSAPP_MESSAGE_EN]) {
      expect(msg).not.toMatch(/\$\{/);
      expect(msg).not.toMatch(/\{\{/);
      expect(msg.toLowerCase()).not.toContain('email');
      expect(msg.toLowerCase()).not.toContain('user-id');
    }
  });

  it('builds URL-encoded wa.me links without embedding names', () => {
    const nl = buildConfiguredWhatsAppUrl('nl');
    const en = buildConfiguredWhatsAppUrl('en');
    expect(nl).toBe(`https://wa.me/31628600727?text=${encodeURIComponent(WHATSAPP_MESSAGE_NL)}`);
    expect(en).toBe(`https://wa.me/31628600727?text=${encodeURIComponent(WHATSAPP_MESSAGE_EN)}`);
    expect(nl).not.toContain(' ');
  });

  it('selects message by locale', () => {
    expect(getWhatsAppMessageForLocale('nl')).toBe(WHATSAPP_MESSAGE_NL);
    expect(getWhatsAppMessageForLocale('en-US')).toBe(WHATSAPP_MESSAGE_EN);
  });

  it('rejects invalid numbers', () => {
    expect(isValidWhatsAppNumber('')).toBe(false);
    expect(isValidWhatsAppNumber('abc')).toBe(false);
    expect(isValidWhatsAppNumber('31628600727')).toBe(true);
  });

  it('buildWhatsAppUrl encodes message and accepts digits-only number', () => {
    const url = buildWhatsAppUrl('31628600727', WHATSAPP_MESSAGE_NL);
    expect(url).toBe(`https://wa.me/31628600727?text=${encodeURIComponent(WHATSAPP_MESSAGE_NL)}`);
    expect(buildWhatsAppUrl('31628600727', null)).toBe('https://wa.me/31628600727');
  });
});
