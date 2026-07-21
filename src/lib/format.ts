import { format as formatDateFns, formatDistanceToNow, parseISO } from 'date-fns';
import { enUS, nl } from 'date-fns/locale';

const AMSTERDAM_TZ = 'Europe/Amsterdam';

export type FormatLocale = 'nl' | 'en';

function getDateFnsLocale(locale: FormatLocale) {
  return locale === 'nl' ? nl : enUS;
}

function toDate(value: string | Date): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }
  const date = parseISO(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Format a UTC/ISO timestamp for display in Europe/Amsterdam. */
export function formatDate(
  value: string | Date | null | undefined,
  pattern = 'd MMM yyyy',
  locale: FormatLocale = 'nl',
): string {
  const date = value == null ? null : toDate(value);
  if (!date) return '—';
  // date-fns formats in local device TZ; for consistent Amsterdam display we use Intl when needed
  try {
    const parts = new Intl.DateTimeFormat(locale === 'nl' ? 'nl-NL' : 'en-GB', {
      timeZone: AMSTERDAM_TZ,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
    if (pattern === 'd MMM yyyy') {
      return parts;
    }
  } catch {
    // fall through
  }
  return formatDateFns(date, pattern, { locale: getDateFnsLocale(locale) });
}

export function formatDateTime(
  value: string | Date | null | undefined,
  locale: FormatLocale = 'nl',
): string {
  const date = value == null ? null : toDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat(locale === 'nl' ? 'nl-NL' : 'en-GB', {
    timeZone: AMSTERDAM_TZ,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatRelative(
  value: string | Date | null | undefined,
  locale: FormatLocale = 'nl',
): string {
  const date = value == null ? null : toDate(value);
  if (!date) return '—';
  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: getDateFnsLocale(locale),
  });
}

/** Format cents as EUR currency. */
export function formatCurrency(
  amountCents: number,
  locale: FormatLocale = 'nl',
  currency: 'EUR' = 'EUR',
): string {
  return new Intl.NumberFormat(locale === 'nl' ? 'nl-NL' : 'en-GB', {
    style: 'currency',
    currency,
  }).format(amountCents / 100);
}

export function formatNumber(
  value: number,
  locale: FormatLocale = 'nl',
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale === 'nl' ? 'nl-NL' : 'en-GB', options).format(value);
}

export function formatPercent(value: number, locale: FormatLocale = 'nl'): string {
  return new Intl.NumberFormat(locale === 'nl' ? 'nl-NL' : 'en-GB', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value);
}

export { AMSTERDAM_TZ };
