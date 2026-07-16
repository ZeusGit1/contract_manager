import type { Phase1Contract } from '@/types/phase1';
import type { ContractDetailDto } from '@/types/api';
import { formatUsd } from '@/lib/formatters';
import { Fact, RailCard } from './DetailRail';
import { formatTerm } from './contractDetail.helpers';
import { useUsersList } from '../hooks';
import styles from './ContractDetail.module.css';

interface DetailRailColumnProps {
  contract: Phase1Contract;
  apiDetail: ContractDetailDto;
  overallStatus: Phase1Contract['overallStatus'];
  onOverallStatusChange: (value: Phase1Contract['overallStatus']) => void;
  priority: Phase1Contract['priority'];
  onPriorityChange: (value: Phase1Contract['priority']) => void;
  /** Display-only owner label — the mutation callback is called with the picked userId. */
  owner: string;
  onOwnerChange: (userId: string | null) => void;
  isBusy?: boolean;
}

/** Contract-detail right rail — status, priority, owner controls + key facts.
 *  Four RailCards composed in one aside so the main screen stays composition-focused.
 *  The owner picker sources firm users from GET /api/users and PATCHes the picked
 *  Entra oid GUID via /api/contracts/{id}/owner. */
export function DetailRailColumn({
  contract,
  apiDetail,
  overallStatus,
  onOverallStatusChange,
  priority,
  onPriorityChange,
  onOwnerChange,
  isBusy,
}: DetailRailColumnProps) {
  const usersQuery = useUsersList();
  const currentOwnerId = apiDetail.procurementOwnerUserId ?? '';

  return (
    <aside className={styles.rail}>
      <RailCard title="Overall status">
        <select
          value={overallStatus}
          onChange={(event) =>
            onOverallStatusChange(event.target.value as Phase1Contract['overallStatus'])
          }
          className={styles.railSelect}
          disabled={isBusy}
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
          disabled={isBusy}
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
            value={currentOwnerId}
            onChange={(event) => {
              const next = event.target.value;
              onOwnerChange(next === '' ? null : next);
            }}
            className={styles.railSelect}
            disabled={isBusy || usersQuery.isLoading}
          >
            <option value="">Unassigned</option>
            {(usersQuery.data ?? []).map((user) => (
              <option key={user.userId} value={user.userId}>
                {user.displayName}
              </option>
            ))}
          </select>
        </label>
        {usersQuery.error ? (
          <p className={styles.railCaption} role="alert">
            Couldn&apos;t load users. Try refreshing.
          </p>
        ) : null}
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
