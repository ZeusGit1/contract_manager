import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { findContract, daysFromTodayLocal } from '@/lib/phase1Data';
import {
  LANE_STATUS_LABEL,
  PROCUREMENT_OWNERS,
  isLaneOpen,
  laneDef,
  requesterEmailFrom,
  type ContractLane,
  type LaneId,
  type Phase1Contract,
} from '@/types/phase1';
import { formatFullDate, formatShortDate, formatUsd } from '@/lib/formatters';

import styles from './Phase1.module.css';

type TabId = 'details' | 'documents' | 'comments' | 'notes' | 'activity';

interface DocItem {
  id: string;
  name: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

interface CommentItem {
  id: string;
  author: string;
  text: string;
  when: string;
  isInternal: boolean;
}

interface NoteItem {
  id: string;
  author: string;
  text: string;
  when: string;
}

const ME_NAME = 'Lisa Farkas';

export function ContractDetailScreen() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const contract = contractId ? findContract(contractId) : undefined;
  const [tab, setTab] = useState<TabId>('details');
  const [lanes, setLanes] = useState<ContractLane[]>(
    () => contract?.lanes.map((l) => ({ ...l })) ?? [],
  );
  const [editingLaneIdx, setEditingLaneIdx] = useState<number | null>(null);
  const [overallStatus, setOverallStatus] = useState<Phase1Contract['overallStatus']>(
    contract?.overallStatus ?? 'active',
  );
  const [priority, setPriority] = useState<Phase1Contract['priority']>(
    contract?.priority ?? 'medium',
  );
  const [owner, setOwner] = useState<string>(contract?.owner ?? PROCUREMENT_OWNERS[0].name);
  const [lanesExpanded, setLanesExpanded] = useState(false);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [activity, setActivity] = useState<{ icon: string; text: string; when: string }[]>(() =>
    seedActivity(contract),
  );
  const [docs, setDocs] = useState<DocItem[]>(() => seedDocs(contract));
  const [comments, setComments] = useState<CommentItem[]>(() => seedComments(contract));
  const [notes, setNotes] = useState<NoteItem[]>(() => seedNotes(contract));

  const openOverdue = useMemo(
    () =>
      lanes.filter((l) => isLaneOpen(l) && l.dueDate && (daysFromTodayLocal(l.dueDate) ?? 0) < 0),
    [lanes],
  );

  if (!contract) {
    return (
      <div className={styles.page}>
        <header className={styles.head}>
          <h1 className={styles.title}>Contract not found</h1>
        </header>
        <button className="btn btn--secondary" onClick={() => navigate('/')}>
          Back to dashboard
        </button>
      </div>
    );
  }

  const isClosed = overallStatus !== 'active';
  const overallLabel =
    overallStatus === 'completed'
      ? 'Completed'
      : overallStatus === 'canceled'
        ? 'Canceled'
        : laneSummaryLabel(lanes);

  const updateLane = (idx: number, patch: Partial<ContractLane>) => {
    setLanes((prev) => {
      const next = prev.slice();
      const old = next[idx];
      next[idx] = { ...old, ...patch, lastUpdated: new Date().toISOString().slice(0, 10) };
      const nextStatus = patch.status;
      if (nextStatus && nextStatus !== old.status) {
        setActivity((a) => [
          {
            icon: 'arrow-right',
            text: `${laneDef(old.id).label} set to ${LANE_STATUS_LABEL[nextStatus]}`,
            when: 'Just now',
          },
          ...a,
        ]);
      }
      return next;
    });
    setEditingLaneIdx(null);
  };

  const onReminderSent = (laneId: LaneId) => {
    setActivity((a) => [
      { icon: 'bell', text: `Reminder sent on ${laneDef(laneId).label} lane`, when: 'Just now' },
      ...a,
    ]);
    setReminderModalOpen(false);
  };

  return (
    <div className={styles.page}>
      <button
        onClick={() => navigate(-1)}
        style={{
          background: 'none',
          border: 0,
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          textAlign: 'left',
          padding: 0,
          marginBottom: 'var(--space-3)',
        }}
      >
        <i className="ph ph-arrow-left" aria-hidden="true" /> Back
      </button>
      <header className={styles.head}>
        <div>
          <div
            style={{
              display: 'flex',
              gap: 8,
              fontSize: 12,
              color: 'var(--text-secondary)',
              marginBottom: 4,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)' }}>{contract.num}</span>
            <span aria-hidden="true">·</span>
            <span>{contract.category}</span>
            <span aria-hidden="true">·</span>
            <PriorityBadge priority={priority} />
          </div>
          <h1 className={styles.title}>{contract.title}</h1>
          <div
            style={{
              display: 'flex',
              gap: 12,
              marginTop: 12,
              color: 'var(--text-secondary)',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <span>{contract.vendor}</span>
            <span aria-hidden="true">·</span>
            <span>{formatUsd(contract.value)}</span>
            <span className={`${styles.priority} ${styles.priorityLow}`}>{overallLabel}</span>
          </div>
        </div>
        {overallStatus === 'active' ? (
          <button className="btn btn--secondary" onClick={() => setReminderModalOpen(true)}>
            <i className="ph ph-paper-plane-tilt" aria-hidden="true" /> Send reminder
          </button>
        ) : null}
      </header>

      {isClosed ? (
        <div className={styles.banner} style={{ background: 'var(--color-pale-blue)' }}>
          <i className="ph ph-info" aria-hidden="true" />
          <span>
            <strong>Contract {overallStatus === 'completed' ? 'complete' : 'canceled'}.</strong>{' '}
            Removed from active views. History preserved here.
          </span>
        </div>
      ) : openOverdue.length > 0 ? (
        <div
          style={{
            background: 'var(--color-pale-orange)',
            borderLeft: '4px solid var(--color-error)',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius)',
            color: 'var(--color-navy)',
            fontSize: 13,
          }}
        >
          <strong>
            {openOverdue.length} lane{openOverdue.length === 1 ? '' : 's'} overdue.
          </strong>{' '}
          {openOverdue.map((l) => laneDef(l.id).label).join(', ')}
        </div>
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 320px)',
          gap: 'var(--space-5)',
        }}
      >
        <div>
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius)',
              padding: 'var(--space-5)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 'var(--space-4)',
                flexWrap: 'wrap',
              }}
            >
              <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Review lanes</p>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Parallel — multiple lanes can be active at once. Procurement records each lane's
                status and sets per-lane due dates.
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {lanes
                .map((lane, idx) => ({ lane, idx }))
                .filter(({ lane }) => (lanesExpanded ? true : lane.id === 'procurement'))
                .map(({ lane, idx }) => (
                  <LaneRow
                    key={lane.id}
                    lane={lane}
                    isClosed={isClosed}
                    editing={editingLaneIdx === idx}
                    onStartEdit={() => setEditingLaneIdx(idx)}
                    onCancelEdit={() => setEditingLaneIdx(null)}
                    onSave={(patch) => updateLane(idx, patch)}
                  />
                ))}
              {lanes.length > 1 ? (
                <button
                  className="btn btn--secondary btn--sm"
                  type="button"
                  onClick={() => setLanesExpanded((prev) => !prev)}
                  style={{ alignSelf: 'flex-start', marginTop: 'var(--space-2)' }}
                >
                  <i
                    className={`ph ph-${lanesExpanded ? 'caret-up' : 'caret-down'}`}
                    aria-hidden="true"
                  />{' '}
                  {lanesExpanded
                    ? `Hide ${lanes.length - 1} other lanes`
                    : `Show ${lanes.length - 1} other lanes`}
                </button>
              ) : null}
            </div>
          </div>

          <ApprovalsSection
            lanes={lanes}
            isClosed={isClosed}
            onRecord={(idx) => {
              setLanesExpanded(true);
              setEditingLaneIdx(idx);
            }}
          />

          <Tabs current={tab} onChange={setTab} />
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius)',
              padding: 'var(--space-5)',
              marginTop: 'var(--space-4)',
            }}
          >
            <TabContent
              tab={tab}
              contract={contract}
              activity={activity}
              docs={docs}
              comments={comments}
              notes={notes}
              onAddDoc={(item) => {
                setDocs((prev) => [item, ...prev]);
                setActivity((a) => [
                  { icon: 'paperclip', text: `Document attached: ${item.name}`, when: 'Just now' },
                  ...a,
                ]);
              }}
              onDeleteDoc={(id) => setDocs((prev) => prev.filter((doc) => doc.id !== id))}
              onAddComment={(item) => {
                setComments((prev) => [...prev, item]);
                setActivity((a) => [
                  {
                    icon: 'chat-circle',
                    text: `${item.author} commented${item.isInternal ? ' (internal)' : ''}`,
                    when: 'Just now',
                  },
                  ...a,
                ]);
              }}
              onAddNote={(item) => {
                setNotes((prev) => [item, ...prev]);
                setActivity((a) => [
                  { icon: 'note-pencil', text: 'Note added', when: 'Just now' },
                  ...a,
                ]);
              }}
            />
          </div>
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <RailCard title="Overall status">
            <select
              value={overallStatus}
              onChange={(e) => setOverallStatus(e.target.value as Phase1Contract['overallStatus'])}
              style={{
                width: '100%',
                height: 32,
                padding: '0 12px',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius)',
                font: 'inherit',
              }}
            >
              <option value="active">Active</option>
              <option value="completed">Mark complete</option>
              <option value="canceled">Mark canceled</option>
            </select>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
              Procurement keeps manual control. Lanes can finish independently — the contract is not
              complete until you say so.
            </p>
          </RailCard>
          <RailCard title="Priority">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Phase1Contract['priority'])}
              style={{
                width: '100%',
                height: 32,
                padding: '0 12px',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius)',
                font: 'inherit',
              }}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </RailCard>
          <RailCard title="Procurement owner">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: 'block',
                    fontSize: 11,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: 4,
                  }}
                >
                  Reassign owner
                </span>
                <select
                  value={owner}
                  onChange={(e) => {
                    const next = e.target.value;
                    setOwner(next);
                    setActivity((prev) => [
                      {
                        icon: 'user-switch',
                        text: `Procurement owner reassigned to ${next}`,
                        when: 'Just now',
                      },
                      ...prev,
                    ]);
                  }}
                  style={{
                    width: '100%',
                    minWidth: 0,
                    padding: '8px 10px',
                    border: '1px solid var(--border-light)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    borderRadius: 'var(--radius)',
                    font: 'inherit',
                    fontWeight: 600,
                  }}
                >
                  {PROCUREMENT_OWNERS.map((o) => (
                    <option key={o.name} value={o.name}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
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
      </div>

      {reminderModalOpen ? (
        <ReminderModal
          contract={contract}
          lanes={lanes}
          onClose={() => setReminderModalOpen(false)}
          onSend={onReminderSent}
        />
      ) : null}
    </div>
  );
}

function ReminderModal({
  contract,
  lanes,
  onClose,
  onSend,
}: {
  contract: Phase1Contract;
  lanes: ContractLane[];
  onClose: () => void;
  onSend: (laneId: LaneId) => void;
}) {
  const targets = lanes.filter(
    (lane) =>
      isLaneOpen(lane) &&
      (lane.id === 'vendor' || lane.id === 'requester' || lane.id === 'signature'),
  );
  const [selected, setSelected] = useState<LaneId | null>(targets[0]?.id ?? null);

  const recipientFor = (laneId: LaneId): string => {
    if (laneId === 'requester')
      return contract.requesterEmail ?? requesterEmailFrom(contract.requester);
    if (laneId === 'vendor') return contract.vendor;
    if (laneId === 'signature') return 'DocuSign envelope';
    return '';
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Send reminder"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--scrim)',
        backdropFilter: 'blur(4px)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 200,
        padding: 'var(--space-4)',
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius)',
          width: 'min(560px, 92vw)',
          maxHeight: '88vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div
          style={{
            padding: 'var(--space-4) var(--space-5)',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontFamily: 'var(--font-mix)', fontSize: 22 }}>Send reminder</div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{ background: 'transparent', border: 0, cursor: 'pointer', fontSize: 20 }}
          >
            <i className="ph ph-x" aria-hidden="true" />
          </button>
        </div>
        <div style={{ padding: 'var(--space-4) var(--space-5)' }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
            External follow-up only — vendor, requester, signature. Internal reviewers are handled
            on the risk-review calls.
          </p>
          {targets.length === 0 ? (
            <p
              style={{
                color: 'var(--text-secondary)',
                textAlign: 'center',
                padding: 'var(--space-4)',
              }}
            >
              No open lanes available for a reminder.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {targets.map((lane) => (
                <label
                  key={lane.id}
                  style={{
                    display: 'flex',
                    gap: 8,
                    padding: 12,
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius)',
                    alignItems: 'flex-start',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="reminder-target"
                    checked={selected === lane.id}
                    onChange={() => setSelected(lane.id)}
                    style={{ marginTop: 3 }}
                  />
                  <span>
                    <strong>{laneDef(lane.id).label}</strong>
                    <br />
                    <span
                      style={{
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {recipientFor(lane.id)}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              justifyContent: 'flex-end',
              marginTop: 16,
            }}
          >
            <button className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            {targets.length > 0 ? (
              <button
                className="btn"
                disabled={!selected}
                onClick={() => selected && onSend(selected)}
              >
                <i className="ph ph-paper-plane-tilt" aria-hidden="true" /> Send reminder
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: Phase1Contract['priority'] }) {
  if (priority === 'critical')
    return <span className={`${styles.priority} ${styles.priorityCritical}`}>Critical</span>;
  if (priority === 'high')
    return <span className={`${styles.priority} ${styles.priorityHigh}`}>High</span>;
  if (priority === 'medium')
    return <span className={`${styles.priority} ${styles.priorityMedium}`}>Medium</span>;
  return <span className={`${styles.priority} ${styles.priorityLow}`}>Low</span>;
}

function LaneRow({
  lane,
  isClosed,
  editing,
  onStartEdit,
  onCancelEdit,
  onSave,
}: {
  lane: ContractLane;
  isClosed: boolean;
  editing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (patch: Partial<ContractLane>) => void;
}) {
  const def = laneDef(lane.id);
  const dueDays = lane.dueDate ? daysFromTodayLocal(lane.dueDate) : null;
  const overdue = isLaneOpen(lane) && dueDays != null && dueDays < 0;
  const [status, setStatus] = useState<ContractLane['status']>(lane.status);
  const [owner, setOwner] = useState(lane.owner ?? '');
  const [dueDate, setDueDate] = useState(lane.dueDate ?? '');
  const [note, setNote] = useState(lane.note ?? '');

  const baseStyle: React.CSSProperties = {
    padding: 'var(--space-3)',
    border: `1px solid ${overdue ? 'var(--color-error)' : 'var(--border-light)'}`,
    borderRadius: 'var(--radius)',
    background: overdue
      ? 'color-mix(in srgb, var(--color-pale-orange) 35%, transparent)'
      : 'var(--bg-page)',
    borderLeft:
      lane.id === 'procurement' && isLaneOpen(lane) ? '4px solid var(--color-orange)' : undefined,
    opacity: lane.status === 'complete' ? 0.7 : lane.status === 'na' ? 0.55 : 1,
  };

  if (editing) {
    return (
      <div style={baseStyle}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
            fontWeight: 600,
          }}
        >
          <i className={`ph ph-${def.icon}`} aria-hidden="true" /> {def.label}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ContractLane['status'])}
            >
              {Object.entries(LANE_STATUS_LABEL).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Owner</span>
            <input value={owner} onChange={(e) => setOwner(e.target.value)} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Due date</span>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: '1 / -1' }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Note (optional)</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn--secondary btn--sm" onClick={onCancelEdit}>
            Cancel
          </button>
          <button
            className="btn btn--sm"
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
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={baseStyle}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '160px minmax(0, 1fr) 180px 160px auto',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
          <i className={`ph ph-${def.icon}`} aria-hidden="true" /> {def.label}
        </div>
        <div>
          <span className={`${styles.lanePill} ${laneStatusClass(lane.status)}`}>
            <span className={styles.lanePill__dot} aria-hidden="true" />
            {LANE_STATUS_LABEL[lane.status]}
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {lane.owner ? (
            <>
              <span
                style={{
                  display: 'block',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                {lane.owner}
              </span>
              Owner
            </>
          ) : (
            <>
              <span
                style={{
                  display: 'block',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                —
              </span>
              No owner yet
            </>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {lane.dueDate ? (
            <>
              <span
                style={{
                  display: 'block',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                {overdue ? (
                  <i
                    className="ph ph-warning-circle"
                    style={{ color: 'var(--color-error)' }}
                    aria-hidden="true"
                  />
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
              <span
                style={{
                  display: 'block',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                —
              </span>
              No due date
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {isClosed ? null : (
            <button className="btn btn--secondary btn--sm" onClick={onStartEdit}>
              <i className="ph ph-pencil-simple" aria-hidden="true" /> Update
            </button>
          )}
        </div>
      </div>
      {lane.note ? (
        <div
          style={{
            marginTop: 8,
            padding: '8px 12px',
            background: 'var(--bg-surface)',
            borderLeft: '3px solid var(--border-light)',
            fontSize: 13,
            color: 'var(--text-secondary)',
          }}
        >
          <i className="ph ph-note-pencil" aria-hidden="true" /> {lane.note}
        </div>
      ) : null}
    </div>
  );
}

const APPROVAL_LANES: LaneId[] = ['legal', 'infosec', 'privacy', 'gco'];

function ApprovalsSection({
  lanes,
  isClosed,
  onRecord,
}: {
  lanes: ContractLane[];
  isClosed: boolean;
  onRecord: (idx: number) => void;
}) {
  const rows = APPROVAL_LANES.map((id) => {
    const idx = lanes.findIndex((lane) => lane.id === id);
    return idx >= 0 ? { lane: lanes[idx], idx } : null;
  }).filter((row): row is { lane: ContractLane; idx: number } => row !== null);

  if (rows.length === 0) return null;

  const approvedCount = rows.filter(
    ({ lane }) => lane.status === 'approved' || lane.status === 'complete',
  ).length;

  return (
    <section
      aria-label="Approvals"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius)',
        padding: 'var(--space-5)',
        marginTop: 'var(--space-4)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 'var(--space-4)',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Approvals</p>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {approvedCount} of {rows.length} recorded · risk-review outcomes from InfoSec, Privacy,
          GCO, Legal
        </span>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
        {rows.map(({ lane, idx }) => {
          const def = laneDef(lane.id);
          const recorded = lane.status === 'approved' || lane.status === 'complete';
          return (
            <li
              key={lane.id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(120px, 1fr) auto minmax(120px, 1fr) auto',
                gap: 12,
                alignItems: 'center',
                padding: 'var(--space-3) var(--space-4)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius)',
                background: recorded
                  ? 'color-mix(in srgb, var(--color-pale-success) 50%, transparent)'
                  : 'var(--bg-page)',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                <i className={`ph ph-${def.icon}`} aria-hidden="true" /> {def.label}
              </span>
              <span className={`${styles.lanePill} ${laneStatusClass(lane.status)}`}>
                <span className={styles.lanePill__dot} aria-hidden="true" />
                {LANE_STATUS_LABEL[lane.status]}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {recorded ? (
                  <>
                    Approved by {lane.owner ?? '—'} · {formatShortDate(lane.lastUpdated)}
                  </>
                ) : (
                  'Awaiting recorded approval'
                )}
              </span>
              {isClosed ? null : (
                <button className="btn btn--secondary btn--sm" onClick={() => onRecord(idx)}>
                  <i className="ph ph-pencil-simple" aria-hidden="true" />{' '}
                  {recorded ? 'Update' : 'Record'}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Tabs({ current, onChange }: { current: TabId; onChange: (id: TabId) => void }) {
  const tabs: { id: TabId; label: string }[] = [
    { id: 'details', label: 'Details' },
    { id: 'documents', label: 'Documents' },
    { id: 'comments', label: 'Comments' },
    { id: 'notes', label: 'Notes' },
    { id: 'activity', label: 'Activity' },
  ];
  return (
    <div
      style={{
        display: 'flex',
        gap: 24,
        borderBottom: '1px solid var(--border-light)',
        margin: '24px 0 16px',
        overflowX: 'auto',
      }}
      role="tablist"
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={current === t.id}
          onClick={() => onChange(t.id)}
          style={{
            background: 'transparent',
            border: 0,
            borderBottom: `2px solid ${current === t.id ? 'var(--accent-interactive)' : 'transparent'}`,
            padding: '12px 0',
            color: current === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: 13,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            cursor: 'pointer',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

interface TabContentProps {
  tab: TabId;
  contract: Phase1Contract;
  activity: { icon: string; text: string; when: string }[];
  docs: DocItem[];
  comments: CommentItem[];
  notes: NoteItem[];
  onAddDoc: (item: DocItem) => void;
  onDeleteDoc: (id: string) => void;
  onAddComment: (item: CommentItem) => void;
  onAddNote: (item: NoteItem) => void;
}

function TabContent({
  tab,
  contract,
  activity,
  docs,
  comments,
  notes,
  onAddDoc,
  onDeleteDoc,
  onAddComment,
  onAddNote,
}: TabContentProps) {
  if (tab === 'details') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
        <Def label="Vendor" value={contract.vendor} />
        <Def label="Category" value={contract.category} />
        <Def label="Contract value" value={formatUsd(contract.value)} />
        <Def
          label="Term"
          value={
            contract.startDate
              ? `${formatFullDate(contract.startDate)} – ${formatFullDate(contract.endDate)}`
              : '—'
          }
        />
        <Def label="Requester" value={contract.requester} />
        <Def label="Procurement owner" value={contract.owner} />
        {contract.event ? (
          <>
            <Def label="Event name" value={contract.event.eventName || '—'} />
            <Def label="Event date" value={formatFullDate(contract.event.eventDate)} />
            <Def label="Venue" value={contract.event.venue || '—'} />
            <Def label="Parent conference / project" value={contract.event.parentEvent || '—'} />
          </>
        ) : null}
        {contract.facilities ? (
          <Def label="Building / office" value={contract.facilities.building} full />
        ) : null}
        {contract.itFields ? (
          <>
            <Def
              label="Accesses personal data"
              value={ynLabel(contract.itFields.accessesPersonalData)}
            />
            <Def label="Accesses PHI" value={ynLabel(contract.itFields.accessesPHI)} />
            <Def
              label="Accesses client/matter data"
              value={ynLabel(contract.itFields.accessesClientMatter)}
            />
            <Def label="Uses AI" value={ynLabel(contract.itFields.usesAI)} />
          </>
        ) : null}
        <Def label="Description" value={contract.description} full />
      </div>
    );
  }
  if (tab === 'activity') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {activity.map((a, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 12 }}>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--color-pale-blue)',
                color: 'var(--color-navy)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <i className={`ph ph-${a.icon}`} aria-hidden="true" />
            </span>
            <div>
              <div style={{ fontSize: 14 }}>{a.text}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{a.when}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (tab === 'documents') {
    return <DocumentsTab docs={docs} onAdd={onAddDoc} onDelete={onDeleteDoc} />;
  }
  if (tab === 'comments') {
    return <CommentsTab comments={comments} onAdd={onAddComment} />;
  }
  if (tab === 'notes') {
    return <NotesTab notes={notes} onAdd={onAddNote} />;
  }
  return null;
}

function DocumentsTab({
  docs,
  onAdd,
  onDelete,
}: {
  docs: DocItem[];
  onAdd: (item: DocItem) => void;
  onDelete: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      onAdd({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        uploadedBy: ME_NAME,
        uploadedAt: new Date().toISOString(),
      });
    });
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          {docs.length} {docs.length === 1 ? 'document' : 'documents'} attached
        </p>
        <label className="btn btn--secondary" style={{ cursor: 'pointer' }}>
          <i className="ph ph-upload-simple" aria-hidden="true" /> Upload document
          <input
            ref={inputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={(event) => handleFiles(event.target.files)}
          />
        </label>
      </div>
      {docs.length === 0 ? (
        <p
          style={{
            color: 'var(--text-secondary)',
            border: '1px dashed var(--border-light)',
            padding: 'var(--space-5)',
            borderRadius: 'var(--radius)',
            textAlign: 'center',
            margin: 0,
          }}
        >
          No documents attached yet. Upload the contract draft, signed copy, or any supporting
          files.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
          {docs.map((doc) => (
            <li
              key={doc.id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                gap: 12,
                alignItems: 'center',
                padding: 'var(--space-3) var(--space-4)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius)',
                background: 'var(--bg-page)',
              }}
            >
              <i className="ph ph-file-text" aria-hidden="true" style={{ fontSize: 24 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, wordBreak: 'break-word' }}>
                  {doc.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {formatBytes(doc.size)} · {doc.uploadedBy} · {formatShortDate(doc.uploadedAt)}
                </div>
              </div>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => onDelete(doc.id)}
                aria-label={`Remove ${doc.name}`}
              >
                <i className="ph ph-trash" aria-hidden="true" /> Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CommentsTab({
  comments,
  onAdd,
}: {
  comments: CommentItem[];
  onAdd: (item: CommentItem) => void;
}) {
  const [text, setText] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd({
      id: crypto.randomUUID(),
      author: ME_NAME,
      text: trimmed,
      when: new Date().toISOString(),
      isInternal,
    });
    setText('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {comments.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            No comments yet. Start the conversation below.
          </p>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              style={{
                padding: 'var(--space-3) var(--space-4)',
                border: '1px solid var(--border-light)',
                borderLeft: c.isInternal
                  ? '3px solid var(--color-gold)'
                  : '3px solid var(--accent-interactive)',
                borderRadius: 'var(--radius)',
                background: 'var(--bg-page)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 4,
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                <strong style={{ fontSize: 13 }}>{c.author}</strong>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {c.isInternal ? 'Internal · ' : ''}
                  {formatShortDate(c.when)}
                </span>
              </div>
              <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {c.text}
              </div>
            </div>
          ))
        )}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          borderTop: '1px solid var(--border-light)',
          paddingTop: 16,
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Add a comment</span>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Comments are visible to the contract team."
            rows={3}
            style={{
              padding: 8,
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius)',
              font: 'inherit',
              resize: 'vertical',
            }}
          />
        </label>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              color: 'var(--text-secondary)',
            }}
          >
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(event) => setIsInternal(event.target.checked)}
            />
            Internal only (not shared outside procurement)
          </label>
          <button type="button" className="btn" onClick={handleSubmit} disabled={!text.trim()}>
            <i className="ph ph-paper-plane-tilt" aria-hidden="true" /> Post comment
          </button>
        </div>
      </div>
    </div>
  );
}

function NotesTab({ notes, onAdd }: { notes: NoteItem[]; onAdd: (item: NoteItem) => void }) {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd({
      id: crypto.randomUUID(),
      author: ME_NAME,
      text: trimmed,
      when: new Date().toISOString(),
    });
    setText('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
        Notes are private to procurement. They never appear on reminders or external messages.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {notes.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No notes yet.</p>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              style={{
                padding: 'var(--space-3) var(--space-4)',
                border: '1px solid var(--border-light)',
                borderLeft: '3px solid var(--color-gold)',
                borderRadius: 'var(--radius)',
                background: 'var(--color-pale-gold)',
                color: 'var(--color-navy)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                  gap: 8,
                  flexWrap: 'wrap',
                  fontSize: 12,
                }}
              >
                <strong>{note.author}</strong>
                <span>{formatShortDate(note.when)}</span>
              </div>
              <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {note.text}
              </div>
            </div>
          ))
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Procurement notes…"
          rows={3}
          style={{
            padding: 8,
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius)',
            font: 'inherit',
            resize: 'vertical',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={handleSubmit} disabled={!text.trim()}>
            <i className="ph ph-plus" aria-hidden="true" /> Add note
          </button>
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function seedDocs(contract: Phase1Contract | undefined): DocItem[] {
  if (!contract) return [];
  return [
    {
      id: crypto.randomUUID(),
      name: `${contract.num} - Vendor draft.pdf`,
      size: 482133,
      uploadedBy: contract.requester,
      uploadedAt: contract.startDate ?? new Date().toISOString(),
    },
  ];
}

function seedComments(contract: Phase1Contract | undefined): CommentItem[] {
  if (!contract) return [];
  return [
    {
      id: crypto.randomUUID(),
      author: contract.requester,
      text: 'Submitted the latest draft from the vendor. Anything you need from me?',
      when: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
      isInternal: false,
    },
  ];
}

function seedNotes(contract: Phase1Contract | undefined): NoteItem[] {
  if (!contract) return [];
  return [];
}

function RailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius)',
        padding: 'var(--space-4)',
      }}
    >
      <p
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--text-secondary)',
          margin: '0 0 12px',
          fontWeight: 600,
        }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 12,
        marginBottom: 8,
      }}
    >
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function Def({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div style={full ? { gridColumn: '1 / -1' } : undefined}>
      <div
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--text-secondary)',
          fontWeight: 600,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 14, wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}

function ynLabel(v: boolean | null | undefined): string {
  if (v == null) return 'Not specified';
  return v ? 'Yes' : 'No';
}

function formatTerm(start: string | null, end: string | null): string {
  if (!start && !end) return '—';
  if (start && end) return `${formatShortDate(start)} – ${formatShortDate(end)}`;
  if (start) return `From ${formatFullDate(start)}`;
  return `Through ${formatFullDate(end)}`;
}

function laneStatusClass(status: ContractLane['status']): string {
  const map: Record<ContractLane['status'], string> = {
    in_review: styles.lanePillInReview,
    waiting: styles.lanePillWaiting,
    approved: styles.lanePillApproved,
    canceled: styles.lanePillCanceled,
    complete: styles.lanePillComplete,
    not_started: styles.lanePillNotStarted,
    na: styles.lanePillNa,
  };
  return map[status];
}

function laneSummaryLabel(lanes: ContractLane[]): string {
  const open = lanes.filter(isLaneOpen);
  if (open.length === 0) return 'Ready to file';
  if (open.length === 1) return `With ${laneDef(open[0].id).label}`;
  return `In review · ${open.length} lanes`;
}

function seedActivity(
  c: Phase1Contract | undefined,
): { icon: string; text: string; when: string }[] {
  if (!c) return [];
  const events: { icon: string; text: string; when: string }[] = [];
  events.push({
    icon: 'file-plus',
    text: `Contract created by ${c.requester}`,
    when: '12 days ago',
  });
  events.push({
    icon: 'identification-badge',
    text: `Procurement owner set to ${c.owner}`,
    when: '11 days ago',
  });
  c.lanes.forEach((l) => {
    if (['in_review', 'approved', 'waiting', 'complete'].includes(l.status)) {
      events.push({
        icon: 'arrow-right',
        text: `${laneDef(l.id).label} lane set to ${LANE_STATUS_LABEL[l.status]}`,
        when: formatFullDate(l.lastUpdated),
      });
    }
  });
  return events.reverse();
}
