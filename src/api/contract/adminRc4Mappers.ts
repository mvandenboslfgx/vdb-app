import { BACKEND_CONTRACT } from '@/config/backendContract';
import { normalizeEnumKey } from '@/i18n/translateEnum';
import { formatDateTime } from '@/lib/format';
import type { AdminQueueItem } from '@/api/mockData';
import type { AdminDashboardStats } from '@/types/domain';

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as JsonRecord;
  }
  return {};
}

function asInt(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asBool(value: unknown): boolean {
  return value === true;
}

const KNOWN_QUEUE_TYPES = new Set([
  'partner_application',
  'support_ticket',
  'commission_review',
  'document_review',
  'appointment',
  'payout_request',
]);

function mapPriority(value: unknown): AdminQueueItem['priority'] {
  const raw = asString(value, 'normal').toLowerCase();
  if (raw === 'low') return 'low';
  if (raw === 'high' || raw === 'urgent') return 'high';
  return 'medium';
}

function mapQueueType(value: unknown): AdminQueueItem['type'] {
  const raw = asString(value, 'unknown');
  if (KNOWN_QUEUE_TYPES.has(raw)) {
    return raw as AdminQueueItem['type'];
  }
  return 'unknown';
}

/** Map Owner `admin_dashboard_stats` jsonb → Mobile domain stats. */
export function mapAdminDashboardStats(raw: unknown): AdminDashboardStats {
  const row = asRecord(raw);
  const schemaVersion = asString(row.schema_version);
  if (schemaVersion && schemaVersion !== BACKEND_CONTRACT.schemaVersion) {
    throw new Error(`CONTRACT_DRIFT:admin_dashboard_stats schema_version=${schemaVersion}`);
  }
  return {
    openPartnerApplications: asInt(row.open_partner_applications),
    openTickets: asInt(row.open_tickets),
    unreadMessages: asInt(row.unread_messages),
    documentsPendingReview: asInt(row.documents_pending_review),
    openPayments: 0,
    commissionsUnderReview: asInt(row.commissions_under_review),
    payoutRequests: asInt(row.payout_requests),
    upcomingAppointments: asInt(row.upcoming_appointments),
  };
}

export type AdminWorkQueuePage = {
  items: AdminQueueItem[];
  nextCursor: string | null;
  schemaVersion: string;
};

/** Map Owner `admin_work_queue` jsonb → Mobile queue page. */
export function mapAdminWorkQueue(raw: unknown): AdminWorkQueuePage {
  const row = asRecord(raw);
  const schemaVersion = asString(row.schema_version, BACKEND_CONTRACT.schemaVersion);
  if (schemaVersion && schemaVersion !== BACKEND_CONTRACT.schemaVersion) {
    throw new Error(`CONTRACT_DRIFT:admin_work_queue schema_version=${schemaVersion}`);
  }
  const itemsRaw = Array.isArray(row.items) ? row.items : [];
  const items = itemsRaw.map((item, index) => mapAdminQueueItem(item, index));
  const next = row.next_cursor;
  return {
    items,
    nextCursor: typeof next === 'string' && next.length > 0 ? next : null,
    schemaVersion,
  };
}

export function mapAdminQueueItem(raw: unknown, index = 0): AdminQueueItem {
  const row = asRecord(raw);
  const type = mapQueueType(row.type);
  const id = asString(row.id, `unknown-${index}`);
  const title =
    type === 'unknown'
      ? `Onbekend wachtrij-item (${asString(row.type, 'n/a')})`
      : asString(row.title, 'Wachtrij-item');
  return {
    id,
    type,
    title,
    subtitle: asString(row.subtitle),
    createdAt: asString(row.created_at, new Date(0).toISOString()),
    priority: mapPriority(row.priority),
    status: asString(row.status) || undefined,
    routeKey: asString(row.route_key) || undefined,
    requiresAal2: asBool(row.requires_aal2),
    updatedAt: asString(row.updated_at) || undefined,
  };
}

export type AdminDirectoryPage = {
  items: { id: string; title: string; subtitle?: string; status?: string; meta?: string }[];
  nextCursor: string | null;
  schemaVersion: string;
};

/** Generic mapper for admin_list_* pages — only contract-safe display fields. */
export function mapAdminDirectoryPage(raw: unknown, titleKeys: string[]): AdminDirectoryPage {
  const row = asRecord(raw);
  const schemaVersion = asString(row.schema_version, BACKEND_CONTRACT.schemaVersion);
  const itemsRaw = Array.isArray(row.items) ? row.items : [];
  const items = itemsRaw.map((item, index) => {
    const r = asRecord(item);
    const id = asString(r.id, `row-${index}`);
    let title = '';
    for (const key of titleKeys) {
      const value = asString(r[key]);
      if (value) {
        title = value;
        break;
      }
    }
    if (!title) title = id;
    const statusRaw = asString(r.status);
    const status = statusRaw ? normalizeEnumKey(statusRaw) : undefined;
    const startsAt = asString(r.starts_at);
    const subtitle =
      asString(r.subtitle) ||
      asString(r.company_name) ||
      asString(r.organization_name) ||
      asString(r.slug) ||
      (startsAt ? formatDateTime(startsAt) : undefined) ||
      undefined;
    const meta = asString(r.updated_at) || asString(r.created_at) || undefined;
    return { id, title, subtitle, status, meta };
  });
  const next = row.next_cursor;
  return {
    items,
    nextCursor: typeof next === 'string' && next.length > 0 ? next : null,
    schemaVersion,
  };
}

export type AdminSettingsSummary = {
  environment: string;
  contractVersion: string;
  schemaVersion: string;
  whatsappConfigured: boolean;
  checkoutEnabled: boolean;
  mollieEnabled: boolean;
  payoutsEnabled: boolean;
  messagingRealtime: boolean;
  appointmentsBooking: boolean;
};

export function mapAdminSettingsSummary(raw: unknown): AdminSettingsSummary {
  const row = asRecord(raw);
  return {
    environment: asString(row.environment, 'unknown'),
    contractVersion: asString(row.contract_version, BACKEND_CONTRACT.packageId),
    schemaVersion: asString(row.schema_version, BACKEND_CONTRACT.schemaVersion),
    whatsappConfigured: asBool(row.whatsapp_configured),
    checkoutEnabled: asBool(row.checkout_enabled),
    mollieEnabled: asBool(row.mollie_enabled),
    payoutsEnabled: asBool(row.partner_payouts_enabled) || asBool(row.payouts_enabled),
    messagingRealtime: asBool(row.messaging_realtime),
    appointmentsBooking: asBool(row.appointments_booking),
  };
}

export type AdminSecurityStatus = {
  currentAal: string;
  mfaEnrolled: boolean;
  mfaRequired: boolean;
  stepUpRequired: boolean;
  actorRole: string;
  capabilities: string[];
};

export function mapAdminSecurityStatus(raw: unknown): AdminSecurityStatus {
  const row = asRecord(raw);
  const caps = Array.isArray(row.capabilities)
    ? row.capabilities.filter((c): c is string => typeof c === 'string')
    : [];
  return {
    currentAal: asString(row.current_aal, 'aal1'),
    mfaEnrolled: asBool(row.mfa_enrolled),
    mfaRequired: asBool(row.mfa_required),
    stepUpRequired: asBool(row.step_up_required),
    actorRole: asString(row.actor_role, 'unknown'),
    capabilities: caps,
  };
}

export function newIdempotencyKey(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}:${rand}`;
}
