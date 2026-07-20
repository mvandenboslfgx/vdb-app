import type {
  Appointment,
  Commission,
  Conversation,
  CustomerDashboard,
  Document,
  Invoice,
  Lead,
  Message,
  NotificationItem,
  PartnerProfile,
  Project,
  Quote,
  SupportTicket,
  AdminDashboardStats,
} from '@/types';

const now = new Date();
const iso = (daysOffset: number) =>
  new Date(now.getTime() + daysOffset * 24 * 60 * 60 * 1000).toISOString();

export const mockProjects: Project[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Corporate website redesign',
    description: 'Nieuwe website met CMS en leadformulieren.',
    status: 'in_progress',
    customerId: 'mock-user-1',
    progressPercent: 62,
    nextMilestone: 'Homepagina review',
    createdAt: iso(-40),
    updatedAt: iso(-1),
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    title: 'Automatisering offertes',
    description: 'Workflow voor offertegeneratie en opvolging.',
    status: 'waiting_for_customer',
    customerId: 'mock-user-1',
    progressPercent: 40,
    nextMilestone: 'Feedback klant',
    createdAt: iso(-20),
    updatedAt: iso(-2),
  },
];

export const mockQuotes: Quote[] = [
  {
    id: '33333333-3333-4333-8333-333333333333',
    number: 'OFF-2026-014',
    title: 'Website redesign fase 2',
    status: 'sent',
    validUntil: iso(14),
    currency: 'EUR',
    subtotalCents: 420000,
    vatCents: 88200,
    totalCents: 508200,
    items: [
      {
        id: 'qi-1',
        description: 'UX & design',
        quantity: 1,
        unitPriceCents: 180000,
        vatPercent: 21,
      },
      {
        id: 'qi-2',
        description: 'Development',
        quantity: 1,
        unitPriceCents: 240000,
        vatPercent: 21,
      },
    ],
    projectId: mockProjects[0]!.id,
    termsVersion: null,
    createdAt: iso(-5),
    updatedAt: iso(-5),
  },
];

export const mockInvoices: Invoice[] = [
  {
    id: '44444444-4444-4444-8444-444444444444',
    number: 'FAC-2026-008',
    status: 'sent',
    issueDate: iso(-10),
    dueDate: iso(5),
    currency: 'EUR',
    subtotalCents: 150000,
    vatCents: 31500,
    totalCents: 181500,
    amountPaidCents: 0,
    projectId: mockProjects[0]!.id,
    paymentReference: 'VDB-FAC-2026-008',
    pdfAvailable: true,
    createdAt: iso(-10),
    updatedAt: iso(-10),
  },
];

export const mockConversations: Conversation[] = [
  {
    id: '55555555-5555-4555-8555-555555555555',
    title: 'Project: Corporate website',
    lastMessagePreview: 'De wireframes staan klaar voor review.',
    lastMessageAt: iso(-0.1),
    unreadCount: 2,
    projectId: mockProjects[0]!.id,
    createdAt: iso(-15),
    updatedAt: iso(-0.1),
  },
];

export const mockMessages: Message[] = [
  {
    id: 'm-1',
    conversationId: mockConversations[0]!.id,
    senderId: 'vdb-staff-1',
    senderName: 'VDB Digital',
    body: 'De wireframes staan klaar voor review.',
    deliveryStatus: 'delivered',
    createdAt: iso(-0.1),
    updatedAt: iso(-0.1),
  },
  {
    id: 'm-2',
    conversationId: mockConversations[0]!.id,
    senderId: 'mock-user-1',
    senderName: 'Demo Gebruiker',
    body: 'Top, ik bekijk ze vandaag.',
    deliveryStatus: 'read',
    createdAt: iso(-0.05),
    updatedAt: iso(-0.05),
  },
];

export const mockDocuments: Document[] = [
  {
    id: '66666666-6666-4666-8666-666666666666',
    projectId: mockProjects[0]!.id,
    title: 'Homepage design v3',
    status: 'under_review',
    currentVersion: 3,
    mimeType: 'application/pdf',
    sizeBytes: 1_240_000,
    scanStatus: 'clean',
    createdAt: iso(-3),
    updatedAt: iso(-1),
  },
];

export const mockTickets: SupportTicket[] = [
  {
    id: '77777777-7777-4777-8777-777777777777',
    subject: 'Vraag over planning',
    category: 'project',
    priority: 'medium',
    status: 'waiting_for_vdb',
    description: 'Kunnen we de oplevering met Ã©Ã©n week verschuiven?',
    createdAt: iso(-4),
    updatedAt: iso(-1),
  },
];

export const mockAppointments: Appointment[] = [
  {
    id: '88888888-8888-4888-8888-888888888888',
    title: 'Intake call',
    startsAt: iso(2),
    endsAt: iso(2.04),
    status: 'confirmed',
    location: 'Google Meet',
    timezone: 'Europe/Amsterdam',
    createdAt: iso(-7),
    updatedAt: iso(-7),
  },
];

export const mockPartner: PartnerProfile = {
  id: 'partner-1',
  userId: 'mock-partner-1',
  companyName: 'Demo Partner BV',
  code: 'VDB-DEMO',
  linkUrl: 'https://vdbdigital.nl/r/VDB-DEMO',
  status: 'active',
  createdAt: iso(-90),
  updatedAt: iso(-1),
};

export const mockLeads: Lead[] = [
  {
    id: '99999999-9999-4999-8999-999999999999',
    partnerId: mockPartner.id,
    name: 'Anna Jansen',
    email: 'anna@example.nl',
    phone: '+31612345678',
    status: 'qualified',
    notes: 'GeÃ¯nteresseerd in webshop',
    createdAt: iso(-6),
    updatedAt: iso(-2),
  },
];

export const mockCommissions: Commission[] = [
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    partnerId: mockPartner.id,
    saleLabel: 'Website pakket â€” Anna Jansen',
    amountCents: 45000,
    currency: 'EUR',
    status: 'under_review',
    expectedReleaseAt: iso(21),
    createdAt: iso(-12),
    updatedAt: iso(-1),
  },
];

export const mockNotifications: NotificationItem[] = [
  {
    id: 'n-1',
    title: 'Nieuwe offerte',
    body: 'Offerte OFF-2026-014 staat klaar.',
    read: false,
    deepLink: 'https://vdbdigital.nl/app/quotes/33333333-3333-4333-8333-333333333333',
    createdAt: iso(-1),
    updatedAt: iso(-1),
  },
];

export function getMockCustomerDashboard(name: string): CustomerDashboard {
  return {
    welcomeName: name,
    activeProjects: mockProjects.filter((p) => p.status !== 'completed' && p.status !== 'cancelled'),
    openQuotes: mockQuotes.filter((q) => q.status === 'sent' || q.status === 'viewed'),
    openInvoices: mockInvoices.filter((i) => i.status === 'sent' || i.status === 'overdue'),
    unreadMessages: mockConversations.reduce((sum, c) => sum + c.unreadCount, 0),
    upcomingAppointments: mockAppointments,
    documentsPendingReview: mockDocuments.filter((d) => d.status === 'under_review').length,
  };
}

export function getMockAdminStats(): AdminDashboardStats {
  return {
    openPartnerApplications: 3,
    openTickets: 5,
    unreadMessages: 8,
    documentsPendingReview: 2,
    openPayments: 4,
    commissionsUnderReview: 2,
    payoutRequests: 1,
    upcomingAppointments: 3,
  };
}

export async function delay(ms = 280): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
