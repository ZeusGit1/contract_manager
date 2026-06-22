import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  activeContracts,
  daysFromTodayLocal,
  isContractOverdue,
  isDueThisWeek,
  isWaitingOnLane,
  needsAction,
  nextActionDue,
} from '@/lib/phase1Data';
import {
  LANE_DEFS,
  ME,
  isLaneOpen,
  ownerByName,
  PROCUREMENT_OWNERS,
  type Phase1Contract,
} from '@/types/phase1';
import { formatShortDate } from '@/lib/formatters';

import styles from './Phase1.module.css';

type TileId = 'all' | 'action' | 'overdue' | 'week' | 'vendor' | 'requester' | 'signature';

type SortKey = 'title' | 'vendor' | 'requester' | 'owner' | 'category' | 'priority' | 'nextDue';
type SortDir = 'asc' | 'desc';

const CATEGORY_ICON: Record<string, string> = {
  Event: 'ticket',
  Facilities: 'wrench',
  IT: 'desktop',
};

const TILES: { id: TileId; label: string; icon: string; cls: string }[] = [
  { id: 'all', label: 'Active contracts', icon: 'list', cls: 'tileAll' },
  { id: 'action', label: 'Needs your action', icon: 'flag', cls: 'tileAction' },
  { id: 'overdue', label: 'Overdue items', icon: 'warning-circle', cls: 'tileOverdue' },
  { id: 'week', label: 'Due this week', icon: 'calendar-blank', cls: 'tileWeek' },
  { id: 'vendor', label: 'Waiting on vendor', icon: 'paper-plane-tilt', cls: 'tileVendor' },
  { id: 'requester', label: 'Waiting on requester', icon: 'user', cls: 'tileRequester' },
  { id: 'signature', label: 'Waiting on signature', icon: 'signature', cls: 'tileSignature' },
];

interface DashboardScreenProps {
  view?: 'mine' | 'master';
}

export function DashboardScreen({ view = 'mine' }: DashboardScreenProps) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: 'nextDue',
    dir: 'asc',
  });

  const tile = (params.get('tile') as TileId) || 'all';
  const query = params.get('q') || '';

  const base = useMemo<Phase1Contract[]>(() => {
    const rows = activeContracts();
    return view === 'mine' ? rows.filter((c) => c.owner === ME.name) : rows;
  }, [view]);

  const counts = useMemo(
    () => ({
      all: base.length,
      action: base.filter(needsAction).length,
      overdue: base.filter(isContractOverdue).length,
      week: base.filter(isDueThisWeek).length,
      vendor: base.filter((c) => isWaitingOnLane(c, 'vendor')).length,
      requester: base.filter((c) => isWaitingOnLane(c, 'requester')).length,
      signature: base.filter((c) => isWaitingOnLane(c, 'signature')).length,
    }),
    [base],
  );

  const filtered = useMemo(() => {
    let rows = base;
    if (tile === 'action') rows = rows.filter(needsAction);
    else if (tile === 'overdue') rows = rows.filter(isContractOverdue);
    else if (tile === 'week') rows = rows.filter(isDueThisWeek);
    else if (tile === 'vendor') rows = rows.filter((c) => isWaitingOnLane(c, 'vendor'));
    else if (tile === 'requester') rows = rows.filter((c) => isWaitingOnLane(c, 'requester'));
    else if (tile === 'signature') rows = rows.filter((c) => isWaitingOnLane(c, 'signature'));

    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((c) =>
        `${c.title} ${c.vendor} ${c.num} ${c.requester} ${c.owner}`.toLowerCase().includes(q),
      );
    }
    return sortRows(rows, sort);
  }, [base, tile, query, sort]);

  const onTile = (id: TileId) => {
    const next = new URLSearchParams(params);
    if (id === 'all') next.delete('tile');
    else next.set('tile', id);
    setParams(next);
  };
  const onSearch = (value: string) => {
    const next = new URLSearchParams(params);
    if (value === '') next.delete('q');
    else next.set('q', value);
    setParams(next);
  };
  const onSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' },
    );

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>{view === 'mine' ? 'My dashboard' : 'Master view'}</h1>
          <p className={styles.subtitle}>
            {view === 'mine'
              ? 'Contracts you own.'
              : 'All active contracts across the procurement team.'}{' '}
            Focused on next-action due dates, not contract expirations.
          </p>
        </div>
        <div className={styles.headActions}>
          <ViewToggle
            current={view}
            onSwitch={(target) => navigate(target === 'mine' ? '/' : '/master')}
          />
          <button className="btn btn--secondary" onClick={() => navigate('/bulk-upload')}>
            <i className="ph ph-upload-simple" aria-hidden="true" />
            Bulk upload
          </button>
          <button className="btn" onClick={() => navigate('/new-contract/category')}>
            <i className="ph ph-plus" aria-hidden="true" />
            New contract
          </button>
        </div>
      </header>

      <div className={styles.banner}>
        <i className="ph ph-info" aria-hidden="true" />
        <span>
          <strong>Phase 1 prototype.</strong> Synthetic data. This tool <em>tracks</em> reviews — it
          does not replace the Tuesday / Thursday risk-review calls where InfoSec, Privacy, GCO, and
          Legal give approvals verbally. Procurement records the outcomes here.
        </span>
      </div>

      <div className={styles.tileRow} role="group" aria-label="Filter by what needs attention">
        {TILES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`${styles.tile} ${styles[t.cls]} ${tile === t.id ? styles.tileActive : ''}`}
            onClick={() => onTile(t.id)}
            aria-pressed={tile === t.id}
          >
            <div className={styles.tileTop}>
              <span className={styles.tileCount}>{counts[t.id]}</span>
              <i className={`ph ph-${t.icon} ${styles.tileIcon}`} aria-hidden="true" />
            </div>
            <span className={styles.tileLabel}>{t.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.legend} aria-label="Procurement owner color key">
        {PROCUREMENT_OWNERS.map((o) => (
          <span key={o.name} className={styles.legendItem}>
            <span
              className={styles.legendSwatch}
              style={{ background: `var(--owner-${o.tone})` }}
              aria-hidden="true"
            />
            {o.name}
            {o.isMe ? ' (you)' : ''}
          </span>
        ))}
        <span className={styles.legendItem}>
          <span
            className={styles.legendSwatch}
            style={{ background: 'color-mix(in srgb, var(--color-pale-orange) 60%, transparent)' }}
            aria-hidden="true"
          />
          Overdue lane
        </span>
      </div>

      <div className={styles.toolbar}>
        <label className={styles.searchWrap}>
          <i className="ph ph-magnifying-glass" aria-hidden="true" />
          <span className="visually-hidden">Search</span>
          <input
            type="search"
            placeholder="Search title, vendor, requester, or owner"
            value={query}
            onChange={(e) => onSearch(e.target.value)}
          />
        </label>
        <span className={styles.resultCount}>
          {filtered.length} of {base.length} contracts
        </span>
      </div>

      <ContractTable
        rows={filtered}
        sort={sort}
        onSort={onSort}
        onOpen={(num) => navigate(`/contracts/${num}`)}
      />
    </div>
  );
}

function ViewToggle({
  current,
  onSwitch,
}: {
  current: 'mine' | 'master';
  onSwitch: (target: 'mine' | 'master') => void;
}) {
  return (
    <div className={styles.viewToggle} role="tablist" aria-label="Dashboard view">
      <button
        type="button"
        role="tab"
        aria-selected={current === 'mine'}
        className={current === 'mine' ? styles.viewToggleActive : ''}
        onClick={() => onSwitch('mine')}
      >
        My dashboard
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={current === 'master'}
        className={current === 'master' ? styles.viewToggleActive : ''}
        onClick={() => onSwitch('master')}
      >
        Master view
      </button>
    </div>
  );
}

interface ContractTableProps {
  rows: Phase1Contract[];
  sort: { key: SortKey; dir: SortDir };
  onSort: (key: SortKey) => void;
  onOpen: (num: string) => void;
}

function ContractTable({ rows, sort, onSort, onOpen }: ContractTableProps) {
  const headers: { key: SortKey; label: string }[] = [
    { key: 'title', label: 'Contract' },
    { key: 'vendor', label: 'Vendor' },
    { key: 'requester', label: 'Requester' },
    { key: 'owner', label: 'Procurement owner' },
    { key: 'category', label: 'Category' },
    { key: 'priority', label: 'Priority' },
    { key: 'nextDue', label: 'Next due' },
  ];
  return (
    <div className={styles.tableShell}>
      <table className={styles.table}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h.key} aria-sort={sortAriaFor(sort, h.key)}>
                <button type="button" className={styles.sortBtn} onClick={() => onSort(h.key)}>
                  <span>{h.label}</span>
                  <i className={`ph ph-${sortIconFor(sort, h.key)}`} aria-hidden="true" />
                </button>
              </th>
            ))}
            <th>Overall</th>
            <th>Active lanes</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr className={styles.emptyRow}>
              <td colSpan={9}>No contracts match this view.</td>
            </tr>
          ) : (
            rows.map((c) => <ContractRow key={c.num} c={c} onOpen={onOpen} />)
          )}
        </tbody>
      </table>
    </div>
  );
}

function ContractRow({ c, onOpen }: { c: Phase1Contract; onOpen: (num: string) => void }) {
  const owner = ownerByName(c.owner);
  const ownerCls = owner ? styles[`owner${owner.tone}`] : '';
  const overdue = isContractOverdue(c);
  const needs = needsAction(c);
  const closed = c.overallStatus !== 'active';
  const clsList = [
    styles.bodyRow,
    ownerCls,
    overdue ? styles.rowOverdue : '',
    needs ? styles.rowNeedsAction : '',
    closed ? styles.rowClosed : '',
  ]
    .filter(Boolean)
    .join(' ');

  const nextDueIso = nextActionDue(c);
  const dueDays = daysFromTodayLocal(nextDueIso);
  const dueOverdue = dueDays != null && dueDays < 0;
  // Phase 1 open question: "due soon" thresholds vary by contract — Lisa to confirm.
  // Until then, we only flag overdue (red). The date itself is always shown.
  const overall = overallStateLabel(c);

  const onOpenStable = () => onOpen(c.num);

  return (
    <tr className={clsList} onClick={onOpenStable}>
      <td>
        <div className={styles.contractName}>
          <span>{c.title}</span>
          <span className={styles.contractNumber}>{c.num}</span>
        </div>
      </td>
      <td>{c.vendor}</td>
      <td>{c.requester}</td>
      <td>
        <span className={styles.cellStack}>
          {owner ? (
            <span
              className={`${styles.ownerDot} ${styles[`ownerDot${owner.tone}`]}`}
              aria-hidden="true"
            />
          ) : null}{' '}
          {c.owner}
        </span>
      </td>
      <td>
        <span className={styles.cat}>
          <i className={`ph ph-${CATEGORY_ICON[c.category]}`} aria-hidden="true" />
          {c.category}
        </span>
      </td>
      <td>
        <PriorityBadge priority={c.priority} />
      </td>
      <td>
        {nextDueIso ? (
          <span className={`${styles.due} ${dueOverdue ? styles.dueOverdue : ''}`}>
            {dueOverdue ? <i className="ph ph-warning-circle" aria-hidden="true" /> : null}
            {formatShortDate(nextDueIso)}
            {dueOverdue ? ` (${-(dueDays as number)}d late)` : ''}
          </span>
        ) : (
          '—'
        )}
      </td>
      <td>
        <span className={styles.priority}>{overall}</span>
      </td>
      <td>
        <LanePills c={c} />
      </td>
    </tr>
  );
}

function LanePills({ c }: { c: Phase1Contract }) {
  const open = c.lanes.filter(isLaneOpen);
  const visible = open.slice(0, 4);
  const extra = open.length - visible.length;
  return (
    <div className={styles.lanePills}>
      {visible.map((lane) => {
        const def = LANE_DEFS.find((l) => l.id === lane.id);
        const pillCls = laneStatusClass(lane.status);
        return (
          <span key={lane.id} className={`${styles.lanePill} ${pillCls}`}>
            <span className={styles.lanePill__dot} aria-hidden="true" />
            {def?.label}
          </span>
        );
      })}
      {extra > 0 ? (
        <span className={`${styles.lanePill} ${styles.lanePillNotStarted}`}>+{extra}</span>
      ) : null}
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

function laneStatusClass(status: string): string {
  const map: Record<string, string> = {
    in_review: styles.lanePillInReview,
    waiting: styles.lanePillWaiting,
    approved: styles.lanePillApproved,
    rejected: styles.lanePillRejected,
    complete: styles.lanePillComplete,
    not_started: styles.lanePillNotStarted,
    na: styles.lanePillNa,
    approved_conditions: styles.lanePillApprovedConditions,
  };
  return map[status] ?? '';
}

function overallStateLabel(c: Phase1Contract): string {
  if (c.overallStatus === 'completed') return 'Completed';
  if (c.overallStatus === 'canceled') return 'Canceled';
  const open = c.lanes
    .filter(isLaneOpen)
    .map((l) => LANE_DEFS.find((d) => d.id === l.id)?.label)
    .filter(Boolean) as string[];
  if (open.length === 0) return 'Ready to file';
  if (open.length === 1) return `With ${open[0]}`;
  return `In review · ${open.length} lanes`;
}

function sortRows(rows: Phase1Contract[], sort: { key: SortKey; dir: SortDir }): Phase1Contract[] {
  const dir = sort.dir === 'asc' ? 1 : -1;
  const out = rows.slice();
  out.sort((a, b) => {
    let av: string | number = '';
    let bv: string | number = '';
    switch (sort.key) {
      case 'title':
        av = a.title.toLowerCase();
        bv = b.title.toLowerCase();
        break;
      case 'vendor':
        av = a.vendor.toLowerCase();
        bv = b.vendor.toLowerCase();
        break;
      case 'requester':
        av = a.requester.toLowerCase();
        bv = b.requester.toLowerCase();
        break;
      case 'owner':
        av = a.owner.toLowerCase();
        bv = b.owner.toLowerCase();
        break;
      case 'category':
        av = a.category;
        bv = b.category;
        break;
      case 'priority': {
        const P: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        av = P[a.priority];
        bv = P[b.priority];
        break;
      }
      case 'nextDue':
        av = nextActionDue(a) ?? '9999-12-31';
        bv = nextActionDue(b) ?? '9999-12-31';
        break;
    }
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
  return out;
}

function sortIconFor(sort: { key: SortKey; dir: SortDir }, key: SortKey): string {
  if (sort.key !== key) return 'caret-up-down';
  return sort.dir === 'asc' ? 'caret-up' : 'caret-down';
}

function sortAriaFor(
  sort: { key: SortKey; dir: SortDir },
  key: SortKey,
): 'ascending' | 'descending' | 'none' {
  if (sort.key !== key) return 'none';
  return sort.dir === 'asc' ? 'ascending' : 'descending';
}
