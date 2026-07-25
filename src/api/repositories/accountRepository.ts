import { mockPartner, mockProfile } from '@/api/mockData';
import { delay, requireLiveSupabase, shouldUseMockApi } from '@/api/repositories/_utils';
import { partnersRepository } from '@/api/repositories/partnersRepository';
import { DomainError } from '@/lib/errors';
import type { PartnerProfile, Profile, Review } from '@/types/domain';

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

  return {
    id: user.id,
    email: user.email ?? '',
    fullName: typeof meta.full_name === 'string' ? meta.full_name : (user.email ?? ''),
    phone: typeof meta.phone === 'string' ? meta.phone : null,
    avatarUrl: typeof meta.avatar_url === 'string' ? meta.avatar_url : null,
    locale: meta.locale === 'en' ? 'en' : 'nl',
    roles: ['customer'],
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
    throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:account_deletion_requests');
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

    throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:reviews');
  },
};
