/** Centralized TanStack Query keys so refetching/invalidation is consistent. */

export const queryKeys = {
  currentUser: ['me'] as const,
  contracts: {
    all: ['contracts'] as const,
    list: (params: Record<string, unknown>) => ['contracts', 'list', params] as const,
    triageCounts: () => ['contracts', 'triage-counts'] as const,
    archive: (params: Record<string, unknown>) => ['contracts', 'archive', params] as const,
    renewals: (params: Record<string, unknown>) => ['contracts', 'renewals', params] as const,
    detail: (id: number) => ['contracts', 'detail', id] as const,
    comments: (id: number) => ['contracts', id, 'comments'] as const,
    notes: (id: number) => ['contracts', id, 'notes'] as const,
    activity: (id: number) => ['contracts', id, 'activity'] as const,
    notifications: (id: number) => ['contracts', id, 'notifications'] as const,
    assignments: (id: number) => ['contracts', id, 'assignments'] as const,
    attachments: (id: number) => ['contracts', id, 'attachments'] as const,
  },
  vendors: {
    all: ['vendors'] as const,
    list: (params: Record<string, unknown>) => ['vendors', 'list', params] as const,
    autocomplete: (query: string) => ['vendors', 'autocomplete', query] as const,
    detail: (id: number) => ['vendors', 'detail', id] as const,
  },
  reminderSettings: ['reminder-settings'] as const,
};
