// VendorScreen (S8) — Vendor Master List. Procurement's source of truth for
// every vendor: the Preferred / Standard / Difficult / Blacklisted status that
// drives workflow decisions, contact info, and contract footprint. Opening a
// row surfaces a summary; the full Vendor Detail screen is out of prototype scope.
const { useState, useMemo } = React;
const { Badge, Button, IconButton, Modal } = window.McDermottDesignSystem_b80d20;

const vFmtUSD = (n) => '$' + n.toLocaleString('en-US');

function VSortHead({ label, sortKey, sort, onSort, numeric }) {
  const active = sort.key === sortKey;
  return (
    <th className="sortable" aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
        onClick={() => onSort(sortKey)} style={numeric ? { textAlign: 'right' } : null}>
      <span className="th-inner" style={numeric ? { flexDirection: 'row-reverse' } : null}>
        {label}
        <i className={`ph ph-${active ? (sort.dir === 'asc' ? 'caret-up' : 'caret-down') : 'caret-up-down'}`} aria-hidden="true"></i>
      </span>
    </th>
  );
}

function VendorModalBody({ row, onOpenContract }) {
  const { STAGES, VENDOR_BADGE } = window.CM;
  return (
    <div className="vmodal">
      <div className="vmodal__statusline">
        <Badge status={VENDOR_BADGE[row.status]}>{row.status}</Badge>
        <span className="vmodal__since">Vendor since {row.since}</span>
      </div>
      <p className="vmodal__note">{row.note}</p>

      <div className="vmodal__facts">
        <div className="fact"><span className="fact__k">Primary contact</span><span className="fact__v">{row.contact}</span></div>
        <div className="fact"><span className="fact__k">Email</span><span className="fact__v">{row.email}</span></div>
        <div className="fact"><span className="fact__k">Phone</span><span className="fact__v">{row.phone}</span></div>
        <div className="fact"><span className="fact__k">Location</span><span className="fact__v">{row.location}</span></div>
        <div className="fact"><span className="fact__k">Primary category</span><span className="fact__v">{row.category}</span></div>
      </div>

      <div className="vmodal__section">
        <p className="vmodal__sectiontitle">Contracts in Contract Manager ({row.count})</p>
        {row.contracts.length === 0 ? (
          <p className="vmodal__empty">No contracts on record for this vendor.</p>
        ) : (
          <div className="vmodal__contracts">
            {row.contracts.map((c) => (
              <button className="vmodal-contract" key={c.num} onClick={() => onOpenContract(c)}>
                <span className="vmodal-contract__main">
                  <span className="vmodal-contract__title">{c.title}</span>
                  <span className="vmodal-contract__num">{c.num}</span>
                </span>
                <Badge status={STAGES[c.stage].status}>{STAGES[c.stage].label}</Badge>
                <i className="ph ph-arrow-right vmodal-contract__go" aria-hidden="true"></i>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="vmodal__scope"><i className="ph ph-info" aria-hidden="true"></i>Full vendor history, documents, and contacts live in the Vendor Detail screen — outside this prototype.</p>
    </div>
  );
}

function VendorScreen({ contracts, onOpenContract }) {
  const { VENDORS, VENDOR_BADGE, VENDOR_STATUS_ORDER, CLOSED_STAGES } = window.CM;
  const all = contracts || window.CM.CONTRACTS;

  const rows = useMemo(() => Object.keys(VENDORS).map((name) => {
    const v = VENDORS[name];
    const cs = all.filter((c) => c.vendor === name);
    const active = cs.filter((c) => !CLOSED_STAGES.includes(c.stage)).length;
    const value = cs.reduce((s, c) => s + c.value, 0);
    return { name, ...v, contracts: cs, count: cs.length, active, value };
  }), [all]);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });
  const [open, setOpen] = useState(null);

  const counts = useMemo(() => {
    const c = { all: rows.length };
    VENDOR_STATUS_ORDER.forEach((s) => { c[s] = rows.filter((r) => r.status === s).length; });
    return c;
  }, [rows]);

  const onSort = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));

  const view = useMemo(() => {
    let r = rows.slice();
    if (filter !== 'all') r = r.filter((x) => x.status === filter);
    const q = query.trim().toLowerCase();
    if (q) r = r.filter((x) => (x.name + ' ' + x.contact + ' ' + x.email).toLowerCase().includes(q));
    const dir = sort.dir === 'asc' ? 1 : -1;
    r.sort((a, b) => {
      let av, bv;
      if (sort.key === 'status') { av = VENDOR_STATUS_ORDER.indexOf(a.status); bv = VENDOR_STATUS_ORDER.indexOf(b.status); }
      else if (sort.key === 'count') { av = a.count; bv = b.count; }
      else if (sort.key === 'value') { av = a.value; bv = b.value; }
      else if (sort.key === 'location') { av = a.location.toLowerCase(); bv = b.location.toLowerCase(); }
      else { av = a[sort.key].toLowerCase(); bv = b[sort.key].toLowerCase(); }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return r;
  }, [rows, filter, query, sort]);

  const pills = [{ id: 'all', label: 'All vendors' }, ...VENDOR_STATUS_ORDER.map((s) => ({ id: s, label: s }))];

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-head__title">Vendors</h1>
          <p className="page-head__sub">The firm's vendor master — status, contacts, and contract footprint across Event, Facilities, and IT.</p>
        </div>
      </div>

      <div className="vfilter" role="group" aria-label="Filter vendors by status">
        {pills.map((p) => (
          <button key={p.id} className={`vfilter__pill${filter === p.id ? ' is-active' : ''}`} aria-pressed={filter === p.id} onClick={() => setFilter(p.id)}>
            {p.id !== 'all' ? <span className={`vstatus-dot vstatus-dot--${p.id.toLowerCase()}`} aria-hidden="true"></span> : null}
            {p.label}
            <span className="vfilter__count">{counts[p.id]}</span>
          </button>
        ))}
      </div>

      <div className="table-toolbar">
        <div className="table-search">
          <i className="ph ph-magnifying-glass" aria-hidden="true"></i>
          <input type="search" placeholder="Search vendors or contacts" aria-label="Search vendors" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <span className="table-meta">{view.length} of {counts.all} vendors</span>
      </div>

      <div className="table-shell">
        <table className="data-table vendor-table">
          <thead>
            <tr>
              <VSortHead label="Vendor" sortKey="name" sort={sort} onSort={onSort} />
              <VSortHead label="Status" sortKey="status" sort={sort} onSort={onSort} />
              <VSortHead label="Primary contact" sortKey="contact" sort={sort} onSort={onSort} />
              <VSortHead label="Location" sortKey="location" sort={sort} onSort={onSort} />
              <VSortHead label="Contracts" sortKey="count" sort={sort} onSort={onSort} numeric />
              <VSortHead label="Total value" sortKey="value" sort={sort} onSort={onSort} numeric />
              <th style={{ width: 44 }} aria-label="Open"></th>
            </tr>
          </thead>
          <tbody>
            {view.length === 0 ? (
              <tr className="empty-row"><td colSpan="7">No vendors match this view. Clear the filter or search to see all vendors.</td></tr>
            ) : view.map((r) => (
              <tr key={r.name} onClick={() => setOpen(r)}>
                <td><span className="cell-name">{r.name}<span className="cell-num cell-num--sans">{r.category}</span></span></td>
                <td><Badge status={VENDOR_BADGE[r.status]}>{r.status}</Badge></td>
                <td><span className="vendor-contact"><span className="vendor-contact__name">{r.contact}</span><span className="vendor-contact__email">{r.email}</span></span></td>
                <td>{r.location}</td>
                <td style={{ textAlign: 'right' }}><span className="vendor-count">{r.active}<span className="vendor-count__sub"> active · {r.count} total</span></span></td>
                <td style={{ textAlign: 'right' }} className="cell-mono">{vFmtUSD(r.value)}</td>
                <td><IconButton icon="arrow-right" size="sm" aria-label={`Open ${r.name}`} onClick={(e) => { e.stopPropagation(); setOpen(r); }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? open.name : ''}
             actions={<Button variant="secondary" onClick={() => setOpen(null)}>Close</Button>}>
        {open ? <VendorModalBody row={open} onOpenContract={(c) => { setOpen(null); onOpenContract && onOpenContract(c); }} /> : null}
      </Modal>
    </div>
  );
}

window.VendorScreen = VendorScreen;
