/**
 * Phase 1 seed data — mirrors the demo HTML at artifacts/demo/Contract-Manager-Demo.html.
 * The PHASE1_CONTRACTS constant is legacy demo data kept for reference; live screens
 * fetch from the API and adapt rows via {@link apiRowToPhase1Contract}.
 */

import type { ContractDetailDto, ContractLaneDto, ContractRowDto, LanePillDto } from '@/types/api';
import type {
  ContractLane,
  LaneId,
  LaneStatus,
  OverallStatus,
  Phase1Contract,
  Priority,
} from '@/types/phase1';
import type { LaneIdApi, LaneStatusApi, OverallStatusApi, PriorityApi } from '@/types/contract';

const MS_DAY = 86_400_000;

function dayOffsetISO(offset: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() + offset);
  return dt.toISOString().slice(0, 10);
}

function L(
  id: LaneId,
  status: LaneStatus,
  owner: string | null,
  dueOffsetDays: number | null,
  note?: string | null,
): ContractLane {
  return {
    id,
    status,
    owner,
    dueDate: dueOffsetDays == null ? null : dayOffsetISO(dueOffsetDays),
    lastUpdated: dayOffsetISO(-Math.floor(Math.random() * 4) - 1),
    note: note ?? null,
  };
}

export const PHASE1_CONTRACTS: Phase1Contract[] = [
  {
    num: 'CTR-2026-0142',
    title: 'Relativity One — eDiscovery platform renewal',
    vendor: 'Relativity ODA LLC',
    category: 'IT',
    requester: 'David Stern',
    owner: 'Lisa Farkas',
    priority: 'high',
    overallStatus: 'active',
    value: 486_000,
    startDate: '2026-09-01',
    endDate: '2027-08-31',
    description:
      'Annual renewal of Relativity One hosted eDiscovery platform. Pricing increase year-over-year; data residency clause requires Privacy + InfoSec review before signature.',
    itFields: {
      itType: 'Software',
      accessesPersonalData: true,
      accessesPHI: false,
      accessesClientMatter: true,
      usesAI: false,
    },
    lanes: [
      L(
        'procurement',
        'in_review',
        'Lisa Farkas',
        2,
        'Driving renewal. Vendor pricing under negotiation.',
      ),
      L('legal', 'approved', 'Outside counsel', -6, 'Form approved per panel matrix.'),
      L('infosec', 'waiting', 'Priya Nair', -2, 'Pending updated SOC 2 report from vendor.'),
      L('privacy', 'in_review', 'Dana Olsson', 5, 'Reviewing EU subprocessors list.'),
      L('gco', 'not_started', null, null),
      L('vendor', 'waiting', 'Relativity ODA LLC', 1, 'Awaiting redline turn on liability cap.'),
      L('requester', 'approved', 'David Stern', -12, 'Business sponsor signed off on scope.'),
      L('signature', 'not_started', null, null),
      L('filed', 'not_started', null, null),
    ],
  },
  {
    num: 'CTR-2026-0139',
    title: 'Annual partner retreat — venue & catering',
    vendor: 'Halcyon Events Group',
    category: 'Event',
    requester: 'Emma Liang',
    owner: 'Marcus Webb',
    priority: 'critical',
    overallStatus: 'active',
    value: 212_500,
    startDate: '2026-10-15',
    endDate: '2026-10-17',
    description:
      'Three-day partner retreat at offsite venue. Halcyon handles venue, F&B, AV. Signature packet ready — awaiting countersignature.',
    event: {
      eventName: 'Annual Partner Retreat 2026',
      eventDate: '2026-10-15',
      venue: 'The Greenbrier Resort',
      parentEvent: 'Annual Partner Retreat 2026',
    },
    lanes: [
      L('procurement', 'in_review', 'Marcus Webb', 1, 'Coordinating signature send-out.'),
      L('legal', 'approved', 'In-house', -14, null),
      L('infosec', 'na', null, null),
      L('privacy', 'na', null, null),
      L('gco', 'approved', 'Tom Reyes', -9, null),
      L(
        'vendor',
        'waiting',
        'Halcyon Events Group',
        -1,
        'Sent for countersignature 2 days ago — no response.',
      ),
      L('requester', 'approved', 'Emma Liang', -10, null),
      L(
        'signature',
        'in_review',
        'DocuSign envelope',
        2,
        'Envelope #DS-887341 — vendor signer not yet opened.',
      ),
      L('filed', 'not_started', null, null),
    ],
  },
  {
    num: 'CTR-2026-0137',
    title: 'Microsoft 365 E5 enterprise agreement',
    vendor: 'Microsoft Corporation',
    category: 'IT',
    requester: 'Frank Moss',
    owner: 'Lisa Farkas',
    priority: 'medium',
    overallStatus: 'active',
    value: 1_340_000,
    startDate: '2026-11-01',
    endDate: '2029-10-31',
    description:
      'Three-year enterprise agreement renewal including Copilot pilot. Privacy review on Copilot data handling required.',
    itFields: {
      itType: 'Software',
      accessesPersonalData: true,
      accessesPHI: false,
      accessesClientMatter: true,
      usesAI: true,
    },
    lanes: [
      L(
        'procurement',
        'in_review',
        'Lisa Farkas',
        7,
        'Pricing locked; awaiting reviewer approvals.',
      ),
      L('legal', 'approved', 'Outside counsel', -20, null),
      L('infosec', 'approved', 'Priya Nair', -3, null),
      L('privacy', 'in_review', 'Dana Olsson', 4, 'Copilot data-handling diligence in progress.'),
      L('gco', 'in_review', 'Tom Reyes', 6, null),
      L('vendor', 'not_started', null, null),
      L('requester', 'approved', 'Frank Moss', -18, null),
      L('signature', 'not_started', null, null),
      L('filed', 'not_started', null, null),
    ],
  },
  {
    num: 'CTR-2026-0131',
    title: 'Floor 14 HVAC service & maintenance',
    vendor: 'Meridian Facilities Co.',
    category: 'Facilities',
    requester: 'Hana Kim',
    owner: 'Tom Reyes',
    priority: 'medium',
    overallStatus: 'active',
    value: 96_400,
    startDate: '2026-07-01',
    endDate: '2027-06-30',
    description: 'Annual HVAC preventive maintenance and on-call repair for Chicago Floor 14.',
    facilities: { building: '444 W Lake Street — Chicago' },
    lanes: [
      L('procurement', 'in_review', 'Tom Reyes', 3, null),
      L('legal', 'approved', 'In-house', -25, null),
      L('infosec', 'na', null, null),
      L('privacy', 'na', null, null),
      L('gco', 'approved', 'Tom Reyes', -22, null),
      L('vendor', 'approved', 'Meridian Facilities Co.', -15, 'Returned signed SoW.'),
      L('requester', 'approved', 'Hana Kim', -30, null),
      L('signature', 'in_review', 'DocuSign envelope', 2, 'Awaiting requester counter-sign.'),
      L('filed', 'not_started', null, null),
    ],
  },
  {
    num: 'CTR-2026-0124',
    title: 'Westlaw Edge research subscription',
    vendor: 'Thomson Reuters',
    category: 'IT',
    requester: 'Aaron Cole',
    owner: 'Lauren Pike',
    priority: 'low',
    overallStatus: 'active',
    value: 624_000,
    startDate: '2026-08-01',
    endDate: '2027-07-31',
    description: 'Annual Westlaw Edge renewal at firm-wide seat count.',
    itFields: {
      itType: 'Software',
      accessesPersonalData: false,
      accessesPHI: false,
      accessesClientMatter: false,
      usesAI: true,
    },
    lanes: [
      L('procurement', 'in_review', 'Lauren Pike', 1, 'Signature packet ready to send.'),
      L('legal', 'approved', 'In-house', -19, null),
      L('infosec', 'approved', 'Priya Nair', -12, null),
      L(
        'privacy',
        'approved',
        'Dana Olsson',
        -9,
        'Approved — annual usage review noted in audit log.',
      ),
      L('gco', 'approved', 'Tom Reyes', -7, null),
      L('vendor', 'approved', 'Thomson Reuters', -4, null),
      L('requester', 'approved', 'Aaron Cole', -30, null),
      L('signature', 'not_started', null, null),
      L('filed', 'not_started', null, null),
    ],
  },
  {
    num: 'CTR-2026-0119',
    title: 'Client appreciation gala — production',
    vendor: 'Lumen Productions',
    category: 'Event',
    requester: 'Grace Okafor',
    owner: 'Lisa Farkas',
    priority: 'high',
    overallStatus: 'active',
    value: 174_000,
    startDate: '2026-12-08',
    endDate: '2026-12-08',
    description: 'Production for client gala. Vendor was difficult last year; close timelines.',
    event: {
      eventName: 'Winter Client Appreciation Gala',
      eventDate: '2026-12-08',
      venue: 'The Plaza Hotel — Grand Ballroom',
      parentEvent: 'Winter Client Appreciation Gala',
    },
    lanes: [
      L(
        'procurement',
        'in_review',
        'Lisa Farkas',
        -1,
        'Vendor missed last year — pushing for tighter timeline commitments.',
      ),
      L('legal', 'in_review', 'In-house', 5, null),
      L('infosec', 'na', null, null),
      L('privacy', 'na', null, null),
      L('gco', 'not_started', null, null),
      L(
        'vendor',
        'waiting',
        'Lumen Productions',
        -3,
        'Awaiting redline turn — reminder sent yesterday.',
      ),
      L('requester', 'in_review', 'Grace Okafor', 3, null),
      L('signature', 'not_started', null, null),
      L('filed', 'not_started', null, null),
    ],
  },
  {
    num: 'CTR-2026-0117',
    title: 'Summer associate welcome dinner',
    vendor: 'Halcyon Events Group',
    category: 'Event',
    requester: 'Isabel Vega',
    owner: 'Marcus Webb',
    priority: 'medium',
    overallStatus: 'active',
    value: 38_000,
    startDate: '2026-06-20',
    endDate: '2026-06-20',
    description: 'Welcome dinner for incoming summer associate class.',
    event: {
      eventName: 'Summer Associate Welcome Dinner',
      eventDate: '2026-06-20',
      venue: 'RPM Steak — Chicago',
      parentEvent: '2026 Summer Associates',
    },
    lanes: [
      L('procurement', 'in_review', 'Marcus Webb', 5, null),
      L('legal', 'approved', 'In-house', -3, null),
      L('infosec', 'na', null, null),
      L('privacy', 'na', null, null),
      L('gco', 'approved', 'Tom Reyes', -2, null),
      L('vendor', 'approved', 'Halcyon Events Group', -1, null),
      L('requester', 'approved', 'Isabel Vega', -6, null),
      L('signature', 'in_review', 'DocuSign envelope', 4, null),
      L('filed', 'not_started', null, null),
    ],
  },
  {
    num: 'CTR-2026-0112',
    title: 'Generative AI contract-review pilot',
    vendor: 'Harvey AI, Inc.',
    category: 'IT',
    requester: 'Frank Moss',
    owner: 'Lisa Farkas',
    priority: 'critical',
    overallStatus: 'active',
    value: 295_000,
    startDate: '2026-10-01',
    endDate: '2027-09-30',
    description:
      'Pilot deployment of Harvey AI for contract review in M&A practice. AI + PHI flags raised by Privacy.',
    itFields: {
      itType: 'Software',
      accessesPersonalData: true,
      accessesPHI: true,
      accessesClientMatter: true,
      usesAI: true,
    },
    lanes: [
      L(
        'procurement',
        'in_review',
        'Lisa Farkas',
        -3,
        'AI + PHI escalation — Privacy lead is the long pole.',
      ),
      L('legal', 'in_review', 'Outside counsel', 2, null),
      L('infosec', 'in_review', 'Priya Nair', -1, null),
      L(
        'privacy',
        'waiting',
        'Dana Olsson',
        -5,
        'Blocked pending vendor BAA. Cannot proceed until vendor provides DPA + BAA.',
      ),
      L('gco', 'not_started', null, null),
      L('vendor', 'waiting', 'Harvey AI, Inc.', -2, 'Requested DPA + BAA — vendor reviewing.'),
      L('requester', 'in_review', 'Frank Moss', 1, null),
      L('signature', 'not_started', null, null),
      L('filed', 'not_started', null, null),
    ],
  },
  {
    num: 'CTR-2026-0108',
    title: 'Reception & lobby renovation',
    vendor: 'Atrium Build Group',
    category: 'Facilities',
    requester: 'Hana Kim',
    owner: 'Lauren Pike',
    priority: 'medium',
    overallStatus: 'active',
    value: 388_000,
    startDate: '2026-09-01',
    endDate: '2027-02-28',
    description: 'Six-month lobby renovation. Vendor flagged as difficult after last project.',
    facilities: { building: 'One Vanderbilt — New York' },
    lanes: [
      L('procurement', 'in_review', 'Lauren Pike', 6, null),
      L('legal', 'in_review', 'Outside counsel', 8, null),
      L('infosec', 'na', null, null),
      L('privacy', 'na', null, null),
      L('gco', 'in_review', 'Tom Reyes', 9, null),
      L(
        'vendor',
        'waiting',
        'Atrium Build Group',
        -1,
        'Slow redline turnaround again — reminder sent.',
      ),
      L('requester', 'approved', 'Hana Kim', -25, null),
      L('signature', 'not_started', null, null),
      L('filed', 'not_started', null, null),
    ],
  },
  {
    num: 'CTR-2026-0089',
    title: 'Office coffee & pantry program',
    vendor: 'Bright Bean Services',
    category: 'Facilities',
    requester: 'Tom Reyes',
    owner: 'Tom Reyes',
    priority: 'medium',
    overallStatus: 'completed',
    value: 28_800,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    description: 'Pantry program for Chicago office.',
    facilities: { building: '444 W Lake Street — Chicago' },
    lanes: [
      L('procurement', 'complete', 'Tom Reyes', -30),
      L('legal', 'approved', 'In-house', -45),
      L('infosec', 'na', null, null),
      L('privacy', 'na', null, null),
      L('gco', 'approved', 'Tom Reyes', -42),
      L('vendor', 'approved', 'Bright Bean Services', -35),
      L('requester', 'approved', 'Tom Reyes', -50),
      L('signature', 'complete', 'DocuSign envelope', -30),
      L('filed', 'complete', 'Tom Reyes', -29),
    ],
  },
  {
    num: 'CTR-2026-0076',
    title: 'Holiday party — venue hold (canceled)',
    vendor: 'Halcyon Events Group',
    category: 'Event',
    requester: 'Emma Liang',
    owner: 'Marcus Webb',
    priority: 'medium',
    overallStatus: 'canceled',
    value: 64_000,
    startDate: null,
    endDate: null,
    description:
      'Holiday party venue hold canceled — parent event canceled at firm-management level.',
    event: {
      eventName: 'Holiday Party 2026 (canceled)',
      eventDate: null,
      venue: 'The Plaza Hotel',
      parentEvent: 'Holiday Party 2026',
    },
    lanes: [
      L('procurement', 'complete', 'Marcus Webb', -40),
      L('legal', 'not_started', null, null),
      L('infosec', 'na', null, null),
      L('privacy', 'na', null, null),
      L('gco', 'not_started', null, null),
      L('vendor', 'complete', 'Halcyon Events Group', -38),
      L('requester', 'complete', 'Emma Liang', -42),
      L('signature', 'not_started', null, null),
      L('filed', 'not_started', null, null),
    ],
  },
];

/** Active = not completed and not canceled. */
export function activeContracts(): Phase1Contract[] {
  return PHASE1_CONTRACTS.filter((c) => c.overallStatus === 'active');
}

export function findContract(num: string): Phase1Contract | undefined {
  return PHASE1_CONTRACTS.find((c) => c.num === num);
}

/** Earliest open-lane due date for an active contract, or null. */
export function nextActionDue(c: Phase1Contract): string | null {
  if (c.overallStatus !== 'active') return null;
  let best: string | null = null;
  for (const lane of c.lanes) {
    if (!lane.dueDate) continue;
    if (lane.status !== 'not_started' && lane.status !== 'in_review' && lane.status !== 'waiting')
      continue;
    if (best == null || lane.dueDate < best) best = lane.dueDate;
  }
  return best;
}

export function daysFromTodayLocal(iso: string | null): number | null {
  if (!iso) return null;
  const today = new Date().toISOString().slice(0, 10);
  return Math.round(
    (new Date(iso + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / MS_DAY,
  );
}

export function isContractOverdue(c: Phase1Contract): boolean {
  if (c.overallStatus !== 'active') return false;
  return c.lanes.some(
    (lane) =>
      (lane.status === 'not_started' || lane.status === 'in_review' || lane.status === 'waiting') &&
      lane.dueDate != null &&
      (daysFromTodayLocal(lane.dueDate) ?? 0) < 0,
  );
}

export function isDueThisWeek(c: Phase1Contract): boolean {
  if (c.overallStatus !== 'active') return false;
  const next = nextActionDue(c);
  if (!next) return false;
  const d = daysFromTodayLocal(next);
  return d != null && d >= 0 && d <= 7;
}

export function isWaitingOnLane(c: Phase1Contract, laneId: LaneId): boolean {
  return c.lanes.some(
    (lane) => lane.id === laneId && (lane.status === 'waiting' || lane.status === 'in_review'),
  );
}

export function needsAction(c: Phase1Contract): boolean {
  if (c.overallStatus !== 'active') return false;
  const proc = c.lanes.find((lane) => lane.id === 'procurement');
  if (!proc) return false;
  if (proc.status !== 'in_review' && proc.status !== 'waiting') return false;
  if (proc.dueDate == null) return true;
  return (daysFromTodayLocal(proc.dueDate) ?? 0) <= 3;
}

// -----------------------------------------------------------------------------
// API → Phase1 adapters. The dashboard/archive/detail screens use the Phase1
// lane vocabulary internally; the API uses the PascalCase v2 vocabulary. These
// adapters keep the existing rendering + filtering logic intact while sourcing
// live data.
// -----------------------------------------------------------------------------

const LANE_ID_API_TO_PHASE1: Record<LaneIdApi, LaneId> = {
  Procurement: 'procurement',
  Legal: 'legal',
  InfoSec: 'infosec',
  Privacy: 'privacy',
  GCO: 'gco',
  Vendor: 'vendor',
  Requester: 'requester',
  Signature: 'signature',
  Filed: 'filed',
};

const LANE_STATUS_API_TO_PHASE1: Record<LaneStatusApi, LaneStatus> = {
  NotStarted: 'not_started',
  InReview: 'in_review',
  Waiting: 'waiting',
  Approved: 'approved',
  Canceled: 'canceled',
  NA: 'na',
  Complete: 'complete',
};

const OVERALL_STATUS_API_TO_PHASE1: Record<OverallStatusApi, OverallStatus> = {
  Active: 'active',
  Completed: 'completed',
  Canceled: 'canceled',
};

const PRIORITY_API_TO_PHASE1: Record<PriorityApi, Priority> = {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
  Critical: 'critical',
};

const TODAY_ISO = () => new Date().toISOString().slice(0, 10);

/** Convert an ISO date-time string (or plain YYYY-MM-DD) to YYYY-MM-DD. */
function toDateOnly(value: string | null): string | null {
  if (!value) return null;
  return value.slice(0, 10);
}

const PHASE1_TO_API_LANE_ID: Record<LaneId, LaneIdApi> = {
  procurement: 'Procurement',
  legal: 'Legal',
  infosec: 'InfoSec',
  privacy: 'Privacy',
  gco: 'GCO',
  vendor: 'Vendor',
  requester: 'Requester',
  signature: 'Signature',
  filed: 'Filed',
};

const PHASE1_TO_API_LANE_STATUS: Record<LaneStatus, LaneStatusApi> = {
  not_started: 'NotStarted',
  in_review: 'InReview',
  waiting: 'Waiting',
  approved: 'Approved',
  canceled: 'Canceled',
  na: 'NA',
  complete: 'Complete',
};

const PHASE1_TO_API_OVERALL: Record<OverallStatus, OverallStatusApi> = {
  active: 'Active',
  completed: 'Completed',
  canceled: 'Canceled',
};

const PHASE1_TO_API_PRIORITY: Record<Priority, PriorityApi> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export function laneIdToApi(id: LaneId): LaneIdApi {
  return PHASE1_TO_API_LANE_ID[id];
}

export function laneStatusToApi(status: LaneStatus): LaneStatusApi {
  return PHASE1_TO_API_LANE_STATUS[status];
}

export function overallStatusToApi(status: OverallStatus): OverallStatusApi {
  return PHASE1_TO_API_OVERALL[status];
}

export function priorityToApi(priority: Priority): PriorityApi {
  return PHASE1_TO_API_PRIORITY[priority];
}

/** Convert an API row pill + optional detail lane into the Phase1 lane shape. */
function laneFromPill(pill: LanePillDto): ContractLane {
  return {
    id: LANE_ID_API_TO_PHASE1[pill.laneId],
    status: LANE_STATUS_API_TO_PHASE1[pill.status],
    owner: pill.ownerName ?? null,
    dueDate: toDateOnly(pill.dueDate),
    lastUpdated: TODAY_ISO(),
    note: null,
  };
}

/** Convert a detail lane (has last-updated + note + owner label) into the Phase1 lane shape. */
export function laneFromDetail(lane: ContractLaneDto): ContractLane {
  return {
    id: LANE_ID_API_TO_PHASE1[lane.laneId],
    status: LANE_STATUS_API_TO_PHASE1[lane.status],
    owner: lane.ownerName ?? lane.ownerLabel ?? null,
    dueDate: toDateOnly(lane.dueDate),
    lastUpdated: toDateOnly(lane.lastUpdated) ?? TODAY_ISO(),
    note: lane.note,
  };
}

/** Map an API ContractRowDto into the Phase1Contract shape used by DashboardScreen. */
export function apiRowToPhase1Contract(row: ContractRowDto): Phase1Contract {
  return {
    contractId: row.contractId,
    num: row.contractNumber,
    title: row.title,
    vendor: row.vendorName,
    category: row.category,
    requester: row.requesterName,
    owner: row.procurementOwnerName ?? 'Unassigned',
    priority: PRIORITY_API_TO_PHASE1[row.priority],
    overallStatus: OVERALL_STATUS_API_TO_PHASE1[row.overallStatus],
    value: row.totalCostUsd ?? 0,
    startDate: toDateOnly(row.termStartDate),
    endDate: toDateOnly(row.termEndDate),
    description: '',
    lanes: row.lanes.map(laneFromPill),
  };
}

/** Map an API ContractDetailDto (+ its lanes) into the Phase1Contract shape. */
export function apiDetailToPhase1Contract(
  detail: ContractDetailDto,
  lanes: ContractLaneDto[],
): Phase1Contract {
  return {
    contractId: detail.contractId,
    num: detail.contractNumber,
    title: detail.title,
    vendor: detail.vendorName,
    category: detail.category,
    requester: detail.requesterName,
    requesterEmail: detail.requesterEmail,
    owner: detail.procurementOwnerName ?? 'Unassigned',
    priority: PRIORITY_API_TO_PHASE1[detail.priority],
    overallStatus: OVERALL_STATUS_API_TO_PHASE1[detail.overallStatus],
    value: detail.totalCostUsd ?? 0,
    startDate: toDateOnly(detail.termStartDate),
    endDate: toDateOnly(detail.termEndDate),
    description: detail.description ?? '',
    lanes: lanes.map(laneFromDetail),
    event: detail.eventFields
      ? {
          eventName: detail.eventFields.eventName ?? '',
          eventDate: toDateOnly(detail.eventFields.eventDate),
          venue: detail.eventFields.venueLocation ?? '',
          parentEvent: detail.eventFields.parentEventName ?? '',
        }
      : undefined,
    facilities: detail.facilitiesFields
      ? { building: detail.facilitiesFields.building ?? '' }
      : undefined,
    itFields: detail.itFields
      ? {
          itType: detail.itFields.itType,
          accessesPersonalData: detail.itFields.accessesPersonalData,
          accessesPHI: detail.itFields.accessesPHI,
          accessesClientMatter: detail.itFields.accessesClientMatter,
          usesAI: detail.itFields.usesAI,
        }
      : undefined,
  };
}
