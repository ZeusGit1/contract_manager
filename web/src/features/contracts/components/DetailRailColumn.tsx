import { PROCUREMENT_OWNERS, type Phase1Contract } from '@/types/phase1';
import { formatUsd } from '@/lib/formatters';
import { Fact, RailCard } from './DetailRail';
import { formatTerm, type ActivityItem } from './contractDetail.helpers';
import styles from './ContractDetail.module.css';

interface DetailRailColumnProps {
  contract: Phase1Contract;
  overallStatus: Phase1Contract['overallStatus'];
  onOverallStatusChange: (value: Phase1Contract['overallStatus']) => void;
  priority: Phase1Contract['priority'];
  onPriorityChange: (value: Phase1Contract['priority']) => void;
  owner: string;
  onOwnerChange: (value: string) => void;
  onOwnerActivity: (event: ActivityItem) => void;
}

/** Contract-detail right rail — status, priority, owner controls + key facts.
 *  Four RailCards composed in one aside so the main screen stays composition-focused. */
export function DetailRailColumn({
  contract,
  overallStatus,
  onOverallStatusChange,
  priority,
  onPriorityChange,
  owner,
  onOwnerChange,
  onOwnerActivity,
}: DetailRailColumnProps) {
  return (
    <aside className={styles.rail}>
      <RailCard title="Overall status">
        <select
          value={overallStatus}
          onChange={(event) =>
            onOverallStatusChange(event.target.value as Phase1Contract['overallStatus'])
          }
          className={styles.railSelect}
        >
          <option value="active">Active</option>
          <option value="completed">Mark complete</option>
          <option value="canceled">Mark canceled</option>
        </select>
        <p className={styles.railCaption}>
          Procurement keeps manual control. Lanes can finish independently — the contract is not
          complete until you say so.
        </p>
      </RailCard>
      <RailCard title="Priority">
        <select
          value={priority}
          onChange={(event) => onPriorityChange(event.target.value as Phase1Contract['priority'])}
          className={styles.railSelect}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </RailCard>
      <RailCard title="Procurement owner">
        <label>
          <span className={styles.railFieldLabel}>Reassign owner</span>
          <select
            value={owner}
            onChange={(event) => {
              const next = event.target.value;
              onOwnerChange(next);
              onOwnerActivity({
                icon: 'user-switch',
                text: `Procurement owner reassigned to ${next}`,
                when: 'Just now',
              });
            }}
            className={styles.railSelect}
          >
            {PROCUREMENT_OWNERS.map((o) => (
              <option key={o.name} value={o.name}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
      </RailCard>
      <RailCard title="Key facts">
        <Fact label="Requester" value={contract.requester} />
        <Fact label="Value" value={formatUsd(contract.value)} />
        <Fact label="Vendor" value={contract.vendor} />
        <Fact label="Contract term" value={formatTerm(contract.startDate, contract.endDate)} />
        {contract.event ? (
          <Fact label="Parent event" value={contract.event.parentEvent || '—'} />
        ) : null}
      </RailCard>
    </aside>
  );
}
