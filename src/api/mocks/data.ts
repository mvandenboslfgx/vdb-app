import type {
  AdminDashboardStats,
  Appointment,
  Commission,
  Conversation,
  CustomerDashboard,
  Document,
  Invoice,
  Lead,
  Message,
  Project,
  Quote,
  SupportTicket,
} from '@/types/domain';

const now = new Date().toISOString();

export const mockProjects: Project[] = [
  {
    id: 'proj-1',
    title: 'Website redesign',
    description: 'Full marketing site rebuild with CMS.',
    status: 'in_progress',
    customerId: 'demo-user',
    progressPercent: 45,
    nextMilestone: 'Homepage review',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'proj-2',
    title: 'Portal MVP',
    description: 'Customer portal phase 1.',
    status: 'planning',
    customerId: 'demo-user',
    progressPercent: 15,
    nextMilestone: 'Kickoff workshop',
    createdAt: now,
    updatedAt: now,
  },
];

export const mockQuotes: Quote[] = [
  {
    id: 'quote-1',
    number: 'Q-2026-014',
    title: 'Website redesign package',
    status: 'sent',
    validUntil: '2026-08-15',
    currency: 'EUR',
    subtotalCents: 450000,
    vatCents: 94500,
    totalCents: 544500,
    items: [
      {
        id: 'qi-1',
        description: 'Design & build',
        quantity: 1,
        unitPriceCents: 450000,
        vatPercent: 21,
      },
    ],
    projectId: 'proj-1',
    termsVersion: null,
    createdAt: now,
    updatedAt: now,
  },
];

export const mockInvoices: Invoice[] = [
  {
    id: 'inv-1',
    number: 'INV-2026-008',
    status: 'sent',
    issueDate: '2026-07-01',
    dueDate: '2026-07-31',
    currency: 'EUR',
    subtotalCents: 150000,
    vatCents: 31500,
    totalCents: 181500,
    amountPaidCents: 0,
    projectId: 'proj-1',
    paymentReference: 'VDB-INV-008',
    pdfAvailable: true,
    createdAt: now,
    updatedAt: now,
  },
];

export const mockConversations: Conversation[] = [
  {
    id: 'conv-1',
    title: 'Website redesign',
    lastMessagePreview: 'Homepage draft is ready for review.',
    lastMessageAt: now,
    unreadCount: 2,
    projectId: 'proj-1',
    createdAt: now,
    updatedAt: now,
  },
];

export const mockMessages: Message[] = [
  {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: 'staff-1',
    senderName: 'VDB Studio',
    body: 'Homepage draft is ready for review.',
    deliveryStatus: 'delivered',
    createdAt: now,
    updatedAt: now,
  },
];

export const mockDocuments: Document[] = [
  {
    id: 'doc-1',
    projectId: 'proj-1',
    title: 'Brand guidelines.pdf',
    status: 'available',
    currentVersion: 2,
    mimeType: 'application/pdf',
    sizeBytes: 240000,
    scanStatus: 'clean',
    createdAt: now,
    updatedAt: now,
  },
];

export const mockAppointments: Appointment[] = [
  {
    id: 'appt-1',
    title: 'Kickoff call',
    startsAt: '2026-07-22T09:00:00.000Z',
    endsAt: '2026-07-22T09:45:00.000Z',
    status: 'confirmed',
    location: 'Google Meet',
    timezone: 'Europe/Amsterdam',
    createdAt: now,
    updatedAt: now,
  },
];

export const mockTickets: SupportTicket[] = [
  {
    id: 'tkt-1',
    subject: 'Invoice PDF download',
    category: 'billing',
    priority: 'medium',
    status: 'open',
    description: 'Cannot download the latest invoice PDF.',
    createdAt: now,
    updatedAt: now,
  },
];

export const mockLeads: Lead[] = [
  {
    id: 'lead-1',
    partnerId: 'partner-1',
    campaignCode: null,
    name: 'Acme BV',
    email: 'hello@acme.example',
    phone: '+31612345678',
    interest: null,
    status: 'new',
    notes: 'Interested in ecommerce.',
    consentGiven: true,
    consentAt: now,
    saleId: null,
    convertedAt: null,
    rejectedReason: null,
    createdAt: now,
    updatedAt: now,
  },
];

export const mockCommissions: Commission[] = [
  {
    id: 'com-1',
    partnerId: 'partner-1',
    saleLabel: 'Website redesign â€” Acme',
    amountCents: 45000,
    currency: 'EUR',
    status: 'under_review',
    expectedReleaseAt: '2026-08-01',
    createdAt: now,
    updatedAt: now,
  },
];

export const mockCustomerDashboard: CustomerDashboard = {
  welcomeName: 'Demo',
  activeProjects: mockProjects,
  openQuotes: mockQuotes,
  openInvoices: mockInvoices,
  unreadMessages: 2,
  upcomingAppointments: mockAppointments,
  documentsPendingReview: 0,
};

export const mockAdminStats: AdminDashboardStats = {
  openPartnerApplications: 3,
  openTickets: 5,
  unreadMessages: 12,
  documentsPendingReview: 2,
  openPayments: 4,
  commissionsUnderReview: 2,
  payoutRequests: 1,
  upcomingAppointments: 3,
};

export const mockPartnerApplications = [
  {
    id: 'app-1',
    companyName: 'North Agency',
    email: 'partner@north.example',
    status: 'submitted' as const,
    createdAt: now,
  },
  {
    id: 'app-2',
    companyName: 'Studio Peak',
    email: 'hello@peak.example',
    status: 'under_review' as const,
    createdAt: now,
  },
];
