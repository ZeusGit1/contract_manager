// DashboardScreen (S2) — Procurement's daily landing: triage strip + active-contracts table.
const { useState, useMemo } = React;
const { Badge, Button } = window.McDermottDesignSystem_b80d20;

const fmtUSD = (n) => '$' + n.toLocaleString('en-US');
const fmtShort = (iso) => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : '—';
const daysFromToday = (iso) => iso ? Math.round((new Date(iso + 'T00:00:00') - new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00')) / 86400000) : null;

function NextDueCell({ iso, stage }) {
  if (!iso) return <span className="reviewer--none">—</span>;
  const d = daysFromToday(iso);
  const overdue = d < 0 && !['canceled', 'terminated', 'completed'].includes(stage);
  return (
    <span className={`due${overdue ? ' due--soon' : ''}`}>
      {overdue ? <i className="ph ph-warning-circle" aria-hidden="true"></i> : null}
      {fmtShort(iso)}
    </span>
  );
}

function SortHead({ label, sortKey, sort, onSort, numeric }) {
  const active = sort.key === sortKey;
  return (
    <th
      className="sortable"
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      onClick={() => onSort(sortKey)}
      style={numeric ? { textAlign: 'right' } : null}
    >
      <span className="th-inner" style={numeric ? { flexDirection: 'row-reverse' } : null}>
        {label}
        <i className={`ph ph-${active ? (sort.dir === 'asc' ? 'caret-up' : 'caret-down') : 'caret-up-down'}`} aria-hidden="true"></i>
      </span>
    </th>
  );
}

function ExpiresCell({ days, stage }) {
  if (stage === 'expired' || (days != null && days < 0)) {
    return <span className="due due--soon"><i className="ph ph-warning-circle" aria-hidden="true"></i>Expired</span>;
  }
  if (stage === 'canceled' || stage === 'terminated') return <span className="reviewer--none">—</span>;
  if (days == null) return <span className="reviewer--none">Not executed</span>;
  const soon = days <= 14;
  return (
    <span className={`due${soon ? ' due--soon' : ''}`}>
      {soon ? <i className="ph ph-warning-circle" aria-hidden="true"></i> : null}
      in {days} {days === 1 ? 'day' : 'days'}
    </span>
  );
}

function DashboardScreen({ onOpenContract, onNavigate, tweaks, extra }) {
  const { STAGES, CATEGORIES, STAGE_RANK, REVIEW_STAGES, EXCEPTION_STAGES } = window.CM;
  const CONTRACTS = useMemo(() => [...(extra || []), ...window.CM.CONTRACTS], [extra]);
  const { density = 'regular', showTriage = true, showNumbers = true, showTeam = true } = tweaks || {};

  // Always current date, formatted "Weekday, D Month".
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long' })
    + ', ' + now.getDate() + ' ' + now.toLocaleDateString('en-US', { month: 'long' });
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState({ key: 'default', dir: 'asc' });

  const isExpiring = (c) => c.expiresDays != null && c.expiresDays >= 0 && c.expiresDays <= 14 && c.stage !== 'expired';
  const counts = useMemo(() => ({
    all: CONTRACTS.length,
    action: CONTRACTS.filter((c) => c.attention).length,
    review: CONTRACTS.filter((c) => REVIEW_STAGES.includes(c.stage)).length,
    sign: CONTRACTS.filter((c) => c.stage === 'out_for_signature').length,
    expiring: CONTRACTS.filter(isExpiring).length,
    closed: CONTRACTS.filter((c) => EXCEPTION_STAGES.includes(c.stage)).length,
  }), [CONTRACTS]);

  const onSort = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));

  const dateMap = useMemo(() => {
    const m = {};
    CONTRACTS.forEach((c) => { m[c.num] = window.CM.actionDates(c); });
    return m;
  }, [CONTRACTS]);

  const rows = useMemo(() => {
    let r = CONTRACTS.slice();
    if (filter === 'action') r = r.filter((c) => c.attention);
    else if (filter === 'review') r = r.filter((c) => REVIEW_STAGES.includes(c.stage));
    else if (filter === 'sign') r = r.filter((c) => c.stage === 'out_for_signature');
    else if (filter === 'expiring') r = r.filter(isExpiring);
    else if (filter === 'closed') r = r.filter((c) => EXCEPTION_STAGES.includes(c.stage));

    const q = query.trim().toLowerCase();
    if (q) r = r.filter((c) => (c.title + ' ' + c.vendor + ' ' + c.num).toLowerCase().includes(q));

    if (sort.key !== 'default') {
      const dir = sort.dir === 'asc' ? 1 : -1;
      r.sort((a, b) => {
        let av, bv;
        if (sort.key === 'value') { av = a.value; bv = b.value; }
        else if (sort.key === 'expires') { av = a.expiresDays == null ? Infinity : a.expiresDays; bv = b.expiresDays == null ? Infinity : b.expiresDays; }
        else if (sort.key === 'stage') { av = STAGE_RANK[a.stage]; bv = STAGE_RANK[b.stage]; }
        else if (sort.key === 'lastAction') { av = dateMap[a.num].lastActionISO || ''; bv = dateMap[b.num].lastActionISO || ''; }
        else if (sort.key === 'nextDue') { av = dateMap[a.num].nextDueISO || '9999-12-31'; bv = dateMap[b.num].nextDueISO || '9999-12-31'; }
        else if (sort.key === 'reviewer') { av = (a.reviewer || '\uffff').toLowerCase(); bv = (b.reviewer || '\uffff').toLowerCase(); }
        else { av = (a[sort.key] || '').toLowerCase(); bv = (b[sort.key] || '').toLowerCase(); }
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      });
    }
    return r;
  }, [CONTRACTS, filter, query, sort, dateMap]);

  const chips = [
    { id: 'all', label: 'All active', count: counts.all, dot: null },
    { id: 'action', label: 'Needs your action', count: counts.action, dot: 'action' },
    { id: 'review', label: 'In attorney review', count: counts.review, dot: 'review' },
    { id: 'sign', label: 'Awaiting signature', count: counts.sign, dot: 'sign' },
    { id: 'expiring', label: 'Expiring ≤ 14 days', count: counts.expiring, dot: 'expiring' },
    { id: 'closed', label: 'On hold & closed', count: counts.closed, dot: 'closed' },
  ];

  return (
    <div className={`density-${density}`}>
      <div className="page-head">
        <div>
          <h1 className="page-head__title">Active contracts</h1>
          <p className="page-head__sub">{dateStr} · everything in flight across Event, Facilities, and IT.</p>
        </div>
        <div className="page-head__actions">
          <Button variant="secondary" icon="upload-simple" onClick={() => onNavigate && onNavigate('bulk')}>Bulk upload</Button>
          <Button variant="primary" icon="plus" onClick={() => onNavigate && onNavigate('intake')}>New contract</Button>
        </div>
      </div>

      {showTriage ? <div className="triage" role="group" aria-label="Filter contracts by what needs attention">
        {chips.map((c) => (
          <button
            key={c.id}
            className={`triage__chip${c.dot === 'action' ? ' attention' : ''}${filter === c.id ? ' is-active' : ''}`}
            aria-pressed={filter === c.id}
            onClick={() => setFilter(c.id)}
          >
            <div className="triage__top">
              <span className="triage__count">{c.count}</span>
              {c.dot ? <span className={`triage__dot triage__dot--${c.dot}`} aria-hidden="true"></span> : null}
            </div>
            <span className="triage__label">{c.label}</span>
          </button>
        ))}
      </div> : null}

      <div className="table-toolbar">
        <div className="table-search">
          <i className="ph ph-magnifying-glass" aria-hidden="true"></i>
          <input type="search" placeholder="Search contracts, vendors, or numbers" aria-label="Search contracts" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <span className="table-meta">{rows.length} of {counts.all} contracts</span>
      </div>

      <div className="table-shell">
        <table className="data-table">
          <thead>
            <tr>
              <th className="col-flag" aria-label="Attention"></th>
              <SortHead label="Contract" sortKey="title" sort={sort} onSort={onSort} />
              <SortHead label="Vendor" sortKey="vendor" sort={sort} onSort={onSort} />
              <SortHead label="Category" sortKey="category" sort={sort} onSort={onSort} />
              <SortHead label="Stage" sortKey="stage" sort={sort} onSort={onSort} />
              <SortHead label="Reviewer" sortKey="reviewer" sort={sort} onSort={onSort} />
              <SortHead label="Value" sortKey="value" sort={sort} onSort={onSort} numeric />
              <SortHead label="Expires" sortKey="expires" sort={sort} onSort={onSort} />
              <SortHead label="Last action" sortKey="lastAction" sort={sort} onSort={onSort} />
              <SortHead label="Next due" sortKey="nextDue" sort={sort} onSort={onSort} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className="empty-row"><td colSpan="10">No contracts match this view. Clear the filter or search to see all active contracts.</td></tr>
            ) : rows.map((c) => {
              const stage = STAGES[c.stage];
              const cat = CATEGORIES[c.category];
              return (
                <tr key={c.num} onClick={() => onOpenContract && onOpenContract(c)} title={c.attention ? c.action : undefined}>
                  <td className="col-flag">
                    <span className="flag-slot">{c.attention ? <span className="flag-dot" aria-label="Needs attention"></span> : null}</span>
                  </td>
                  <td>
                    <span className="cell-name">{c.title}{showNumbers ? <span className="cell-num">{c.num}</span> : null}</span>
                  </td>
                  <td>{c.vendor}</td>
                  <td><span className="cat"><i className={`ph ph-${cat.icon}`} aria-hidden="true"></i>{c.category}</span></td>
                  <td><Badge status={stage.status}>{stage.label}</Badge></td>
                  <td>
                    {c.reviewer
                      ? <span className="reviewer__txt"><span className="reviewer__name">{c.reviewer}</span>{showTeam ? <span className="reviewer__team">{c.team}</span> : null}</span>
                      : <span className="reviewer--none">Unassigned</span>}
                  </td>
                  <td style={{ textAlign: 'right' }} className="cell-mono">{fmtUSD(c.value)}</td>
                  <td><ExpiresCell days={c.expiresDays} stage={c.stage} /></td>
                  <td><span className="cell-date">{fmtShort(dateMap[c.num].lastActionISO)}</span></td>
                  <td><NextDueCell iso={dateMap[c.num].nextDueISO} stage={c.stage} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

window.DashboardScreen = DashboardScreen;
