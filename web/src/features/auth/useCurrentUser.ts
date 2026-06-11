import { useQuery } from '@tanstack/react-query';
import { apiJson } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import type { CurrentUserResponse } from '@/types/api';

export function useCurrentUser() {
  return useQuery<CurrentUserResponse>({
    queryKey: queryKeys.currentUser,
    queryFn: () => apiJson<CurrentUserResponse>('/api/me'),
    staleTime: 60_000,
  });
}
