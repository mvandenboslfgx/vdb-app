import * as Localization from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import adminEn from './locales/en/admin.json';
import authEn from './locales/en/auth.json';
import commissionsEn from './locales/en/commissions.json';
import commonEn from './locales/en/common.json';
import customerEn from './locales/en/customer.json';
import documentsEn from './locales/en/documents.json';
import errorsEn from './locales/en/errors.json';
import invoicesEn from './locales/en/invoices.json';
import messagesEn from './locales/en/messages.json';
import notificationsEn from './locales/en/notifications.json';
import partnersEn from './locales/en/partners.json';
import paymentsEn from './locales/en/payments.json';
import projectsEn from './locales/en/projects.json';
import publicEn from './locales/en/public.json';
import quotesEn from './locales/en/quotes.json';
import supportEn from './locales/en/support.json';
import appEn from './locales/en.json';

import adminNl from './locales/nl/admin.json';
import authNl from './locales/nl/auth.json';
import commissionsNl from './locales/nl/commissions.json';
import commonNl from './locales/nl/common.json';
import customerNl from './locales/nl/customer.json';
import documentsNl from './locales/nl/documents.json';
import errorsNl from './locales/nl/errors.json';
import invoicesNl from './locales/nl/invoices.json';
import messagesNl from './locales/nl/messages.json';
import notificationsNl from './locales/nl/notifications.json';
import partnersNl from './locales/nl/partners.json';
import paymentsNl from './locales/nl/payments.json';
import projectsNl from './locales/nl/projects.json';
import publicNl from './locales/nl/public.json';
import quotesNl from './locales/nl/quotes.json';
import supportNl from './locales/nl/support.json';
import appNl from './locales/nl.json';

export const namespaces = [
  'common',
  'auth',
  'customer',
  'projects',
  'messages',
  'support',
  'documents',
  'quotes',
  'invoices',
  'payments',
  'partners',
  'commissions',
  'admin',
  'notifications',
  'errors',
  'public',
  'app',
] as const;

export type AppNamespace = (typeof namespaces)[number];
export type AppLanguage = 'nl' | 'en';

const resources = {
  nl: {
    common: commonNl,
    auth: authNl,
    customer: customerNl,
    projects: projectsNl,
    messages: messagesNl,
    support: supportNl,
    documents: documentsNl,
    quotes: quotesNl,
    invoices: invoicesNl,
    payments: paymentsNl,
    partners: partnersNl,
    commissions: commissionsNl,
    admin: adminNl,
    notifications: notificationsNl,
    errors: errorsNl,
    public: publicNl,
    app: appNl,
  },
  en: {
    common: commonEn,
    auth: authEn,
    customer: customerEn,
    projects: projectsEn,
    messages: messagesEn,
    support: supportEn,
    documents: documentsEn,
    quotes: quotesEn,
    invoices: invoicesEn,
    payments: paymentsEn,
    partners: partnersEn,
    commissions: commissionsEn,
    admin: adminEn,
    notifications: notificationsEn,
    errors: errorsEn,
    public: publicEn,
    app: appEn,
  },
} as const;

function detectDeviceLanguage(): AppLanguage {
  const locales = Localization.getLocales();
  const code = locales[0]?.languageCode?.toLowerCase();
  if (code === 'nl') {
    return 'nl';
  }
  if (code === 'en') {
    return 'en';
  }
  return 'nl';
}

export const i18n = createInstance();

let initialized = false;

export function initI18n(language?: AppLanguage): typeof i18n {
  if (!initialized) {
    void i18n.use(initReactI18next).init({
      resources,
      lng: language ?? detectDeviceLanguage(),
      fallbackLng: 'en',
      defaultNS: 'common',
      ns: [...namespaces],
      interpolation: {
        escapeValue: false,
      },
      returnNull: false,
      compatibilityJSON: 'v4',
    });
    initialized = true;
  } else if (language) {
    void i18n.changeLanguage(language);
  }
  return i18n;
}

export function getCurrentLanguage(): AppLanguage {
  const lng = i18n.language?.split('-')[0];
  return lng === 'en' ? 'en' : 'nl';
}

/** Alias used by customer screens */
export function getAppLocale(): AppLanguage {
  return getCurrentLanguage();
}

export type AppLocale = AppLanguage;

export function setAppLocale(locale: AppLocale): void {
  void i18n.changeLanguage(locale);
}

export async function setAppLanguage(language: AppLanguage): Promise<void> {
  await i18n.changeLanguage(language);
}

export default i18n;
