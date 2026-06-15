import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '@/mws/Badge';
import { Button } from '@/mws/Button';
import {
  useAddComment,
  useContractActivity,
  useContractAssignments,
  useContractComments,
  useContractDetail,
  useContractNotes,
  useUpdateStatus,
} from './hooks';
import { ApprovalsPanel } from './components/ApprovalsPanel';
import { ContractDetailRail } from './components/ContractDetailRail';
import { StatusBanner } from './components/StatusBanner';
import { StatusChanger } from './components/StatusChanger';
import { formatFullDate, formatUsd } from '@/lib/formatters';
import { statusInfo } from '@/lib/statusMap';
import { FORWARD_STATUS_ORDER } from '@/types/contract';
import type { ContractStatus } from '@/types/contract';
import styles from './ContractDetailScreen.module.css';

type Tab = 'details' | 'documents' | 'comments' | 'notes' | 'activity';

// Page component composing several sub-components — exceeds 200 lines because it owns the
// header, banner, stepper, status changer, tab nav, right rail, and tab-panel renderers.
// Each piece is isolated; growth happens in the dedicated sub-components, not here.
export function ContractDetailScreen() {
  const { contractId } = useParams<{ contractId: string }>();
  const numericId = Number.parseInt(contractId ?? '', 10);
  const detailQuery = useContractDetail(numericId);
  const commentsQuery = useContractComments(numericId);
  const notesQuery = useContractNotes(numericId);
  const activityQuery = useContractActivity(numericId);
  const assignmentsQuery = useContractAssignments(numericId);
  const updateStatus = useUpdateStatus();
  const addComment = useAddComment(numericId);
  const [tab, setTab] = useState<Tab>('details');
  const [commentDraft, setCommentDraft] = useState('');

  if (!Number.isFinite(numericId) || numericId <= 0) {
    return <p className={styles.error}>Invalid contract reference.</p>;
  }
  if (detailQuery.isLoading) {
    return <p className={styles.muted}>Loading contract…</p>;
  }
  if (detailQuery.error || !detailQuery.data) {
    return <p className={styles.error}>Couldn&apos;t load this contract.</p>;
  }
  const contract = detailQuery.data;
  const stage = statusInfo(contract.status);
  const currentIndex = FORWARD_STATUS_ORDER.indexOf(contract.status as ContractStatus);
  const isClosed =
    contract.status === 'Completed' ||
    contract.status === 'Canceled' ||
    contract.status === 'Expired' ||
    contract.status === 'Terminated';

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.backLink}>
        <i className="ph ph-arrow-left" aria-hidden="true" /> Active contracts
      </Link>
      <header className={styles.head}>
        <div>
          <div className={styles.eyebrow}>
            <span className={styles.contractNumber}>{contract.contractNumber}</span>
            <span>·</span>
            <span>{contract.category}</span>
          </div>
          <h1 className={styles.title}>{contract.title}</h1>
          <div className={styles.subline}>
            <Link to="/vendors" className={styles.vendorLink}>
              {contract.vendorName}
            </Link>
            <span>·</span>
            <span>{formatUsd(contract.totalCostUsd)}</span>
            <Badge status={stage.badge}>{stage.label}</Badge>
          </div>
        </div>
        {contract.canEdit ? (
          <StatusChanger
            status={contract.status as ContractStatus}
            isPending={updateStatus.isPending}
            onChange={(newStatus) =>
              updateStatus.mutate({ contractId: numericId, newStatus, note: null })
            }
          />
        ) : null}
      </header>

      <StatusBanner
        status={contract.status as ContractStatus}
        nextActionDueAt={contract.nextActionDueAt}
        attentionReason={null}
      />

      <div className={styles.workflow}>
        <p className={styles.workflowEyebrow}>Review workflow</p>
        <ol className={styles.stepper} aria-label="Contract lifecycle">
          {FORWARD_STATUS_ORDER.map((step, index) => {
            const stateName =
              index < currentIndex || (isClosed && step !== 'Completed' && index <= currentIndex)
                ? 'done'
                : index === currentIndex
                  ? 'current'
                  : 'todo';
            return (
              <li
                key={step}
                className={`${styles.step} ${styles[stateName as 'done' | 'current' | 'todo']}`}
                aria-current={stateName === 'current' ? 'step' : undefined}
              >
                <span className={styles.stepCircle} aria-hidden="true">
                  {stateName === 'done' ? <i className="ph ph-check" /> : index + 1}
                </span>
                <span className={styles.stepLabel}>{statusInfo(step).label}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className={styles.body}>
        <div className={styles.main}>
          <nav className={styles.tabs} role="tablist" aria-label="Contract sections">
            {(['details', 'documents', 'comments', 'notes', 'activity'] as Tab[]).map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={`${styles.tab} ${tab === id ? styles.tabActive : ''}`}
                onClick={() => setTab(id)}
              >
                {tabLabel(id, contract)}
              </button>
            ))}
          </nav>

          <section className={styles.panel} role="tabpanel">
            {tab === 'details' ? (
              <div className={styles.detailsStack}>
                <ApprovalsPanel
                  status={contract.status as ContractStatus}
                  assignments={assignmentsQuery.data ?? []}
                />
                <DetailsTab contract={contract} />
              </div>
            ) : tab === 'documents' ? (
              <p className={styles.muted}>Document upload arrives in a follow-up build phase.</p>
            ) : tab === 'comments' ? (
              <CommentsTab
                comments={commentsQuery.data ?? []}
                isLoading={commentsQuery.isLoading}
                draft={commentDraft}
                onDraftChange={setCommentDraft}
                onSubmit={() => {
                  if (commentDraft.trim() === '') return;
                  addComment.mutate(
                    { text: commentDraft.trim(), isInternalOnly: false },
                    { onSuccess: () => setCommentDraft('') },
                  );
                }}
                submitting={addComment.isPending}
              />
            ) : tab === 'notes' ? (
              <NotesTab notes={notesQuery.data ?? []} isLoading={notesQuery.isLoading} />
            ) : (
              <ActivityTab
                activity={activityQuery.data ?? []}
                isLoading={activityQuery.isLoading}
              />
            )}
          </section>
        </div>
        <ContractDetailRail contract={contract} />
      </div>
    </div>
  );
}

function tabLabel(tab: Tab, contract: ReturnType<typeof useContractDetail>['data']): string {
  if (!contract) return tab;
  if (tab === 'documents') return `Documents (${contract.attachmentCount})`;
  if (tab === 'comments') return `Comments (${contract.commentCount})`;
  if (tab === 'notes') return `Notes (${contract.noteCount})`;
  return tab[0].toUpperCase() + tab.slice(1);
}

interface DetailsTabProps {
  contract: NonNullable<ReturnType<typeof useContractDetail>['data']>;
}

function DetailsTab({ contract }: DetailsTabProps) {
  return (
    <dl className={styles.defGrid}>
      <div className={styles.def}>
        <dt>Vendor</dt>
        <dd>{contract.vendorName}</dd>
      </div>
      <div className={styles.def}>
        <dt>Category</dt>
        <dd>{contract.category}</dd>
      </div>
      <div className={styles.def}>
        <dt>Contract value</dt>
        <dd>{formatUsd(contract.totalCostUsd)}</dd>
      </div>
      <div className={styles.def}>
        <dt>Term</dt>
        <dd>
          {contract.termStartDate || contract.termEndDate
            ? `${formatFullDate(contract.termStartDate)} → ${formatFullDate(contract.termEndDate)}`
            : 'Not yet set'}
        </dd>
      </div>
      <div className={styles.def}>
        <dt>Requested by</dt>
        <dd>{contract.requesterName}</dd>
      </div>
      <div className={styles.def}>
        <dt>Submitted</dt>
        <dd>{formatFullDate(contract.submittedAt)}</dd>
      </div>
      {contract.itType ? (
        <div className={styles.def}>
          <dt>IT type</dt>
          <dd>{contract.itType}</dd>
        </div>
      ) : null}
      {contract.description ? (
        <div className={styles.defFull}>
          <dt>Description</dt>
          <dd>{contract.description}</dd>
        </div>
      ) : null}
    </dl>
  );
}

interface CommentsTabProps {
  comments: { contractCommentId: number; authorName: string; text: string; createdAt: string }[];
  isLoading: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  submitting: boolean;
}

function CommentsTab({
  comments,
  isLoading,
  draft,
  onDraftChange,
  onSubmit,
  submitting,
}: CommentsTabProps) {
  if (isLoading) return <p className={styles.muted}>Loading comments…</p>;
  return (
    <div className={styles.commentColumn}>
      {comments.length === 0 ? (
        <p className={styles.muted}>No comments yet. Add the first one below.</p>
      ) : (
        comments.map((comment) => (
          <article key={comment.contractCommentId} className={styles.comment}>
            <header className={styles.commentHead}>
              <span className={styles.commentAuthor}>{comment.authorName}</span>
              <span className={styles.commentWhen}>{formatFullDate(comment.createdAt)}</span>
            </header>
            <p className={styles.commentText}>{comment.text}</p>
          </article>
        ))
      )}
      <CommentForm
        draft={draft}
        onDraftChange={onDraftChange}
        onSubmit={onSubmit}
        submitting={submitting}
      />
    </div>
  );
}

function CommentForm({
  draft,
  onDraftChange,
  onSubmit,
  submitting,
}: Omit<CommentsTabProps, 'comments' | 'isLoading'>) {
  return (
    <form
      className={styles.commentForm}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor="comment-draft" className="visually-hidden">
        Add a comment
      </label>
      <textarea
        id="comment-draft"
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        placeholder="Add an internal note for the review team"
        rows={3}
        className={styles.commentInput}
      />
      <Button type="submit" icon="paper-plane-tilt" disabled={submitting || draft.trim() === ''}>
        Add comment
      </Button>
    </form>
  );
}

interface NotesTabProps {
  notes: {
    contractNoteId: number;
    type: string;
    noteDate: string;
    text: string;
    participants: string | null;
  }[];
  isLoading: boolean;
}

function NotesTab({ notes, isLoading }: NotesTabProps) {
  if (isLoading) return <p className={styles.muted}>Loading notes…</p>;
  if (notes.length === 0) {
    return (
      <p className={styles.muted}>
        No discussion logged yet. Record a meeting, call, or note to keep the running history.
      </p>
    );
  }
  return (
    <ul className={styles.notesList}>
      {notes.map((note) => (
        <li key={note.contractNoteId} className={styles.note}>
          <header className={styles.noteHead}>
            <span className={styles.noteType}>{note.type}</span>
            <span>{formatFullDate(note.noteDate)}</span>
            {note.participants ? <span>· {note.participants}</span> : null}
          </header>
          <p>{note.text}</p>
        </li>
      ))}
    </ul>
  );
}

interface ActivityTabProps {
  activity: {
    activityEventId: number;
    descriptionLine: string;
    occurredAt: string;
    actorName: string;
  }[];
  isLoading: boolean;
}

function ActivityTab({ activity, isLoading }: ActivityTabProps) {
  if (isLoading) return <p className={styles.muted}>Loading activity…</p>;
  if (activity.length === 0) return <p className={styles.muted}>No activity yet.</p>;
  return (
    <ul className={styles.timeline}>
      {activity.map((event) => (
        <li key={event.activityEventId} className={styles.timelineItem}>
          <span className={styles.timelineDot} aria-hidden="true" />
          <div>
            <p className={styles.timelineText}>{event.descriptionLine}</p>
            <p className={styles.timelineWhen}>
              {event.actorName} · {formatFullDate(event.occurredAt)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
