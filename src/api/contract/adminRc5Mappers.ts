/**
 * RC5 directory detail + ticket replies mappers.
 * Assert schema_version == BACKEND_CONTRACT.schemaVersion on every payload.
 */
import { BACKEND_CONTRACT } from '@/config/backendContract';
import {
  mapPortalAppointmentStatus,
  presentAppointmentDetailMeta,
} from '@/lib/appointmentPresentation';

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as JsonRecord;
  }
  return {};
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asInt(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function asBool(value: unknown): boolean {
  return value === true;
}

function assertSchemaVersion(row: JsonRecord, surface: string): void {
  const version = asString(row.schema_version);
  if (version && version !== BACKEND_CONTRACT.schemaVersion) {
    throw new Error(`CONTRACT_DRIFT:${surface} schema_version=${version}`);
  }
}

export type PartnerActivationChecklist = {
  canActivate: boolean;
  missing: string[];
  checks: Record<string, boolean>;
};

export type AdminPartnerDetail = {
  id: string;
  displayName: string;
  legalName: string | null;
  status: string;
  partnerType: 'INDIVIDUAL' | 'BUSINESS' | null;
  typeClassificationStatus: string | null;
  legacyActivationGrandfathered: boolean;
  payoutProfileStatus: string | null;
  staffApprovedAt: string | null;
  requiredAgreementType: string | null;
  requiredAgreementVersion: string | null;
  ageVerificationStatus: string | null;
  identityVerificationStatus: string | null;
  businessVerificationStatus: string | null;
  activationBlockCodes: string[];
  activationChecklist: PartnerActivationChecklist;
};

export type AdminDirectoryDetail = {
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
  metaLines: string[];
  partner?: AdminPartnerDetail;
  rawKind: 'product' | 'partner' | 'customer' | 'project' | 'quote' | 'invoice' | 'appointment';
};

function mapChecklist(raw: unknown): PartnerActivationChecklist {
  const row = asRecord(raw);
  const missingRaw = Array.isArray(row.missing) ? row.missing : [];
  const missing = missingRaw.filter((x): x is string => typeof x === 'string');
  const checksRaw = asRecord(row.checks);
  const checks: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(checksRaw)) {
    checks[k] = v === true;
  }
  return {
    canActivate: asBool(row.can_activate),
    missing,
    checks,
  };
}

export function mapAdminProductDetail(raw: unknown): AdminDirectoryDetail {
  const row = asRecord(raw);
  assertSchemaVersion(row, 'admin_get_product');
  return {
    id: asString(row.id),
    title: asString(row.name, asString(row.slug, 'Product')),
    subtitle: asStringOrNull(row.summary) ?? undefined,
    status: asStringOrNull(row.status) ?? undefined,
    metaLines: [
      `Prijs: ${asInt(row.price_cents)} ${asString(row.currency, 'EUR')}`,
      `Legal: ${asString(row.legal_status, '—')}`,
      `Partner enabled: ${asBool(row.partner_enabled) ? 'ja' : 'nee'}`,
    ],
    rawKind: 'product',
  };
}

export function mapAdminPartnerDetail(raw: unknown): AdminDirectoryDetail {
  const row = asRecord(raw);
  assertSchemaVersion(row, 'admin_get_partner');
  const typeRaw = asStringOrNull(row.partner_type);
  const partnerType = typeRaw === 'INDIVIDUAL' || typeRaw === 'BUSINESS' ? typeRaw : null;
  const blockCodes = Array.isArray(row.activation_block_codes)
    ? row.activation_block_codes.filter((x): x is string => typeof x === 'string')
    : [];
  const partner: AdminPartnerDetail = {
    id: asString(row.id),
    displayName: asString(row.display_name, asString(row.legal_name, 'Partner')),
    legalName: asStringOrNull(row.legal_name),
    status: asString(row.status, 'UNKNOWN'),
    partnerType,
    typeClassificationStatus: asStringOrNull(row.type_classification_status),
    legacyActivationGrandfathered: asBool(row.legacy_activation_grandfathered),
    payoutProfileStatus: asStringOrNull(row.payout_profile_status),
    staffApprovedAt: asStringOrNull(row.staff_approved_at),
    requiredAgreementType: asStringOrNull(row.required_agreement_type),
    requiredAgreementVersion: asStringOrNull(row.required_agreement_version),
    ageVerificationStatus: asStringOrNull(row.age_verification_status),
    identityVerificationStatus: asStringOrNull(row.identity_verification_status),
    businessVerificationStatus: asStringOrNull(row.business_verification_status),
    activationBlockCodes: blockCodes,
    activationChecklist: mapChecklist(row.activation_checklist),
  };
  const typeLabel =
    partnerType === 'INDIVIDUAL'
      ? 'Particulier'
      : partnerType === 'BUSINESS'
        ? 'Zakelijk'
        : 'Ongeclassificeerd (REVIEW_REQUIRED)';
  const checklist = partner.activationChecklist;
  return {
    id: partner.id,
    title: partner.displayName,
    subtitle: typeLabel,
    status: partner.status,
    metaLines: [
      `Classificatie: ${partner.typeClassificationStatus ?? '—'}`,
      `Payoutprofiel: ${partner.payoutProfileStatus ?? '—'}`,
      `Kan activeren: ${checklist.canActivate ? 'ja' : 'nee'}`,
      checklist.missing.length
        ? `Ontbrekend: ${checklist.missing.join(', ')}`
        : 'Checklist compleet',
      `Leeftijd: ${partner.ageVerificationStatus ?? '—'}`,
      `Identiteit: ${partner.identityVerificationStatus ?? '—'}`,
      ...(partnerType === 'BUSINESS'
        ? [`Zakelijke verificatie: ${partner.businessVerificationStatus ?? '—'}`]
        : []),
      partner.requiredAgreementType
        ? `Overeenkomst: ${partner.requiredAgreementType} v${partner.requiredAgreementVersion ?? '?'}`
        : 'Overeenkomst: —',
    ],
    partner,
    rawKind: 'partner',
  };
}

export function mapAdminCustomerDetail(raw: unknown): AdminDirectoryDetail {
  const row = asRecord(raw);
  assertSchemaVersion(row, 'admin_get_customer');
  return {
    id: asString(row.id),
    title: asString(row.name, asString(row.organization_name, 'Klant')),
    status: asStringOrNull(row.status) ?? undefined,
    metaLines: [
      `Projecten: ${asInt(row.project_count)}`,
      `Open tickets: ${asInt(row.open_ticket_count)}`,
    ],
    rawKind: 'customer',
  };
}

export function mapAdminProjectDetail(raw: unknown): AdminDirectoryDetail {
  const row = asRecord(raw);
  assertSchemaVersion(row, 'admin_get_project');
  return {
    id: asString(row.id),
    title: asString(row.title, asString(row.name, 'Project')),
    subtitle: asStringOrNull(row.customer_label) ?? undefined,
    status: asStringOrNull(row.status) ?? undefined,
    metaLines: [
      `Offertes: ${asInt(row.quote_count)}`,
      `Facturen: ${asInt(row.invoice_count)}`,
      `Afspraken: ${asInt(row.appointment_count)}`,
    ],
    rawKind: 'project',
  };
}

export function mapAdminQuoteDetail(raw: unknown): AdminDirectoryDetail {
  const row = asRecord(raw);
  assertSchemaVersion(row, 'admin_get_quote');
  const totals = asRecord(row.totals);
  const items = Array.isArray(row.items) ? row.items : [];
  return {
    id: asString(row.id),
    title: asString(row.quote_number, asString(row.title, 'Offerte')),
    status: asStringOrNull(row.status) ?? undefined,
    metaLines: [
      `Totaal: ${asInt(totals.total_cents)} ${asString(row.currency, 'EUR')}`,
      `Regels: ${items.length}${asBool(row.items_truncated) ? '+' : ''}`,
    ],
    rawKind: 'quote',
  };
}

export function mapAdminInvoiceDetail(raw: unknown): AdminDirectoryDetail {
  const row = asRecord(raw);
  assertSchemaVersion(row, 'admin_get_invoice');
  const totals = asRecord(row.totals);
  return {
    id: asString(row.id),
    title: asString(row.invoice_number, asString(row.title, 'Factuur')),
    status: asStringOrNull(row.status) ?? undefined,
    metaLines: [
      `Verschuldigd: ${asInt(totals.amount_due_cents)}`,
      `Betaald: ${asInt(totals.amount_paid_cents)}`,
      `Totaal: ${asInt(totals.total_cents)} ${asString(row.currency, 'EUR')}`,
    ],
    rawKind: 'invoice',
  };
}

export function mapAdminAppointmentDetail(raw: unknown): AdminDirectoryDetail {
  const row = asRecord(raw);
  assertSchemaVersion(row, 'admin_get_appointment');
  const statusRaw = asStringOrNull(row.status);
  const status = statusRaw ? mapPortalAppointmentStatus(statusRaw) : undefined;
  const starts = asStringOrNull(row.starts_at);
  const ends = asStringOrNull(row.ends_at);
  const location = asStringOrNull(row.location);
  return {
    id: asString(row.id),
    title: asString(row.title, 'Afspraak'),
    status,
    metaLines: presentAppointmentDetailMeta(starts, ends, location, 'nl'),
    rawKind: 'appointment',
  };
}

export type SupportReplyPage = {
  items: {
    id: string;
    ticketId: string;
    body: string;
    isInternal: boolean;
    createdAt: string;
    authorUserId: string | null;
  }[];
  nextCursor: string | null;
  schemaVersion: string;
};

export function mapSupportTicketRepliesPage(raw: unknown): SupportReplyPage {
  const row = asRecord(raw);
  assertSchemaVersion(row, 'list_portal_support_ticket_replies');
  const itemsRaw = Array.isArray(row.items) ? row.items : [];
  const items = itemsRaw.map((item) => {
    const r = asRecord(item);
    return {
      id: asString(r.id),
      ticketId: asString(r.ticket_id),
      body: asString(r.body),
      isInternal: asBool(r.is_internal),
      createdAt: asString(r.created_at),
      authorUserId: asStringOrNull(r.author_user_id),
    };
  });
  const next = row.next_cursor;
  return {
    items,
    nextCursor: typeof next === 'string' && next.length > 0 ? next : null,
    schemaVersion: asString(row.schema_version, BACKEND_CONTRACT.schemaVersion),
  };
}

/** Dutch labels for activation block codes (UI copy only). */
export const ACTIVATION_BLOCK_COPY: Record<string, string> = {
  PARTNER_TYPE_UNKNOWN: 'Partnertype nog niet bekend',
  PARTNER_SUSPENDED: 'Partner is geschorst',
  STAFF_APPROVAL_MISSING: 'Staffgoedkeuring ontbreekt',
  AGE_NOT_VERIFIED: 'Leeftijdsverificatie ontbreekt',
  IDENTITY_NOT_VERIFIED: 'Identiteitsverificatie ontbreekt',
  BUSINESS_NOT_VERIFIED: 'Zakelijke verificatie ontbreekt',
  COMPANY_DETAILS_MISSING: 'Bedrijfsgegevens/KVK ontbreken',
  AGREEMENT_NOT_ACCEPTED: 'Overeenkomst niet geaccepteerd',
  PAYOUT_PROFILE_NOT_APPROVED: 'Payoutprofiel niet goedgekeurd',
};
