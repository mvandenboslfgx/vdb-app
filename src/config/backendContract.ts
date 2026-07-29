/**
 * Exact consumer pin of owner contract 0.2.0-rc.5.
 * VDB Digital 2.0 remains CANONICAL_BACKEND_OWNER.
 */
export const BACKEND_CONTRACT = {
  packageId: 'vdb-backend-contract@0.2.0-rc.5',
  version: '0.2.0-rc.5',
  schemaVersion: '2026.07.29.partner-identity-directory-rc5',
  minimumCompatibleClientVersion: '>=0.2.0-rc.5',
  partnerSurfaceCompatibleWith: 'vdb-backend-contract@0.2.0-rc.1',
  messagingSupportCompatibleWith: 'vdb-backend-contract@0.2.0-rc.3',
  adminControlSurfaceCompatibleWith: 'vdb-backend-contract@0.2.0-rc.4',
  status: 'CONSUMER_PIN_OWNER_RC5',
  /** Historical pins — not the staging target. */
  supersededPins: {
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
