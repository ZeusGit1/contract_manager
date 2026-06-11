import styles from './Badge.module.css';

export type BadgeStatus = 'live' | 'pending' | 'failed' | 'draft' | 'archived' | 'info' | 'hold';

interface BadgeProps {
  status: BadgeStatus;
  children: React.ReactNode;
}

/** McDermott status badge — pill shape, pale fill + navy text per theme-stable rule.
 *  See .claude/rules/design/notifications-and-feedback.md. */
export function Badge({ status, children }: BadgeProps) {
  return <span className={`${styles.badge} ${styles[status]}`}>{children}</span>;
}
