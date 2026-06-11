import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ContractTable } from '@/components/ContractTable';
import { apiJson } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import type { ContractRowDto, PagedResult } from '@/types/api';
import styles from './ListScreen.module.css';

export function ArchiveScreen() {
  const [query, setQuery] = useState('');
  const [year, setYear] = useState<string>('');

  const params = useMemo(
    () => ({
      query: query.trim() || undefined,
      year: year ? Number.parseInt(year, 10) : undefined,
    }),
    [query, year],
  );

  const archiveQuery = useQuery<PagedResult<ContractRowDto>>({
    queryKey: queryKeys.contracts.archive(params),
    queryFn: () => {
      const search = new URLSearchParams();
      if (params.query) search.set('query', params.query);
      if (params.year) search.set('year', params.year.toString());
      const qs = search.toString();
      return apiJson<PagedResult<ContractRowDto>>(`/api/contracts/archive${qs ? `?${qs}` : ''}`);
    },
  });

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, index) => currentYear - index);

  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.title}>Archive</h1>
        <p className={styles.subtitle}>
          Completed, canceled, expired, and terminated contracts. Records stay searchable in
          perpetuity.
        </p>
      </header>
      <div className={styles.toolbar}>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, vendor, or requester"
          aria-label="Search archived contracts"
          className={styles.search}
        />
        <select
          value={year}
          onChange={(event) => setYear(event.target.value)}
          aria-label="Filter by year submitted"
          className={styles.select}
        >
          <option value="">All years</option>
          {yearOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <ContractTable
        rows={archiveQuery.data?.items ?? []}
        isLoading={archiveQuery.isLoading}
        error={archiveQuery.error as Error | null}
        emptyMessage="No archived contracts match these filters."
      />
    </div>
  );
}
