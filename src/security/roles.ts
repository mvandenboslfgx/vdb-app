import type { AppRole } from '@/types/roles';

export type { AppRole } from '@/types/roles';

export const ALL_ROLES: readonly AppRole[] = [
  'customer',
  'partner_pending',
  'partner',
  'staff',
  'admin',
  'owner',
] as const;

export const STAFF_ROLES: readonly AppRole[] = ['staff', 'admin', 'owner'] as const;
export const ADMIN_ROLES: readonly AppRole[] = ['admin', 'owner'] as const;
export const PARTNER_ROLES: readonly AppRole[] = ['partner'] as const;

export function hasRole(roles: readonly AppRole[], role: AppRole): boolean {
  return roles.includes(role);
}

export function hasAnyRole(roles: readonly AppRole[], required: readonly AppRole[]): boolean {
  return required.some((role) => roles.includes(role));
}

export function isStaff(roles: readonly AppRole[]): boolean {
  return hasAnyRole(roles, STAFF_ROLES);
}

export function isAdmin(roles: readonly AppRole[]): boolean {
  return hasAnyRole(roles, ADMIN_ROLES);
}

export function isPartner(roles: readonly AppRole[]): boolean {
  return hasAnyRole(roles, PARTNER_ROLES);
}

export function isCustomer(roles: readonly AppRole[]): boolean {
  return hasRole(roles, 'customer') || roles.length === 0;
}

export function isPartnerPending(roles: readonly AppRole[]): boolean {
  return hasRole(roles, 'partner_pending');
}

/**
 * Resolves the primary app area for navigation.
 * Client-side only — every sensitive action must re-check roles server-side.
 */
export function resolvePrimaryArea(
  roles: readonly AppRole[],
): 'admin' | 'partner' | 'customer' | 'public' {
  if (isAdmin(roles) || isStaff(roles)) {
    return 'admin';
  }
  if (isPartner(roles)) {
    return 'partner';
  }
  if (isCustomer(roles) || isPartnerPending(roles)) {
    return 'customer';
  }
  return 'public';
}

/** Home href for an authenticated user based on roles. */
export function resolveHomeRoute(roles: readonly AppRole[]): string {
  switch (resolvePrimaryArea(roles)) {
    case 'admin':
      return '/(admin)';
    case 'partner':
      return '/(partner)';
    case 'customer':
      return '/(customer)';
    default:
      return '/(public)';
  }
}

export function canAccessAdminArea(roles: readonly AppRole[]): boolean {
  return isAdmin(roles) || isStaff(roles);
}

export function canAccessPartnerArea(roles: readonly AppRole[]): boolean {
  return isPartner(roles) || isAdmin(roles) || isStaff(roles);
}

/** Public registration may only yield customer or partner_application — never admin. */
export function isPubliclyAssignableRole(role: AppRole): boolean {
  return role === 'customer' || role === 'partner_pending';
}
