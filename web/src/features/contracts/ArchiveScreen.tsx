import { useNavigate } from 'react-router-dom';

import { PHASE1_CONTRACTS } from '@/lib/phase1Data';
import { ownerByName, type Phase1Contract } from '@/types/phase1';
import { formatUsd } from '@/lib/formatters';

import styles from './Phase1.module.css';

const CATEGORY_ICON: Record<string, string> = {
  Event: 'ticket',
  Facilities: 'wrench',
  IT: 'desktop',
};

export function ArchiveScreen() {
  const navigate = useNavigate();
  const closed: Phase1Contract[] = PHASE1_CONTRACTS.filter((c) => c.overallStatus !== 'active');

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
      <div className={styles.tableShell}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Contract</th>
              <th>Vendor</th>
              <th>Requester</th>
              <th>Procurement owner</th>
              <th>Category</th>
              <th>Final state</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {closed.length === 0 ? (
              <tr className={styles.emptyRow}>
                <td colSpan={7}>No closed contracts yet.</td>
              </tr>
            ) : (
              closed.map((c) => {
                const owner = ownerByName(c.owner);
                return (
                  <tr
                    key={c.num}
                    className={`${styles.bodyRow} ${styles.rowClosed}`}
                    onClick={() => navigate(`/contracts/${c.num}`)}
                  >
                    <td>
                      <div className={styles.contractName}>
                        <span>{c.title}</span>
                        <span className={styles.contractNumber}>{c.num}</span>
                      </div>
                    </td>
                    <td>{c.vendor}</td>
                    <td>{c.requester}</td>
                    <td>
                      <span className={styles.cellStack}>
                        {owner ? (
                          <span
                            className={`${styles.ownerDot} ${styles[`ownerDot${owner.tone}`]}`}
                            aria-hidden="true"
                          />
                        ) : null}{' '}
                        {c.owner}
                      </span>
                    </td>
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
        </table>
      </div>
    </div>
  );
}
