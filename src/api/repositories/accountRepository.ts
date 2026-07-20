import type { Profile, Review } from '@/types/domain';
import { mockPartner, mockProfile } from '@/api/mockData';

export interface AccountDeletionRequest {
  id: string;
  status: 'submitted' | 'processing' | 'completed';
}

const reviews: Review[] = [];

export const accountRepository = {
  async getProfile(): Promise<Profile> {
    return { ...mockProfile };
  },

  async requestDeletion(): Promise<AccountDeletionRequest> {
    return {
      id: `del-${Date.now()}`,
      status: 'submitted',
    };
  },

  async getPartnerProfile() {
    return { ...mockPartner };
  },

  async submitReview(input: {
    projectId: string;
    rating: number;
    title: string;
    body: string;
    publishConsent: boolean;
  }): Promise<Review> {
    const review: Review = {
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
    reviews.push(review);
    return review;
  },
};
