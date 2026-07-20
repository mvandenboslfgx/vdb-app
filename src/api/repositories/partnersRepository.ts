import { listCommissions, requestPayout } from '@/api/repositories/commissionsRepository';
import { mockStore } from '@/api/mockData';
import { delay, shouldUseMockApi } from '@/api/repositories/_utils';
import { getSupabase } from '@/lib/supabase';
import type { Lead, PartnerProfile } from '@/types/domain';
import type { PartnerApplicationInput } from '@/validation/partner';

export async function getPartnerProfile(): Promise<PartnerProfile | null> {
  if (shouldUseMockApi()) {
    await delay();
    return { ...mockStore.partner };
  }
  const supabase = getSupabase();
  if (!supabase) return { ...mockStore.partner };
  const { data, error } = await supabase.from('partners').select('*').maybeSingle();
  if (error) throw new Error(error.message);
  return data as PartnerProfile | null;
}

export async function listLeads(): Promise<Lead[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.leads];
  }
  const supabase = getSupabase();
  if (!supabase) return [...mockStore.leads];
  const { data, error } = await supabase.from('leads').select('*').order('created_at', {
    ascending: false,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as Lead[];
}

export async function createLead(input: {
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  consentConfirmed: boolean;
}): Promise<Lead> {
  if (!input.consentConfirmed) {
    throw new Error('Lead consent required');
  }
  if (shouldUseMockApi()) {
    await delay();
    const lead: Lead = {
      id: `lead-${Date.now()}`,
      partnerId: mockStore.partner.id,
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      status: 'new',
      notes: input.notes ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockStore.leads.unshift(lead);
    return lead;
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('leads')
    .insert({
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      notes: input.notes ?? null,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Lead;
}

export async function getPartnerLink(): Promise<string> {
  const profile = await getPartnerProfile();
  return profile?.linkUrl ?? '';
}

export async function submitPartnerApplication(
  input:
    | PartnerApplicationInput
    | {
        companyName: string;
        contactName: string;
        email: string;
        phone?: string;
        website?: string;
        kvkNumber?: string;
        vatNumber?: string;
        motivation?: string;
      },
): Promise<{ id: string; status: 'submitted' }> {
  if (shouldUseMockApi()) {
    await delay(200);
    return { id: `app-${Date.now()}`, status: 'submitted' };
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('partner_applications')
    .insert({
      company_name: input.companyName,
      contact_name: input.contactName,
      email: input.email,
      phone: input.phone ?? null,
      website: input.website || null,
      kvk_number: input.kvkNumber || null,
      vat_number: input.vatNumber || null,
      motivation: input.motivation ?? '',
      status: 'submitted',
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id as string, status: 'submitted' };
}

export const partnersRepository = {
  getProfile: getPartnerProfile,
  listLeads,
  createLead,
  getPartnerLink,
  partnerLink: getPartnerLink,
  listCommissions,
  requestPayout,
  submitApplication: submitPartnerApplication,
  apply: submitPartnerApplication,
};

/** Alias used by partner feature hooks */
export const partnerRepository = partnersRepository;
