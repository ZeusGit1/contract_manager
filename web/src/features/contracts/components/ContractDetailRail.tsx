import { formatFullDate, formatShortDate, formatUsd } from '@/lib/formatters';
import type { ContractDetailDto } from '@/types/api';
import styles from './ContractDetailRail.module.css';

interface ContractDetailRailProps {
  contract: ContractDetailDto;
}

export function ContractDetailRail({ contract }: ContractDetailRailProps) {
  return (
    <aside className={styles.rail} aria-label="Contract summary">
      <section className={styles.card}>
        <h2 className={styles.heading}>Vendor</h2>
        <dl className={styles.list}>
          <Row label="Name" value={contract.vendorName} />
          <Row label="Status" value={contract.vendorPreferredStatus} />
        </dl>
      </section>

      <section className={styles.card}>
        <h2 className={styles.heading}>Owner</h2>
        <dl className={styles.list}>
          <Row label="Requester" value={contract.requesterName} />
          <Row
            label="Reviewer"
            value={contract.assignedReviewerName ?? 'Unassigned'}
            muted={!contract.assignedReviewerName}
          />
        </dl>
      </section>

      <section className={styles.card}>
        <h2 className={styles.heading}>Key dates</h2>
        <dl className={styles.list}>
          <Row label="Submitted" value={formatShortDate(contract.submittedAt)} />
          <Row label="Term start" value={formatShortDate(contract.termStartDate)} />
          <Row label="Term end" value={formatShortDate(contract.termEndDate)} />
          <Row label="Next action due" value={formatShortDate(contract.nextActionDueAt)} />
          <Row label="Last update" value={formatFullDate(contract.lastActionAt)} />
        </dl>
      </section>

      <section className={styles.card}>
        <h2 className={styles.heading}>Value</h2>
        <p className={styles.value}>{formatUsd(contract.totalCostUsd)}</p>
      </section>
    </aside>
  );
}

interface RowProps {
  label: string;
  value: string;
  muted?: boolean;
}

function Row({ label, value, muted }: RowProps) {
  return (
    <div className={styles.row}>
      <dt>{label}</dt>
      <dd className={muted ? styles.muted : undefined}>{value}</dd>
    </div>
  );
}
