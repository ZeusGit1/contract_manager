import { daysFromToday, formatShortDate } from '@/lib/formatters';
import type { ContractStatus } from '@/types/contract';
import styles from './StatusBanner.module.css';

interface StatusBannerProps {
  status: ContractStatus;
  nextActionDueAt: string | null;
  attentionReason?: string | null;
}

export function StatusBanner({ status, nextActionDueAt, attentionReason }: StatusBannerProps) {
  const banner = deriveBanner(status, nextActionDueAt, attentionReason);
  const flag = deriveFlag(status);
  if (!banner && !flag) return null;
  return (
    <div className={styles.row}>
      {flag ? (
        <span className={`${styles.flag} ${styles[flag.kind]}`}>
          <i className={`ph ph-${flag.icon}`} aria-hidden="true" />
          <span className={styles.flagLabel}>{flag.label}</span>
          <span className={styles.flagBody}>{flag.body}</span>
        </span>
      ) : null}
      {banner ? (
        <div className={`${styles.alert} ${styles[banner.severity]}`} role="status">
          <i className={`ph ph-${banner.icon}`} aria-hidden="true" />
          <span>{banner.message}</span>
        </div>
      ) : null}
    </div>
  );
}

interface Banner {
  severity: 'warn' | 'info';
  icon: string;
  message: string;
}

function deriveBanner(
  status: ContractStatus,
  nextActionDueAt: string | null,
  attentionReason?: string | null,
): Banner | null {
  if (attentionReason) {
    return { severity: 'warn', icon: 'warning-circle', message: attentionReason };
  }
  if (status === 'OnHold' || status === 'Canceled') return null;
  const dueDays = daysFromToday(nextActionDueAt);
  if (dueDays != null && dueDays < 0 && nextActionDueAt) {
    const label = formatShortDate(nextActionDueAt);
    return {
      severity: 'warn',
      icon: 'warning-circle',
      message: `Next action was due ${label} — review and update the next step.`,
    };
  }
  return null;
}

interface Flag {
  kind: 'paused' | 'closed';
  icon: string;
  label: string;
  body: string;
}

function deriveFlag(status: ContractStatus): Flag | null {
  if (status === 'OnHold') {
    return { kind: 'paused', icon: 'pause-circle', label: 'Paused', body: 'Resume to continue.' };
  }
  if (status === 'Completed') {
    return { kind: 'closed', icon: 'check-circle', label: 'Closed', body: 'Marked completed.' };
  }
  if (status === 'Canceled' || status === 'Expired' || status === 'Terminated') {
    return { kind: 'closed', icon: 'x-circle', label: status, body: 'No further actions.' };
  }
  return null;
}
