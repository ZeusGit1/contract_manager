import { useState } from 'react';
import { Button } from '@/mws/Button';
import { statusInfo } from '@/lib/statusMap';
import { FORWARD_STATUS_ORDER } from '@/types/contract';
import type { ContractStatus } from '@/types/contract';
import styles from './StatusChanger.module.css';

interface StatusChangerProps {
  status: ContractStatus;
  isPending: boolean;
  onChange: (newStatus: ContractStatus) => void;
}

export function StatusChanger({ status, isPending, onChange }: StatusChangerProps) {
  const [target, setTarget] = useState<ContractStatus>(() => defaultTarget(status));
  const options = buildOptions(status);

  if (status === 'OnHold') {
    return (
      <Button icon="play" disabled={isPending} onClick={() => onChange('InProcess')}>
        Resume review
      </Button>
    );
  }

  if (status === 'Completed') {
    return (
      <Button
        variant="secondary"
        icon="arrow-clockwise"
        disabled={isPending}
        onClick={() => onChange('InProcess')}
      >
        Reopen contract
      </Button>
    );
  }

  if (options.length === 0) return null;

  return (
    <div className={styles.changer}>
      <label className={styles.label}>
        <span className="visually-hidden">Next status</span>
        <select
          value={target}
          onChange={(event) => setTarget(event.target.value as ContractStatus)}
          className={styles.select}
          disabled={isPending}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {statusInfo(option).label}
            </option>
          ))}
        </select>
      </label>
      <Button
        icon="arrow-right"
        disabled={isPending || target === status}
        onClick={() => onChange(target)}
      >
        Apply
      </Button>
    </div>
  );
}

function defaultTarget(current: ContractStatus): ContractStatus {
  const index = FORWARD_STATUS_ORDER.indexOf(current);
  if (index >= 0 && index < FORWARD_STATUS_ORDER.length - 1) {
    return FORWARD_STATUS_ORDER[index + 1];
  }
  return current;
}

function buildOptions(current: ContractStatus): ContractStatus[] {
  const index = FORWARD_STATUS_ORDER.indexOf(current);
  const forward = index >= 0 ? FORWARD_STATUS_ORDER.slice(index + 1) : [];
  const exceptional: ContractStatus[] = ['OnHold'];
  return [...forward, ...exceptional];
}
