export type AppRole = 'customer' | 'partner_pending' | 'partner' | 'staff' | 'admin' | 'owner';

export type ProjectStatus =
  | 'request_received'
  | 'intake'
  | 'quote'
  | 'accepted'
  | 'planning'
  | 'in_progress'
  | 'waiting_for_customer'
  | 'review'
  | 'revision'
  | 'completed'
  | 'paused'
  | 'cancelled';

export type CommissionStatus =
  | 'pending'
  | 'awaiting_payment'
  | 'payment_received'
  | 'under_review'
  | 'approved'
  | 'payable'
  | 'payout_requested'
  | 'paid'
  | 'rejected'
  | 'reversed';

export type SupportTicketStatus =
  'new' | 'open' | 'waiting_for_customer' | 'waiting_for_vdb' | 'resolved' | 'closed';

export type DocumentStatus =
  | 'draft'
  | 'uploaded'
  | 'processing'
  | 'available'
  | 'under_review'
  | 'approved'
  | 'changes_requested'
  | 'superseded'
  | 'archived'
  | 'rejected';

export type ScanStatus = 'pending' | 'clean' | 'flagged' | 'failed';

export type PaymentStatus =
  | 'created'
  | 'open'
  | 'pending'
  | 'authorized'
  | 'paid'
  | 'failed'
  | 'expired'
  | 'canceled'
  | 'refunded'
  | 'partially_refunded'
  | 'charged_back';

export type QuoteStatus =
  'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired' | 'withdrawn';

export type InvoiceStatus =
  'draft' | 'sent' | 'viewed' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled' | 'credited';

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'rejected' | 'invalid';

export type PayoutRequestStatus =
  'draft' | 'submitted' | 'under_review' | 'approved' | 'paid' | 'rejected' | 'cancelled';

export type PartnerApplicationStatus =
  'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'suspended';

export type AppointmentStatus =
  'requested' | 'confirmed' | 'rescheduled' | 'cancelled' | 'completed' | 'no_show';

export type MessageDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export type ProductCategory =
  | 'service'
  | 'physical_product'
  | 'custom_project'
  | 'digital_good'
  | 'external_subscription'
  | 'restricted'
  | 'manual_review_required';

export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

export interface Profile extends Timestamps {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  locale: 'nl' | 'en';
  roles: AppRole[];
  emailVerified: boolean;
}

export interface Project extends Timestamps {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  customerId: string;
  progressPercent: number;
  nextMilestone: string | null;
}

export interface ProjectMilestone extends Timestamps {
  id: string;
  projectId: string;
  title: string;
  dueDate: string | null;
  completedAt: string | null;
  sortOrder: number;
}

export interface ProjectUpdate extends Timestamps {
  id: string;
  projectId: string;
  title: string;
  body: string;
  authorName: string;
}

export interface Conversation extends Timestamps {
  id: string;
  title: string;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  projectId: string | null;
}

export interface Message extends Timestamps {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  body: string;
  deliveryStatus: MessageDeliveryStatus;
}

export interface SupportTicket extends Timestamps {
  id: string;
  subject: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: SupportTicketStatus;
  description: string;
}

export interface Document extends Timestamps {
  id: string;
  projectId: string | null;
  title: string;
  status: DocumentStatus;
  currentVersion: number;
  mimeType: string;
  sizeBytes: number;
  scanStatus: ScanStatus;
}

export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  vatPercent: number;
}

export interface Quote extends Timestamps {
  id: string;
  number: string;
  title: string;
  status: QuoteStatus;
  validUntil: string;
  currency: 'EUR';
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
  items: QuoteItem[];
  projectId: string | null;
  /** Version of the terms document linked to this quote, e.g. "1.2". Null when none is linked yet. */
  termsVersion: string | null;
}

export interface Invoice extends Timestamps {
  id: string;
  number: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  currency: 'EUR';
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
  amountPaidCents: number;
  projectId: string | null;
  paymentReference: string | null;
  pdfAvailable: boolean;
}

export interface Payment extends Timestamps {
  id: string;
  invoiceId: string;
  status: PaymentStatus;
  amountCents: number;
  currency: 'EUR';
  checkoutUrl: string | null;
  productCategory: ProductCategory;
}

export interface Appointment extends Timestamps {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  location: string | null;
  timezone: 'Europe/Amsterdam';
}

export interface AppointmentSlot {
  id: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  bookedCount: number;
  timezone: 'Europe/Amsterdam';
}

export interface PartnerProfile extends Timestamps {
  id: string;
  userId: string;
  companyName: string | null;
  code: string;
  linkUrl: string;
  status: 'active' | 'suspended';
}

export interface Lead extends Timestamps {
  id: string;
  partnerId: string;
  campaignCode: string | null;
  name: string;
  email: string;
  phone: string | null;
  interest: string | null;
  status: LeadStatus;
  notes: string | null;
  consentGiven: boolean;
  consentAt: string | null;
  saleId: string | null;
  convertedAt: string | null;
  rejectedReason: string | null;
}

export interface Commission extends Timestamps {
  id: string;
  partnerId: string;
  saleLabel: string;
  amountCents: number;
  currency: 'EUR';
  status: CommissionStatus;
  expectedReleaseAt: string | null;
}

export interface PayoutRequest extends Timestamps {
  id: string;
  partnerId: string;
  payoutAccountId: string;
  status: PayoutRequestStatus;
  amountCents: number;
  currency: 'EUR';
  submittedAt: string | null;
  notes: string | null;
}

export interface SupportTicketMessage extends Timestamps {
  id: string;
  ticketId: string;
  authorId: string;
  body: string;
  isInternal: boolean;
}

export interface NotificationItem extends Timestamps {
  id: string;
  title: string;
  body: string;
  read: boolean;
  deepLink: string | null;
}

export interface Review extends Timestamps {
  id: string;
  projectId: string;
  rating: number;
  title: string;
  body: string;
  publishConsent: boolean;
  status: 'draft' | 'submitted' | 'published' | 'rejected';
}

export interface AdminDashboardStats {
  openPartnerApplications: number;
  openTickets: number;
  unreadMessages: number;
  documentsPendingReview: number;
  openPayments: number;
  commissionsUnderReview: number;
  payoutRequests: number;
  upcomingAppointments: number;
}

export interface CustomerDashboard {
  welcomeName: string;
  activeProjects: Project[];
  openQuotes: Quote[];
  openInvoices: Invoice[];
  unreadMessages: number;
  upcomingAppointments: Appointment[];
  documentsPendingReview: number;
  unavailableSurfaces?: ('conversations' | 'appointments')[];
}
