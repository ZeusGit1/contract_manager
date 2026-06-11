// BulkUploadScreen (S12) — Bulk Upload, Preview & Fix. Procurement uploads the
// legacy SpendConnect export to seed the system. The preview surfaces the messy
// reality: each parsed row is validated per-cell, flagged cells are fixed inline
// or the whole row is skipped, and only resolved rows commit to the dashboard.
const { useState, useMemo, useRef } = React;
const { Button, Badge, IconButton } = window.McDermottDesignSystem_b80d20;

const CATEGORY_OPTS = ['Event', 'Facilities', 'IT'];

// Raw rows as if parsed from "SpendConnect_export_2026.csv" — deliberately messy.
const RAW_ROWS = [
  { title: 'Carbon copier maintenance',        vendor: 'Canon Business Solutions', category: 'Facilities', value: '24000',     start: '2026-08-01', end: '2027-08-01' },
  { title: 'eDiscovery overflow processing',   vendor: 'Relativity ODA LLC',       category: 'IT',         value: '88000',     start: '2026-07-15', end: '2027-07-15' },
  { title: 'Summer associate mixer',           vendor: 'Halcyon Events Group',     category: 'Event',      value: 'TBD',       start: '2026-06-20', end: '2026-06-21' },
  { title: 'Endpoint security renewal',        vendor: 'Exterro, Inc.',            category: 'Tech',       value: '142000',    start: '2026-09-01', end: '2027-09-01' },
  { title: 'Cloud backup retainer',            vendor: 'Microsoft Corp',           category: 'IT',         value: '67000',     start: '2026-10-01', end: '2027-10-01' },
  { title: '',                                 vendor: 'Bright Bean Services',     category: 'Facilities', value: '12000',     start: '2026-07-01', end: '2027-07-01' },
  { title: 'Townhall AV rental',               vendor: 'Lumen Productions',        category: 'Event',      value: '34000',     start: '2026-11-10', end: '2026-10-10' },
  { title: 'Records shredding addendum',       vendor: 'SecureShred Partners',     category: 'Facilities', value: '9000',      start: '2026-08-15', end: '' },
  { title: 'Research platform seats',          vendor: 'Thomson Reuters',          category: 'IT',         value: '210000',    start: '2026-09-30', end: '2027-09-30' },
  { title: 'Lobby plant refresh',              vendor: 'Atrium Build',             category: 'Facilites',  value: '4500',      start: '2026-08-05', end: '2027-08-05' },
  { title: 'Managed print toner program',      vendor: 'Canon Business Solutions', category: 'Facilities', value: '15000',     start: '2026-12-01', end: '2027-12-01' },
  { title: 'AI research pilot extension',      vendor: 'Harvey AI, Inc.',          category: 'IT',         value: '$120,000',  start: '2026-08-20', end: '2027-08-20' },
];

const COLS = [
  { key: 'title',    label: 'Contract title', type: 'text' },
  { key: 'vendor',   label: 'Vendor',         type: 'vendor' },
  { key: 'category', label: 'Category',       type: 'category' },
  { key: 'value',    label: 'Value (USD)',    type: 'value' },
  { key: 'start',    label: 'Term start',     type: 'date' },
  { key: 'end',      label: 'Term end',       type: 'date' },
];

const parseValue = (v) => Number(String(v).replace(/[$,\s]/g, ''));
const fmtMoney = (n) => '$' + n.toLocaleString('en-US');
const fmtDay = (iso) => { const d = new Date(iso + 'T00:00:00'); return isNaN(d) ? iso : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }); };

function fieldError(key, fields, vendorsSet) {
  const val = fields[key];
  if (key === 'title') return val.trim() ? null : 'Missing title';
  if (key === 'vendor') { if (!val.trim()) return 'Missing vendor'; return vendorsSet.has(val) ? null : 'Unknown vendor'; }
  if (key === 'category') return CATEGORY_OPTS.includes(val) ? null : 'Unknown category';
  if (key === 'value') { const n = parseValue(val); return (val !== '' && !isNaN(n) && n > 0) ? null : 'Invalid amount'; }
  if (key === 'start' || key === 'end') {
    if (!val) return 'Missing date';
    if (isNaN(new Date(val + 'T00:00:00'))) return 'Invalid date';
    if (key === 'end' && fields.start && val < fields.start) return 'Ends before start';
    return null;
  }
  return null;
}
const rowErrorCount = (fields, vs) => COLS.reduce((n, c) => n + (fieldError(c.key, fields, vs) ? 1 : 0), 0);

function display(key, val) {
  if (key === 'value') { const n = parseValue(val); return (val !== '' && !isNaN(n) && n > 0) ? fmtMoney(n) : (val || '—'); }
  if (key === 'start' || key === 'end') return val ? fmtDay(val) : '—';
  return val || '—';
}

function Cell({ row, col, editing, vendors, vendorsSet, onEdit, onCommit, onClose }) {
  const err = fieldError(col.key, row.fields, vendorsSet);
  const isEditing = editing && editing.id === row.id && editing.key === col.key;
  const val = row.fields[col.key];

  if (isEditing && !row.skipped) {
    if (col.type === 'vendor' || col.type === 'category') {
      const opts = col.type === 'category' ? CATEGORY_OPTS : vendors;
      return (
        <td className="bu-td bu-td--editing">
          <select className="bu-edit" autoFocus value={vendorsSet.has(val) || CATEGORY_OPTS.includes(val) ? val : ''}
                  onChange={(e) => { onCommit(row.id, col.key, e.target.value); onClose(); }}
                  onBlur={onClose}>
            <option value="" disabled>Select…</option>
            {opts.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </td>
      );
    }
    const inputType = col.type === 'value' ? 'number' : col.type === 'date' ? 'date' : 'text';
    return (
      <td className="bu-td bu-td--editing">
        <input className="bu-edit" type={inputType} autoFocus
               value={col.type === 'value' ? String(parseValue(val) || (val === '' ? '' : val)) : val}
               onChange={(e) => onCommit(row.id, col.key, e.target.value)}
               onBlur={onClose}
               onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') onClose(); }} />
      </td>
    );
  }

  return (
    <td className="bu-td">
      <button className={`bu-cell${err && !row.skipped ? ' bu-cell--err' : ''}${row.skipped ? ' bu-cell--skip' : ''}`}
              onClick={() => !row.skipped && onEdit(row.id, col.key)} disabled={row.skipped}
              title={err && !row.skipped ? err : 'Click to edit'}>
        <span className="bu-cell__val">{display(col.key, val)}</span>
        {err && !row.skipped ? <span className="bu-cell__flag"><i className="ph ph-warning-circle" aria-hidden="true"></i>{err}</span> : null}
      </button>
    </td>
  );
}

function BulkUploadScreen({ onCommit, onCancel }) {
  const vendors = useMemo(() => Object.keys(window.CM.VENDORS).sort(), []);
  const vendorsSet = useMemo(() => new Set(vendors), [vendors]);

  const [uploaded, setUploaded] = useState(false);
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('all');
  const fileRef = useRef(null);

  const loadSample = () => {
    setRows(RAW_ROWS.map((r, i) => ({ id: i + 1, fields: { ...r }, skipped: false })));
    setUploaded(true);
  };

  const commitCell = (id, key, value) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, fields: { ...r.fields, [key]: value } } : r)));
  const toggleSkip = (id) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, skipped: !r.skipped } : r)));

  const stats = useMemo(() => {
    let ready = 0, fixes = 0, skipped = 0;
    rows.forEach((r) => { if (r.skipped) skipped++; else if (rowErrorCount(r.fields, vendorsSet) > 0) fixes++; else ready++; });
    return { ready, fixes, skipped, total: rows.length };
  }, [rows, vendorsSet]);

  const view = useMemo(() => {
    if (filter === 'all') return rows;
    return rows.filter((r) => {
      const isSkip = r.skipped;
      const isErr = !isSkip && rowErrorCount(r.fields, vendorsSet) > 0;
      if (filter === 'ready') return !isSkip && !isErr;
      if (filter === 'fixes') return isErr;
      return isSkip;
    });
  }, [rows, filter, vendorsSet]);

  const commit = () => {
    if (stats.fixes > 0 || stats.ready === 0) return;
    const drafts = rows.filter((r) => !r.skipped).map((r) => ({
      title: r.fields.title.trim(),
      vendor: r.fields.vendor,
      category: r.fields.category,
      value: parseValue(r.fields.value),
    }));
    onCommit && onCommit(drafts);
  };

  if (!uploaded) {
    return (
      <div>
        <div className="page-head">
          <div>
            <h1 className="page-head__title">Bulk upload</h1>
            <p className="page-head__sub">Seed the system from the legacy SpendConnect export. You'll review and fix every row before anything is imported.</p>
          </div>
        </div>
        <div className="dropzone">
          <i className="ph ph-table dropzone__icon" aria-hidden="true"></i>
          <h2 className="dropzone__title">Drop your SpendConnect export here</h2>
          <p className="dropzone__hint">CSV or XLSX exported from SpendConnect. Nothing is imported until you confirm.</p>
          <div className="dropzone__actions">
            <input ref={fileRef} type="file" accept=".csv,.xlsx" style={{ display: 'none' }} onChange={loadSample} />
            <Button variant="primary" icon="upload-simple" onClick={() => fileRef.current && fileRef.current.click()}>Select file</Button>
            <Button variant="secondary" icon="table" onClick={loadSample}>Load sample export</Button>
          </div>
        </div>
      </div>
    );
  }

  const chips = [
    { id: 'all', label: 'All rows', count: stats.total },
    { id: 'ready', label: 'Ready', count: stats.ready, tone: 'ready' },
    { id: 'fixes', label: 'Needs fixes', count: stats.fixes, tone: 'fixes' },
    { id: 'skipped', label: 'Skipped', count: stats.skipped, tone: 'skip' },
  ];

  return (
    <div>
      <button className="back-link" onClick={onCancel}><i className="ph ph-arrow-left" aria-hidden="true"></i>Active contracts</button>

      <div className="page-head">
        <div>
          <h1 className="page-head__title">Preview & fix import</h1>
          <p className="page-head__sub"><i className="ph ph-file-csv" aria-hidden="true" style={{ marginRight: 6 }}></i>SpendConnect_export_2026.csv · {stats.total} rows parsed</p>
        </div>
        <div className="page-head__actions">
          <div className="advance-wrap">
            <Button variant="primary" icon="check" disabled={stats.fixes > 0 || stats.ready === 0} onClick={commit}>
              Import {stats.ready} contract{stats.ready === 1 ? '' : 's'}
            </Button>
            {stats.fixes > 0 ? <span className="advance-hint">{stats.fixes} row{stats.fixes === 1 ? '' : 's'} still need fixing or skipping</span> : null}
          </div>
        </div>
      </div>

      <div className="bu-tabs" role="group" aria-label="Filter rows">
        {chips.map((c) => (
          <button key={c.id} className={`bu-tab${filter === c.id ? ' is-active' : ''}`} aria-pressed={filter === c.id} onClick={() => setFilter(c.id)}>
            {c.tone ? <span className={`bu-dot bu-dot--${c.tone}`} aria-hidden="true"></span> : null}
            {c.label}<span className="bu-tab__count">{c.count}</span>
          </button>
        ))}
      </div>

      <div className="table-shell">
        <table className="bu-table">
          <thead>
            <tr>
              <th className="bu-th-status">Row</th>
              {COLS.map((c) => <th key={c.key}>{c.label}</th>)}
              <th className="bu-th-action" aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>
            {view.length === 0 ? (
              <tr><td className="bu-empty" colSpan={COLS.length + 2}>No rows in this view.</td></tr>
            ) : view.map((r) => {
              const errs = rowErrorCount(r.fields, vendorsSet);
              const state = r.skipped ? 'skip' : errs > 0 ? 'error' : 'ready';
              return (
                <tr key={r.id} className={`bu-row bu-row--${state}`}>
                  <td className="bu-status">
                    <span className={`bu-badge bu-badge--${state}`}>
                      <i className={`ph ph-${state === 'ready' ? 'check-circle' : state === 'error' ? 'warning-circle' : 'minus-circle'}`} aria-hidden="true"></i>
                      {state === 'ready' ? 'Ready' : state === 'error' ? `${errs} ${errs === 1 ? 'fix' : 'fixes'}` : 'Skipped'}
                    </span>
                  </td>
                  {COLS.map((c) => (
                    <Cell key={c.key} row={r} col={c} editing={editing} vendors={vendors} vendorsSet={vendorsSet}
                          onEdit={(id, key) => setEditing({ id, key })} onCommit={commitCell} onClose={() => setEditing(null)} />
                  ))}
                  <td className="bu-action">
                    <Button variant="secondary" size="sm" icon={r.skipped ? 'arrow-counter-clockwise' : 'prohibit'} onClick={() => toggleSkip(r.id)}>
                      {r.skipped ? 'Restore' : 'Skip'}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="bu-footnote">Skipped rows won't be imported. Fix the flagged cells — click any highlighted value to edit it — or skip the row to move on.</p>
    </div>
  );
}

window.BulkUploadScreen = BulkUploadScreen;
