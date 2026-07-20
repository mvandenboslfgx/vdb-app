/**
 * Mock data + repositories for local demo mode.
 */
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function w(rel, content) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content.replace(/\r?\n/g, '\n'), 'utf8');
  console.log('wrote', rel);
}

w(
  'src/api/mockData.ts',
  `import type {
  Appointment,
  ChatMessage,
  Commission,
  Conversation,
  DashboardAction,
  DocumentRecord,
  Invoice,
  Project,
  ProjectMilestone,
  Quote,
  SupportTicket,
} from '@/types/domain';

export const mockProjects: Project[] = [
  {
    id: 'proj-1',
    title: 'Bedrijfswebsite vernieuwing',
    description: 'Nieuwe corporate site met CMS en leadformulieren.',
    status: 'in_progress',
    customerId: 'demo-customer',
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-07-18T14:00:00.000Z',
  },
  {
    id: 'proj-2',
    title: 'Automatisering offertetraject',
    description: 'Workflow van aanvraag tot digitale acceptatie.',
    status: 'waiting_on_customer',
    customerId: 'demo-customer',
    createdAt: '2026-05-12T09:00:00.000Z',
    updatedAt: '2026-07-15T11:00:00.000Z',
  },
];

export const mockMilestones: ProjectMilestone[] = [
  {
    id: 'ms-1',
    projectId: 'proj-1',
    title: 'Design akkoord',
    description: 'Visueel ontwerp goedgekeurd',
    dueDate: '2026-06-20T00:00:00.000Z',
    completedAt: '2026-06-18T00:00:00.000Z',
    sortOrder: 1,
  },
  {
    id: 'ms-2',
    projectId: 'proj-1',
    title: 'Development sprint 1',
    description: null,
    dueDate: '2026-07-25T00:00:00.000Z',
    completedAt: null,
    sortOrder: 2,
  },
];

export const mockConversations: Conversation[] = [
  {
    id: 'conv-1',
    title: 'Projectchat — Bedrijfswebsite',
    projectId: 'proj-1',
    updatedAt: '2026-07-19T16:20:00.000Z',
    unreadCount: 2,
  },
  {
    id: 'conv-2',
    title: 'Support — Hostingvraag',
    projectId: null,
    updatedAt: '2026-07-17T09:10:00.000Z',
    unreadCount: 0,
  },
];

export const mockMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: 'staff-1',
    body: 'De homepage-mockups staan klaar ter review.',
    createdAt: '2026-07-19T15:00:00.000Z',
    deliveredAt: '2026-07-19T15:00:01.000Z',
    readAt: null,
  },
  {
    id: 'msg-2',
    conversationId: 'conv-1',
    senderId: 'demo-customer',
    body: 'Dank je, ik bekijk ze vandaag.',
    createdAt: '2026-07-19T16:20:00.000Z',
    deliveredAt: '2026-07-19T16:20:01.000Z',
    readAt: '2026-07-19T16:21:00.000Z',
  },
];

export const mockDocuments: DocumentRecord[] = [
  {
    id: 'doc-1',
    projectId: 'proj-1',
    title: 'Homepage design v3',
    status: 'under_review',
    currentVersion: 3,
    updatedAt: '2026-07-19T12:00:00.000Z',
  },
  {
    id: 'doc-2',
    projectId: 'proj-1',
    title: 'Technische specificatie',
    status: 'available',
    currentVersion: 1,
    updatedAt: '2026-07-10T08:00:00.000Z',
  },
];

export const mockQuotes: Quote[] = [
  {
    id: 'quote-1',
    number: 'OFF-2026-014',
    title: 'Website + CMS',
    status: 'sent',
    totalCents: 485000,
    vatCents: 84348,
    currency: 'EUR',
    validUntil: '2026-08-01T22:00:00.000Z',
    createdAt: '2026-07-01T10:00:00.000Z',
  },
];

export const mockInvoices: Invoice[] = [
  {
    id: 'inv-1',
    number: 'FACT-2026-008',
    status: 'open',
    totalCents: 181500,
    vatCents: 31500,
    currency: 'EUR',
    issuedAt: '2026-07-05T10:00:00.000Z',
    dueAt: '2026-07-20T22:00:00.000Z',
    paymentReference: 'VDB-FACT-008',
  },
];

export const mockAppointments: Appointment[] = [
  {
    id: 'appt-1',
    title: 'Voortgangsgesprek',
    startsAt: '2026-07-22T13:00:00.000Z',
    endsAt: '2026-07-22T13:45:00.000Z',
    timezone: 'Europe/Amsterdam',
    status: 'confirmed',
    location: 'Online (Google Meet)',
  },
];

export const mockTickets: SupportTicket[] = [
  {
    id: 'tkt-1',
    subject: 'DNS wijziging doorvoeren',
    category: 'hosting',
    priority: 'medium',
    status: 'waiting_for_vdb',
    description: 'Graag nameservers omzetten naar de nieuwe omgeving.',
    createdAt: '2026-07-16T11:00:00.000Z',
    updatedAt: '2026-07-17T09:00:00.000Z',
  },
];

export const mockCommissions: Commission[] = [
  {
    id: 'com-1',
    partnerId: 'demo-partner',
    saleId: 'sale-1',
    amountCents: 25000,
    basisCents: 250000,
    rateBps: 1000,
    status: 'under_review',
    expectedReleaseAt: '2026-08-15T00:00:00.000Z',
    updatedAt: '2026-07-18T10:00:00.000Z',
  },
  {
    id: 'com-2',
    partnerId: 'demo-partner',
    saleId: 'sale-2',
    amountCents: 12000,
    basisCents: 120000,
    rateBps: 1000,
    status: 'payable',
    expectedReleaseAt: '2026-07-10T00:00:00.000Z',
    updatedAt: '2026-07-12T10:00:00.000Z',
  },
];

export const mockCustomerActions: DashboardAction[] = [
  {
    id: 'a1',
    type: 'document',
    title: 'Homepage design v3 beoordelen',
    subtitle: 'Wacht op jouw goedkeuring',
    href: '/(customer)/documents/doc-1',
    urgency: 'high',
  },
  {
    id: 'a2',
    type: 'quote',
    title: 'Offerte OFF-2026-014',
    subtitle: 'Geldig tot 1 augustus',
    href: '/(customer)/quotes/quote-1',
    urgency: 'medium',
  },
  {
    id: 'a3',
    type: 'invoice',
    title: 'Factuur FACT-2026-008',
    subtitle: 'Openstaand',
    href: '/(customer)/invoices/inv-1',
    urgency: 'high',
  },
];

export const mockAdminActions: DashboardAction[] = [
  {
    id: 'ad1',
    type: 'partner_application',
    title: 'Partneraanvraag — Jansen Media',
    href: '/(admin)/approvals',
    urgency: 'high',
  },
  {
    id: 'ad2',
    type: 'commission',
    title: 'Commissie onder review',
    href: '/(admin)/finance',
    urgency: 'medium',
  },
  {
    id: 'ad3',
    type: 'ticket',
    title: 'Open ticket: DNS wijziging',
    href: '/(admin)/tickets',
    urgency: 'medium',
  },
];

export const mockPartnerLeads = [
  {
    id: 'lead-1',
    name: 'Bakkerij De Korst',
    email: 'info@example-bakkerij.nl',
    status: 'qualified' as const,
    createdAt: '2026-07-14T10:00:00.000Z',
  },
  {
    id: 'lead-2',
    name: 'Studio Noord',
    email: 'hello@example-studio.nl',
    status: 'new' as const,
    createdAt: '2026-07-19T08:00:00.000Z',
  },
];
`,
);

w(
  'src/api/repositories/projectsRepository.ts',
  `import { clientEnv } from '@/config/env';
import { mockMilestones, mockProjects } from '@/api/mockData';
import type { Project, ProjectMilestone } from '@/types/domain';

export async function listProjects(): Promise<Project[]> {
  if (clientEnv.useMockData) return mockProjects;
  // Remote mapping lands after migrations are applied.
  return mockProjects;
}

export async function getProject(id: string): Promise<Project | null> {
  const all = await listProjects();
  return all.find((p) => p.id === id) ?? null;
}

export async function listMilestones(projectId: string): Promise<ProjectMilestone[]> {
  if (clientEnv.useMockData) {
    return mockMilestones.filter((m) => m.projectId === projectId);
  }
  return mockMilestones.filter((m) => m.projectId === projectId);
}
`,
);

w(
  'src/api/repositories/messagesRepository.ts',
  `import { clientEnv } from '@/config/env';
import { mockConversations, mockMessages } from '@/api/mockData';
import type { ChatMessage, Conversation } from '@/types/domain';
import { createIdempotencyKey } from '@/lib/idempotency';

export async function listConversations(): Promise<Conversation[]> {
  return mockConversations;
}

export async function listMessages(conversationId: string): Promise<ChatMessage[]> {
  return mockMessages.filter((m) => m.conversationId === conversationId);
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string,
): Promise<ChatMessage> {
  const message: ChatMessage = {
    id: \`msg-\${Date.now()}\`,
    conversationId,
    senderId,
    body,
    createdAt: new Date().toISOString(),
    deliveredAt: null,
    readAt: null,
  };
  if (clientEnv.useMockData) {
    mockMessages.push(message);
    void createIdempotencyKey();
    return message;
  }
  return message;
}
`,
);

w(
  'src/api/repositories/documentsRepository.ts',
  `import { mockDocuments } from '@/api/mockData';
import type { DocumentRecord } from '@/types/domain';

export async function listDocuments(): Promise<DocumentRecord[]> {
  return mockDocuments;
}

export async function getDocument(id: string): Promise<DocumentRecord | null> {
  return mockDocuments.find((d) => d.id === id) ?? null;
}

export async function reviewDocument(
  id: string,
  decision: 'approved' | 'changes_requested',
  _comment?: string,
): Promise<DocumentRecord> {
  const doc = mockDocuments.find((d) => d.id === id);
  if (!doc) throw new Error('Document not found');
  doc.status = decision === 'approved' ? 'approved' : 'changes_requested';
  doc.updatedAt = new Date().toISOString();
  return doc;
}
`,
);

w(
  'src/api/repositories/quotesRepository.ts',
  `import { mockQuotes } from '@/api/mockData';
import type { Quote } from '@/types/domain';

export async function listQuotes(): Promise<Quote[]> {
  return mockQuotes;
}

export async function getQuote(id: string): Promise<Quote | null> {
  return mockQuotes.find((q) => q.id === id) ?? null;
}

export async function decideQuote(
  id: string,
  decision: 'accepted' | 'rejected',
): Promise<Quote> {
  const quote = mockQuotes.find((q) => q.id === id);
  if (!quote) throw new Error('Quote not found');
  quote.status = decision;
  return quote;
}
`,
);

w(
  'src/api/repositories/invoicesRepository.ts',
  `import { mockInvoices } from '@/api/mockData';
import type { Invoice } from '@/types/domain';

export async function listInvoices(): Promise<Invoice[]> {
  return mockInvoices;
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  return mockInvoices.find((i) => i.id === id) ?? null;
}
`,
);

w(
  'src/api/repositories/paymentsRepository.ts',
  `import { evaluatePaymentPolicy, type ProductPolicyType } from '@/security/paymentPolicy';
import { DEFAULT_FEATURE_FLAGS } from '@/security/featureFlags';

export interface CheckoutRequest {
  invoiceId: string;
  productType: ProductPolicyType;
  platform: 'android' | 'ios' | 'web';
}

export interface CheckoutResult {
  ok: boolean;
  checkoutUrl?: string;
  messageKey?: string;
}

/**
 * Fail-closed checkout. Never marks payments as paid locally.
 */
export async function createCheckout(input: CheckoutRequest): Promise<CheckoutResult> {
  const decision = evaluatePaymentPolicy({
    productType: input.productType,
    platform: input.platform,
    mollieCheckoutEnabled: DEFAULT_FEATURE_FLAGS.mollie_checkout,
    digitalProductCheckoutEnabled: DEFAULT_FEATURE_FLAGS.digital_product_checkout,
  });

  if (!decision.allowed) {
    return { ok: false, messageKey: decision.messageKey };
  }

  // Without server function + Mollie key, checkout stays unavailable.
  return {
    ok: false,
    messageKey: 'payments.policy.checkoutDisabled',
  };
}
`,
);

w(
  'src/api/repositories/supportRepository.ts',
  `import { mockTickets } from '@/api/mockData';
import type { SupportTicket } from '@/types/domain';

export async function listTickets(): Promise<SupportTicket[]> {
  return mockTickets;
}

export async function getTicket(id: string): Promise<SupportTicket | null> {
  return mockTickets.find((t) => t.id === id) ?? null;
}

export async function createTicket(input: {
  subject: string;
  category: string;
  description: string;
  priority?: SupportTicket['priority'];
}): Promise<SupportTicket> {
  const ticket: SupportTicket = {
    id: \`tkt-\${Date.now()}\`,
    subject: input.subject,
    category: input.category,
    priority: input.priority ?? 'medium',
    status: 'new',
    description: input.description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockTickets.unshift(ticket);
  return ticket;
}
`,
);

w(
  'src/api/repositories/appointmentsRepository.ts',
  `import { mockAppointments } from '@/api/mockData';
import type { Appointment } from '@/types/domain';

export async function listAppointments(): Promise<Appointment[]> {
  return mockAppointments;
}
`,
);

w(
  'src/api/repositories/commissionsRepository.ts',
  `import { mockCommissions } from '@/api/mockData';
import type { Commission } from '@/types/domain';

export async function listCommissions(): Promise<Commission[]> {
  return mockCommissions;
}
`,
);

w(
  'src/api/repositories/partnersRepository.ts',
  `import { mockPartnerLeads } from '@/api/mockData';

export async function listLeads() {
  return mockPartnerLeads;
}

export async function createLead(input: {
  name: string;
  email: string;
  consentConfirmed: boolean;
}) {
  if (!input.consentConfirmed) {
    throw new Error('Lead consent required');
  }
  const lead = {
    id: \`lead-\${Date.now()}\`,
    name: input.name,
    email: input.email,
    status: 'new' as const,
    createdAt: new Date().toISOString(),
  };
  mockPartnerLeads.unshift(lead);
  return lead;
}

export async function submitPartnerApplication(_input: Record<string, string>) {
  return { id: \`app-\${Date.now()}\`, status: 'submitted' as const };
}
`,
);

w(
  'src/api/repositories/adminRepository.ts',
  `import { mockAdminActions } from '@/api/mockData';

export async function getAdminDashboard() {
  return {
    actions: mockAdminActions,
    counts: {
      partnerApplications: 1,
      openTickets: 1,
      commissionsUnderReview: 1,
      payoutRequests: 0,
    },
  };
}

export async function approvePartnerApplication(id: string, actorId: string) {
  return { id, status: 'approved' as const, actorId };
}

export async function rejectPartnerApplication(
  id: string,
  actorId: string,
  internalReason: string,
) {
  if (!internalReason.trim()) {
    throw new Error('Internal rejection reason required');
  }
  return { id, status: 'rejected' as const, actorId };
}
`,
);

w(
  'src/api/repositories/customerRepository.ts',
  `import {
  mockAppointments,
  mockConversations,
  mockCustomerActions,
  mockInvoices,
  mockProjects,
  mockQuotes,
} from '@/api/mockData';

export async function getCustomerDashboard() {
  return {
    actions: mockCustomerActions,
    projects: mockProjects,
    quotes: mockQuotes,
    invoices: mockInvoices,
    unreadMessages: mockConversations.reduce((sum, c) => sum + c.unreadCount, 0),
    nextAppointment: mockAppointments[0] ?? null,
  };
}
`,
);

console.log('api repositories done');
