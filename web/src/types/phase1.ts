/**
 * Phase 1 data model — parallel review lanes.
 * Replaces the linear ContractStatus workflow with multiple concurrent review lanes
 * per contract. This is the frontend type shape; backend API/schema follow-up required.
 */

import type { Category } from './contract';

export type LaneId =
  | 'procurement'
  | 'legal'
  | 'infosec'
  | 'privacy'
  | 'gco'
  | 'vendor'
  | 'requester'
  | 'signature'
  | 'filed';

export type LaneStatus =
  | 'not_started'
  | 'in_review'
  | 'waiting'
  | 'approved'
  | 'canceled'
  | 'na'
  | 'complete';

export interface ContractLane {
  id: LaneId;
  status: LaneStatus;
  owner: string | null;
  dueDate: string | null;
  lastUpdated: string;
  note: string | null;
}

export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type OverallStatus = 'active' | 'completed' | 'canceled';

export interface ProcurementOwner {
  name: string;
  initials: string;
  tone: 1 | 2 | 3 | 4;
  isMe?: boolean;
}

export interface EventFields {
  eventName: string;
  eventDate: string | null;
  venue: string;
  parentEvent: string;
}

export interface FacilitiesFields {
  building: string;
}

export interface ITFields {
  itType: 'Software' | 'ProfessionalServices' | null;
  accessesPersonalData: boolean | null;
  accessesPHI: boolean | null;
  usesAI: boolean | null;
}

export interface Phase1Contract {
  num: string;
  title: string;
  vendor: string;
  category: Category;
  requester: string;
  /** Optional override. When absent, derive via requesterEmailFrom(requester). */
  requesterEmail?: string;
  owner: string;
  priority: Priority;
  overallStatus: OverallStatus;
  value: number;
  startDate: string | null;
  endDate: string | null;
  description: string;
  lanes: ContractLane[];
  event?: EventFields;
  facilities?: FacilitiesFields;
  itFields?: ITFields;
}

export function requesterEmailFrom(name: string): string {
  return name.toLowerCase().replace(/[^a-z]+/g, '.') + '@mwe.example';
}

export const LANE_DEFS: { id: LaneId; label: string; icon: string }[] = [
  { id: 'procurement', label: 'Procurement', icon: 'briefcase' },
  { id: 'legal', label: 'Legal', icon: 'scales' },
  { id: 'infosec', label: 'InfoSec', icon: 'shield-check' },
  { id: 'privacy', label: 'Privacy', icon: 'lock' },
  { id: 'gco', label: 'GCO', icon: 'gavel' },
  { id: 'vendor', label: 'Vendor', icon: 'paper-plane-tilt' },
  { id: 'requester', label: 'Requester', icon: 'user' },
  { id: 'signature', label: 'Signature', icon: 'signature' },
  { id: 'filed', label: 'Filed', icon: 'archive' },
];

export const LANE_STATUS_LABEL: Record<LaneStatus, string> = {
  not_started: 'Not started',
  in_review: 'In review',
  waiting: 'Waiting',
  approved: 'Approved',
  canceled: 'Canceled',
  na: 'Not applicable',
  complete: 'Complete',
};

export const PROCUREMENT_OWNERS: ProcurementOwner[] = [
  { name: 'Lisa Farkas', initials: 'LF', tone: 1, isMe: true },
  { name: 'Marcus Webb', initials: 'MW', tone: 2 },
  { name: 'Lauren Pike', initials: 'LP', tone: 3 },
  { name: 'Tom Reyes', initials: 'TR', tone: 4 },
];

export const ME = PROCUREMENT_OWNERS[0];

export const OPEN_LANE_STATUSES: LaneStatus[] = ['in_review', 'waiting'];

export function isLaneOpen(l: ContractLane): boolean {
  return OPEN_LANE_STATUSES.includes(l.status);
}

export function laneDef(id: LaneId) {
  const found = LANE_DEFS.find((l) => l.id === id);
  if (!found) throw new Error(`Unknown lane id: ${id}`);
  return found;
}

export function ownerByName(name: string): ProcurementOwner | undefined {
  return PROCUREMENT_OWNERS.find((o) => o.name === name);
}

export function ownerToneClass(name: string): string {
  const owner = ownerByName(name);
  return owner ? `owner-${owner.tone}` : '';
}
