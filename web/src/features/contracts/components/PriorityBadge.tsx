import type { Phase1Contract } from '@/types/phase1';
import styles from '../Phase1.module.css';

const LABELS: Record<Phase1Contract['priority'], string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const CLASSES: Record<Phase1Contract['priority'], string> = {
  critical: styles.priorityCritical,
  high: styles.priorityHigh,
  medium: styles.priorityMedium,
  low: styles.priorityLow,
};

/** Contract priority pill. Pale fills per notifications-and-feedback.md;
 *  Critical adds a saturated dot for emphasis (defined in Phase1.module.css). */
export function PriorityBadge({ priority }: { priority: Phase1Contract['priority'] }) {
  return <span className={`${styles.priority} ${CLASSES[priority]}`}>{LABELS[priority]}</span>;
}
