/**
 * Explicit portal_* row shapes for Mobile domain mapping (rc.2 / owner schema).
 * Kept local so we do not cast through `any` or Mobile proposal generated types.
 */

export type PortalProjectStatus =
  | 'DRAFT'
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_CUSTOMER'
  | 'REVIEW'
  | 'COMPLETED'
  | 'ON_HOLD'
  | 'CANCELED'
  | 'ARCHIVED';

export type PortalQuoteStatus =
  'DRAFT' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'SUPERSEDED' | 'CANCELED';

export type PortalInvoiceStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELED'
  | 'CREDITED'
  | 'IN_REVIEW'
  | 'READY'
  | 'ISSUED'
  | 'PARTIALLY_PAID'
  | 'ARCHIVED';

export type PortalDocumentStatus =
  'UPLOADING' | 'AVAILABLE' | 'QUARANTINED' | 'REJECTED' | 'ARCHIVED' | 'DELETED';

export interface PortalProjectRow {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  status: PortalProjectStatus;
  progress_percent: number;
  planned_delivery_date: string | null;
  created_at: string;
  updated_at: string;
  customer_visible?: boolean;
  project_number?: string;
}

export interface PortalQuoteRow {
  id: string;
  organization_id: string;
  quote_number: string;
  title: string;
  description: string | null;
  status: PortalQuoteStatus;
  currency: string;
  subtotal_cents: number;
  vat_cents: number;
  total_cents: number;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
  project_id?: string | null;
}

export interface PortalQuoteItemRow {
  id: string;
  quote_id: string;
  title: string;
  description: string | null;
  quantity: number;
  unit_price_cents: number;
  tax_rate_basis_points: number;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PortalInvoiceRow {
  id: string;
  organization_id: string;
  invoice_number: string;
  status: PortalInvoiceStatus;
  issue_date: string | null;
  due_date: string | null;
  currency: string;
  subtotal_cents: number;
  vat_cents: number;
  total_cents: number;
  created_at: string;
  updated_at: string;
  project_id?: string | null;
  customer_visible?: boolean;
}

export interface PortalFileRow {
  id: string;
  organization_id: string;
  project_id: string | null;
  quote_id: string | null;
  invoice_id: string | null;
  title: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  status: PortalDocumentStatus;
  scan_status?: string | null;
  created_at: string;
  updated_at: string;
  customer_visible?: boolean;
  version_number?: number;
}
