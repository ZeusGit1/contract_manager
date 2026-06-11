import type { BadgeStatus } from '@/mws/Badge';
import type { ContractStatus } from '@/types/contract';

interface StatusInfo {
  label: string;
  badge: BadgeStatus;
}

const STATUS_MAP: Record<ContractStatus, StatusInfo> = {
  InProcess: { label: 'In process', badge: 'draft' },
  WithVendor: { label: 'With vendor', badge: 'info' },
  WithRequester: { label: 'With requester', badge: 'info' },
  WithLegal: { label: 'With legal', badge: 'pending' },
  WithGCO: { label: 'With GCO', badge: 'pending' },
  WithInfoSec: { label: 'With InfoSec', badge: 'pending' },
  WithPrivacy: { label: 'With Privacy', badge: 'pending' },
  OutForSignature: { label: 'Out for signature', badge: 'info' },
  Completed: { label: 'Completed', badge: 'live' },
  OnHold: { label: 'On hold', badge: 'hold' },
  Canceled: { label: 'Canceled', badge: 'failed' },
  Expired: { label: 'Expired', badge: 'archived' },
  Terminated: { label: 'Terminated', badge: 'failed' },
};

export function statusInfo(status: ContractStatus): StatusInfo {
  return STATUS_MAP[status];
}
