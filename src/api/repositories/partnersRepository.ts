import { listCommissions, requestPayout } from '@/api/repositories/commissionsRepository';
import { mockStore } from '@/api/mockData';
import { delay, requireLiveSupabase, shouldUseMockApi } from '@/api/repositories/_utils';
import { DomainError, fromSupabaseError } from '@/lib/errors';
import { mapPartnerProfile } from '@/lib/mappers';
import type { Lead, PartnerProfile } from '@/types/domain';
import type { PartnerApplicationInput } from '@/validation/partner';

async function requireCurrentPartnerProfile(supabase: ReturnType<typeof requireLiveSupabase>) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw DomainError.unauthorized('You must be signed in as a partner.');
  }
  const { data, error } = await supabase
    .from('partner_profiles')
    .select('*')
    .eq('user_id', userData.user.id)
    .maybeSingle();
  if (error) throw fromSupabaseError(error);
  return data;
}

export async function getPartnerProfile(): Promise<PartnerProfile | null> {
  if (shouldUseMockApi()) {
    await delay();
    return { ...mockStore.partner };
  }
  const supabase = requireLiveSupabase();
  const profile = await requireCurrentPartnerProfile(supabase);
  if (!profile) return null;

  const { data: codeRow } = await supabase
    .from('partner_codes')
    .select('code')
    .eq('partner_id', profile.id)
    .eq('is_active', true)
    .maybeSingle();
  const { data: linkRow } = await supabase
    .from('partner_links')
    .select('slug')
    .eq('partner_id', profile.id)
    .eq('is_active', true)
    .maybeSingle();

  return mapPartnerProfile(profile, {
    code: codeRow?.code ?? '',
    linkUrl: linkRow?.slug ? `https://vdbdigital.nl/r/${linkRow.slug}` : '',
  });
}

/**
 * There is no `leads` table in the current schema — this is a real gap, not a
 * mock. We fail closed with a clear configuration error instead of querying a
 * table that does not exist or fabricating data.
 */
export async function listLeads(): Promise<Lead[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.leads];
  }
  requireLiveSupabase();
  throw DomainError.configuration(
    'Leads are not yet available: the `leads` table has not been provisioned in Supabase.',
  );
}

export async function createLead(input: {
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  consentConfirmed: boolean;
}): Promise<Lead> {
  if (!input.consentConfirmed) {
    throw DomainError.validation('Lead consent required');
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
  requireLiveSupabase();
  throw DomainError.configuration(
    'Leads are not yet available: the `leads` table has not been provisioned in Supabase.',
  );
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

  const supabase = requireLiveSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw DomainError.unauthorized('You must be signed in to apply as a partner.');
  }

  const fullName = 'contactName' in input ? input.contactName : userData.user.email ?? '';
  const { data, error } = await supabase
    .from('partner_applications')
    .insert({
      user_id: userData.user.id,
      full_name: fullName,
      company_name: input.companyName || null,
      email: input.email,
      phone: input.phone || null,
      motivation: input.motivation ?? '',
      status: 'submitted',
      accepted_partner_rules: true,
      accepted_privacy_policy: true,
    })
    .select('id')
    .single();
  if (error) throw fromSupabaseError(error);
  return { id: data.id, status: 'submitted' };
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
