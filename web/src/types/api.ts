import type {
  Category,
  ContractStatus,
  Hosting,
  ITType,
  LicensingType,
  NoteType,
  PreferredStatus,
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

export interface ContractRowDto {
  contractId: number;
  contractNumber: string;
  title: string;
  category: Category;
  status: ContractStatus;
  vendorName: string;
  vendorId: number;
  assignedReviewerName: string | null;
  assignedReviewerTeam: string | null;
  assignedReviewerUserId: string | null;
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

export interface ContractDetailDto {
  contractId: number;
  contractNumber: string;
  title: string;
  category: Category;
  status: ContractStatus;
  vendorId: number;
  vendorName: string;
  vendorPreferredStatus: PreferredStatus;
  requesterUserId: string;
  requesterName: string;
  assignedReviewerUserId: string | null;
  assignedReviewerName: string | null;
  totalCostUsd: number | null;
  signatureDeadline: string | null;
  submittedAt: string;
  termStartDate: string | null;
  termEndDate: string | null;
  lastActionAt: string;
  nextActionDueAt: string | null;
  description: string | null;
  // Event-only
  eventDate: string | null;
  venueLocation: string | null;
  partOfLargerEvent: boolean | null;
  parentEventName: string | null;
  // Facilities-only
  serviceDescription: string | null;
  // IT-only
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
  usesAI: boolean | null;
  commentCount: number;
  noteCount: number;
  attachmentCount: number;
  canEdit: boolean;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
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
  status: ContractStatus;
  category: Category;
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
