import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { findContract, daysFromTodayLocal } from '@/lib/phase1Data';
import {
  LANE_STATUS_LABEL,
  PROCUREMENT_OWNERS,
  isLaneOpen,
  laneDef,
  ownerByName,
  requesterEmailFrom,
  type ContractLane,
  type LaneId,
  type Phase1Contract,
} from '@/types/phase1';
import { formatFullDate, formatShortDate, formatUsd } from '@/lib/formatters';

import styles from './Phase1.module.css';

type TabId = 'details' | 'documents' | 'comments' | 'notes' | 'activity';

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

  const ownerObj = ownerByName(owner);
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
            <TabContent tab={tab} contract={contract} activity={activity} />
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
              {ownerObj ? (
                <span
                  className={`${styles.ownerDot} ${styles[`ownerDot${ownerObj.tone}`]}`}
                  style={{ width: 14, height: 14, flexShrink: 0 }}
                  aria-hidden="true"
                />
              ) : null}
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

function TabContent({
  tab,
  contract,
  activity,
}: {
  tab: TabId;
  contract: Phase1Contract;
  activity: { icon: string; text: string; when: string }[];
}) {
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
  return (
    <p style={{ color: 'var(--text-secondary)' }}>
      {tab === 'documents' && 'Documents tab — placeholder.'}
      {tab === 'comments' && 'Comments tab — placeholder.'}
      {tab === 'notes' && 'Notes tab — placeholder.'}
    </p>
  );
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
