import { delay } from '@/features/_shared/mockData';
import type { Review } from '@/types';

const reviews: Review[] = [];

export interface ReviewsRepository {
  listForProject(projectId: string): Promise<Review[]>;
}

class MockReviewsRepository implements ReviewsRepository {
  async listForProject(projectId: string): Promise<Review[]> {
    await delay();
    return reviews.filter((review) => review.projectId === projectId);
  }
}

export function createReviewsRepository(): ReviewsRepository {
  return new MockReviewsRepository();
}
