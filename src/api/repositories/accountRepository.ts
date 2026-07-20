import { mockPartner, mockProfile } from '@/api/mockData';
import { delay, requireLiveSupabase, shouldUseMockApi } from '@/api/repositories/_utils';
import { partnersRepository } from '@/api/repositories/partnersRepository';
import { DomainError, fromSupabaseError } from '@/lib/errors';
import type { AppRole, PartnerProfile, Profile, Review } from '@/types/domain';

export interface AccountDeletionRequest {
  id: string;
  status: 'submitted' | 'processing' | 'completed';
}

/** No `app_profiles` table exists yet — identity lives on the Supabase auth user. */
async function mapAuthUserToProfile(
  supabase: ReturnType<typeof requireLiveSupabase>,
): Promise<Profile> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw DomainError.unauthorized('You must be signed in to view your profile.');
  }
  const user = userData.user;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;

  const { data: roleRows, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .is('revoked_at', null);
  if (roleError) throw fromSupabaseError(roleError);
  const roles = (roleRows ?? []).map((r) => r.role as AppRole);

  return {
    id: user.id,
    email: user.email ?? '',
    fullName: typeof meta.full_name === 'string' ? meta.full_name : user.email ?? '',
    phone: typeof meta.phone === 'string' ? meta.phone : null,
    avatarUrl: typeof meta.avatar_url === 'string' ? meta.avatar_url : null,
    locale: meta.locale === 'en' ? 'en' : 'nl',
    roles: roles.length > 0 ? roles : ['customer'],
    emailVerified: Boolean(user.email_confirmed_at),
    createdAt: user.created_at,
    updatedAt: user.updated_at ?? user.created_at,
  };
}

export const accountRepository = {
  async getProfile(): Promise<Profile> {
    if (shouldUseMockApi()) {
      await delay();
      return { ...mockProfile };
    }
    const supabase = requireLiveSupabase();
    return mapAuthUserToProfile(supabase);
  },

  async requestDeletion(): Promise<AccountDeletionRequest> {
    if (shouldUseMockApi()) {
      await delay();
      return {
        id: `del-${Date.now()}`,
        status: 'submitted',
      };
    }
    const supabase = requireLiveSupabase();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      throw DomainError.unauthorized('You must be signed in to request account deletion.');
    }
    const { data, error } = await supabase
      .from('account_deletion_requests')
      .insert({ user_id: userData.user.id, status: 'requested' })
      .select('id')
      .single();
    if (error) throw fromSupabaseError(error);
    return { id: data.id, status: 'submitted' };
  },

  async getPartnerProfile(): Promise<PartnerProfile | null> {
    if (shouldUseMockApi()) {
      await delay();
      return { ...mockPartner };
    }
    return partnersRepository.getProfile();
  },

  async submitReview(input: {
    projectId: string;
    rating: number;
    title: string;
    body: string;
    publishConsent: boolean;
  }): Promise<Review> {
    if (shouldUseMockApi()) {
      await delay();
      return {
        id: `review-${Date.now()}`,
        projectId: input.projectId,
        rating: input.rating,
        title: input.title,
        body: input.body,
        publishConsent: input.publishConsent,
        status: 'submitted',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const supabase = requireLiveSupabase();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      throw DomainError.unauthorized('You must be signed in to submit a review.');
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        author_id: userData.user.id,
        project_id: input.projectId,
        rating: input.rating,
        title: input.title,
        body: input.body,
        status: 'submitted',
      })
      .select('*')
      .single();
    if (error) throw fromSupabaseError(error);

    return {
      id: data.id,
      projectId: data.project_id ?? input.projectId,
      rating: data.rating,
      title: data.title ?? input.title,
      body: data.body ?? input.body,
      // `publishConsent` is not yet persisted on `reviews` — echo the caller's choice.
      publishConsent: input.publishConsent,
      status: data.status === 'hidden' ? 'rejected' : data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },
};
