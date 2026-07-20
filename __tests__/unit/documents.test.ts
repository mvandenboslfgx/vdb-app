import {
  assertAllowedUpload,
  assertReviewComment,
  nextStatusAfterReview,
  statusAfterNewVersionUpload,
} from '@/domain/documents';

describe('document review rules', () => {
  it('requires comment for changes_requested', () => {
    expect(() => assertReviewComment('changes_requested', '')).toThrow(/Comment/);
    expect(() => assertReviewComment('approved')).not.toThrow();
  });

  it('maps decisions to statuses', () => {
    expect(nextStatusAfterReview('approved')).toBe('approved');
    expect(nextStatusAfterReview('changes_requested')).toBe('changes_requested');
  });

  it('starts a new review cycle after new version upload', () => {
    expect(statusAfterNewVersionUpload()).toBe('under_review');
  });

  it('allows pdf and images; rejects executables', () => {
    expect(() => assertAllowedUpload('application/pdf', 1000)).not.toThrow();
    expect(() => assertAllowedUpload('image/png', 1000)).not.toThrow();
    expect(() => assertAllowedUpload('application/x-msdownload', 1000)).toThrow(/MIME/);
  });
});
