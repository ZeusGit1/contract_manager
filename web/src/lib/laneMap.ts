/** Display helpers for the v2 parallel-lanes model. */

import type { LaneIdApi, LaneStatusApi, OverallStatusApi, PriorityApi } from '@/types/contract';

/** Ordered list of lane ids — matches LaneId enum ordering in the API. */
export const LANE_ORDER: LaneIdApi[] = [
  'Procurement',
  'Legal',
  'InfoSec',
  'Privacy',
  'GCO',
  'Vendor',
  'Requester',
  'Signature',
  'Filed',
];

export const LANE_ICON: Record<LaneIdApi, string> = {
  Procurement: 'briefcase',
  Legal: 'scales',
  InfoSec: 'shield-check',
  Privacy: 'lock',
  GCO: 'gavel',
  Vendor: 'paper-plane-tilt',
  Requester: 'user',
  Signature: 'signature',
  Filed: 'archive',
};

export const LANE_LABEL: Record<LaneIdApi, string> = {
  Procurement: 'Procurement',
  Legal: 'Legal',
  InfoSec: 'InfoSec',
  Privacy: 'Privacy',
  GCO: 'GCO',
  Vendor: 'Vendor',
  Requester: 'Requester',
  Signature: 'Signature',
  Filed: 'Filed',
};

export const LANE_STATUS_LABEL: Record<LaneStatusApi, string> = {
  NotStarted: 'Not started',
  InReview: 'In review',
  Waiting: 'Waiting',
  Approved: 'Approved',
  Canceled: 'Canceled',
  NA: 'Not applicable',
  Complete: 'Complete',
};

export const PRIORITY_LABEL: Record<PriorityApi, string> = {
  Low: 'Low',
  Medium: 'Medium',
  High: 'High',
  Critical: 'Critical',
};

export const OVERALL_STATUS_LABEL: Record<OverallStatusApi, string> = {
  Active: 'Active',
  Completed: 'Completed',
  Canceled: 'Canceled',
};

/** A lane is "open" when it is InReview or Waiting — i.e. procurement is still working on it. */
export function isLaneOpen(status: LaneStatusApi): boolean {
  return status === 'InReview' || status === 'Waiting';
}

/** Category → icon name for card / row rendering. */
export const CATEGORY_ICON: Record<string, string> = {
  Event: 'ticket',
  Facilities: 'wrench',
  IT: 'desktop',
};
