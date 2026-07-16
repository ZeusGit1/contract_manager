import { useRef, useState } from 'react';
import { Button } from '@/mws/Button';
import { formatFullDate, formatShortDate, formatUsd } from '@/lib/formatters';
import type { Phase1Contract } from '@/types/phase1';
import type { AttachmentDto } from '@/types/api';
import { Def } from './DetailRail';
import { formatBytes, ynLabel, type TabId } from './contractDetail.helpers';
import {
  downloadAttachment,
  useAddComment,
  useAddNote,
  useContractActivity,
  useContractAttachments,
  useContractComments,
  useContractNotes,
  useDeleteAttachment,
  useUploadAttachments,
} from '../hooks';
import styles from './DetailTabs.module.css';

interface DetailTabsProps {
  current: TabId;
  onChange: (id: TabId) => void;
  contract: Phase1Contract;
  contractId: number;
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'details', label: 'Details' },
  { id: 'documents', label: 'Documents' },
  { id: 'comments', label: 'Comments' },
  { id: 'notes', label: 'Notes' },
  { id: 'activity', label: 'Activity' },
];

/** Contract-detail tabs — Details / Documents / Comments / Notes / Activity.
 *  Tab row scrolls horizontally on narrow viewports per navigation-and-ia.md. */
export function DetailTabs({ current, onChange, contract, contractId }: DetailTabsProps) {
  return (
    <>
      <div role="tablist" className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={current === tab.id}
            onClick={() => onChange(tab.id)}
            className={`${styles.tab} ${current === tab.id ? styles.tabActive : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={styles.tabPanel}>
        {current === 'details' ? <DetailsPane contract={contract} /> : null}
        {current === 'activity' ? <ActivityPane contractId={contractId} /> : null}
        {current === 'documents' ? <DocumentsPane contractId={contractId} /> : null}
        {current === 'comments' ? <CommentsPane contractId={contractId} /> : null}
        {current === 'notes' ? <NotesPane contractId={contractId} /> : null}
      </div>
    </>
  );
}

function DetailsPane({ contract }: { contract: Phase1Contract }) {
  return (
    <div className={styles.detailsGrid}>
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

/** Activity pane — reads server-emitted ActivityEventDto items. */
function ActivityPane({ contractId }: { contractId: number }) {
  const query = useContractActivity(contractId);

  if (query.isLoading) return <p className={styles.docsEmpty}>Loading activity…</p>;
  if (query.error) {
    return (
      <p className={styles.docsError} role="alert">
        Couldn&apos;t load activity. Refresh to try again.
      </p>
    );
  }
  const activity = query.data ?? [];
  if (activity.length === 0) return <p className={styles.docsEmpty}>No activity yet.</p>;

  return (
    <div className={styles.activityList}>
      {activity.map((event) => (
        <div key={event.activityEventId} className={styles.activityItem}>
          <span className={styles.activityIcon}>
            <i className={`ph ph-${iconForActivity(event.type)}`} aria-hidden="true" />
          </span>
          <div>
            <div className={styles.activityText}>{event.descriptionLine}</div>
            <div className={styles.activityWhen}>{formatShortDate(event.occurredAt)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function iconForActivity(type: string): string {
  switch (type) {
    case 'ContractCreated':
      return 'file-plus';
    case 'LaneStatusChanged':
      return 'arrow-right';
    case 'LaneOwnerChanged':
      return 'identification-badge';
    case 'LaneNoteUpdated':
      return 'note-pencil';
    case 'LaneDueDateChanged':
      return 'calendar-blank';
    case 'OverallStatusChanged':
      return 'check-circle';
    case 'OwnerReassigned':
      return 'user-switch';
    case 'CommentAdded':
      return 'chat-circle';
    case 'NoteAdded':
      return 'note-pencil';
    case 'AttachmentAdded':
      return 'paperclip';
    case 'AttachmentRemoved':
      return 'trash';
    case 'ReminderLogged':
      return 'bell';
    case 'BulkImported':
      return 'upload-simple';
    case 'AssignmentAdded':
    case 'AssignmentRemoved':
      return 'user-plus';
    default:
      return 'circle';
  }
}

/**
 * Documents pane — self-contained. Fetches the attachments list, uploads via the batch
 * protocol, downloads by streaming a blob into an object URL, and soft-deletes.
 * All state lives on the server; nothing is kept in local component state.
 */
function DocumentsPane({ contractId }: { contractId: number }) {
  const listQuery = useContractAttachments(contractId);
  const uploadMutation = useUploadAttachments(contractId);
  const deleteMutation = useDeleteAttachment(contractId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const attachments = listQuery.data ?? [];

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    uploadMutation.mutate(arr, {
      onSettled: () => {
        if (inputRef.current) inputRef.current.value = '';
      },
    });
  };

  const handleDownload = async (attachment: AttachmentDto) => {
    setDownloadError(null);
    setDownloadingId(attachment.contractAttachmentId);
    try {
      await downloadAttachment(attachment);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Couldn’t download the file.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = (attachment: AttachmentDto) => {
    if (!confirm(`Remove ${attachment.fileName}? This can’t be undone.`)) return;
    deleteMutation.mutate(attachment.contractAttachmentId);
  };

  if (contractId <= 0) {
    return (
      <p className={styles.docsEmpty}>Attachments become available after the contract is saved.</p>
    );
  }

  return (
    <div className={styles.docsTab}>
      <div className={styles.docsHead}>
        <p className={styles.docsSummary}>
          {attachments.length} {attachments.length === 1 ? 'document' : 'documents'} attached
        </p>
        <Button
          variant="secondary"
          icon="upload-simple"
          onClick={() => inputRef.current?.click()}
          disabled={uploadMutation.isPending}
        >
          {uploadMutation.isPending ? 'Uploading…' : 'Upload document'}
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={(event) => handleFiles(event.target.files)}
      />
      {uploadMutation.error ? (
        <p className={styles.docsError} role="alert">
          Couldn&apos;t upload: {uploadMutation.error.message}
        </p>
      ) : null}
      {deleteMutation.error ? (
        <p className={styles.docsError} role="alert">
          Couldn&apos;t remove: {deleteMutation.error.message}
        </p>
      ) : null}
      {downloadError ? (
        <p className={styles.docsError} role="alert">
          {downloadError}
        </p>
      ) : null}
      {listQuery.isLoading ? (
        <p className={styles.docsEmpty}>Loading attachments…</p>
      ) : listQuery.error ? (
        <p className={styles.docsError} role="alert">
          Couldn&apos;t load attachments. Refresh to try again.
        </p>
      ) : attachments.length === 0 ? (
        <p className={styles.docsEmpty}>
          No documents attached yet. Upload the contract draft, signed copy, or any supporting
          files.
        </p>
      ) : (
        <ul className={styles.docsList}>
          {attachments.map((doc) => {
            const isDownloading = downloadingId === doc.contractAttachmentId;
            return (
              <li key={doc.contractAttachmentId} className={styles.docItem}>
                <i className={`ph ph-file-text ${styles.docIcon}`} aria-hidden="true" />
                <div>
                  <button
                    type="button"
                    className={styles.docNameButton}
                    onClick={() => handleDownload(doc)}
                    disabled={isDownloading}
                    aria-label={`Download ${doc.fileName}`}
                  >
                    <span className={styles.docName}>{doc.fileName}</span>
                  </button>
                  <div className={styles.docMeta}>
                    {formatBytes(doc.sizeBytes)} · {formatShortDate(doc.createdAt)}
                    {isDownloading ? ' · Downloading…' : ''}
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  icon="download-simple"
                  onClick={() => handleDownload(doc)}
                  disabled={isDownloading}
                  aria-label={`Download ${doc.fileName}`}
                >
                  Download
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon="trash"
                  onClick={() => handleDelete(doc)}
                  disabled={deleteMutation.isPending}
                  aria-label={`Remove ${doc.fileName}`}
                >
                  Remove
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CommentsPane({ contractId }: { contractId: number }) {
  const listQuery = useContractComments(contractId);
  const addMutation = useAddComment(contractId);
  const [text, setText] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const comments = listQuery.data ?? [];

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    addMutation.mutate(
      { text: trimmed, isInternalOnly: isInternal },
      { onSuccess: () => setText('') },
    );
  };

  return (
    <div className={styles.commentsTab}>
      {listQuery.error ? (
        <p className={styles.docsError} role="alert">
          Couldn&apos;t load comments. Refresh to try again.
        </p>
      ) : null}
      {addMutation.error ? (
        <p className={styles.docsError} role="alert">
          Couldn&apos;t post comment: {addMutation.error.message}
        </p>
      ) : null}
      <div className={styles.commentsList}>
        {listQuery.isLoading ? (
          <p className={styles.commentsEmpty}>Loading comments…</p>
        ) : comments.length === 0 ? (
          <p className={styles.commentsEmpty}>No comments yet. Start the conversation below.</p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.contractCommentId}
              className={`${styles.comment} ${comment.isInternalOnly ? styles.commentInternal : ''}`}
            >
              <div className={styles.commentHead}>
                <strong className={styles.commentAuthor}>{comment.authorName}</strong>
                <span className={styles.commentMeta}>
                  {comment.isInternalOnly ? 'Internal · ' : ''}
                  {formatShortDate(comment.createdAt)}
                </span>
              </div>
              <div className={styles.commentBody}>{comment.text}</div>
            </div>
          ))
        )}
      </div>
      <div className={styles.commentComposer}>
        <label className={styles.composerField}>
          <span className={styles.composerLabel}>Add a comment</span>
          <textarea
            className={styles.composerText}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Comments are visible to the contract team."
            rows={3}
            disabled={addMutation.isPending}
          />
        </label>
        <div className={styles.composerFooter}>
          <label className={styles.internalToggle}>
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(event) => setIsInternal(event.target.checked)}
              disabled={addMutation.isPending}
            />
            Internal only (not shared outside procurement)
          </label>
          <Button
            icon="paper-plane-tilt"
            onClick={handleSubmit}
            disabled={!text.trim() || addMutation.isPending}
          >
            {addMutation.isPending ? 'Posting…' : 'Post comment'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function NotesPane({ contractId }: { contractId: number }) {
  const listQuery = useContractNotes(contractId);
  const addMutation = useAddNote(contractId);
  const [text, setText] = useState('');

  const notes = listQuery.data ?? [];

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    addMutation.mutate(
      {
        type: 'Note',
        noteDate: new Date().toISOString().slice(0, 10),
        participants: null,
        text: trimmed,
      },
      { onSuccess: () => setText('') },
    );
  };

  return (
    <div className={styles.notesTab}>
      <p className={styles.notesCaption}>
        Notes are private to procurement. They never appear on reminders or external messages.
      </p>
      {listQuery.error ? (
        <p className={styles.docsError} role="alert">
          Couldn&apos;t load notes. Refresh to try again.
        </p>
      ) : null}
      {addMutation.error ? (
        <p className={styles.docsError} role="alert">
          Couldn&apos;t add note: {addMutation.error.message}
        </p>
      ) : null}
      <div className={styles.notesList}>
        {listQuery.isLoading ? (
          <p className={styles.notesEmpty}>Loading notes…</p>
        ) : notes.length === 0 ? (
          <p className={styles.notesEmpty}>No notes yet.</p>
        ) : (
          notes.map((note) => (
            <div key={note.contractNoteId} className={styles.note}>
              <div className={styles.noteHead}>
                <strong>{note.authorName}</strong>
                <span>{formatShortDate(note.createdAt)}</span>
              </div>
              <div className={styles.noteBody}>{note.text}</div>
            </div>
          ))
        )}
      </div>
      <div className={styles.notesComposer}>
        <textarea
          className={styles.composerText}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Procurement notes…"
          rows={3}
          disabled={addMutation.isPending}
        />
        <div className={styles.notesComposerActions}>
          <Button
            icon="plus"
            onClick={handleSubmit}
            disabled={!text.trim() || addMutation.isPending}
          >
            {addMutation.isPending ? 'Adding…' : 'Add note'}
          </Button>
        </div>
      </div>
    </div>
  );
}
