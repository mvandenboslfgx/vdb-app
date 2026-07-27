/**
 * Exact consumer pin of owner contract 0.2.0-rc.3.
 * VDB Digital 2.0 remains CANONICAL_BACKEND_OWNER.
 */
export const BACKEND_CONTRACT = {
  packageId: 'vdb-backend-contract@0.2.0-rc.3',
  version: '0.2.0-rc.3',
  schemaVersion: '2026.07.25.messaging-support-appointments-rc3',
  minimumCompatibleClientVersion: '>=0.2.0-rc.3',
  partnerSurfaceCompatibleWith: 'vdb-backend-contract@0.2.0-rc.1',
  status: 'CONSUMER_PIN_OWNER_RC3',
  /** Historical local remediation proposal — not canonical. */
  supersededLocalProposal: {
    version: '0.1.1',
    schemaVersion: '2026.07.24.remediation',
  },
} as const;

export type BackendContractPin = typeof BACKEND_CONTRACT;
