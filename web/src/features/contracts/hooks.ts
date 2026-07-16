import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiJson } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import type {
  ActivityEventDto,
  AssignmentDto,
  AttachmentDto,
  ContractDetailDto,
  ContractLaneDto,
  ContractRowDto,
  CommentDto,
  NoteDto,
  NotificationLogDto,
  PagedResult,
  ReminderTargetDto,
  TriageCountsDto,
  UserSummaryDto,
} from '@/types/api';
import type { LaneIdApi, LaneStatusApi, OverallStatusApi, PriorityApi } from '@/types/contract';

const DEFAULT_PAGE_SIZE = 200;

interface ContractListParams {
  /** Server-side filter: 'mine' | 'master' | 'submissions' | 'reviews' | undefined. */
  view?: string;
  category?: string;
  priority?: string;
  procurementOwnerUserId?: string;
  query?: string;
  page?: number;
  pageSize?: number;
}

function buildQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.append(key, String(value));
  }
  const queryString = search.toString();
  return queryString.length > 0 ? `?${queryString}` : '';
}

export function useContractList(params: ContractListParams) {
  const finalParams = { ...params, pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE };
  return useQuery<PagedResult<ContractRowDto>>({
    queryKey: queryKeys.contracts.list(finalParams),
    queryFn: () => apiJson<PagedResult<ContractRowDto>>(`/api/contracts${buildQuery(finalParams)}`),
  });
}

export function useTriageCounts() {
  return useQuery<TriageCountsDto>({
    queryKey: queryKeys.contracts.triageCounts(),
    queryFn: () => apiJson<TriageCountsDto>('/api/contracts/triage-counts'),
  });
}

export function useContractDetail(contractId: number) {
  return useQuery<ContractDetailDto>({
    queryKey: queryKeys.contracts.detail(contractId),
    queryFn: () => apiJson<ContractDetailDto>(`/api/contracts/${contractId}`),
    enabled: Number.isFinite(contractId) && contractId > 0,
  });
}

export function useContractComments(contractId: number) {
  return useQuery<CommentDto[]>({
    queryKey: queryKeys.contracts.comments(contractId),
    queryFn: () => apiJson<CommentDto[]>(`/api/contracts/${contractId}/comments`),
    enabled: contractId > 0,
  });
}

export function useContractNotes(contractId: number) {
  return useQuery<NoteDto[]>({
    queryKey: queryKeys.contracts.notes(contractId),
    queryFn: () => apiJson<NoteDto[]>(`/api/contracts/${contractId}/notes`),
    enabled: contractId > 0,
  });
}

export function useContractActivity(contractId: number) {
  return useQuery<ActivityEventDto[]>({
    queryKey: queryKeys.contracts.activity(contractId),
    queryFn: () => apiJson<ActivityEventDto[]>(`/api/contracts/${contractId}/activity`),
    enabled: contractId > 0,
  });
}

export function useContractAssignments(contractId: number) {
  return useQuery<AssignmentDto[]>({
    queryKey: queryKeys.contracts.assignments(contractId),
    queryFn: () => apiJson<AssignmentDto[]>(`/api/contracts/${contractId}/assignments`),
    enabled: contractId > 0,
  });
}

export function useContractLanes(contractId: number) {
  return useQuery<ContractLaneDto[]>({
    queryKey: queryKeys.contracts.lanes(contractId),
    queryFn: () => apiJson<ContractLaneDto[]>(`/api/contracts/${contractId}/lanes`),
    enabled: Number.isFinite(contractId) && contractId > 0,
  });
}

interface ArchiveListParams {
  query?: string;
  year?: number;
  page?: number;
  pageSize?: number;
}

export function useContractArchive(params: ArchiveListParams) {
  const finalParams = { ...params, pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE };
  return useQuery<PagedResult<ContractRowDto>>({
    queryKey: queryKeys.contracts.archive(finalParams),
    queryFn: () =>
      apiJson<PagedResult<ContractRowDto>>(`/api/contracts/archive${buildQuery(finalParams)}`),
  });
}

// ---------- Attachments ----------

/** List all attachments on a contract. Server enforces ownership → 403. */
export function useContractAttachments(contractId: number) {
  return useQuery<AttachmentDto[]>({
    queryKey: queryKeys.contracts.attachments(contractId),
    queryFn: () => apiJson<AttachmentDto[]>(`/api/contracts/${contractId}/attachments`),
    enabled: Number.isFinite(contractId) && contractId > 0,
  });
}

interface BatchCreatedDto {
  batchId: number;
}

/**
 * Upload one or more files against a contract. Follows the three-step batch protocol:
 * 1) POST /contracts/{id}/attachment-batches → batchId
 * 2) POST /attachments?contractId=&batchId= per file (multipart)
 * 3) POST /attachment-batches/{batchId}/complete
 *
 * Runs the per-file uploads sequentially — Phase 1 defaults, keeps failures easy to attribute.
 * The server tolerates partial batches, so a failed upload here does not orphan the batch.
 * Returns the number of files that uploaded successfully; the caller should also await
 * the invalidated attachments list for the final row shape.
 */
export function useUploadAttachments(contractId: number) {
  const queryClient = useQueryClient();
  return useMutation<number, Error, File[]>({
    mutationFn: async (files: File[]) => {
      if (files.length === 0) return 0;
      const batch = await apiJson<BatchCreatedDto>(
        `/api/contracts/${contractId}/attachment-batches`,
        { method: 'POST' },
      );
      let uploaded = 0;
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        await api(`/api/attachments?contractId=${contractId}&batchId=${batch.batchId}`, {
          method: 'POST',
          asFormData: formData,
        });
        uploaded++;
      }
      await api(`/api/attachment-batches/${batch.batchId}/complete`, { method: 'POST' });
      return uploaded;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.attachments(contractId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.detail(contractId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.activity(contractId) });
    },
  });
}

/** Soft-delete an attachment. Server enforces ownership. */
export function useDeleteAttachment(contractId: number) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (attachmentId: number) => {
      await api(`/api/attachments/${attachmentId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.attachments(contractId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.detail(contractId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.activity(contractId) });
    },
  });
}

/**
 * Download an attachment's content. Uses the auth-attached fetch (bearer token) then
 * streams the blob into an object URL that a temporary <a> click triggers as a download.
 * Object URL is revoked after the click.
 */
export async function downloadAttachment(attachment: AttachmentDto): Promise<void> {
  const response = await api(`/api/attachments/${attachment.contractAttachmentId}/content`);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = attachment.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function useAddComment(contractId: number) {
  const queryClient = useQueryClient();
  return useMutation<CommentDto, Error, { text: string; isInternalOnly: boolean }>({
    mutationFn: (input) =>
      apiJson<CommentDto>(`/api/contracts/${contractId}/comments`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.comments(contractId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.detail(contractId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.activity(contractId) });
    },
  });
}

// ---------- Notes ----------

export interface AddNoteInput {
  type: 'Meeting' | 'Call' | 'Email' | 'Note';
  noteDate: string;
  participants: string | null;
  text: string;
}

export function useAddNote(contractId: number) {
  const queryClient = useQueryClient();
  return useMutation<NoteDto, Error, AddNoteInput>({
    mutationFn: (input) =>
      apiJson<NoteDto>(`/api/contracts/${contractId}/notes`, { method: 'POST', body: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.notes(contractId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.detail(contractId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.activity(contractId) });
    },
  });
}

// ---------- Contract-header mutations ----------

/** PATCH /api/contracts/{id} — updates title/priority/vendor/etc. via UpdateContractRequest. */
export function useUpdateContract(contractId: number) {
  const queryClient = useQueryClient();
  return useMutation<ContractDetailDto, Error, { priority?: PriorityApi }>({
    mutationFn: (patch) =>
      apiJson<ContractDetailDto>(`/api/contracts/${contractId}`, {
        method: 'PATCH',
        body: patch,
      }),
    onSuccess: (detail) => {
      queryClient.setQueryData(queryKeys.contracts.detail(contractId), detail);
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all });
    },
  });
}

/** PATCH /api/contracts/{id}/overall — flip a contract to Completed/Canceled/Active. */
export function useUpdateOverallStatus(contractId: number) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { overallStatus: OverallStatusApi; reason?: string | null }>({
    mutationFn: async (input) => {
      await api(`/api/contracts/${contractId}/overall`, {
        method: 'PATCH',
        body: input,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.detail(contractId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.activity(contractId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all });
    },
  });
}

/** PATCH /api/contracts/{id}/owner — reassign the procurement owner to another user (or unassign). */
export function useUpdateProcurementOwner(contractId: number) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { procurementOwnerUserId: string | null }>({
    mutationFn: async (input) => {
      await api(`/api/contracts/${contractId}/owner`, {
        method: 'PATCH',
        body: input,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.detail(contractId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.activity(contractId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all });
    },
  });
}

// ---------- Lane mutation ----------

export interface UpdateLaneInput {
  status?: LaneStatusApi;
  ownerUserId?: string | null;
  ownerLabel?: string | null;
  dueDate?: string | null;
  note?: string | null;
  clearOwner?: boolean;
  clearDueDate?: boolean;
  clearNote?: boolean;
}

/** PATCH /api/contracts/{contractId}/lanes/{laneId} — updates a single lane. */
export function useUpdateLane(contractId: number) {
  const queryClient = useQueryClient();
  return useMutation<ContractLaneDto, Error, { laneId: LaneIdApi; patch: UpdateLaneInput }>({
    mutationFn: ({ laneId, patch }) =>
      apiJson<ContractLaneDto>(`/api/contracts/${contractId}/lanes/${laneId}`, {
        method: 'PATCH',
        body: patch,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.lanes(contractId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.detail(contractId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.activity(contractId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all });
    },
  });
}

// ---------- Reminders ----------

export function useReminderTargets(contractId: number) {
  return useQuery<ReminderTargetDto[]>({
    queryKey: ['contracts', contractId, 'reminder-targets'],
    queryFn: () => apiJson<ReminderTargetDto[]>(`/api/contracts/${contractId}/reminders/targets`),
    enabled: Number.isFinite(contractId) && contractId > 0,
  });
}

export interface SendReminderInput {
  targetLaneId: LaneIdApi;
  subject?: string;
  message?: string;
}

export function useSendReminder(contractId: number) {
  const queryClient = useQueryClient();
  return useMutation<NotificationLogDto, Error, SendReminderInput>({
    mutationFn: (input) =>
      apiJson<NotificationLogDto>(`/api/contracts/${contractId}/reminders`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.activity(contractId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.detail(contractId) });
    },
  });
}

// ---------- Users ----------

/** GET /api/users — list of firm users for the procurement-owner picker. */
export function useUsersList() {
  return useQuery<UserSummaryDto[]>({
    queryKey: queryKeys.users.list(),
    queryFn: () => apiJson<UserSummaryDto[]>('/api/users'),
    staleTime: 5 * 60 * 1000, // Users list changes rarely; cache for 5 minutes.
  });
}
