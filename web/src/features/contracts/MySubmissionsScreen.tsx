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

export function MySubmissionsScreen() {
  const navigate = useNavigate();
  const mine: Phase1Contract[] = PHASE1_CONTRACTS.filter(
    (c) => c.requester === ME.name || c.owner === ME.name,
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
              <th>Contract</th>
              <th>Category</th>
              <th>Requester</th>
              <th>Overall</th>
              <th>Next due</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {mine.length === 0 ? (
              <tr className={styles.emptyRow}>
                <td colSpan={6}>You haven&rsquo;t submitted any contracts yet.</td>
              </tr>
            ) : (
              mine.map((c) => {
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
