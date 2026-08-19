import { fetchRolesForUser } from '@/lib/auth/fetchRoles';
import { fromOwnerTable } from '@/api/contract/ownerClient';
import { getSupabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  getSupabase: jest.fn(),
}));

jest.mock('@/api/contract/ownerClient', () => ({
  fromOwnerTable: jest.fn(),
}));

describe('fetchRolesForUser', () => {
  const fromMock = fromOwnerTable as jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();
    (getSupabase as jest.Mock).mockReturnValue({});
  });

  function chain(result: { data: unknown; error: unknown }) {
    return {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue(result),
    };
  }

  it('returns customer only when no elevated rows exist', async () => {
    fromMock.mockImplementation((_client, table) => {
      if (table === 'admin_roles') return chain({ data: null, error: null });
      if (table === 'partner_profiles') return chain({ data: null, error: null });
      throw new Error(`unexpected table ${table}`);
    });

    await expect(fetchRolesForUser('user-1')).resolves.toEqual(['customer']);
  });

  it('adds partner_pending for pending partner profile', async () => {
    fromMock.mockImplementation((_client, table) => {
      if (table === 'admin_roles') return chain({ data: null, error: null });
      if (table === 'partner_profiles') return chain({ data: { status: 'PENDING' }, error: null });
      throw new Error(`unexpected table ${table}`);
    });

    await expect(fetchRolesForUser('partner-1')).resolves.toEqual(['customer', 'partner_pending']);
  });

  it('adds staff/admin for admin_roles ADMIN row', async () => {
    fromMock.mockImplementation((_client, table) => {
      if (table === 'admin_roles') return chain({ data: { role: 'ADMIN' }, error: null });
      if (table === 'partner_profiles') return chain({ data: null, error: null });
      throw new Error(`unexpected table ${table}`);
    });

    await expect(fetchRolesForUser('staff-1')).resolves.toEqual(['customer', 'staff', 'admin']);
  });

  it('does not grant partner role for revoked profile', async () => {
    fromMock.mockImplementation((_client, table) => {
      if (table === 'admin_roles') return chain({ data: null, error: null });
      if (table === 'partner_profiles') return chain({ data: { status: 'REVOKED' }, error: null });
      throw new Error(`unexpected table ${table}`);
    });

    await expect(fetchRolesForUser('revoked-1')).resolves.toEqual(['customer']);
  });
});
