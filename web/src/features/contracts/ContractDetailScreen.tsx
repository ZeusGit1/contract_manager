import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/mws/Button';
import {
  apiDetailToPhase1Contract,
  daysFromTodayLocal,
  laneIdToApi,
  laneStatusToApi,
  overallStatusToApi,
  priorityToApi,
} from '@/lib/phase1Data';
import { isLaneOpen, laneDef, type ContractLane, type Phase1Contract } from '@/types/phase1';
import { formatUsd } from '@/lib/formatters';
import type { ContractDetailDto } from '@/types/api';

import phase1Styles from './Phase1.module.css';
import detailStyles from './components/ContractDetail.module.css';
import { ApprovalsSection } from './components/ApprovalsSection';
import { laneSummaryLabel, type TabId } from './components/contractDetail.helpers';
import { DetailRailColumn } from './components/DetailRailColumn';
import { DetailTabs } from './components/DetailTabs';
import { LaneRow } from './components/LaneRow';
import { PriorityBadge } from './components/PriorityBadge';
import { ReminderModal } from './components/ReminderModal';
import {
  useContractDetail,
  useContractLanes,
  useSendReminder,
  useUpdateContract,
  useUpdateLane,
  useUpdateOverallStatus,
  useUpdateProcurementOwner,
} from './hooks';

export function ContractDetailScreen() {
  const { contractId: routeParam } = useParams();
  const navigate = useNavigate();

  // API contract ids are integers. Legacy paths (CTR-2026-0142) are no longer minted
  // by any screen — they arrive as NaN here and fall through to the "not found" state.
  const contractIdNum = routeParam ? Number.parseInt(routeParam, 10) : NaN;
  const isValidId = Number.isFinite(contractIdNum) && contractIdNum > 0;

  const detailQuery = useContractDetail(isValidId ? contractIdNum : 0);
  const lanesQuery = useContractLanes(isValidId ? contractIdNum : 0);

  const contract = useMemo<Phase1Contract | undefined>(() => {
    if (!detailQuery.data || !lanesQuery.data) return undefined;
    return apiDetailToPhase1Contract(detailQuery.data, lanesQuery.data);
  }, [detailQuery.data, lanesQuery.data]);

  if (!isValidId) {
    return <NotFound onBack={() => navigate('/')} />;
  }

  if (detailQuery.isLoading || lanesQuery.isLoading) {
    return (
      <div className={phase1Styles.page}>
        <header className={phase1Styles.head}>
          <h1 className={phase1Styles.title}>Loading contract…</h1>
        </header>
      </div>
    );
  }

  if (detailQuery.error || lanesQuery.error || !contract || !detailQuery.data || !lanesQuery.data) {
    return <NotFound onBack={() => navigate('/')} />;
  }

  // The tabs / rail / mutations all need the contractId. Passing the raw API DTO down
  // alongside the adapted Phase1 shape means sub-components that render Phase1 vocabulary
  // still work, while mutations use real Entra GUIDs and API enums.
  return <ContractDetailBody contract={contract} apiDetail={detailQuery.data} />;
}

interface ContractDetailBodyProps {
  contract: Phase1Contract;
  apiDetail: ContractDetailDto;
}

function ContractDetailBody({ contract, apiDetail }: ContractDetailBodyProps) {
  const navigate = useNavigate();
  const contractId = apiDetail.contractId;
  const [tab, setTab] = useState<TabId>('details');
  const [editingLaneIdx, setEditingLaneIdx] = useState<number | null>(null);
  const [lanesExpanded, setLanesExpanded] = useState(false);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const updateOverall = useUpdateOverallStatus(contractId);
  const updatePriority = useUpdateContract(contractId);
  const updateOwner = useUpdateProcurementOwner(contractId);
  const updateLane = useUpdateLane(contractId);
  const sendReminder = useSendReminder(contractId);

  // The server data is the source of truth — no local mirroring. Sub-components render
  // from `contract` (an adapted view of the API response); mutations trigger a refetch
  // and TanStack Query pushes updated values down.
  const lanes = contract.lanes;
  const overallStatus = contract.overallStatus;
  const priority = contract.priority;
  const owner = contract.owner;

  const openOverdue = useMemo(
    () =>
      lanes.filter((l) => isLaneOpen(l) && l.dueDate && (daysFromTodayLocal(l.dueDate) ?? 0) < 0),
    [lanes],
  );

  const isClosed = overallStatus !== 'active';
  const overallLabel =
    overallStatus === 'completed'
      ? 'Completed'
      : overallStatus === 'canceled'
        ? 'Canceled'
        : laneSummaryLabel(lanes);

  const surfaceError = (label: string, err: Error) => {
    setMutationError(`${label}: ${err.message}`);
  };

  const handleOverallStatus = (value: Phase1Contract['overallStatus']) => {
    setMutationError(null);
    updateOverall.mutate(
      { overallStatus: overallStatusToApi(value) },
      { onError: (err) => surfaceError('Overall status update failed', err) },
    );
  };

  const handlePriority = (value: Phase1Contract['priority']) => {
    setMutationError(null);
    updatePriority.mutate(
      { priority: priorityToApi(value) },
      { onError: (err) => surfaceError('Priority update failed', err) },
    );
  };

  const handleOwner = (userId: string | null) => {
    setMutationError(null);
    updateOwner.mutate(
      { procurementOwnerUserId: userId },
      { onError: (err) => surfaceError('Owner reassignment failed', err) },
    );
  };

  const handleLaneSave = (idx: number, patch: Partial<ContractLane>) => {
    const laneClientObj = lanes[idx];
    if (!laneClientObj) return;
    setMutationError(null);
    updateLane.mutate(
      {
        laneId: laneIdToApi(laneClientObj.id),
        patch: {
          status: patch.status ? laneStatusToApi(patch.status) : undefined,
          // The Phase1 lane owner is a name string (from the API's OwnerName). Persist it as
          // OwnerLabel — mutations don't know which firm user (if any) it maps to. Passing
          // an empty string maps to ClearOwner.
          ownerLabel:
            patch.owner === undefined
              ? undefined
              : patch.owner === null || patch.owner === ''
                ? null
                : patch.owner,
          clearOwner: patch.owner === null || patch.owner === '',
          dueDate: patch.dueDate === undefined ? undefined : patch.dueDate,
          clearDueDate: patch.dueDate === null || patch.dueDate === '',
          note: patch.note === undefined ? undefined : patch.note,
          clearNote: patch.note === null || patch.note === '',
        },
      },
      {
        onError: (err) => surfaceError('Lane update failed', err),
        onSettled: () => setEditingLaneIdx(null),
      },
    );
  };

  const handleReminderSend = (laneIdPhase1: import('@/types/phase1').LaneId) => {
    setMutationError(null);
    sendReminder.mutate(
      { targetLaneId: laneIdToApi(laneIdPhase1) },
      {
        onSuccess: () => setReminderModalOpen(false),
        onError: (err) => surfaceError('Send reminder failed', err),
      },
    );
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

      {mutationError ? (
        <div className={phase1Styles.banner} role="alert">
          <i className="ph ph-warning-circle" aria-hidden="true" />
          <span>{mutationError}</span>
        </div>
      ) : null}

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
                    onSave={(patch) => handleLaneSave(idx, patch)}
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

          <DetailTabs current={tab} onChange={setTab} contract={contract} contractId={contractId} />
        </div>

        <DetailRailColumn
          contract={contract}
          apiDetail={apiDetail}
          overallStatus={overallStatus}
          onOverallStatusChange={handleOverallStatus}
          priority={priority}
          onPriorityChange={handlePriority}
          owner={owner}
          onOwnerChange={handleOwner}
          isBusy={updateOverall.isPending || updatePriority.isPending || updateOwner.isPending}
        />
      </div>

      {reminderModalOpen ? (
        <ReminderModal
          contract={contract}
          lanes={lanes}
          onClose={() => setReminderModalOpen(false)}
          onSend={handleReminderSend}
          isSending={sendReminder.isPending}
        />
      ) : null}
    </div>
  );
}

function NotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className={phase1Styles.page}>
      <header className={phase1Styles.head}>
        <h1 className={phase1Styles.title}>Contract not found</h1>
      </header>
      <Button variant="secondary" onClick={onBack}>
        Back to dashboard
      </Button>
    </div>
  );
}
