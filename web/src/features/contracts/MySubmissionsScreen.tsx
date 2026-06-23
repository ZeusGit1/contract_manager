import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PHASE1_CONTRACTS, nextActionDue, daysFromTodayLocal } from '@/lib/phase1Data';
import { ME, type Phase1Contract } from '@/types/phase1';
import { formatShortDate, formatUsd } from '@/lib/formatters';

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

  const rows = useMemo(() => {
    const base = PHASE1_CONTRACTS.filter((c) => c.requester === ME.name || c.owner === ME.name);
    return sortRows(base, sort);
  }, [sort]);

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
        <button className="btn" onClick={() => navigate('/new-contract/category')}>
          <i className="ph ph-plus" aria-hidden="true" /> New contract
        </button>
      </header>

      <div className={styles.tableShell}>
        <table className={styles.table}>
          <thead>
            <tr>
              {HEADERS.map((h) => (
                <th key={h.key} aria-sort={sortAriaFor(sort, h.key)}>
                  <button type="button" className={styles.sortBtn} onClick={() => onSort(h.key)}>
                    <span>{h.label}</span>
                    <i className={`ph ph-${sortIconFor(sort, h.key)}`} aria-hidden="true" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className={styles.emptyRow}>
                <td colSpan={HEADERS.length}>You haven&rsquo;t submitted any contracts yet.</td>
              </tr>
            ) : (
              rows.map((c) => {
                const next = nextActionDue(c);
                const days = daysFromTodayLocal(next);
                const overdue = days != null && days < 0;
                return (
                  <tr
                    key={c.num}
                    className={styles.bodyRow}
                    onClick={() => navigate(`/contracts/${c.num}`)}
                  >
                    <td>
                      <div className={styles.contractName}>
                        <span>{c.title}</span>
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
                          {overdue ? (
                            <i className="ph ph-warning-circle" aria-hidden="true" />
                          ) : null}
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
        </table>
      </div>
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

function sortIconFor(sort: { key: SortKey; dir: SortDir }, key: SortKey): string {
  if (sort.key !== key) return 'caret-up-down';
  return sort.dir === 'asc' ? 'caret-up' : 'caret-down';
}

function sortAriaFor(
  sort: { key: SortKey; dir: SortDir },
  key: SortKey,
): 'ascending' | 'descending' | 'none' {
  if (sort.key !== key) return 'none';
  return sort.dir === 'asc' ? 'ascending' : 'descending';
}
