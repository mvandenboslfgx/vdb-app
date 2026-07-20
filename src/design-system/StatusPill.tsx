import React from 'react';

import { Badge } from '@/design-system/Badge';

type StatusTone = 'neutral' | 'gold' | 'success' | 'warning' | 'error' | 'info';

export interface StatusPillProps {
  label: string;
  tone?: StatusTone;
}

export function StatusPill({ label, tone = 'neutral' }: StatusPillProps) {
  return <Badge label={label} tone={tone} />;
}
