import { useState } from 'react';
import { Button } from '@/mws/Button';
import {
  isLaneOpen,
  laneDef,
  requesterEmailFrom,
  type ContractLane,
  type LaneId,
  type Phase1Contract,
} from '@/types/phase1';
import styles from './ReminderModal.module.css';

interface ReminderModalProps {
  contract: Phase1Contract;
  lanes: ContractLane[];
  onClose: () => void;
  onSend: (laneId: LaneId) => void;
}

/** Reminder modal — pick an external lane (vendor/requester/signature) and send.
 *  Internal reviewers are handled on the risk-review calls, not from here. */
export function ReminderModal({ contract, lanes, onClose, onSend }: ReminderModalProps) {
  const targets = lanes.filter(
    (lane) =>
      isLaneOpen(lane) &&
      (lane.id === 'vendor' || lane.id === 'requester' || lane.id === 'signature'),
  );
  const [selected, setSelected] = useState<LaneId | null>(targets[0]?.id ?? null);

  const recipientFor = (laneId: LaneId): string => {
    if (laneId === 'requester') {
      return contract.requesterEmail ?? requesterEmailFrom(contract.requester);
    }
    if (laneId === 'vendor') return contract.vendor;
    if (laneId === 'signature') return 'DocuSign envelope';
    return '';
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Send reminder"
      className={styles.scrim}
      onClick={onClose}
    >
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div className={styles.head}>
          <div className={styles.title}>Send reminder</div>
          <button type="button" aria-label="Close" onClick={onClose} className={styles.closeBtn}>
            <i className="ph ph-x" aria-hidden="true" />
          </button>
        </div>
        <div className={styles.body}>
          <p className={styles.caption}>
            External follow-up only — vendor, requester, signature. Internal reviewers are handled
            on the risk-review calls.
          </p>
          {targets.length === 0 ? (
            <p className={styles.emptyMessage}>No open lanes available for a reminder.</p>
          ) : (
            <div className={styles.optionsList}>
              {targets.map((lane) => (
                <label key={lane.id} className={styles.option}>
                  <input
                    type="radio"
                    name="reminder-target"
                    checked={selected === lane.id}
                    onChange={() => setSelected(lane.id)}
                  />
                  <span>
                    <strong>{laneDef(lane.id).label}</strong>
                    <br />
                    <span className={styles.optionRecipient}>{recipientFor(lane.id)}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
          <div className={styles.actions}>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            {targets.length > 0 ? (
              <Button
                icon="paper-plane-tilt"
                disabled={!selected}
                onClick={() => selected && onSend(selected)}
              >
                Send reminder
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
