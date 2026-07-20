import type {
  AdminDashboardStats,
  Appointment,
  AppointmentSlot,
  Commission,
  Conversation,
  CustomerDashboard,
  Document,
  Invoice,
  Lead,
  Message,
  NotificationItem,
  PartnerProfile,
  Payment,
  PayoutRequest,
  Profile,
  Project,
  ProjectMilestone,
  ProjectUpdate,
  Quote,
  SupportTicket,
  SupportTicketMessage,
} from '@/types/domain';

export const DEMO_CUSTOMER_ID = 'demo-customer-0001';
export const DEMO_PARTNER_ID = 'demo-partner-0001';
export const DEMO_STAFF_ID = 'demo-staff-0001';

const now = '2026-07-20T12:00:00.000Z';
const daysAgo = (n: number) =>
  new Date(Date.UTC(2026, 6, 20 - n, 10, 0, 0)).toISOString();
const daysFromNow = (n: number) =>
  new Date(Date.UTC(2026, 6, 20 + n, 10, 0, 0)).toISOString();

export const mockProfile: Profile = {
  id: DEMO_CUSTOMER_ID,
  email: 'demo@vdbdigital.nl',
  fullName: 'Sanne de Vries',
  phone: '+31612345678',
  avatarUrl: null,
  locale: 'nl',
  roles: ['customer'],
  emailVerified: true,
  createdAt: daysAgo(120),
  updatedAt: now,
};

export const mockProjects: Project[] = [
  {
    id: 'proj-webshop-001',
    title: 'Webshop herlancering',
    description:
      'Nieuwe Next.js webshop met Mollie-checkout, productcatalogus en klantportaal.',
    status: 'in_progress',
    customerId: DEMO_CUSTOMER_ID,
    progressPercent: 62,
    nextMilestone: 'Checkout flow review',
    createdAt: daysAgo(45),
    updatedAt: daysAgo(1),
  },
  {
    id: 'proj-brand-002',
    title: 'Merkidentiteit & huisstijl',
    description: 'Logo-refresh, kleurenpalet, typografie en merkgids voor VDB Digital klant.',
    status: 'review',
    customerId: DEMO_CUSTOMER_ID,
    progressPercent: 88,
    nextMilestone: 'Feedbackronde 2',
    createdAt: daysAgo(60),
    updatedAt: daysAgo(2),
  },
  {
    id: 'proj-app-003',
    title: 'Klantportaal app',
    description: 'Expo mobiele app voor projectupdates, documenten en facturen.',
    status: 'planning',
    customerId: DEMO_CUSTOMER_ID,
    progressPercent: 18,
    nextMilestone: 'Wireframes afronden',
    createdAt: daysAgo(14),
    updatedAt: daysAgo(0),
  },
];

export const mockMilestones: ProjectMilestone[] = [
  {
    id: 'ms-1',
    projectId: 'proj-webshop-001',
    title: 'Discovery & scope',
    dueDate: daysAgo(30),
    completedAt: daysAgo(28),
    sortOrder: 1,
    createdAt: daysAgo(45),
    updatedAt: daysAgo(28),
  },
  {
    id: 'ms-2',
    projectId: 'proj-webshop-001',
    title: 'Design system',
    dueDate: daysAgo(14),
    completedAt: daysAgo(12),
    sortOrder: 2,
    createdAt: daysAgo(40),
    updatedAt: daysAgo(12),
  },
  {
    id: 'ms-3',
    projectId: 'proj-webshop-001',
    title: 'Checkout flow review',
    dueDate: daysFromNow(5),
    completedAt: null,
    sortOrder: 3,
    createdAt: daysAgo(20),
    updatedAt: daysAgo(1),
  },
];

export const mockProjectUpdates: ProjectUpdate[] = [
  {
    id: 'upd-1',
    projectId: 'proj-webshop-001',
    title: 'Betaalflow aangesloten',
    body: 'Mollie hosted checkout is aangesloten op staging. Klarna en iDEAL getest.',
    authorName: 'Jesse van VDB',
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: 'upd-2',
    projectId: 'proj-brand-002',
    title: 'Huisstijlgids v2',
    body: 'Nieuwe versie van de merkgids staat klaar ter review in Documenten.',
    authorName: 'Lisa Design',
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
];

export const mockConversations: Conversation[] = [
  {
    id: 'conv-1',
    title: 'Webshop herlancering',
    lastMessagePreview: 'De staging-URL staat klaar voor review.',
    lastMessageAt: daysAgo(0),
    unreadCount: 2,
    projectId: 'proj-webshop-001',
    createdAt: daysAgo(40),
    updatedAt: daysAgo(0),
  },
  {
    id: 'conv-2',
    title: 'Algemene support',
    lastMessagePreview: 'Bedankt, we kijken ernaar.',
    lastMessageAt: daysAgo(3),
    unreadCount: 0,
    projectId: null,
    createdAt: daysAgo(50),
    updatedAt: daysAgo(3),
  },
];

export const mockMessages: Message[] = [
  {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: DEMO_STAFF_ID,
    senderName: 'Jesse van VDB',
    body: 'Hoi Sanne, de staging-URL staat klaar voor review.',
    deliveryStatus: 'read',
    createdAt: daysAgo(0),
    updatedAt: daysAgo(0),
  },
  {
    id: 'msg-2',
    conversationId: 'conv-1',
    senderId: DEMO_STAFF_ID,
    senderName: 'Jesse van VDB',
    body: 'Kun je vooral de checkout op mobiel even testen?',
    deliveryStatus: 'delivered',
    createdAt: daysAgo(0),
    updatedAt: daysAgo(0),
  },
  {
    id: 'msg-3',
    conversationId: 'conv-2',
    senderId: DEMO_CUSTOMER_ID,
    senderName: 'Sanne de Vries',
    body: 'Ik heb een vraag over de factuur van juni.',
    deliveryStatus: 'read',
    createdAt: daysAgo(4),
    updatedAt: daysAgo(4),
  },
  {
    id: 'msg-4',
    conversationId: 'conv-2',
    senderId: DEMO_STAFF_ID,
    senderName: 'Support VDB',
    body: 'Bedankt, we kijken ernaar.',
    deliveryStatus: 'read',
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },
];

export const mockQuotes: Quote[] = [
  {
    id: 'quote-001',
    number: 'OFF-2026-0142',
    title: 'Klantportaal app — fase 1',
    status: 'sent',
    validUntil: daysFromNow(14),
    currency: 'EUR',
    subtotalCents: 680000,
    vatCents: 142800,
    totalCents: 822800,
    items: [
      {
        id: 'qi-1',
        description: 'UX wireframes & flows',
        quantity: 1,
        unitPriceCents: 180000,
        vatPercent: 21,
      },
      {
        id: 'qi-2',
        description: 'Expo app basis (auth, navigatie, theming)',
        quantity: 1,
        unitPriceCents: 500000,
        vatPercent: 21,
      },
    ],
    projectId: 'proj-app-003',
    termsVersion: '1.2',
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
  },
  {
    id: 'quote-002',
    number: 'OFF-2026-0098',
    title: 'Webshop herlancering — restwerk',
    status: 'accepted',
    validUntil: daysAgo(10),
    currency: 'EUR',
    subtotalCents: 240000,
    vatCents: 50400,
    totalCents: 290400,
    items: [
      {
        id: 'qi-3',
        description: 'Checkout afronden & testen',
        quantity: 1,
        unitPriceCents: 240000,
        vatPercent: 21,
      },
    ],
    projectId: 'proj-webshop-001',
    termsVersion: '1.1',
    createdAt: daysAgo(25),
    updatedAt: daysAgo(20),
  },
];

export const mockInvoices: Invoice[] = [
  {
    id: 'inv-001',
    number: 'FAC-2026-0311',
    status: 'sent',
    issueDate: daysAgo(7),
    dueDate: daysFromNow(14),
    currency: 'EUR',
    subtotalCents: 240000,
    vatCents: 50400,
    totalCents: 290400,
    amountPaidCents: 0,
    projectId: 'proj-webshop-001',
    paymentReference: 'VDB-FAC-2026-0311',
    pdfAvailable: true,
    createdAt: daysAgo(7),
    updatedAt: daysAgo(7),
  },
  {
    id: 'inv-002',
    number: 'FAC-2026-0288',
    status: 'paid',
    issueDate: daysAgo(40),
    dueDate: daysAgo(26),
    currency: 'EUR',
    subtotalCents: 450000,
    vatCents: 94500,
    totalCents: 544500,
    amountPaidCents: 544500,
    projectId: 'proj-brand-002',
    paymentReference: 'VDB-FAC-2026-0288',
    pdfAvailable: true,
    createdAt: daysAgo(40),
    updatedAt: daysAgo(30),
  },
  {
    id: 'inv-003',
    number: 'FAC-2026-0301',
    status: 'overdue',
    issueDate: daysAgo(35),
    dueDate: daysAgo(5),
    currency: 'EUR',
    subtotalCents: 95000,
    vatCents: 19950,
    totalCents: 114950,
    amountPaidCents: 0,
    projectId: null,
    paymentReference: 'VDB-FAC-2026-0301',
    pdfAvailable: true,
    createdAt: daysAgo(35),
    updatedAt: daysAgo(5),
  },
];

export const mockPayments: Payment[] = [
  {
    id: 'pay-001',
    invoiceId: 'inv-002',
    status: 'paid',
    amountCents: 544500,
    currency: 'EUR',
    checkoutUrl: null,
    productCategory: 'custom_project',
    createdAt: daysAgo(30),
    updatedAt: daysAgo(30),
  },
];

export const mockDocuments: Document[] = [
  {
    id: 'doc-001',
    projectId: 'proj-brand-002',
    title: 'Merkgids v2.pdf',
    status: 'under_review',
    currentVersion: 2,
    mimeType: 'application/pdf',
    sizeBytes: 2_450_000,
    scanStatus: 'clean',
    createdAt: daysAgo(3),
    updatedAt: daysAgo(2),
  },
  {
    id: 'doc-002',
    projectId: 'proj-webshop-001',
    title: 'Sitemap & IA.xlsx',
    status: 'approved',
    currentVersion: 1,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    sizeBytes: 180_000,
    scanStatus: 'clean',
    createdAt: daysAgo(20),
    updatedAt: daysAgo(18),
  },
  {
    id: 'doc-003',
    projectId: 'proj-app-003',
    title: 'Wireframes fase 1.fig',
    status: 'available',
    currentVersion: 1,
    mimeType: 'application/octet-stream',
    sizeBytes: 8_200_000,
    scanStatus: 'clean',
    createdAt: daysAgo(6),
    updatedAt: daysAgo(6),
  },
];

export const mockTickets: SupportTicket[] = [
  {
    id: 'ticket-001',
    subject: 'Vraag over factuur juni',
    category: 'billing',
    priority: 'medium',
    status: 'waiting_for_vdb',
    description: 'Klopt het bedrag op FAC-2026-0301? Ik mis de specificatie van uren.',
    createdAt: daysAgo(4),
    updatedAt: daysAgo(3),
  },
  {
    id: 'ticket-002',
    subject: 'Toegang tot staging',
    category: 'technical',
    priority: 'high',
    status: 'open',
    description: 'Ik kan niet inloggen op de staging-omgeving van de webshop.',
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
];

export const mockAppointments: Appointment[] = [
  {
    id: 'appt-001',
    title: 'Checkout review call',
    startsAt: daysFromNow(2).replace('T10:00:00.000Z', 'T13:00:00.000Z'),
    endsAt: daysFromNow(2).replace('T10:00:00.000Z', 'T13:45:00.000Z'),
    status: 'confirmed',
    location: 'Google Meet',
    timezone: 'Europe/Amsterdam',
    createdAt: daysAgo(5),
    updatedAt: daysAgo(4),
  },
  {
    id: 'appt-002',
    title: 'Intake klantportaal',
    startsAt: daysFromNow(8).replace('T10:00:00.000Z', 'T09:30:00.000Z'),
    endsAt: daysFromNow(8).replace('T10:00:00.000Z', 'T10:30:00.000Z'),
    status: 'requested',
    location: null,
    timezone: 'Europe/Amsterdam',
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
];

export const mockAvailabilitySlots: AppointmentSlot[] = [
  {
    id: 'slot-001',
    startsAt: daysFromNow(3).replace('T10:00:00.000Z', 'T09:00:00.000Z'),
    endsAt: daysFromNow(3).replace('T10:00:00.000Z', 'T09:30:00.000Z'),
    capacity: 1,
    bookedCount: 0,
    timezone: 'Europe/Amsterdam',
  },
  {
    id: 'slot-002',
    startsAt: daysFromNow(3).replace('T10:00:00.000Z', 'T11:00:00.000Z'),
    endsAt: daysFromNow(3).replace('T10:00:00.000Z', 'T11:30:00.000Z'),
    capacity: 1,
    bookedCount: 0,
    timezone: 'Europe/Amsterdam',
  },
  {
    id: 'slot-003',
    startsAt: daysFromNow(4).replace('T10:00:00.000Z', 'T14:00:00.000Z'),
    endsAt: daysFromNow(4).replace('T10:00:00.000Z', 'T14:30:00.000Z'),
    capacity: 1,
    bookedCount: 1,
    timezone: 'Europe/Amsterdam',
  },
];

export const mockPartner: PartnerProfile = {
  id: DEMO_PARTNER_ID,
  userId: 'demo-partner-user',
  companyName: 'Noordzee Studio',
  code: 'NOORDZEE',
  linkUrl: 'https://vdbdigital.nl/r/NOORDZEE',
  status: 'active',
  createdAt: daysAgo(90),
  updatedAt: daysAgo(10),
};

export const mockLeads: Lead[] = [
  {
    id: 'lead-001',
    partnerId: DEMO_PARTNER_ID,
    campaignCode: 'NOORDZEE',
    name: 'Tom Bakker',
    email: 'tom@bakker-media.nl',
    phone: '+31687654321',
    interest: 'Webshop + branding',
    status: 'qualified',
    notes: 'Zoekt webshop + branding.',
    consentGiven: true,
    consentAt: daysAgo(12),
    saleId: null,
    convertedAt: null,
    rejectedReason: null,
    createdAt: daysAgo(12),
    updatedAt: daysAgo(8),
  },
  {
    id: 'lead-002',
    partnerId: DEMO_PARTNER_ID,
    campaignCode: null,
    name: 'Iris Jansen',
    email: 'iris@jansen-retail.nl',
    phone: null,
    interest: null,
    status: 'contacted',
    notes: null,
    consentGiven: true,
    consentAt: daysAgo(4),
    saleId: null,
    convertedAt: null,
    rejectedReason: null,
    createdAt: daysAgo(4),
    updatedAt: daysAgo(3),
  },
];

export const mockCommissions: Commission[] = [
  {
    id: 'com-001',
    partnerId: DEMO_PARTNER_ID,
    saleLabel: 'Webshop pakket — Bakker Media',
    amountCents: 45000,
    currency: 'EUR',
    status: 'payable',
    expectedReleaseAt: daysFromNow(7),
    createdAt: daysAgo(20),
    updatedAt: daysAgo(2),
  },
  {
    id: 'com-002',
    partnerId: DEMO_PARTNER_ID,
    saleLabel: 'Branding basis — Jansen Retail',
    amountCents: 27500,
    currency: 'EUR',
    status: 'under_review',
    expectedReleaseAt: daysFromNow(21),
    createdAt: daysAgo(6),
    updatedAt: daysAgo(1),
  },
  {
    id: 'com-003',
    partnerId: DEMO_PARTNER_ID,
    saleLabel: 'Onderhoudscontract Q1',
    amountCents: 12000,
    currency: 'EUR',
    status: 'paid',
    expectedReleaseAt: daysAgo(30),
    createdAt: daysAgo(60),
    updatedAt: daysAgo(35),
  },
];

export const mockPayoutRequests: PayoutRequest[] = [];

export const mockTicketMessages: SupportTicketMessage[] = [
  {
    id: 'ticket-msg-001',
    ticketId: 'ticket-001',
    authorId: DEMO_CUSTOMER_ID,
    body: 'Klopt het bedrag op FAC-2026-0301? Ik mis de specificatie van uren.',
    isInternal: false,
    createdAt: daysAgo(4),
    updatedAt: daysAgo(4),
  },
];

export const mockNotifications: NotificationItem[] = [
  {
    id: 'notif-001',
    title: 'Nieuwe offerte',
    body: 'OFF-2026-0142 staat klaar ter acceptatie.',
    read: false,
    deepLink: 'https://vdbdigital.nl/app/quotes/quote-001',
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
  },
  {
    id: 'notif-002',
    title: 'Document ter review',
    body: 'Merkgids v2 wacht op jouw feedback.',
    read: false,
    deepLink: 'https://vdbdigital.nl/app/documents/doc-001',
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    id: 'notif-003',
    title: 'Factuur verstuurd',
    body: 'FAC-2026-0311 is beschikbaar in Facturen.',
    read: true,
    deepLink: 'https://vdbdigital.nl/app/invoices/inv-001',
    createdAt: daysAgo(7),
    updatedAt: daysAgo(6),
  },
];

export interface AdminQueueItem {
  id: string;
  type:
    | 'partner_application'
    | 'document_review'
    | 'support_ticket'
    | 'commission_review'
    | 'payout_request';
  title: string;
  subtitle: string;
  createdAt: string;
  priority: 'low' | 'medium' | 'high';
  companyName?: string;
  email?: string;
}

export const mockAdminQueue: AdminQueueItem[] = [
  {
    id: 'aq-1',
    type: 'partner_application',
    title: 'Partneraanvraag — Studio Rivier',
    subtitle: 'Ingediend door mara@studiorivier.nl',
    createdAt: daysAgo(1),
    priority: 'high',
    companyName: 'Studio Rivier',
    email: 'mara@studiorivier.nl',
  },
  {
    id: 'aq-2',
    type: 'document_review',
    title: 'Merkgids v2.pdf',
    subtitle: 'Project: Merkidentiteit & huisstijl',
    createdAt: daysAgo(2),
    priority: 'medium',
  },
  {
    id: 'aq-3',
    type: 'support_ticket',
    title: 'Toegang tot staging',
    subtitle: 'Prioriteit hoog',
    createdAt: daysAgo(1),
    priority: 'high',
  },
  {
    id: 'aq-4',
    type: 'commission_review',
    title: 'Commissie under review',
    subtitle: '€275,00 — Jansen Retail',
    createdAt: daysAgo(1),
    priority: 'medium',
  },
  {
    id: 'aq-5',
    type: 'payout_request',
    title: 'Uitbetalingsverzoek Noordzee Studio',
    subtitle: '€450,00 payable',
    createdAt: daysAgo(0),
    priority: 'high',
  },
];

export const mockAdminStats: AdminDashboardStats = {
  openPartnerApplications: 3,
  openTickets: 2,
  unreadMessages: 5,
  documentsPendingReview: 1,
  openPayments: 2,
  commissionsUnderReview: 1,
  payoutRequests: 1,
  upcomingAppointments: 2,
};

export function buildCustomerDashboard(welcomeName = mockProfile.fullName): CustomerDashboard {
  return {
    welcomeName,
    activeProjects: mockProjects.filter(
      (p) => !['completed', 'cancelled'].includes(p.status),
    ),
    openQuotes: mockQuotes.filter((q) => q.status === 'sent' || q.status === 'viewed'),
    openInvoices: mockInvoices.filter((i) =>
      ['sent', 'viewed', 'partially_paid', 'overdue'].includes(i.status),
    ),
    unreadMessages: mockConversations.reduce((sum, c) => sum + c.unreadCount, 0),
    upcomingAppointments: mockAppointments.filter((a) =>
      ['requested', 'confirmed', 'rescheduled'].includes(a.status),
    ),
    documentsPendingReview: mockDocuments.filter((d) => d.status === 'under_review').length,
  };
}

/** Mutable in-memory store for demo mutations. */
export const mockStore = {
  projects: [...mockProjects],
  milestones: [...mockMilestones],
  updates: [...mockProjectUpdates],
  conversations: [...mockConversations],
  messages: [...mockMessages],
  quotes: [...mockQuotes],
  invoices: [...mockInvoices],
  payments: [...mockPayments],
  documents: [...mockDocuments],
  tickets: [...mockTickets],
  appointments: [...mockAppointments],
  availabilitySlots: mockAvailabilitySlots.map((slot) => ({ ...slot })),
  partner: { ...mockPartner },
  leads: [...mockLeads],
  commissions: [...mockCommissions],
  payoutRequests: [...mockPayoutRequests],
  ticketMessages: [...mockTicketMessages],
  notifications: [...mockNotifications],
  adminQueue: [...mockAdminQueue],
  adminStats: { ...mockAdminStats },
};
