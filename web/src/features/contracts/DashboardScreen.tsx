import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/mws/Badge';
import { Button } from '@/mws/Button';
import { useContractList, useTriageCounts } from './hooks';
import { daysFromToday, formatShortDate, formatTodayHeader, formatUsd } from '@/lib/formatters';
import { statusInfo } from '@/lib/statusMap';
import type { Category } from '@/types/contract';
import type { TriageCountsDto } from '@/types/api';
import styles from './DashboardScreen.module.css';

type TriageId = 'all' | 'action' | 'review' | 'sign' | 'expiring' | 'closed';
type SortKey =
  | 'title'
  | 'vendor'
  | 'category'
  | 'stage'
  | 'reviewer'
  | 'value'
  | 'expires'
  | 'lastAction'
  | 'nextDue';
type SortDir = 'asc' | 'desc';

interface TriageChip {
  id: TriageId;
  label: string;
}

interface ColumnSpec {
  key: SortKey | 'flag';
  label: string;
  sortable: boolean;
  numeric?: boolean;
}

const TRIAGE_CHIPS: TriageChip[] = [
  { id: 'all', label: 'All active' },
  { id: 'action', label: 'Needs your action' },
  { id: 'review', label: 'In attorney review' },
  { id: 'sign', label: 'Awaiting signature' },
  { id: 'expiring', label: 'Expiring ≤ 14 days' },
  { id: 'closed', label: 'On hold & closed' },
];

// Phosphor icon per category — matches the prototype's element choice.
const CATEGORY_ICON: Record<Category, string> = {
  Event: 'ticket',
  Facilities: 'wrench',
  IT: 'desktop',
};

const COLUMNS: ColumnSpec[] = [
  { key: 'flag', label: '', sortable: false },
  { key: 'title', label: 'Contract', sortable: true },
  { key: 'vendor', label: 'Vendor', sortable: true },
  { key: 'category', label: 'Category', sortable: true },
  { key: 'stage', label: 'Stage', sortable: true },
  { key: 'reviewer', label: 'Reviewer', sortable: true },
  { key: 'value', label: 'Value', sortable: true, numeric: true },
  { key: 'expires', label: 'Expires', sortable: true },
  { key: 'lastAction', label: 'Last action', sortable: true },
  { key: 'nextDue', label: 'Next due', sortable: true },
];

const EXPIRING_SOON_DAYS = 14;

export function DashboardScreen() {
  const [triage, setTriage] = useState<TriageId>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: SortKey | null; dir: SortDir }>({
    key: null,
    dir: 'asc',
  });
  const navigate = useNavigate();

  const params = useMemo(
    () => ({
      triage: triage === 'all' ? undefined : triage,
      query: query.trim() === '' ? undefined : query.trim(),
      sortBy: sort.key ?? undefined,
      sortDir: sort.key ? sort.dir : undefined,
    }),
    [triage, query, sort],
  );

  const { data, isLoading, error } = useContractList(params);
  const countsQuery = useTriageCounts();
  const counts = countsQuery.data;
  const rows = data?.items ?? [];
  const total = data?.total ?? 0;
  const todayLabel = formatTodayHeader();

  const onHeaderClick = (key: SortKey) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return { key: null, dir: 'asc' };
    });
  };

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
        {TRIAGE_CHIPS.map((chip) => {
          const count = chipCount(counts, chip.id);
          return (
            <button
              key={chip.id}
              type="button"
              aria-pressed={triage === chip.id}
              className={`${styles.chip} ${triage === chip.id ? styles.chipActive : ''} ${
                chip.id === 'action' ? styles.chipAttention : ''
              }`}
              onClick={() => setTriage(chip.id)}
            >
              <span className={styles.chipTop}>
                <span className={styles.chipCount}>
                  {count == null ? '—' : count.toLocaleString()}
                </span>
                <span
                  className={`${styles.chipDot} ${dotClass(styles, chip.id)}`}
                  aria-hidden="true"
                />
              </span>
              <span className={styles.chipLabel}>{chip.label}</span>
            </button>
          );
        })}
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
              {COLUMNS.map((col) => {
                if (col.key === 'flag') {
                  return <th key="flag" aria-label="Attention" className={styles.flagCell} />;
                }
                const isActive = sort.key === col.key;
                const ariaSort = isActive
                  ? sort.dir === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none';
                return (
                  <th
                    key={col.key}
                    aria-sort={col.sortable ? ariaSort : undefined}
                    className={col.numeric ? styles.numeric : undefined}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        className={`${styles.sortButton} ${col.numeric ? styles.sortButtonRight : ''}`}
                        onClick={() => onHeaderClick(col.key as SortKey)}
                      >
                        <span>{col.label}</span>
                        <i
                          className={`ph ph-${
                            isActive
                              ? sort.dir === 'asc'
                                ? 'caret-up'
                                : 'caret-down'
                              : 'caret-up-down'
                          } ${styles.sortIcon}`}
                          aria-hidden="true"
                        />
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={COLUMNS.length} className={styles.emptyRow}>
                  Loading contracts…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={COLUMNS.length} className={styles.emptyRow}>
                  Couldn&apos;t load contracts. Refresh to try again.
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className={styles.emptyRow}>
                  No contracts match this view. Clear the filter or search to see all active
                  contracts.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const stage = statusInfo(row.status);
                const expiresDays = daysFromToday(row.termEndDate);
                const expiresSoon =
                  expiresDays != null && expiresDays >= 0 && expiresDays <= EXPIRING_SOON_DAYS;
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
                    <td>
                      <span className={styles.categoryCell}>
                        <i
                          className={`ph ph-${CATEGORY_ICON[row.category]} ${styles.categoryIcon}`}
                          aria-hidden="true"
                        />
                        {row.category}
                      </span>
                    </td>
                    <td>
                      <Badge status={stage.badge}>{stage.label}</Badge>
                    </td>
                    <td>
                      {row.assignedReviewerName ? (
                        <span className={styles.reviewerCell}>
                          <span className={styles.reviewerName}>{row.assignedReviewerName}</span>
                          {row.assignedReviewerTeam ? (
                            <span className={styles.reviewerTeam}>{row.assignedReviewerTeam}</span>
                          ) : null}
                        </span>
                      ) : (
                        <span className={styles.muted}>Unassigned</span>
                      )}
                    </td>
                    <td className={styles.numeric}>{formatUsd(row.totalCostUsd)}</td>
                    <td>
                      {row.termEndDate ? (
                        expiresSoon ? (
                          <span className={styles.expiringSoon}>
                            <i className="ph ph-warning-circle" aria-hidden="true" />
                            in {expiresDays} day{expiresDays === 1 ? '' : 's'}
                          </span>
                        ) : (
                          formatShortDate(row.termEndDate)
                        )
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className={styles.muted}>{formatShortDate(row.lastActionAt)}</td>
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

function chipCount(counts: TriageCountsDto | undefined, id: TriageId): number | null {
  if (!counts) return null;
  return counts[id];
}

function dotClass(styleMap: Record<string, string>, id: TriageId): string {
  switch (id) {
    case 'action':
      return styleMap.dotAction;
    case 'review':
      return styleMap.dotReview;
    case 'sign':
      return styleMap.dotSign;
    case 'expiring':
      return styleMap.dotExpiring;
    case 'closed':
      return styleMap.dotClosed;
    default:
      return styleMap.dotNeutral;
  }
}
