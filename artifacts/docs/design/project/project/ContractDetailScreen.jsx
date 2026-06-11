// ContractDetailScreen (S3) — full record for one contract, Procurement view.
const { useState } = React;
const { Badge, Button, IconButton, Avatar, Alert, Tabs, Input, Select } = window.McDermottDesignSystem_b80d20;

const fmtUSD = (n) => '$' + n.toLocaleString('en-US');

// Exception/terminal status presentation (off the forward path).
const EXC_META = {
  on_hold:    { icon: 'pause-circle',    severity: 'info',    title: 'On hold',    body: 'Review is paused. Resume to continue the workflow.' },
  canceled:   { icon: 'x-circle',        severity: 'warning', title: 'Canceled',   body: 'This contract was canceled before execution.' },
  expired:    { icon: 'clock-countdown', severity: 'warning', title: 'Expired',    body: 'The term has lapsed. Start a renewal to put a new term in place.' },
  terminated: { icon: 'prohibit',        severity: 'warning', title: 'Terminated', body: 'This contract was terminated before its natural end date.' },
};

function Stepper({ currentId }) {
  const { STAGE_STEP, STAGE_ORDER, STAGES, EXCEPTION_STAGES } = window.CM;
  const cur = STAGE_ORDER.indexOf(currentId);
  const exception = EXCEPTION_STAGES.includes(currentId);
  const meta = EXC_META[currentId];
  return (
    <div className="workflow">
      <p className="workflow__eyebrow">Review workflow</p>
      <div className={`stepper${exception ? ' stepper--muted' : ''}`} role="list" aria-label="Contract lifecycle">
        {STAGE_STEP.map((s, i) => {
          const state = exception ? 'todo' : (i < cur ? 'done' : i === cur ? 'current' : 'todo');
          return (
            <div className={`step ${state}`} role="listitem" key={s.id} aria-current={state === 'current' ? 'step' : undefined}>
              <span className="step__circle">
                {state === 'done' ? <i className="ph ph-check" aria-hidden="true"></i> : i + 1}
              </span>
              <span className="step__label">{s.label}</span>
            </div>
          );
        })}
      </div>
      {exception && meta ? (
        <div className={`workflow-flag workflow-flag--${STAGES[currentId].kind}`}>
          <i className={`ph ph-${meta.icon}`} aria-hidden="true"></i>
          <span className="workflow-flag__label">{meta.title}</span>
          <span className="workflow-flag__body">{meta.body}</span>
        </div>
      ) : null}
    </div>
  );
}

function YesNo({ on }) {
  return on
    ? <span className="yn yn--yes"><i className="ph ph-warning-circle" aria-hidden="true"></i>Yes</span>
    : <span className="yn yn--no"><i className="ph ph-minus" aria-hidden="true"></i>No</span>;
}

const APPROVAL_BADGE = {
  approved: { status: 'live', label: 'Approved' },
  pending: { status: 'pending', label: 'Pending' },
  overdue: { status: 'failed', label: 'Overdue' },
};

function ApprovalsPanel({ approvals, editable, onApprove, onRemind }) {
  const done = approvals.filter((a) => a.status === 'approved').length;
  const allDone = done === approvals.length;
  return (
    <div className="approvals">
      <div className="approvals__head">
        <p className="approvals__title">Attorney approvals</p>
        <span className="approvals__progress">
          {allDone ? <i className="ph ph-check-circle" aria-hidden="true"></i> : null}
          {done} of {approvals.length} complete
        </span>
      </div>
      {approvals.map((a) => {
        const b = APPROVAL_BADGE[a.status];
        return (
          <div className="approval" key={a.team}>
            <span className="approval__team">{a.team}</span>
            <Badge status={b.status}>{b.label}</Badge>
            {a.when ? <span className="approval__meta">· {a.when}</span> : null}
            <span className="approval__spacer"></span>
            {editable && a.status !== 'approved' ? (
              <div className="approval__actions">
                <Button variant="secondary" size="sm" icon="bell" onClick={() => onRemind(a.team)}>Send reminder</Button>
                <Button variant="secondary" size="sm" icon="check" onClick={() => onApprove(a.team)}>Record approval</Button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function DetailsTab({ c, d, onVendor }) {
  return (
    <div className="detail-tabpanel">
      <div className="def-grid">
        <div className="def">
          <div className="def__label">Vendor</div>
          <div className="def__value"><button className="vendor-link" onClick={onVendor}>{c.vendor}<i className="ph ph-arrow-up-right" aria-hidden="true" style={{ fontSize: 13 }}></i></button></div>
        </div>
        <div className="def"><div className="def__label">Category</div><div className="def__value">{c.category}</div></div>
        {d.risk ? <div className="def"><div className="def__label">IT type</div><div className="def__value">{d.risk.type}</div></div> : null}
        <div className="def"><div className="def__label">Contract value</div><div className="def__value">{fmtUSD(c.value)}</div></div>
        <div className="def"><div className="def__label">Term</div><div className="def__value">{d.term}</div></div>
        <div className="def"><div className="def__label">Requested by</div><div className="def__value">{d.requester}</div></div>
        <div className="def"><div className="def__label">Request date</div><div className="def__value">{d.requestDate}</div></div>

        {d.risk ? (
          <div className="def def--full">
            <div className="def__label">Risk review</div>
            <div className="risk-row">
              <div><div className="def__label">Accesses personal data</div><YesNo on={d.risk.personalData} /></div>
              <div><div className="def__label">Accesses PHI</div><YesNo on={d.risk.phi} /></div>
              <div><div className="def__label">Uses AI</div><YesNo on={d.risk.usesAI} /></div>
            </div>
          </div>
        ) : null}

        <div className="def def--full">
          <div className="def__label">Description</div>
          <p className="def__desc">{d.description}</p>
        </div>
      </div>
    </div>
  );
}

function DocumentsTab({ docs, onAttach }) {
  return (
    <div className="detail-tabpanel">
      <div className="section-bar">
        <h2>Documents</h2>
        <Button variant="secondary" size="sm" icon="paperclip" onClick={onAttach}>Attach document</Button>
      </div>
      <div className="doc-list">
        {docs.map((doc, i) => (
          <div className="doc" key={i}>
            <i className="ph ph-file-text doc__icon" aria-hidden="true"></i>
            <div className="doc__main">
              <div className="doc__name">{doc.name}</div>
              <div className="doc__meta">Updated {doc.updated} · {doc.by}</div>
            </div>
            <span className="doc__ver">{doc.version}{doc.versions > 1 ? ` · ${doc.versions} versions` : ''}</span>
            <IconButton icon="download-simple" size="sm" aria-label={`Download ${doc.name}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

function CommentsTab({ comments, onAdd }) {
  const [draft, setDraft] = useState('');
  const submit = () => { if (draft.trim()) { onAdd(draft.trim()); setDraft(''); } };
  return (
    <div className="detail-tabpanel">
      <div>
        {comments.map((m, i) => (
          <div className="comment" key={i}>
            <Avatar name={m.author} size="sm" />
            <div className="comment__body">
              <div className="comment__head">
                <span className="comment__author">{m.author}</span>
                <span className="comment__role">{m.role}</span>
                <span className="comment__when">{m.when}</span>
              </div>
              <p className="comment__text">{m.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="comment-form">
        <Input multiline placeholder="Add an internal note for the review team" aria-label="Add comment" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <Button variant="primary" icon="paper-plane-tilt" onClick={submit} disabled={!draft.trim()}>Add comment</Button>
      </div>
    </div>
  );
}

function ActivityTab({ activity }) {
  return (
    <div className="detail-tabpanel">
      <div className="timeline">
        {activity.map((a, i) => (
          <div className="tl" key={i}>
            <span className="tl__icon"><i className={`ph ph-${a.icon}`} aria-hidden="true"></i></span>
            <div className="tl__main">
              <div className="tl__text">{a.text}</div>
              <div className="tl__when">{a.when}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const NOTE_TYPES = ['Meeting', 'Call', 'Email', 'Note'];
const NOTE_ICON = { Meeting: 'users-three', Call: 'phone', Email: 'envelope-simple', Note: 'note-pencil' };

function NotesTab({ meetings, onAdd, onUpdate, onDelete }) {
  const today = new Date().toISOString().slice(0, 10);
  const [type, setType] = useState('Meeting');
  const [date, setDate] = useState(today);
  const [participants, setParticipants] = useState('');
  const [text, setText] = useState('');
  const [editIdx, setEditIdx] = useState(-1);
  const [edit, setEdit] = useState(null);

  const submit = () => {
    if (!text.trim()) return;
    onAdd({ type, dateISO: date, participants: participants.trim(), text: text.trim() });
    setText(''); setParticipants(''); setType('Meeting'); setDate(today);
  };
  const startEdit = (i, m) => {
    const parsed = new Date(m.date);
    const iso = isNaN(parsed) ? today : parsed.toISOString().slice(0, 10);
    setEditIdx(i);
    setEdit({ type: m.type, date: iso, participants: m.participants || '', text: m.text });
  };
  const saveEdit = () => {
    if (!edit.text.trim()) return;
    onUpdate(editIdx, { type: edit.type, dateISO: edit.date, participants: edit.participants.trim(), text: edit.text.trim() });
    setEditIdx(-1); setEdit(null);
  };
  const cancelEdit = () => { setEditIdx(-1); setEdit(null); };

  return (
    <div className="detail-tabpanel">
      <div className="notes-list">
        {meetings.length === 0 ? (
          <p className="notes-empty">No discussion logged yet. Record a meeting, call, or note to keep the running history on this contract.</p>
        ) : meetings.map((m, i) => editIdx === i ? (
          <div className="note note--editing" key={i}>
            <div className="note-form__row">
              <Select aria-label="Entry type" value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value })} options={NOTE_TYPES} />
              <Input type="date" aria-label="Date" value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} />
              <Input placeholder="Participants (optional)" aria-label="Participants" value={edit.participants} onChange={(e) => setEdit({ ...edit, participants: e.target.value })} />
            </div>
            <Input multiline aria-label="Discussion notes" value={edit.text} onChange={(e) => setEdit({ ...edit, text: e.target.value })} />
            <div className="note__editactions">
              <Button variant="primary" size="sm" icon="check" onClick={saveEdit} disabled={!edit.text.trim()}>Save note</Button>
              <Button variant="secondary" size="sm" onClick={cancelEdit}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="note" key={i}>
            <div className="note__head">
              <span className={`note-type note-type--${m.type.toLowerCase()}`}><i className={`ph ph-${NOTE_ICON[m.type] || 'note'}`} aria-hidden="true"></i>{m.type}</span>
              <span className="note__date">{m.date}</span>
              {m.participants ? <span className="note__people"><i className="ph ph-users" aria-hidden="true"></i>{m.participants}</span> : null}
              <span className="note__actions">
                <IconButton icon="pencil-simple" size="sm" aria-label="Edit note" onClick={() => startEdit(i, m)} />
                <IconButton icon="trash" size="sm" aria-label="Delete note" onClick={() => onDelete(i)} />
              </span>
            </div>
            <p className="note__text">{m.text}</p>
          </div>
        ))}
      </div>
      <div className="note-form">
        <div className="section-bar"><h2>Log a discussion</h2></div>
        <div className="note-form__row">
          <Select aria-label="Entry type" value={type} onChange={(e) => setType(e.target.value)} options={NOTE_TYPES} />
          <Input type="date" aria-label="Date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input placeholder="Participants (optional)" aria-label="Participants" value={participants} onChange={(e) => setParticipants(e.target.value)} />
        </div>
        <Input multiline placeholder="What was discussed, and what was decided?" aria-label="Discussion notes" value={text} onChange={(e) => setText(e.target.value)} />
        <Button variant="primary" icon="plus" onClick={submit} disabled={!text.trim()}>Add note</Button>
      </div>
    </div>
  );
}

const fmtISO = (iso) => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

function ContractDetailScreen({ contract, onBack, onNavigate }) {
  const { STAGE_STEP, STAGE_ORDER, STAGES, REVIEWERS, REVIEW_STAGES, EXCEPTION_STAGES, buildDetail } = window.CM;
  const d = buildDetail(contract);

  const STATUS_OPTIONS = Object.keys(STAGES).map((id) => ({ value: id, label: STAGES[id].label }));

  const [stage, setStage] = useState(contract.stage);
  const [tab, setTab] = useState('details');
  const [docs, setDocs] = useState(d.documents);
  const [comments, setComments] = useState(d.comments);
  const [activity, setActivity] = useState(d.activity);
  const [approvals, setApprovals] = useState(d.approvals);
  const [reviewer, setReviewer] = useState({ name: contract.reviewer, team: contract.team });
  const [editingReviewer, setEditingReviewer] = useState(false);
  const [pendingReviewer, setPendingReviewer] = useState(contract.reviewer || REVIEWERS[0].name);
  const [meetings, setMeetings] = useState(d.meetings);
  const todayISO = new Date().toISOString().slice(0, 10);
  const [lastActionISO, setLastActionISO] = useState(d.lastActionISO);
  const [nextDueISO, setNextDueISO] = useState(d.nextDueISO);
  const [editingDue, setEditingDue] = useState(false);
  const [pendingDue, setPendingDue] = useState(d.nextDueISO || todayISO);

  // Every logged action also stamps the "last action" date to today.
  const logActivity = (icon, text) => {
    setActivity((a) => [{ icon, text, when: 'Just now' }, ...a]);
    setLastActionISO(todayISO);
  };

  const idx = STAGE_ORDER.indexOf(stage);
  const onPath = idx !== -1 && stage !== 'completed';
  const next = onPath ? STAGE_STEP[idx + 1] : null;
  const inReview = REVIEW_STAGES.includes(stage);
  const isException = EXCEPTION_STAGES.includes(stage);
  const outstanding = approvals.filter((a) => a.status !== 'approved').length;
  // Signature is gated: a contract can't leave the final review stage until every approval is in.
  const blocked = stage === 'with_privacy' && outstanding > 0;

  const advance = () => {
    if (!next || blocked) return;
    setStage(next.id);
    logActivity('arrow-right', `Status changed to ${STAGES[next.id].label}`);
  };

  const changeStatus = (id) => {
    if (id === stage) return;
    setStage(id);
    logActivity('flag', `Status changed to ${STAGES[id].label}`);
  };

  const recordApproval = (team) => {
    setApprovals((as) => as.map((a) => (a.team === team ? { ...a, status: 'approved', when: 'Just now' } : a)));
    logActivity('check-circle', `${team} approval recorded`);
  };
  const sendReminder = (team) => logActivity('bell', `Reminder sent to ${team}`);

  // Notice always reflects live state — no stale “review overdue” once past review.
  let notice = null;
  if (isException && EXC_META[stage]) {
    const m = EXC_META[stage];
    notice = { severity: m.severity, title: m.title, body: m.body };
  } else if (stage === 'in_process' && !reviewer.name) {
    notice = { severity: 'warning', title: 'Unassigned', body: 'Assign a lead reviewer to begin the approval process.' };
  } else if (inReview) {
    const od = approvals.filter((a) => a.status === 'overdue').map((a) => a.team);
    if (od.length) notice = { severity: 'warning', title: 'Approval overdue', body: `${od.join(', ')} approval is overdue. Send a reminder or record their decision.` };
  } else if (stage === 'completed' && contract.expiresDays != null && contract.expiresDays <= 14) {
    notice = { severity: 'warning', title: 'Expiring soon', body: `Expires in ${contract.expiresDays} days — start the renewal.` };
  }

  const attachDoc = () => {
    setDocs((ds) => [{ name: 'New attachment', version: 'v1', versions: 1, updated: 'Today', by: 'Lisa Farkas' }, ...ds]);
    logActivity('paperclip', 'Document uploaded: New attachment v1');
    setTab('documents');
  };

  const addComment = (text) => {
    setComments((cs) => [...cs, { author: 'Lisa Farkas', role: 'Procurement', when: 'Just now', text }]);
    logActivity('chat-text', 'Comment added by Lisa Farkas');
  };

  const addMeeting = (entry) => {
    setMeetings((ms) => [{ type: entry.type, date: fmtISO(entry.dateISO), participants: entry.participants, text: entry.text }, ...ms]);
    logActivity('notepad', `${entry.type} note logged`);
  };

  const updateMeeting = (i, entry) => {
    setMeetings((ms) => ms.map((m, j) => (j === i ? { type: entry.type, date: fmtISO(entry.dateISO), participants: entry.participants, text: entry.text } : m)));
    logActivity('pencil-simple', `${entry.type} note edited`);
  };

  const deleteMeeting = (i) => {
    setMeetings((ms) => ms.filter((_, j) => j !== i));
    logActivity('trash', 'Discussion note deleted');
  };

  const saveDue = () => {
    setNextDueISO(pendingDue);
    setEditingDue(false);
    logActivity('calendar-check', `Next action due set to ${fmtISO(pendingDue)}`);
  };

  const saveReassign = () => {
    const r = REVIEWERS.find((x) => x.name === pendingReviewer);
    setReviewer({ name: r.name, team: r.team });
    setEditingReviewer(false);
    logActivity('identification-badge', `Reassigned to ${r.name} · ${r.team}`);
  };

  const TABS = [
    { value: 'details', label: 'Details' },
    { value: 'documents', label: `Documents (${docs.length})` },
    { value: 'comments', label: `Comments (${comments.length})` },
    { value: 'notes', label: `Notes (${meetings.length})` },
    { value: 'activity', label: 'Activity' },
  ];

  // Next-action-due display state (overdue once past, unless the contract is closed).
  const dueDays = nextDueISO ? Math.round((new Date(nextDueISO + 'T00:00:00') - new Date(todayISO + 'T00:00:00')) / 86400000) : null;
  const dueClosed = ['canceled', 'terminated', 'completed'].includes(stage);
  const dueOverdue = dueDays != null && dueDays < 0 && !dueClosed;
  const dueRel = dueDays == null ? null
    : dueDays < 0 ? `${-dueDays} day${dueDays === -1 ? '' : 's'} overdue`
    : dueDays === 0 ? 'Due today'
    : `in ${dueDays} day${dueDays === 1 ? '' : 's'}`;

  return (
    <div>
      <button className="back-link" onClick={onBack}><i className="ph ph-arrow-left" aria-hidden="true"></i>Active contracts</button>

      <div className="page-head">
        <div>
          <div className="detail-eyebrow">
            <span className="cell-mono">{contract.num}</span>
            <span className="detail-dot">·</span>
            <span className="cat"><i className={`ph ph-${window.CM.CATEGORIES[contract.category].icon}`} aria-hidden="true"></i>{contract.category}</span>
          </div>
          <h1 className="page-head__title">{contract.title}</h1>
          <div className="detail-sub">
            <button className="vendor-link" onClick={() => onNavigate && onNavigate('vendors')}>{contract.vendor}<i className="ph ph-arrow-up-right" aria-hidden="true" style={{ fontSize: 13 }}></i></button>
            <span className="detail-dot">·</span>
            <span>{fmtUSD(contract.value)}</span>
            <Badge status={STAGES[stage].status}>{STAGES[stage].label}</Badge>
          </div>
        </div>
        <div className="page-head__actions">
          <div className="advance-wrap">
            {stage === 'completed' || stage === 'expired' ? (
              <Button variant="secondary" icon="arrows-clockwise" onClick={() => onNavigate && onNavigate('renewals')}>Start renewal</Button>
            ) : stage === 'on_hold' ? (
              <Button variant="primary" icon="play" onClick={() => changeStatus('with_legal')}>Resume review</Button>
            ) : stage === 'canceled' || stage === 'terminated' ? (
              <Button variant="secondary" icon="arrow-counter-clockwise" onClick={() => changeStatus('in_process')}>Reopen contract</Button>
            ) : (
              <Button variant="primary" icon={stage === 'in_process' ? 'paper-plane-tilt' : 'arrow-right'} disabled={blocked} onClick={advance}>
                {next && next.id === 'completed' ? 'Mark completed' : `Advance to ${next.label}`}
              </Button>
            )}
            {blocked ? <span className="advance-hint">{outstanding} approval{outstanding === 1 ? '' : 's'} outstanding</span> : null}
          </div>
        </div>
      </div>

      {notice ? (
        <Alert severity={notice.severity} title={notice.title}>{notice.body}</Alert>
      ) : null}

      <div className="detail-grid">
        <div>
          <Stepper currentId={stage} />
          <ApprovalsPanel approvals={approvals} editable={inReview} onApprove={recordApproval} onRemind={sendReminder} />
          <Tabs tabs={TABS} value={tab} onChange={setTab} />
          {tab === 'details' && <DetailsTab c={contract} d={d} onVendor={() => onNavigate && onNavigate('vendors')} />}
          {tab === 'documents' && <DocumentsTab docs={docs} onAttach={attachDoc} />}
          {tab === 'comments' && <CommentsTab comments={comments} onAdd={addComment} />}
          {tab === 'notes' && <NotesTab meetings={meetings} onAdd={addMeeting} onUpdate={updateMeeting} onDelete={deleteMeeting} />}
          {tab === 'activity' && <ActivityTab activity={activity} />}
        </div>

        <aside className="rail">
          <div className="rail-card">
            <p className="rail-card__eyebrow">Status</p>
            <div className="status-now">
              <Badge status={STAGES[stage].status}>{STAGES[stage].label}</Badge>
            </div>
            <Select
              aria-label="Change contract status"
              value={stage}
              onChange={(e) => changeStatus(e.target.value)}
              options={STATUS_OPTIONS}
            />
            <p className="status-hint">Set any of the 13 contract statuses. Each change is recorded in the activity trail.</p>
          </div>

          <div className="rail-card">
            <p className="rail-card__eyebrow">Action dates</p>
            <div className="facts">
              <div className="fact"><span className="fact__k">Last action</span><span className="fact__v">{fmtISO(lastActionISO)}</span></div>
              <div className="fact">
                <span className="fact__k">Next action due</span>
                <span className={`fact__v${dueOverdue ? ' fact__v--overdue' : ''}`}>
                  {dueOverdue ? <i className="ph ph-warning-circle" aria-hidden="true"></i> : null}
                  {fmtISO(nextDueISO)}
                </span>
              </div>
            </div>
            {dueRel ? <div className={`due-rel${dueOverdue ? ' due-rel--overdue' : ''}`}>{dueRel}</div> : null}
            {editingDue ? (
              <div className="reassign-form">
                <Input type="date" aria-label="Next action due date" value={pendingDue} onChange={(e) => setPendingDue(e.target.value)} />
                <div className="reassign-actions">
                  <Button variant="primary" size="sm" icon="check" onClick={saveDue}>Save date</Button>
                  <Button variant="secondary" size="sm" onClick={() => setEditingDue(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button variant="secondary" size="sm" icon="calendar-blank" onClick={() => { setPendingDue(nextDueISO || todayISO); setEditingDue(true); }}>
                {nextDueISO ? 'Update due date' : 'Set due date'}
              </Button>
            )}
          </div>

          <div className="rail-card">
            <p className="rail-card__eyebrow">Lead reviewer</p>
            {editingReviewer ? (
              <div className="reassign-form">
                <Select
                  aria-label="Reassign reviewer"
                  value={pendingReviewer}
                  onChange={(e) => setPendingReviewer(e.target.value)}
                  options={REVIEWERS.map((r) => ({ value: r.name, label: `${r.name} · ${r.team}` }))}
                />
                <div className="reassign-actions">
                  <Button variant="primary" size="sm" icon="check" onClick={saveReassign}>Save reviewer</Button>
                  <Button variant="secondary" size="sm" onClick={() => setEditingReviewer(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="reviewer-block">
                  {reviewer.name ? <Avatar name={reviewer.name} size="md" /> : <span className="tl__icon"><i className="ph ph-user" aria-hidden="true"></i></span>}
                  <div className="reviewer-block__txt">
                    <div className="reviewer-block__name">{reviewer.name || 'Unassigned'}</div>
                    <div className="reviewer-block__team">{reviewer.team || 'No attorney review team'}</div>
                  </div>
                </div>
                <Button variant="secondary" size="sm" icon="user-switch" onClick={() => { setPendingReviewer(reviewer.name || REVIEWERS[0].name); setEditingReviewer(true); }}>
                  {reviewer.name ? 'Reassign reviewer' : 'Assign reviewer'}
                </Button>
              </>
            )}
          </div>

          <div className="rail-card">
            <p className="rail-card__eyebrow">Key facts</p>
            <div className="facts">
              <div className="fact"><span className="fact__k">Value</span><span className="fact__v">{fmtUSD(contract.value)}</span></div>
              <div className="fact"><span className="fact__k">Term</span><span className="fact__v">{d.term}</span></div>
              <div className="fact"><span className="fact__k">Requested by</span><span className="fact__v">{d.requester}</span></div>
              <div className="fact"><span className="fact__k">Expires</span><span className="fact__v">{
                stage === 'expired' || (contract.expiresDays != null && contract.expiresDays < 0) ? 'Expired'
                : stage === 'canceled' || stage === 'terminated' ? '—'
                : contract.expiresDays != null ? `in ${contract.expiresDays} days` : 'Not executed'
              }</span></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

window.ContractDetailScreen = ContractDetailScreen;
