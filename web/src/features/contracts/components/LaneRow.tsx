import { useState } from 'react';
import { Button } from '@/mws/Button';
import { daysFromTodayLocal } from '@/lib/phase1Data';
import { formatShortDate } from '@/lib/formatters';
import { LANE_STATUS_LABEL, isLaneOpen, laneDef, type ContractLane } from '@/types/phase1';
import phase1Styles from '../Phase1.module.css';
import styles from './LaneRow.module.css';

interface LaneRowProps {
  lane: ContractLane;
  isClosed: boolean;
  editing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (patch: Partial<ContractLane>) => void;
}

const LANE_PILL_CLASS: Record<ContractLane['status'], string> = {
  in_review: phase1Styles.lanePillInReview,
  waiting: phase1Styles.lanePillWaiting,
  approved: phase1Styles.lanePillApproved,
  canceled: phase1Styles.lanePillCanceled,
  complete: phase1Styles.lanePillComplete,
  not_started: phase1Styles.lanePillNotStarted,
  na: phase1Styles.lanePillNa,
};

/** One review lane. Read mode shows the current owner/status/due; Edit mode swaps to a form.
 *  Procurement lane gets an orange left rail when open (it's the anchor for the whole flow). */
export function LaneRow({
  lane,
  isClosed,
  editing,
  onStartEdit,
  onCancelEdit,
  onSave,
}: LaneRowProps) {
  const def = laneDef(lane.id);
  const dueDays = lane.dueDate ? daysFromTodayLocal(lane.dueDate) : null;
  const overdue = isLaneOpen(lane) && dueDays != null && dueDays < 0;
  const [status, setStatus] = useState<ContractLane['status']>(lane.status);
  const [owner, setOwner] = useState(lane.owner ?? '');
  const [dueDate, setDueDate] = useState(lane.dueDate ?? '');
  const [note, setNote] = useState(lane.note ?? '');

  const rowClass = [
    styles.row,
    overdue ? styles.rowOverdue : '',
    lane.id === 'procurement' && isLaneOpen(lane) ? styles.rowActive : '',
    lane.status === 'complete' ? styles.rowComplete : '',
    lane.status === 'na' ? styles.rowNa : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (editing) {
    return (
      <div className={rowClass}>
        <div className={styles.header}>
          <i className={`ph ph-${def.icon}`} aria-hidden="true" /> {def.label}
        </div>
        <div className={styles.editorGrid}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as ContractLane['status'])}
            >
              {Object.entries(LANE_STATUS_LABEL).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Owner</span>
            <input value={owner} onChange={(event) => setOwner(event.target.value)} />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Due date</span>
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </label>
          <label className={`${styles.field} ${styles.fieldFull}`}>
            <span className={styles.fieldLabel}>Note (optional)</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
        </div>
        <div className={styles.editorActions}>
          <Button variant="secondary" size="sm" onClick={onCancelEdit}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() =>
              onSave({
                status,
                owner: owner || null,
                dueDate: dueDate || null,
                note: note || null,
              })
            }
          >
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={rowClass}>
      <div className={styles.readGrid}>
        <div className={styles.header}>
          <i className={`ph ph-${def.icon}`} aria-hidden="true" /> {def.label}
        </div>
        <div>
          <span className={`${phase1Styles.lanePill} ${LANE_PILL_CLASS[lane.status]}`}>
            <span className={phase1Styles.lanePill__dot} aria-hidden="true" />
            {LANE_STATUS_LABEL[lane.status]}
          </span>
        </div>
        <div className={styles.readCell}>
          {lane.owner ? (
            <>
              <span className={styles.readCellValue}>{lane.owner}</span>
              Owner
            </>
          ) : (
            <>
              <span className={styles.readCellValue}>—</span>
              No owner yet
            </>
          )}
        </div>
        <div className={styles.readCell}>
          {lane.dueDate ? (
            <>
              <span className={styles.readCellValue}>
                {overdue ? (
                  <i className={`ph ph-warning-circle ${styles.warningIcon}`} aria-hidden="true" />
                ) : null}{' '}
                {formatShortDate(lane.dueDate)}
              </span>
              {overdue
                ? `${-(dueDays as number)}d overdue`
                : dueDays === 0
                  ? 'Due today'
                  : `in ${dueDays}d`}
            </>
          ) : (
            <>
              <span className={styles.readCellValue}>—</span>
              No due date
            </>
          )}
        </div>
        <div className={styles.readActions}>
          {isClosed ? null : (
            <Button variant="secondary" size="sm" icon="pencil-simple" onClick={onStartEdit}>
              Update
            </Button>
          )}
        </div>
      </div>
      {lane.note ? (
        <div className={styles.noteBox}>
          <i className="ph ph-note-pencil" aria-hidden="true" /> {lane.note}
        </div>
      ) : null}
    </div>
  );
}
