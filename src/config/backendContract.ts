/**
 * Exact consumer pin of owner contract 0.2.0-rc.2.
 * VDB Digital 2.0 remains CANONICAL_BACKEND_OWNER.
 */
export const BACKEND_CONTRACT = {
  packageId: 'vdb-backend-contract@0.2.0-rc.2',
  version: '0.2.0-rc.2',
  schemaVersion: '2026.07.24.mobile-compat-rc2',
  minimumCompatibleClientVersion: '>=0.2.0-rc.2',
  partnerSurfaceCompatibleWith: 'vdb-backend-contract@0.2.0-rc.1',
  status: 'CONSUMER_PIN_OWNER_RC2',
  /** Historical local remediation proposal — not canonical. */
  supersededLocalProposal: {
    version: '0.1.1',
    schemaVersion: '2026.07.24.remediation',
  },
} as const;

export type BackendContractPin = typeof BACKEND_CONTRACT;
