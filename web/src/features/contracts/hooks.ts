import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiJson } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import type {
  ActivityEventDto,
  AssignmentDto,
  ContractDetailDto,
  ContractRowDto,
  CommentDto,
  NoteDto,
  PagedResult,
  TriageCountsDto,
} from '@/types/api';

const DEFAULT_PAGE_SIZE = 50;

interface ContractListParams {
  triage?: string;
  category?: string;
  query?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
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

export interface UpdateStatusInput {
  contractId: number;
  newStatus: string;
  note?: string | null;
}

export function useUpdateStatus() {
  const queryClient = useQueryClient();
  return useMutation<ContractDetailDto, Error, UpdateStatusInput>({
    mutationFn: async ({ contractId, newStatus, note }) =>
      apiJson<ContractDetailDto>(`/api/contracts/${contractId}/status`, {
        method: 'PATCH',
        body: { newStatus, note: note ?? null },
      }),
    onSuccess: (detail) => {
      queryClient.setQueryData(queryKeys.contracts.detail(detail.contractId), detail);
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.activity(detail.contractId) });
    },
  });
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
    },
  });
}
