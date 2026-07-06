import { useRef, useState } from 'react';
import { Button } from '@/mws/Button';
import { formatFullDate, formatShortDate, formatUsd } from '@/lib/formatters';
import type { Phase1Contract } from '@/types/phase1';
import { Def } from './DetailRail';
import {
  formatBytes,
  ME_NAME,
  ynLabel,
  type ActivityItem,
  type CommentItem,
  type DocItem,
  type NoteItem,
  type TabId,
} from './contractDetail.helpers';
import styles from './DetailTabs.module.css';

interface DetailTabsProps {
  current: TabId;
  onChange: (id: TabId) => void;
  contract: Phase1Contract;
  activity: ActivityItem[];
  docs: DocItem[];
  comments: CommentItem[];
  notes: NoteItem[];
  onAddDoc: (item: DocItem) => void;
  onDeleteDoc: (id: string) => void;
  onAddComment: (item: CommentItem) => void;
  onAddNote: (item: NoteItem) => void;
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
export function DetailTabs({
  current,
  onChange,
  contract,
  activity,
  docs,
  comments,
  notes,
  onAddDoc,
  onDeleteDoc,
  onAddComment,
  onAddNote,
}: DetailTabsProps) {
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
        {current === 'activity' ? <ActivityPane activity={activity} /> : null}
        {current === 'documents' ? (
          <DocumentsPane docs={docs} onAdd={onAddDoc} onDelete={onDeleteDoc} />
        ) : null}
        {current === 'comments' ? <CommentsPane comments={comments} onAdd={onAddComment} /> : null}
        {current === 'notes' ? <NotesPane notes={notes} onAdd={onAddNote} /> : null}
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

function ActivityPane({ activity }: { activity: ActivityItem[] }) {
  return (
    <div className={styles.activityList}>
      {activity.map((event, index) => (
        <div key={index} className={styles.activityItem}>
          <span className={styles.activityIcon}>
            <i className={`ph ph-${event.icon}`} aria-hidden="true" />
          </span>
          <div>
            <div className={styles.activityText}>{event.text}</div>
            <div className={styles.activityWhen}>{event.when}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface DocumentsPaneProps {
  docs: DocItem[];
  onAdd: (item: DocItem) => void;
  onDelete: (id: string) => void;
}

function DocumentsPane({ docs, onAdd, onDelete }: DocumentsPaneProps) {
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
    <div className={styles.docsTab}>
      <div className={styles.docsHead}>
        <p className={styles.docsSummary}>
          {docs.length} {docs.length === 1 ? 'document' : 'documents'} attached
        </p>
        <Button variant="secondary" icon="upload-simple" onClick={() => inputRef.current?.click()}>
          Upload document
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={(event) => handleFiles(event.target.files)}
      />
      {docs.length === 0 ? (
        <p className={styles.docsEmpty}>
          No documents attached yet. Upload the contract draft, signed copy, or any supporting
          files.
        </p>
      ) : (
        <ul className={styles.docsList}>
          {docs.map((doc) => (
            <li key={doc.id} className={styles.docItem}>
              <i className={`ph ph-file-text ${styles.docIcon}`} aria-hidden="true" />
              <div>
                <div className={styles.docName}>{doc.name}</div>
                <div className={styles.docMeta}>
                  {formatBytes(doc.size)} · {doc.uploadedBy} · {formatShortDate(doc.uploadedAt)}
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon="trash"
                onClick={() => onDelete(doc.id)}
                aria-label={`Remove ${doc.name}`}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface CommentsPaneProps {
  comments: CommentItem[];
  onAdd: (item: CommentItem) => void;
}

function CommentsPane({ comments, onAdd }: CommentsPaneProps) {
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
    <div className={styles.commentsTab}>
      <div className={styles.commentsList}>
        {comments.length === 0 ? (
          <p className={styles.commentsEmpty}>No comments yet. Start the conversation below.</p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className={`${styles.comment} ${comment.isInternal ? styles.commentInternal : ''}`}
            >
              <div className={styles.commentHead}>
                <strong className={styles.commentAuthor}>{comment.author}</strong>
                <span className={styles.commentMeta}>
                  {comment.isInternal ? 'Internal · ' : ''}
                  {formatShortDate(comment.when)}
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
          />
        </label>
        <div className={styles.composerFooter}>
          <label className={styles.internalToggle}>
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(event) => setIsInternal(event.target.checked)}
            />
            Internal only (not shared outside procurement)
          </label>
          <Button icon="paper-plane-tilt" onClick={handleSubmit} disabled={!text.trim()}>
            Post comment
          </Button>
        </div>
      </div>
    </div>
  );
}

interface NotesPaneProps {
  notes: NoteItem[];
  onAdd: (item: NoteItem) => void;
}

function NotesPane({ notes, onAdd }: NotesPaneProps) {
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
    <div className={styles.notesTab}>
      <p className={styles.notesCaption}>
        Notes are private to procurement. They never appear on reminders or external messages.
      </p>
      <div className={styles.notesList}>
        {notes.length === 0 ? (
          <p className={styles.notesEmpty}>No notes yet.</p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className={styles.note}>
              <div className={styles.noteHead}>
                <strong>{note.author}</strong>
                <span>{formatShortDate(note.when)}</span>
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
        />
        <div className={styles.notesComposerActions}>
          <Button icon="plus" onClick={handleSubmit} disabled={!text.trim()}>
            Add note
          </Button>
        </div>
      </div>
    </div>
  );
}
