import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/mws/Badge';
import { apiJson } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { formatShortDate } from '@/lib/formatters';
import { statusInfo } from '@/lib/statusMap';
import type { PagedResult } from '@/types/api';
import styles from './ListScreen.module.css';

interface RenewalRow {
  contractId: number;
  contractNumber: string;
  title: string;
  category: string;
  vendorName: string;
  termEndDate: string | null;
  daysRemaining: number | null;
  status: string;
  assignedReviewerName: string | null;
  renewalInFlight: boolean;
}

const WINDOW_OPTIONS = [
  { value: 30, label: 'Next 30 days' },
  { value: 60, label: 'Next 60 days' },
  { value: 90, label: 'Next 90 days' },
];

export function RenewalsScreen() {
  const [windowDays, setWindowDays] = useState(30);

  const params = useMemo(() => ({ windowDays }), [windowDays]);
  const renewalsQuery = useQuery<PagedResult<RenewalRow>>({
    queryKey: queryKeys.contracts.renewals(params),
    queryFn: () =>
      apiJson<PagedResult<RenewalRow>>(`/api/contracts/renewals?windowDays=${windowDays}`),
  });

  const rows = renewalsQuery.data?.items ?? [];

  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.title}>Renewal report</h1>
        <p className={styles.subtitle}>Contracts approaching the end of their term.</p>
      </header>
      <div className={styles.toolbar}>
        <select
          value={windowDays}
          onChange={(event) => setWindowDays(Number.parseInt(event.target.value, 10))}
          aria-label="Renewal window"
          className={styles.select}
        >
          {WINDOW_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.tableShell}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Contract</th>
              <th>Vendor</th>
              <th>End date</th>
              <th className={styles.numeric}>Days remaining</th>
              <th>Status</th>
              <th>Reviewer</th>
            </tr>
          </thead>
          <tbody>
            {renewalsQuery.isLoading ? (
              <tr>
                <td colSpan={6} className={styles.emptyRow}>
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.emptyRow}>
                  No contracts expiring in this window.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const stage = statusInfo(row.status as never);
                return (
                  <tr key={row.contractId}>
                    <td>
                      <div className={styles.contractCell}>
                        <a href={`/contracts/${row.contractId}`}>{row.title}</a>
                        <span className={styles.contractNumber}>{row.contractNumber}</span>
                      </div>
                    </td>
                    <td>{row.vendorName}</td>
                    <td>{formatShortDate(row.termEndDate)}</td>
                    <td className={styles.numeric}>{row.daysRemaining ?? '—'}</td>
                    <td>
                      <Badge status={stage.badge}>{stage.label}</Badge>
                      {row.renewalInFlight ? (
                        <span className={styles.inFlight}>Renewal in flight</span>
                      ) : null}
                    </td>
                    <td>{row.assignedReviewerName ?? '—'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
