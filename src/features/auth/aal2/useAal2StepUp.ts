import { useCallback, useRef, useState } from 'react';

import type { Aal2Status } from '@/lib/auth/aal2';
import { getAal2Status, runSensitiveActionWithAal2 } from '@/lib/auth/aal2';
import type { Aal2StepUpOutcome } from '@/features/auth/aal2/Aal2StepUpModal';

type PendingResolver = (outcome: Aal2StepUpOutcome) => void;

export function useAal2StepUp() {
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<Aal2Status | null>(null);
  const resolverRef = useRef<PendingResolver | null>(null);

  const close = useCallback((outcome: Aal2StepUpOutcome) => {
    setVisible(false);
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(outcome);
  }, []);

  const ensureStepUp = useCallback(async (current: Aal2Status): Promise<Aal2StepUpOutcome> => {
    setStatus(current);
    setVisible(true);
    return await new Promise<Aal2StepUpOutcome>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const runWithStepUp = useCallback(
    async <T>(action: () => Promise<T>) => {
      return runSensitiveActionWithAal2({
        action,
        ensureStepUp,
      });
    },
    [ensureStepUp],
  );

  const probe = useCallback(async () => getAal2Status(), []);

  return {
    visible,
    status,
    onComplete: close,
    runWithStepUp,
    probe,
  };
}
