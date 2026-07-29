import { useCallback, useEffect, useState } from 'react';

import { getPartnerProfile } from '@/api/repositories/partnersRepository';
import {
  decidePartnerTicketAccess,
  type PartnerTicketAccess,
  type PartnerTicketProfileStatus,
} from '@/lib/partnerTicketPolicy';

type PartnerTicketGateState = {
  loading: boolean;
  status: PartnerTicketProfileStatus;
  access: PartnerTicketAccess;
  reload: () => void;
};

/**
 * Loads partner_profiles status and applies the RC6 support capability matrix.
 * Fail-closed when the profile is missing or status is unknown.
 */
export function usePartnerTicketGate(): PartnerTicketGateState {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<PartnerTicketProfileStatus>('unknown');
  const [access, setAccess] = useState<PartnerTicketAccess>(() =>
    decidePartnerTicketAccess('unknown'),
  );

  const reload = useCallback(() => {
    setLoading(true);
    void (async () => {
      try {
        const profile = await getPartnerProfile();
        const nextStatus = profile?.status ?? 'unknown';
        setStatus(nextStatus);
        setAccess(decidePartnerTicketAccess(nextStatus));
      } catch {
        setStatus('unknown');
        setAccess(decidePartnerTicketAccess('unknown'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { loading, status, access, reload };
}
