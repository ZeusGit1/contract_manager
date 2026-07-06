import { Button } from '@/mws/Button';
import { formatShortDate } from '@/lib/formatters';
import { LANE_STATUS_LABEL, laneDef, type ContractLane, type LaneId } from '@/types/phase1';
import phase1Styles from '../Phase1.module.css';
import styles from './ApprovalsSection.module.css';

const APPROVAL_LANES: LaneId[] = ['legal', 'infosec', 'privacy', 'gco'];

const LANE_PILL_CLASS: Record<ContractLane['status'], string> = {
  in_review: phase1Styles.lanePillInReview,
  waiting: phase1Styles.lanePillWaiting,
  approved: phase1Styles.lanePillApproved,
  canceled: phase1Styles.lanePillCanceled,
  complete: phase1Styles.lanePillComplete,
  not_started: phase1Styles.lanePillNotStarted,
  na: phase1Styles.lanePillNa,
};

interface ApprovalsSectionProps {
  lanes: ContractLane[];
  isClosed: boolean;
  onRecord: (idx: number) => void;
}

/** Section listing the four approval lanes (Legal, InfoSec, Privacy, GCO) with a Record/Update
 *  affordance. Approved rows use a pale-success tint so recorded outcomes read at a glance. */
export function ApprovalsSection({ lanes, isClosed, onRecord }: ApprovalsSectionProps) {
  const rows = APPROVAL_LANES.map((id) => {
    const idx = lanes.findIndex((lane) => lane.id === id);
    return idx >= 0 ? { lane: lanes[idx], idx } : null;
  }).filter((row): row is { lane: ContractLane; idx: number } => row !== null);

  if (rows.length === 0) return null;

  const approvedCount = rows.filter(
    ({ lane }) => lane.status === 'approved' || lane.status === 'complete',
  ).length;

  return (
    <section aria-label="Approvals" className={styles.section}>
      <div className={styles.head}>
        <p className={styles.title}>Approvals</p>
        <span className={styles.caption}>
          {approvedCount} of {rows.length} recorded · risk-review outcomes from InfoSec, Privacy,
          GCO, Legal
        </span>
      </div>
      <ul className={styles.list}>
        {rows.map(({ lane, idx }) => {
          const def = laneDef(lane.id);
          const recorded = lane.status === 'approved' || lane.status === 'complete';
          return (
            <li key={lane.id} className={`${styles.item} ${recorded ? styles.itemRecorded : ''}`}>
              <span className={styles.laneName}>
                <i className={`ph ph-${def.icon}`} aria-hidden="true" /> {def.label}
              </span>
              <span className={`${phase1Styles.lanePill} ${LANE_PILL_CLASS[lane.status]}`}>
                <span className={phase1Styles.lanePill__dot} aria-hidden="true" />
                {LANE_STATUS_LABEL[lane.status]}
              </span>
              <span className={styles.itemStatus}>
                {recorded ? (
                  <>
                    Approved by {lane.owner ?? '—'} · {formatShortDate(lane.lastUpdated)}
                  </>
                ) : (
                  'Awaiting recorded approval'
                )}
              </span>
              {isClosed ? null : (
                <Button
                  variant="secondary"
                  size="sm"
                  icon="pencil-simple"
                  onClick={() => onRecord(idx)}
                >
                  {recorded ? 'Update' : 'Record'}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
