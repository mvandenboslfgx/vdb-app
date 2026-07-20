import { delay, mockLeads, mockPartner } from '@/features/_shared/mockData';
import type { Lead, PartnerProfile } from '@/types';
import type { LeadInput, PartnerApplicationInput } from '@/validation';

export interface PartnersRepository {
  getProfile(): Promise<PartnerProfile>;
  listLeads(): Promise<Lead[]>;
  registerLead(input: LeadInput): Promise<Lead>;
  submitApplication(input: PartnerApplicationInput): Promise<{ status: 'submitted' }>;
}

class MockPartnersRepository implements PartnersRepository {
  async getProfile(): Promise<PartnerProfile> {
    await delay();
    return mockPartner;
  }

  async listLeads(): Promise<Lead[]> {
    await delay();
    return [...mockLeads];
  }

  async registerLead(input: LeadInput): Promise<Lead> {
    await delay();
    const lead: Lead = {
      id: `lead-${Date.now()}`,
      partnerId: mockPartner.id,
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      status: 'new',
      notes: input.notes ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockLeads.unshift(lead);
    return lead;
  }

  async submitApplication(_input: PartnerApplicationInput): Promise<{ status: 'submitted' }> {
    await delay();
    return { status: 'submitted' };
  }
}

export function createPartnersRepository(): PartnersRepository {
  return new MockPartnersRepository();
}
