import { fromOwnerTable } from '@/api/contract/ownerClient';
import { getSupabase } from '@/lib/supabase';
import type { AppRole } from '@/types/domain';

const ACTIVE_PARTNER_STATUSES = new Set(['active', 'approved']);
const PENDING_PARTNER_STATUSES = new Set(['pending', 'submitted', 'under_review']);

/**
 * Resolve canonical app roles from trusted backend tables only.
 * Never reads user-controlled metadata for privilege assignment.
 */
export async function fetchRolesForUser(userId: string): Promise<AppRole[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return ['customer'];
  }

  const roles = new Set<AppRole>(['customer']);

  try {
    const { data: adminRow, error: adminError } = await fromOwnerTable(supabase, 'admin_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    if (!adminError && adminRow && typeof adminRow.role === 'string') {
      const adminRole = adminRow.role.toUpperCase();
      roles.add('staff');
      if (adminRole === 'ADMIN' || adminRole === 'SUPPORT' || adminRole === 'CONTENT') {
        roles.add('admin');
      }
      if (adminRole === 'OWNER') {
        roles.add('admin');
        roles.add('owner');
      }
    }
  } catch {
    // admin_roles optional for pure customers/partners.
  }

  try {
    const { data, error } = await fromOwnerTable(supabase, 'partner_profiles')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle();
    if (!error && data) {
      const status = typeof data.status === 'string' ? data.status.toLowerCase() : '';
      if (ACTIVE_PARTNER_STATUSES.has(status)) {
        roles.add('partner');
      } else if (PENDING_PARTNER_STATUSES.has(status)) {
        roles.add('partner_pending');
      }
    }
  } catch {
    // Partner profile optional.
  }

  return [...roles];
}
