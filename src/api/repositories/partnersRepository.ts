import {
  getPayableBalance,
  listCommissions,
  listPayoutRequests,
  requestPayout,
} from '@/api/repositories/commissionsRepository';
import { mockStore } from '@/api/mockData';
import { delay, requireLiveSupabase, shouldUseMockApi } from '@/api/repositories/_utils';
import { DomainError, fromSupabaseError } from '@/lib/errors';
import { mapLead, mapPartnerProfile } from '@/lib/mappers';
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
 * Lists the current partner's leads from the real `partner_leads` table
 * (see supabase/migrations/20260720101600_business_flow_completion.sql).
 * RLS restricts rows to `partner_id = current_partner_id()` -- this
 * repository never filters client-side, the database is the source of truth.
 */
export async function listLeads(): Promise<Lead[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.leads];
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase
    .from('partner_leads')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw fromSupabaseError(error);
  return (data ?? []).map(mapLead);
}

export interface CreateLeadInput {
  name: string;
  email: string;
  phone?: string;
  interest?: string;
  notes?: string;
  campaignCode?: string;
  consentConfirmed: boolean;
}

/**
 * Registers a new lead via the `register_partner_lead` RPC. The database
 * independently re-checks partner activation, suspension, consent, and
 * per-partner email dedupe -- this client-side check is fail-fast only.
 */
export async function createLead(input: CreateLeadInput): Promise<Lead> {
  if (!input.consentConfirmed) {
    throw DomainError.validation('Lead consent required');
  }
  if (shouldUseMockApi()) {
    await delay();
    const now = new Date().toISOString();
    const lead: Lead = {
      id: `lead-${Date.now()}`,
      partnerId: mockStore.partner.id,
      campaignCode: input.campaignCode ?? null,
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      interest: input.interest ?? null,
      status: 'new',
      notes: input.notes ?? null,
      consentGiven: true,
      consentAt: now,
      saleId: null,
      convertedAt: null,
      rejectedReason: null,
      createdAt: now,
      updatedAt: now,
    };
    mockStore.leads.unshift(lead);
    return lead;
  }

  const supabase = requireLiveSupabase();
  const { data, error } = await supabase.rpc('register_partner_lead', {
    p_name: input.name,
    p_email: input.email,
    p_consent_given: input.consentConfirmed,
    p_campaign_code: input.campaignCode || undefined,
    p_phone: input.phone || undefined,
    p_interest: input.interest || undefined,
    p_notes: input.notes || undefined,
  });
  if (error) throw fromSupabaseError(error);
  return mapLead(data);
}

export interface UpdateLeadContactInput {
  name?: string;
  phone?: string;
  interest?: string;
  notes?: string;
  markContacted?: boolean;
}

/**
 * Updates contact details on an owned lead via `update_partner_lead_contact`.
 * The RPC itself blocks this once a lead has progressed past
 * `new`/`contacted` -- partners can never edit a qualified/converted lead.
 */
export async function updateLeadContact(leadId: string, input: UpdateLeadContactInput): Promise<Lead> {
  if (shouldUseMockApi()) {
    await delay();
    const lead = mockStore.leads.find((l) => l.id === leadId);
    if (!lead) throw DomainError.notFound('Lead not found');
    if (lead.status !== 'new' && lead.status !== 'contacted') {
      throw DomainError.forbidden('This lead can no longer be edited.');
    }
    lead.name = input.name ?? lead.name;
    lead.phone = input.phone ?? lead.phone;
    lead.interest = input.interest ?? lead.interest;
    lead.notes = input.notes ?? lead.notes;
    if (input.markContacted && lead.status === 'new') lead.status = 'contacted';
    lead.updatedAt = new Date().toISOString();
    return { ...lead };
  }

  const supabase = requireLiveSupabase();
  const { data, error } = await supabase.rpc('update_partner_lead_contact', {
    p_lead_id: leadId,
    p_name: input.name || undefined,
    p_phone: input.phone || undefined,
    p_interest: input.interest || undefined,
    p_notes: input.notes || undefined,
    p_mark_contacted: input.markContacted ?? false,
  });
  if (error) throw fromSupabaseError(error);
  return mapLead(data);
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
  updateLeadContact,
  getPartnerLink,
  partnerLink: getPartnerLink,
  listCommissions,
  requestPayout,
  getPayableBalance,
  listPayoutRequests,
  submitApplication: submitPartnerApplication,
  apply: submitPartnerApplication,
};

/** Alias used by partner feature hooks */
export const partnerRepository = partnersRepository;