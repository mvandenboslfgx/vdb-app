/**
 * Exact consumer pin of owner contract 0.2.0-rc.7.
 * Read RPC schema stamps remain partner-approval-aal2-rc6 (no mass stamp bump).
 * VDB Digital 2.0 remains CANONICAL_BACKEND_OWNER.
 */
export const BACKEND_CONTRACT = {
  packageId: 'vdb-backend-contract@0.2.0-rc.7',
  version: '0.2.0-rc.7',
  schemaVersion: '2026.07.29.partner-approval-aal2-rc6',
  minimumCompatibleClientVersion: '>=0.2.0-rc.7',
  partnerSurfaceCompatibleWith: 'vdb-backend-contract@0.2.0-rc.1',
  messagingSupportCompatibleWith: 'vdb-backend-contract@0.2.0-rc.3',
  adminControlSurfaceCompatibleWith: 'vdb-backend-contract@0.2.0-rc.4',
  partnerIdentityDirectoryCompatibleWith: 'vdb-backend-contract@0.2.0-rc.5',
  partnerApprovalAal2CompatibleWith: 'vdb-backend-contract@0.2.0-rc.6',
  status: 'CONSUMER_PIN_OWNER_RC7',
  /** Historical pins — not the staging target. No live fallback. */
  supersededPins: {
    rc6: {
      packageId: 'vdb-backend-contract@0.2.0-rc.6',
      schemaVersion: '2026.07.29.partner-approval-aal2-rc6',
    },
    rc5: {
      packageId: 'vdb-backend-contract@0.2.0-rc.5',
      schemaVersion: '2026.07.29.partner-identity-directory-rc5',
    },
    rc4: {
      packageId: 'vdb-backend-contract@0.2.0-rc.4',
      schemaVersion: '2026.07.29.admin-control-surface-rc4',
    },
    rc3: {
      packageId: 'vdb-backend-contract@0.2.0-rc.3',
      schemaVersion: '2026.07.25.messaging-support-appointments-rc3',
    },
    localRemediation: {
      version: '0.1.1',
      schemaVersion: '2026.07.24.remediation',
    },
  },
} as const;

export type BackendContractPin = typeof BACKEND_CONTRACT;
