import type {
  Category,
  ContractStatus,
  Hosting,
  ITType,
  LaneIdApi,
  LaneStatusApi,
  LicensingType,
  NoteType,
  OverallStatusApi,
  PreferredStatus,
  PriorityApi,
  VendorType,
  AppRole,
} from './contract';

export interface CurrentUserResponse {
  userId: string;
  displayName: string;
  email: string;
  department: string | null;
  roles: AppRole[];
}

/** Compact lane summary emitted with each row so the SPA can render pills
 *  without a second round-trip. Mirrors LanePillDto in the API. */
export interface LanePillDto {
  laneId: LaneIdApi;
  status: LaneStatusApi;
  ownerName: string | null;
  dueDate: string | null;
}

/** Mirrors ContractRowDto in the API (v2 parallel-lanes model). */
export interface ContractRowDto {
  contractId: number;
  contractNumber: string;
  title: string;
  category: Category;
  overallStatus: OverallStatusApi;
  priority: PriorityApi;
  vendorId: number;
  vendorName: string;
  requesterUserId: string;
  requesterName: string;
  procurementOwnerUserId: string | null;
  procurementOwnerName: string | null;
  totalCostUsd: number | null;
  termStartDate: string | null;
  termEndDate: string | null;
  submittedAt: string;
  lastActionAt: string;
  activeLaneCount: number;
  lanes: LanePillDto[];
}

/** Legacy row shape retained only for the (soon-to-be-removed) linear-status ContractTable
 *  primitive. Prefer ContractRowDto everywhere. */
export interface LegacyContractRowDto {
  contractId: number;
  contractNumber: string;
  title: string;
  category: Category;
  status: ContractStatus;
  vendorName: string;
  vendorId: number;
  assignedReviewerName: string | null;
  totalCostUsd: number | null;
  termEndDate: string | null;
  lastActionAt: string;
  nextActionDueAt: string | null;
  needsAttention: boolean;
  attentionReason: string | null;
}

export interface TriageCountsDto {
  all: number;
  action: number;
  review: number;
  sign: number;
  expiring: number;
  closed: number;
}

export interface EventFieldsDto {
  eventName: string | null;
  eventDate: string | null;
  venueLocation: string | null;
  parentEventName: string | null;
}

export interface FacilitiesFieldsDto {
  building: string | null;
  serviceDescription: string | null;
}

export interface ItFieldsDto {
  itType: ITType | null;
  applicationName: string | null;
  applicationVersion: string | null;
  licensingType: LicensingType | null;
  numberOfUsers: number | null;
  cloudOrOnPrem: Hosting | null;
  systemAccess: string | null;
  permissions: string | null;
  integrations: string | null;
  accessesPersonalData: boolean | null;
  accessesPHI: boolean | null;
  accessesClientMatter: boolean | null;
  usesAI: boolean | null;
}

export interface ContractCapabilitiesDto {
  canEditHeader: boolean;
  canUpdateLanes: boolean;
  canManageAssignments: boolean;
  canSendReminder: boolean;
  canSeeInternalOnlyComments: boolean;
  canSeeNotes: boolean;
}

export interface ContractDetailDto {
  contractId: number;
  contractNumber: string;
  title: string;
  category: Category;
  overallStatus: OverallStatusApi;
  priority: PriorityApi;
  vendorId: number;
  vendorName: string;
  vendorPreferredStatus: PreferredStatus;
  requesterUserId: string;
  requesterName: string;
  requesterEmail: string;
  procurementOwnerUserId: string | null;
  procurementOwnerName: string | null;
  totalCostUsd: number | null;
  termStartDate: string | null;
  termEndDate: string | null;
  submittedAt: string;
  lastActionAt: string;
  description: string | null;
  eventFields: EventFieldsDto | null;
  facilitiesFields: FacilitiesFieldsDto | null;
  itFields: ItFieldsDto | null;
  customFieldValues: Record<string, string | null>;
  capabilities: ContractCapabilitiesDto;
}

/** Mirrors ContractLaneDto in the API. */
export interface ContractLaneDto {
  contractLaneId: number;
  contractId: number;
  laneId: LaneIdApi;
  status: LaneStatusApi;
  ownerUserId: string | null;
  ownerName: string | null;
  ownerLabel: string | null;
  dueDate: string | null;
  lastUpdated: string;
  note: string | null;
}

/** API returns { items, page, pageSize, totalCount } — mirror it exactly. */
export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface CommentDto {
  contractCommentId: number;
  authorUserId: string;
  authorName: string;
  authorRoleSnapshot: string;
  text: string;
  isInternalOnly: boolean;
  createdAt: string;
}

export interface NoteDto {
  contractNoteId: number;
  authorUserId: string;
  authorName: string;
  type: NoteType;
  noteDate: string;
  participants: string | null;
  text: string;
  createdAt: string;
}

export interface ActivityEventDto {
  activityEventId: number;
  actorUserId: string;
  actorName: string;
  type: string;
  descriptionLine: string;
  occurredAt: string;
}

export interface AssignmentDto {
  contractAssignmentId: number;
  reviewerUserId: string;
  reviewerName: string;
  reviewerTeam: string;
  assignedAt: string;
}

export interface AttachmentDto {
  contractAttachmentId: number;
  attachmentGuid: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  status: string;
  createdAt: string;
}

export interface VendorRowDto {
  vendorId: number;
  name: string;
  type: VendorType;
  preferredStatus: PreferredStatus;
  primaryContactName: string | null;
  contractCount: number;
}

export interface VendorSuggestionDto {
  vendorId: number;
  name: string;
  preferredStatus: PreferredStatus;
}

export interface VendorContractRefDto {
  contractId: number;
  contractNumber: string;
  title: string;
  overallStatus: OverallStatusApi;
  priority: PriorityApi;
  category: Category;
  activeLaneCount: number;
}

export interface VendorSummaryDto {
  vendorId: number;
  name: string;
  type: VendorType;
  preferredStatus: PreferredStatus;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  primaryContactPhone: string | null;
  primaryContactRole: string | null;
  location: string | null;
  vendorSinceText: string | null;
  notes: string | null;
  contracts: VendorContractRefDto[];
}

export interface BulkUploadRowDto {
  rowNumber: number;
  contractNumber: string | null;
  contractTitle: string | null;
  vendorName: string | null;
  matchedVendorId: number | null;
  category: string | null;
  priority: string | null;
  procurementOwnerUserId: string | null;
  requesterName: string | null;
  requesterEmail: string | null;
  totalCost: number | null;
  termStartDate: string | null;
  termEndDate: string | null;
  submittedDate: string | null;
  legacyStatus: string | null;
  isValid: boolean;
  errors: string[];
}

export interface BulkUploadPreviewDto {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rows: BulkUploadRowDto[];
}

export interface ReminderSettingDto {
  category: Category;
  cadenceDays: number;
  templateBody: string;
  isEnabled: boolean;
}

/** Mirrors UserSummaryDto in the API. */
export interface UserSummaryDto {
  userId: string;
  displayName: string;
  email: string | null;
}

/** Mirrors ReminderTargetDto in the API — lanes the caller can send a reminder to. */
export interface ReminderTargetDto {
  laneId: LaneIdApi;
  status: LaneStatusApi;
  ownerLabel: string | null;
  recipientEmail: string | null;
}

/** Mirrors NotificationLogDto in the API. */
export interface NotificationLogDto {
  notificationLogId: number;
  contractId: number;
  targetLaneId: LaneIdApi;
  channel: string;
  recipientLabel: string | null;
  recipientEmail: string | null;
  subject: string;
  status: string;
  failureReason: string | null;
  sentAt: string;
}
