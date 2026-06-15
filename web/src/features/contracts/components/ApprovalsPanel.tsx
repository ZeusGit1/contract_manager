import type { ContractStatus } from '@/types/contract';
import { FORWARD_STATUS_ORDER } from '@/types/contract';
import { statusInfo } from '@/lib/statusMap';
import type { AssignmentDto } from '@/types/api';
import styles from './ApprovalsPanel.module.css';

type StageKey = 'WithLegal' | 'WithGCO' | 'WithInfoSec' | 'WithPrivacy';
type ApprovalState = 'approved' | 'current' | 'pending';

interface ApprovalsPanelProps {
  status: ContractStatus;
  assignments: AssignmentDto[];
}

const REVIEW_STAGES: StageKey[] = ['WithLegal', 'WithGCO', 'WithInfoSec', 'WithPrivacy'];

export function ApprovalsPanel({ status, assignments }: ApprovalsPanelProps) {
  const currentIndex = FORWARD_STATUS_ORDER.indexOf(status);
  const rows = REVIEW_STAGES.map((stage) => {
    const stageIndex = FORWARD_STATUS_ORDER.indexOf(stage);
    let state: ApprovalState = 'pending';
    if (stageIndex < currentIndex) state = 'approved';
    else if (stageIndex === currentIndex) state = 'current';
    const reviewer = findLatestReviewer(assignments, stage);
    return { stage, state, reviewer };
  });

  const doneCount = rows.filter((row) => row.state === 'approved').length;

  return (
    <section className={styles.panel} aria-label="Attorney approvals">
      <header className={styles.head}>
        <h3 className={styles.title}>Attorney approvals</h3>
        <span className={styles.progress}>
          <i className="ph ph-check-circle" aria-hidden="true" />
          {doneCount} of {REVIEW_STAGES.length} complete
        </span>
      </header>
      <ul className={styles.list}>
        {rows.map((row) => (
          <li key={row.stage} className={`${styles.row} ${styles[row.state]}`}>
            <span className={styles.icon} aria-hidden="true">
              {row.state === 'approved' ? (
                <i className="ph ph-check-circle" />
              ) : row.state === 'current' ? (
                <i className="ph ph-circle-notch" />
              ) : (
                <i className="ph ph-circle" />
              )}
            </span>
            <span className={styles.label}>{statusInfo(row.stage).label}</span>
            <span className={styles.reviewer}>{row.reviewer ?? '—'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function findLatestReviewer(assignments: AssignmentDto[], team: StageKey): string | null {
  const match = assignments
    .filter((assignment) => normalizeTeam(assignment.reviewerTeam) === team)
    .sort((first, second) => second.assignedAt.localeCompare(first.assignedAt))[0];
  return match?.reviewerName ?? null;
}

function normalizeTeam(team: string): StageKey | null {
  const lowered = team.toLowerCase();
  if (lowered.includes('legal')) return 'WithLegal';
  if (lowered.includes('gco')) return 'WithGCO';
  if (lowered.includes('infosec') || lowered.includes('info sec')) return 'WithInfoSec';
  if (lowered.includes('privacy')) return 'WithPrivacy';
  return null;
}
