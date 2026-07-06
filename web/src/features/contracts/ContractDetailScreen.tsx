import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/mws/Button';
import { findContract, daysFromTodayLocal } from '@/lib/phase1Data';
import {
  LANE_STATUS_LABEL,
  isLaneOpen,
  laneDef,
  type ContractLane,
  type LaneId,
  type Phase1Contract,
} from '@/types/phase1';
import { formatUsd } from '@/lib/formatters';

import phase1Styles from './Phase1.module.css';
import detailStyles from './components/ContractDetail.module.css';
import { ApprovalsSection } from './components/ApprovalsSection';
import {
  seedActivity,
  seedComments,
  seedDocs,
  seedNotes,
  laneSummaryLabel,
  type ActivityItem,
  type CommentItem,
  type DocItem,
  type NoteItem,
  type TabId,
} from './components/contractDetail.helpers';
import { DetailRailColumn } from './components/DetailRailColumn';
import { DetailTabs } from './components/DetailTabs';
import { LaneRow } from './components/LaneRow';
import { PriorityBadge } from './components/PriorityBadge';
import { ReminderModal } from './components/ReminderModal';

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
  const [activity, setActivity] = useState<ActivityItem[]>(() => seedActivity(contract));
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
      <div className={phase1Styles.page}>
        <header className={phase1Styles.head}>
          <h1 className={phase1Styles.title}>Contract not found</h1>
        </header>
        <Button variant="secondary" onClick={() => navigate('/')}>
          Back to dashboard
        </Button>
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
    <div className={phase1Styles.page}>
      <button type="button" onClick={() => navigate(-1)} className={detailStyles.backLink}>
        <i className="ph ph-arrow-left" aria-hidden="true" /> Back
      </button>
      <header className={phase1Styles.head}>
        <div>
          <div className={detailStyles.eyebrowRow}>
            <span className={detailStyles.eyebrowNum}>{contract.num}</span>
            <span aria-hidden="true">·</span>
            <span>{contract.category}</span>
            <span aria-hidden="true">·</span>
            <PriorityBadge priority={priority} />
          </div>
          <h1 className={phase1Styles.title}>{contract.title}</h1>
          <div className={detailStyles.metaRow}>
            <span>{contract.vendor}</span>
            <span aria-hidden="true">·</span>
            <span>{formatUsd(contract.value)}</span>
            <span className={`${phase1Styles.priority} ${phase1Styles.priorityLow}`}>
              {overallLabel}
            </span>
          </div>
        </div>
        {overallStatus === 'active' ? (
          <Button
            variant="secondary"
            icon="paper-plane-tilt"
            onClick={() => setReminderModalOpen(true)}
          >
            Send reminder
          </Button>
        ) : null}
      </header>

      {isClosed ? (
        <div className={phase1Styles.banner}>
          <i className="ph ph-info" aria-hidden="true" />
          <span>
            <strong>Contract {overallStatus === 'completed' ? 'complete' : 'canceled'}.</strong>{' '}
            Removed from active views. History preserved here.
          </span>
        </div>
      ) : openOverdue.length > 0 ? (
        <div className={detailStyles.overdueBanner}>
          <strong>
            {openOverdue.length} lane{openOverdue.length === 1 ? '' : 's'} overdue.
          </strong>{' '}
          {openOverdue.map((l) => laneDef(l.id).label).join(', ')}
        </div>
      ) : null}

      <div className={detailStyles.detailLayout}>
        <div className={detailStyles.mainColumn}>
          <section className={detailStyles.laneSection}>
            <div className={detailStyles.laneSectionHead}>
              <p className={detailStyles.laneSectionTitle}>Review lanes</p>
              <span className={detailStyles.laneSectionCaption}>
                Parallel — multiple lanes can be active at once. Procurement records each
                lane&apos;s status and sets per-lane due dates.
              </span>
            </div>
            <div className={detailStyles.laneList}>
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
                <Button
                  variant="secondary"
                  size="sm"
                  icon={lanesExpanded ? 'caret-up' : 'caret-down'}
                  onClick={() => setLanesExpanded((prev) => !prev)}
                  className={detailStyles.expandLanesBtn}
                >
                  {lanesExpanded
                    ? `Hide ${lanes.length - 1} other lanes`
                    : `Show ${lanes.length - 1} other lanes`}
                </Button>
              ) : null}
            </div>
          </section>

          <ApprovalsSection
            lanes={lanes}
            isClosed={isClosed}
            onRecord={(idx) => {
              setLanesExpanded(true);
              setEditingLaneIdx(idx);
            }}
          />

          <DetailTabs
            current={tab}
            onChange={setTab}
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

        <DetailRailColumn
          contract={contract}
          overallStatus={overallStatus}
          onOverallStatusChange={setOverallStatus}
          priority={priority}
          onPriorityChange={setPriority}
          owner={owner}
          onOwnerChange={setOwner}
          onOwnerActivity={(event) => setActivity((prev) => [event, ...prev])}
        />
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
