import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/mws/Badge';
import { Button } from '@/mws/Button';
import { useContractList } from './hooks';
import { daysFromToday, formatShortDate, formatTodayHeader, formatUsd } from '@/lib/formatters';
import { statusInfo } from '@/lib/statusMap';
import styles from './DashboardScreen.module.css';

type TriageId = 'all' | 'action' | 'review' | 'sign' | 'expiring' | 'closed';

interface TriageChip {
  id: TriageId;
  label: string;
}

const TRIAGE_CHIPS: TriageChip[] = [
  { id: 'all', label: 'All active' },
  { id: 'action', label: 'Needs your action' },
  { id: 'review', label: 'In attorney review' },
  { id: 'sign', label: 'Awaiting signature' },
  { id: 'expiring', label: 'Expiring ≤ 14 days' },
  { id: 'closed', label: 'On hold & closed' },
];

export function DashboardScreen() {
  const [triage, setTriage] = useState<TriageId>('all');
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const params = useMemo(
    () => ({
      triage: triage === 'all' ? undefined : triage,
      query: query.trim() === '' ? undefined : query.trim(),
    }),
    [triage, query],
  );

  const { data, isLoading, error } = useContractList(params);
  const rows = data?.items ?? [];
  const total = data?.total ?? 0;
  const todayLabel = formatTodayHeader();

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Active contracts</h1>
          <p className={styles.subtitle}>
            {todayLabel} · everything in flight across Event, Facilities, and IT.
          </p>
        </div>
        <div className={styles.headActions}>
          <Button variant="secondary" icon="upload-simple" onClick={() => navigate('/bulk-upload')}>
            Bulk upload
          </Button>
          <Button variant="primary" icon="plus" onClick={() => navigate('/new-contract')}>
            New contract
          </Button>
        </div>
      </header>

      <div
        className={styles.triageStrip}
        role="group"
        aria-label="Filter contracts by attention area"
      >
        {TRIAGE_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            aria-pressed={triage === chip.id}
            className={`${styles.chip} ${triage === chip.id ? styles.chipActive : ''}`}
            onClick={() => setTriage(chip.id)}
          >
            <span className={styles.chipLabel}>{chip.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.toolbar}>
        <label className={styles.searchLabel}>
          <span className="visually-hidden">Search contracts</span>
          <input
            type="search"
            placeholder="Search contracts, vendors, or numbers"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={styles.search}
          />
        </label>
        <span className={styles.resultCount}>
          {isLoading ? 'Loading…' : `${rows.length} of ${total} contracts`}
        </span>
      </div>

      <div className={styles.tableShell}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th aria-label="Attention" className={styles.flagCell} />
              <th>Contract</th>
              <th>Vendor</th>
              <th>Category</th>
              <th>Stage</th>
              <th>Reviewer</th>
              <th className={styles.numeric}>Value</th>
              <th>Expires</th>
              <th>Next due</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className={styles.emptyRow}>
                  Loading contracts…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={9} className={styles.emptyRow}>
                  Couldn&apos;t load contracts. Refresh to try again.
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className={styles.emptyRow}>
                  No contracts match this view. Clear the filter or search to see all active
                  contracts.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const stage = statusInfo(row.status);
                const expiresDays = daysFromToday(row.termEndDate);
                return (
                  <tr
                    key={row.contractId}
                    className={styles.bodyRow}
                    onClick={() => navigate(`/contracts/${row.contractId}`)}
                    title={row.attentionReason ?? undefined}
                  >
                    <td className={styles.flagCell}>
                      {row.needsAttention ? (
                        <span className={styles.flagDot} aria-label="Needs attention" />
                      ) : null}
                    </td>
                    <td>
                      <div className={styles.contractName}>
                        <Link
                          to={`/contracts/${row.contractId}`}
                          onClick={(event) => event.stopPropagation()}
                        >
                          {row.title}
                        </Link>
                        <span className={styles.contractNumber}>{row.contractNumber}</span>
                      </div>
                    </td>
                    <td>{row.vendorName}</td>
                    <td>{row.category}</td>
                    <td>
                      <Badge status={stage.badge}>{stage.label}</Badge>
                    </td>
                    <td>
                      {row.assignedReviewerName ?? <span className={styles.muted}>Unassigned</span>}
                    </td>
                    <td className={styles.numeric}>{formatUsd(row.totalCostUsd)}</td>
                    <td>
                      {row.termEndDate
                        ? expiresDays != null && expiresDays <= 14
                          ? `in ${expiresDays} day${expiresDays === 1 ? '' : 's'}`
                          : formatShortDate(row.termEndDate)
                        : '—'}
                    </td>
                    <td>{formatShortDate(row.nextActionDueAt)}</td>
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
