/**
 * Client feature flags — fail-closed for financial / policy-sensitive features.
 * Server must re-validate every flag before enabling a sensitive action.
 */

export type FeatureFlagKey =
  | 'registration'
  | 'partnerRegistration'
  | 'realtimeChat'
  | 'documentUploads'
  | 'documentApproval'
  | 'appointments'
  | 'reviews'
  | 'mollieCheckout'
  | 'digitalProductCheckout'
  | 'partnerPayouts'
  | 'mobileAdmin'
  | 'pushNotifications'
  | 'maintenanceMode';

export type FeatureFlagMap = Record<FeatureFlagKey, boolean>;

/** Financial / policy-sensitive flags that must default OFF when config is missing. */
export const FAIL_CLOSED_FLAGS: readonly FeatureFlagKey[] = [
  'mollieCheckout',
  'digitalProductCheckout',
  'partnerPayouts',
] as const;

const DEFAULT_FLAGS: FeatureFlagMap = {
  registration: true,
  partnerRegistration: true,
  // Messaging list/send is live; realtime subscriptions stay off until explicitly enabled.
  realtimeChat: false,
  documentUploads: true,
  documentApproval: true,
  // Appointment list is live; booking remains fail-closed in repositories / server flags.
  appointments: true,
  reviews: true,
  mollieCheckout: false,
  digitalProductCheckout: false,
  partnerPayouts: false,
  mobileAdmin: true,
  pushNotifications: false,
  maintenanceMode: false,
};

/** Snake_case mirror for payment policy / edge stubs. */
export const DEFAULT_FEATURE_FLAGS = {
  mollie_checkout: DEFAULT_FLAGS.mollieCheckout,
  digital_product_checkout: DEFAULT_FLAGS.digitalProductCheckout,
  partner_payouts: DEFAULT_FLAGS.partnerPayouts,
  registration: DEFAULT_FLAGS.registration,
  partner_registration: DEFAULT_FLAGS.partnerRegistration,
  realtime_chat: DEFAULT_FLAGS.realtimeChat,
  document_uploads: DEFAULT_FLAGS.documentUploads,
  document_approval: DEFAULT_FLAGS.documentApproval,
  appointments: DEFAULT_FLAGS.appointments,
  reviews: DEFAULT_FLAGS.reviews,
  mobile_admin: DEFAULT_FLAGS.mobileAdmin,
  push_notifications: DEFAULT_FLAGS.pushNotifications,
  maintenance_mode: DEFAULT_FLAGS.maintenanceMode,
} as const;

let activeFlags: FeatureFlagMap = { ...DEFAULT_FLAGS };

export function getFeatureFlags(): FeatureFlagMap {
  return { ...activeFlags };
}

export function setFeatureFlags(partial: Partial<FeatureFlagMap>): FeatureFlagMap {
  activeFlags = { ...activeFlags, ...partial };
  // Re-assert fail-closed defaults when explicitly set to undefined-like
  for (const key of FAIL_CLOSED_FLAGS) {
    if (partial[key] === undefined && activeFlags[key] === undefined) {
      activeFlags[key] = false;
    }
  }
  return getFeatureFlags();
}

export function resetFeatureFlags(): FeatureFlagMap {
  activeFlags = { ...DEFAULT_FLAGS };
  return getFeatureFlags();
}

export function isFeatureEnabled(key: FeatureFlagKey): boolean {
  const value = activeFlags[key];
  if (value === undefined || value === null) {
    return FAIL_CLOSED_FLAGS.includes(key) ? false : Boolean(DEFAULT_FLAGS[key]);
  }
  return value;
}

/**
 * Payment / Play Store policy gate (client mirror).
 * Always fail-closed — server must be authoritative.
 */
export type ProductCategory =
  | 'service'
  | 'physical_product'
  | 'custom_project'
  | 'digital_good'
  | 'external_subscription'
  | 'restricted'
  | 'manual_review_required';

export type PaymentPlatform = 'ios' | 'android' | 'web';

export interface PaymentPolicyInput {
  category: ProductCategory;
  platform: PaymentPlatform;
  flags?: FeatureFlagMap;
}

export interface PaymentPolicyResult {
  allowed: boolean;
  reason: string;
  useMollie: boolean;
  requiresManualReview: boolean;
}

export function evaluatePaymentPolicy(input: PaymentPolicyInput): PaymentPolicyResult {
  const flags = input.flags ?? getFeatureFlags();

  if (flags.maintenanceMode) {
    return {
      allowed: false,
      reason: 'maintenance_mode',
      useMollie: false,
      requiresManualReview: false,
    };
  }

  if (!flags.mollieCheckout) {
    return {
      allowed: false,
      reason: 'mollie_checkout_disabled',
      useMollie: false,
      requiresManualReview: false,
    };
  }

  if (
    (input.category === 'digital_good' || input.category === 'external_subscription') &&
    input.platform === 'android' &&
    !flags.digitalProductCheckout
  ) {
    return {
      allowed: false,
      reason: 'play_store_billing_gate',
      useMollie: false,
      requiresManualReview: true,
    };
  }

  if (input.category === 'restricted') {
    return {
      allowed: false,
      reason: 'restricted_product',
      useMollie: false,
      requiresManualReview: true,
    };
  }

  if (input.category === 'manual_review_required') {
    return {
      allowed: false,
      reason: 'manual_review_required',
      useMollie: false,
      requiresManualReview: true,
    };
  }

  return {
    allowed: true,
    reason: 'allowed',
    useMollie: true,
    requiresManualReview: false,
  };
}
