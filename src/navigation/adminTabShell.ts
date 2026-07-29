/** Canonical admin primary tab shell — max five visible tabs; leads under Meer only. */
export const ADMIN_PRIMARY_TAB_NAMES = [
  'index',
  'approvals',
  'tickets',
  'finance',
  'more',
] as const;

/** File-based routes that must stay off the primary tab bar (`href: null`). */
export const ADMIN_HIDDEN_TAB_NAMES = ['leads'] as const;

export const ADMIN_MAX_PRIMARY_TABS = ADMIN_PRIMARY_TAB_NAMES.length;
