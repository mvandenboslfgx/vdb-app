import { i18n, initI18n } from '@/i18n';
import {
  humanizeEnumValue,
  isForbiddenRouteTitle,
  looksLikeRawEnumOrI18nKey,
  normalizeEnumKey,
  translateEnum,
} from '@/i18n/translateEnum';

describe('translateEnum', () => {
  beforeAll(async () => {
    initI18n('nl');
    await i18n.changeLanguage('nl');
  });

  it('normalizes UPPERCASE and namespaced-looking values', () => {
    expect(normalizeEnumKey('NEW')).toBe('new');
    expect(normalizeEnumKey('leadStatus.NEW')).toBe('new');
    expect(normalizeEnumKey('WAITING_FOR_CUSTOMER')).toBe('waiting_for_customer');
    expect(normalizeEnumKey('NO_SHOW')).toBe('no_show');
  });

  it('translates lead statuses', () => {
    const t = i18n.getFixedT('nl', 'partners');
    expect(translateEnum(t, 'leadStatus', 'NEW')).toBe('Nieuw');
    expect(translateEnum(t, 'leadStatus', 'CONVERTED')).toBe('Omgezet naar verkoop');
    expect(translateEnum(t, 'leadStatus', 'qualified')).toBe('Gekwalificeerd');
  });

  it('translates ticket categories including OTHER', () => {
    const t = i18n.getFixedT('nl', 'support');
    expect(translateEnum(t, 'categories', 'OTHER')).toBe('Overig');
    expect(translateEnum(t, 'categories', 'billing')).toBe('Facturatie');
  });

  it('translates appointment SCHEDULED to Gepland', () => {
    const t = i18n.getFixedT('nl', 'customer');
    expect(translateEnum(t, 'appointments.status', 'SCHEDULED')).toBe('Gepland');
    expect(translateEnum(t, 'appointments.status', 'scheduled')).toBe('Gepland');
  });

  it('falls back to humanized value, never raw namespaced key', () => {
    const t = i18n.getFixedT('nl', 'partners');
    const result = translateEnum(t, 'leadStatus', 'TOTALLY_UNKNOWN_STATUS');
    expect(looksLikeRawEnumOrI18nKey(result)).toBe(false);
    expect(result).toBe(humanizeEnumValue('TOTALLY_UNKNOWN_STATUS'));
  });

  it('flags forbidden route titles', () => {
    expect(isForbiddenRouteTitle('index')).toBe(true);
    expect(isForbiddenRouteTitle('[id]')).toBe(true);
    expect(isForbiddenRouteTitle('payouts')).toBe(true);
    expect(isForbiddenRouteTitle('Leads')).toBe(false);
  });
});
