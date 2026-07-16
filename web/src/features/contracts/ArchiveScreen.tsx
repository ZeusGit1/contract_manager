import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { SortHeader, TableEmptyRow, TableShell, TableSkeletonRows } from '@/mws/Table';
import { apiRowToPhase1Contract } from '@/lib/phase1Data';
import type { Phase1Contract } from '@/types/phase1';
import { formatUsd } from '@/lib/formatters';
import { useContractArchive } from './hooks';

import styles from './Phase1.module.css';

const CATEGORY_ICON: Record<string, string> = {
  Event: 'ticket',
  Facilities: 'wrench',
  IT: 'desktop',
};

type SortKey = 'title' | 'vendor' | 'requester' | 'owner' | 'category' | 'finalState' | 'value';
type SortDir = 'asc' | 'desc';

const HEADERS: { key: SortKey; label: string }[] = [
  { key: 'title', label: 'Contract' },
  { key: 'vendor', label: 'Vendor' },
  { key: 'requester', label: 'Requester' },
  { key: 'owner', label: 'Procurement owner' },
  { key: 'category', label: 'Category' },
  { key: 'finalState', label: 'Final state' },
  { key: 'value', label: 'Value' },
];

export function ArchiveScreen() {
  const navigate = useNavigate();
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'title', dir: 'asc' });
  const archiveQuery = useContractArchive({});

  const rows = useMemo(() => {
    const base = (archiveQuery.data?.items ?? []).map(apiRowToPhase1Contract);
    return sortRows(base, sort);
  }, [archiveQuery.data, sort]);

  const onSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' },
    );

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Completed / canceled</h1>
          <p className={styles.subtitle}>
            Contracts procurement has manually marked complete or canceled. History preserved here —
            no auto-archive.
          </p>
        </div>
      </header>
      {archiveQuery.error ? (
        <div className={styles.banner} role="alert">
          <i className="ph ph-warning-circle" aria-hidden="true" />
          <span>Couldn&apos;t load archived contracts. Refresh to try again.</span>
        </div>
      ) : null}
      <TableShell minWidth={960}>
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
          {archiveQuery.isLoading ? (
            <TableSkeletonRows columnCount={HEADERS.length} />
          ) : rows.length === 0 ? (
            <TableEmptyRow colSpan={HEADERS.length}>No closed contracts yet.</TableEmptyRow>
          ) : (
            rows.map((c) => {
              const detailKey = c.contractId ?? c.num;
              return (
                <tr
                  key={detailKey}
                  className={`${styles.bodyRow} ${styles.rowClosed}`}
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
                  <td>{c.vendor}</td>
                  <td>{c.requester}</td>
                  <td>{c.owner}</td>
                  <td>
                    <span className={styles.cat}>
                      <i className={`ph ph-${CATEGORY_ICON[c.category]}`} aria-hidden="true" />
                      {c.category}
                    </span>
                  </td>
                  <td>{c.overallStatus === 'completed' ? 'Completed' : 'Canceled'}</td>
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
      case 'vendor':
        av = a.vendor.toLowerCase();
        bv = b.vendor.toLowerCase();
        break;
      case 'requester':
        av = a.requester.toLowerCase();
        bv = b.requester.toLowerCase();
        break;
      case 'owner':
        av = a.owner.toLowerCase();
        bv = b.owner.toLowerCase();
        break;
      case 'category':
        av = a.category;
        bv = b.category;
        break;
      case 'finalState':
        av = a.overallStatus;
        bv = b.overallStatus;
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
