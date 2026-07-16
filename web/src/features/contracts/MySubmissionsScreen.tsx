import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/mws/Button';
import { SortHeader, TableEmptyRow, TableShell, TableSkeletonRows } from '@/mws/Table';
import { apiRowToPhase1Contract, nextActionDue, daysFromTodayLocal } from '@/lib/phase1Data';
import type { Phase1Contract } from '@/types/phase1';
import { formatShortDate, formatUsd } from '@/lib/formatters';
import { useContractList } from './hooks';

import styles from './Phase1.module.css';

const CATEGORY_ICON: Record<string, string> = {
  Event: 'ticket',
  Facilities: 'wrench',
  IT: 'desktop',
};

type SortKey = 'title' | 'category' | 'requester' | 'overall' | 'nextDue' | 'value';
type SortDir = 'asc' | 'desc';

const HEADERS: { key: SortKey; label: string }[] = [
  { key: 'title', label: 'Contract' },
  { key: 'category', label: 'Category' },
  { key: 'requester', label: 'Requester' },
  { key: 'overall', label: 'Overall' },
  { key: 'nextDue', label: 'Next due' },
  { key: 'value', label: 'Value' },
];

export function MySubmissionsScreen() {
  const navigate = useNavigate();
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'nextDue', dir: 'asc' });
  // Server-side view scoping — 'submissions' returns contracts where the caller is the requester.
  const listQuery = useContractList({ view: 'submissions' });

  const rows = useMemo(() => {
    const base = (listQuery.data?.items ?? []).map(apiRowToPhase1Contract);
    return sortRows(base, sort);
  }, [listQuery.data, sort]);

  const onSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' },
    );

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>My submissions</h1>
          <p className={styles.subtitle}>
            Contracts where you are the requester or the procurement owner.
          </p>
        </div>
        <Button icon="plus" onClick={() => navigate('/new-contract/category')}>
          New contract
        </Button>
      </header>
      {listQuery.error ? (
        <div className={styles.banner} role="alert">
          <i className="ph ph-warning-circle" aria-hidden="true" />
          <span>Couldn&apos;t load your submissions. Refresh to try again.</span>
        </div>
      ) : null}

      <TableShell minWidth={720}>
        <thead>
          <tr>
            {HEADERS.map((h) => (
              <SortHeader<SortKey>
                key={h.key}
                columnKey={h.key}
                activeKey={sort.key}
                dir={sort.dir}
                onSort={onSort}
              >
                {h.label}
              </SortHeader>
            ))}
          </tr>
        </thead>
        <tbody>
          {listQuery.isLoading ? (
            <TableSkeletonRows columnCount={HEADERS.length} />
          ) : rows.length === 0 ? (
            <TableEmptyRow colSpan={HEADERS.length}>
              You haven&rsquo;t submitted any contracts yet.
            </TableEmptyRow>
          ) : (
            rows.map((c) => {
              const next = nextActionDue(c);
              const days = daysFromTodayLocal(next);
              const overdue = days != null && days < 0;
              const detailKey = c.contractId ?? c.num;
              return (
                <tr
                  key={detailKey}
                  className={styles.bodyRow}
                  onClick={() => navigate(`/contracts/${detailKey}`)}
                >
                  <td>
                    <div className={styles.contractName}>
                      <Link
                        to={`/contracts/${detailKey}`}
                        onClick={(event) => event.stopPropagation()}
                        className={styles.contractLink}
                      >
                        {c.title}
                      </Link>
                      <span className={styles.contractNumber}>{c.num}</span>
                    </div>
                  </td>
                  <td>
                    <span className={styles.cat}>
                      <i className={`ph ph-${CATEGORY_ICON[c.category]}`} aria-hidden="true" />
                      {c.category}
                    </span>
                  </td>
                  <td>{c.requester}</td>
                  <td>
                    {c.overallStatus === 'completed'
                      ? 'Completed'
                      : c.overallStatus === 'canceled'
                        ? 'Canceled'
                        : 'Active'}
                  </td>
                  <td>
                    {next ? (
                      <span className={`${styles.due} ${overdue ? styles.dueOverdue : ''}`}>
                        {overdue ? <i className="ph ph-warning-circle" aria-hidden="true" /> : null}
                        {formatShortDate(next)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{formatUsd(c.value)}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </TableShell>
    </div>
  );
}

function sortRows(rows: Phase1Contract[], sort: { key: SortKey; dir: SortDir }): Phase1Contract[] {
  const dir = sort.dir === 'asc' ? 1 : -1;
  const out = rows.slice();
  out.sort((a, b) => {
    let av: string | number = '';
    let bv: string | number = '';
    switch (sort.key) {
      case 'title':
        av = a.title.toLowerCase();
        bv = b.title.toLowerCase();
        break;
      case 'category':
        av = a.category;
        bv = b.category;
        break;
      case 'requester':
        av = a.requester.toLowerCase();
        bv = b.requester.toLowerCase();
        break;
      case 'overall':
        av = a.overallStatus;
        bv = b.overallStatus;
        break;
      case 'nextDue':
        av = nextActionDue(a) ?? '9999-12-31';
        bv = nextActionDue(b) ?? '9999-12-31';
        break;
      case 'value':
        av = a.value;
        bv = b.value;
        break;
    }
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
  return out;
}
