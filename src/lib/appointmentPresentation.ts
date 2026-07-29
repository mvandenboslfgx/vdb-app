import type { Appointment, AppointmentStatus } from '@/types/domain';
import { AMSTERDAM_TZ, type FormatLocale } from '@/lib/format';
import { normalizeEnumKey } from '@/i18n/translateEnum';

export type AppointmentListPresentation = {
  title: string;
  dateLabel: string;
  timeRangeLabel: string;
  durationLabel: string | null;
  locationLabel: string | null;
  statusKey: string;
  isToday: boolean;
  isTomorrow: boolean;
};

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function amsterdamParts(date: Date, locale: FormatLocale) {
  const fmt = new Intl.DateTimeFormat(locale === 'nl' ? 'nl-NL' : 'en-GB', {
    timeZone: AMSTERDAM_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value])) as Record<
    string,
    string
  >;
  return parts;
}

function amsterdamYmd(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: AMSTERDAM_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function formatTime(parts: Record<string, string>): string {
  const hour = parts.hour ?? '00';
  const minute = parts.minute ?? '00';
  return `${hour}:${minute}`;
}

export function mapPortalAppointmentStatus(raw: string | null | undefined): AppointmentStatus {
  const key = normalizeEnumKey(raw);
  switch (key) {
    case 'scheduled':
      return 'scheduled';
    case 'requested':
      return 'requested';
    case 'confirmed':
      return 'confirmed';
    case 'rescheduled':
      return 'rescheduled';
    case 'cancelled':
    case 'canceled':
      return 'cancelled';
    case 'completed':
      return 'completed';
    case 'no_show':
      return 'no_show';
    default:
      return 'scheduled';
  }
}

export function presentAppointmentListItem(
  appointment: Pick<Appointment, 'title' | 'startsAt' | 'endsAt' | 'location' | 'status'>,
  locale: FormatLocale = 'nl',
  now: Date = new Date(),
): AppointmentListPresentation {
  const start = toDate(appointment.startsAt);
  const end = toDate(appointment.endsAt);
  const startParts = start ? amsterdamParts(start, locale) : null;
  const endParts = end ? amsterdamParts(end, locale) : null;

  const dateLabel = startParts
    ? `${startParts.weekday} ${startParts.day} ${startParts.month}`
    : '—';
  const timeRangeLabel = startParts
    ? endParts
      ? `${formatTime(startParts)} – ${formatTime(endParts)}`
      : formatTime(startParts)
    : '—';

  let durationLabel: string | null = null;
  if (start && end && end > start) {
    const mins = Math.round((end.getTime() - start.getTime()) / 60000);
    durationLabel = mins >= 60 ? `${Math.floor(mins / 60)}u ${mins % 60}m` : `${mins} min`;
  }

  const today = amsterdamYmd(now);
  const startYmd = start ? amsterdamYmd(start) : '';
  const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrow = amsterdamYmd(tomorrowDate);

  const location = appointment.location?.trim() || null;
  const locationLabel = location
    ? /online|zoom|teams|meet\.google/i.test(location)
      ? locale === 'nl'
        ? 'Online'
        : 'Online'
      : location
    : null;

  return {
    title: appointment.title?.trim() || (locale === 'nl' ? 'Afspraak' : 'Appointment'),
    dateLabel,
    timeRangeLabel,
    durationLabel,
    locationLabel,
    statusKey: normalizeEnumKey(appointment.status) || 'scheduled',
    isToday: Boolean(startYmd && startYmd === today),
    isTomorrow: Boolean(startYmd && startYmd === tomorrow),
  };
}

export function presentAppointmentDetailMeta(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
  location: string | null | undefined,
  locale: FormatLocale = 'nl',
): string[] {
  const presented = presentAppointmentListItem(
    {
      title: '',
      startsAt: startsAt ?? '',
      endsAt: endsAt ?? '',
      location: location ?? null,
      status: 'scheduled',
    },
    locale,
  );
  const lines = [`${presented.dateLabel}`, `Tijd: ${presented.timeRangeLabel}`];
  if (presented.durationLabel) lines.push(`Duur: ${presented.durationLabel}`);
  lines.push(`Locatie: ${presented.locationLabel ?? '—'}`);
  return lines;
}
