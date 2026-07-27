import { useState } from 'react';
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

export interface ApprovalInput {
  ownerLabel: string;
  note: string | null;
}

interface ApprovalsSectionProps {
  lanes: ContractLane[];
  isClosed: boolean;
  /**
   * Fires when the user hits Approve on a row. Parent wires this to the lane-update mutation
   * with status=Approved, ownerLabel=input.ownerLabel, note=input.note.
   */
  onApprove: (idx: number, input: ApprovalInput) => void;
  /** Fires when the user clicks Details — opens the full lane editor in the Review-lanes section. */
  onOpenDetails: (idx: number) => void;
  /** Disables the Approve controls while a mutation is in flight. */
  isSaving?: boolean;
}

/** Section listing the four approval lanes (Legal, InfoSec, Privacy, GCO) with inline
 *  Approve + Details affordances. Approve reveals a small owner/note form so procurement
 *  can record the outcome without scrolling up to the Review-lanes section. */
export function ApprovalsSection({
  lanes,
  isClosed,
  onApprove,
  onOpenDetails,
  isSaving,
}: ApprovalsSectionProps) {
  const [approvingIdx, setApprovingIdx] = useState<number | null>(null);

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
          const isApproving = approvingIdx === idx;
          return (
            <li key={lane.id} className={styles.itemWrap}>
              <div className={`${styles.item} ${recorded ? styles.itemRecorded : ''}`}>
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
                  <div className={styles.itemActions}>
                    {!recorded ? (
                      <Button
                        size="sm"
                        icon="check-circle"
                        onClick={() => setApprovingIdx((current) => (current === idx ? null : idx))}
                        disabled={isSaving}
                      >
                        Approve
                      </Button>
                    ) : null}
                    <Button
                      variant="secondary"
                      size="sm"
                      icon="pencil-simple"
                      onClick={() => onOpenDetails(idx)}
                      disabled={isSaving}
                    >
                      Details
                    </Button>
                  </div>
                )}
              </div>
              {isApproving ? (
                <ApproveForm
                  laneLabel={def.label}
                  initialOwner={lane.owner ?? ''}
                  isSaving={isSaving}
                  onCancel={() => setApprovingIdx(null)}
                  onConfirm={(input) => {
                    onApprove(idx, input);
                    setApprovingIdx(null);
                  }}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

interface ApproveFormProps {
  laneLabel: string;
  initialOwner: string;
  isSaving?: boolean;
  onCancel: () => void;
  onConfirm: (input: ApprovalInput) => void;
}

/** Small inline form under an Approve click — captures reviewer name + optional note. */
function ApproveForm({ laneLabel, initialOwner, isSaving, onCancel, onConfirm }: ApproveFormProps) {
  const [owner, setOwner] = useState(initialOwner);
  const [note, setNote] = useState('');

  const handleConfirm = () => {
    const trimmed = owner.trim();
    if (!trimmed) return;
    onConfirm({ ownerLabel: trimmed, note: note.trim() || null });
  };

  return (
    <div className={styles.approveForm}>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>{laneLabel} approver</span>
        <input
          type="text"
          value={owner}
          onChange={(event) => setOwner(event.target.value)}
          placeholder="e.g. Priya Nair"
          autoFocus
        />
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>
          Note <span className={styles.fieldOptional}>(optional)</span>
        </span>
        <input
          type="text"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Any conditions or context"
        />
      </label>
      <div className={styles.approveFormActions}>
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          size="sm"
          icon="check-circle"
          onClick={handleConfirm}
          disabled={isSaving || !owner.trim()}
        >
          {isSaving ? 'Recording…' : 'Confirm approval'}
        </Button>
      </div>
    </div>
  );
}
