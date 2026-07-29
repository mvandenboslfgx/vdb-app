import {
  DEFAULT_NOTIFICATION_PREFS,
  parseBoolPref,
  parseNotificationPrefs,
  parseStoredLanguage,
  serializeBoolPref,
  serializeLanguage,
} from '@/features/settings/devicePreferences';

describe('devicePreferences', () => {
  it('parses and serializes language prefs', () => {
    expect(parseStoredLanguage('nl')).toBe('nl');
    expect(parseStoredLanguage('en')).toBe('en');
    expect(parseStoredLanguage('fr')).toBeNull();
    expect(parseStoredLanguage(null)).toBeNull();
    expect(serializeLanguage('nl')).toBe('nl');
    expect(serializeLanguage('en')).toBe('en');
  });

  it('parses and serializes boolean prefs', () => {
    expect(parseBoolPref('true', false)).toBe(true);
    expect(parseBoolPref('false', true)).toBe(false);
    expect(parseBoolPref(null, true)).toBe(true);
    expect(parseBoolPref('maybe', false)).toBe(false);
    expect(serializeBoolPref(true)).toBe('true');
    expect(serializeBoolPref(false)).toBe('false');
  });

  it('defaults marketing to false and uses device-only defaults', () => {
    expect(DEFAULT_NOTIFICATION_PREFS.marketing).toBe(false);
    expect(
      parseNotificationPrefs({
        push: null,
        email: null,
        marketing: null,
      }),
    ).toEqual(DEFAULT_NOTIFICATION_PREFS);

    expect(
      parseNotificationPrefs({
        push: 'true',
        email: 'true',
        marketing: 'true',
      }),
    ).toEqual({ push: true, email: true, marketing: true });
  });
});
