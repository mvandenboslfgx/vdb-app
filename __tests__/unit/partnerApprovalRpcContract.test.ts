/**
 * Unit coverage for Owner RC5 review_partner_application argument mapping.
 */

const mockRpcOwner = jest.fn();

jest.mock('@/api/contract/ownerClient', () => ({
  rpcOwner: (...args: unknown[]) => mockRpcOwner(...args),
  fromOwnerTable: jest.fn(),
}));

jest.mock('@/api/repositories/_utils', () => ({
  shouldUseMockApi: () => false,
  requireLiveSupabase: () => ({ id: 'fake-client' }),
  delay: async () => undefined,
}));

/* eslint-disable import/first -- jest mocks must be hoisted before module imports */
import {
  approvePartnerApplication,
  rejectPartnerApplication,
} from '@/api/repositories/adminRepository';
import { mapMobileRpcToOwner } from '@/api/contract/ownerMapping';
/* eslint-enable import/first */

describe('partner application review RPC contract', () => {
  beforeEach(() => {
    mockRpcOwner.mockReset();
  });

  it('maps logical approve RPC to review_partner_application', () => {
    expect(mapMobileRpcToOwner('approve_partner_application')).toBe('review_partner_application');
    expect(mapMobileRpcToOwner('reject_partner_application')).toBe('review_partner_application');
  });

  it('approve sends p_approve=true without legacy p_reason', async () => {
    mockRpcOwner.mockResolvedValueOnce({ data: 'app-1', error: null });
    const result = await approvePartnerApplication('app-1', 'ignored');
    expect(mockRpcOwner).toHaveBeenCalledWith(
      { id: 'fake-client' },
      'approve_partner_application',
      {
        p_application_id: 'app-1',
        p_approve: true,
      },
    );
    expect(result).toEqual({ id: 'app-1', status: 'approved' });
  });

  it('reject sends p_approve=false and p_rejection_reason', async () => {
    mockRpcOwner.mockResolvedValueOnce({ data: 'app-1', error: null });
    const result = await rejectPartnerApplication('app-1', 'Not complete');
    expect(mockRpcOwner).toHaveBeenCalledWith({ id: 'fake-client' }, 'reject_partner_application', {
      p_application_id: 'app-1',
      p_approve: false,
      p_rejection_reason: 'Not complete',
    });
    expect(result).toEqual({ id: 'app-1', status: 'rejected' });
  });

  it('rejects empty application id before network', async () => {
    await expect(approvePartnerApplication('')).rejects.toMatchObject({
      code: 'VALIDATION',
    });
    expect(mockRpcOwner).not.toHaveBeenCalled();
  });

  it('rejects empty rejection reason before network', async () => {
    await expect(rejectPartnerApplication('app-1', '  ')).rejects.toMatchObject({
      code: 'VALIDATION',
    });
    expect(mockRpcOwner).not.toHaveBeenCalled();
  });
});
