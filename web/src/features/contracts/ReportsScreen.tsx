import { PHASE1_CONTRACTS } from '@/lib/phase1Data';
import { ME, PROCUREMENT_OWNERS, type Phase1Contract } from '@/types/phase1';

import styles from './Phase1.module.css';

export function ReportsScreen() {
  const all = PHASE1_CONTRACTS;
  const active = all.filter((c) => c.overallStatus === 'active');
  const completed = all.filter((c) => c.overallStatus === 'completed');
  const canceled = all.filter((c) => c.overallStatus === 'canceled');
  const reviewedYTD = active.length + completed.length + canceled.length;
  const myActive = active.filter((c) => c.owner === ME.name).length;

  const byCategory = (rows: Phase1Contract[]) => {
    const out: Record<string, number> = { Event: 0, Facilities: 0, IT: 0 };
    rows.forEach((c) => {
      out[c.category] = (out[c.category] || 0) + 1;
    });
    return out;
  };

  const allByCat = byCategory(all);
  const activeByCat = byCategory(active);
  const byOwner = PROCUREMENT_OWNERS.map((o) => ({
    owner: o,
    active: active.filter((c) => c.owner === o.name).length,
    completed: completed.filter((c) => c.owner === o.name).length,
  }));

  const maxOwner = Math.max(1, ...byOwner.map((b) => b.active));
  const maxCat = Math.max(1, ...Object.values(activeByCat));

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Reports</h1>
          <p className={styles.subtitle}>
            Snapshot for Lisa&rsquo;s annual review, leadership rollups (Tenvir, Michael Shea), and
            rush-request pushback. Synthetic data.
          </p>
        </div>
      </header>

      <div className={styles.banner}>
        <i className="ph ph-info" aria-hidden="true" />
        <span>
          Phase 1 reports cover counts and current load. Time-to-close and SLA dashboards come in
          Phase 2.
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
          gap: 'var(--space-3)',
        }}
      >
        <Kpi label="Contracts reviewed YTD" value={reviewedYTD} sub="Across all owners" />
        <Kpi
          label="Active right now"
          value={active.length}
          sub="Push back on rush requests with this"
        />
        <Kpi label="My active" value={myActive} sub={ME.name} />
        <Kpi label="Completed YTD" value={completed.length} />
        <Kpi label="Canceled YTD" value={canceled.length} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
          gap: 'var(--space-5)',
        }}
      >
        <Card title="Active by category">
          <Bar label="Event" value={activeByCat.Event} max={maxCat} />
          <Bar label="Facilities" value={activeByCat.Facilities} max={maxCat} />
          <Bar label="IT" value={activeByCat.IT} max={maxCat} />
        </Card>
        <Card title="Active by procurement owner">
          {byOwner.map((b) => (
            <Bar
              key={b.owner.name}
              label={`${b.owner.name}${b.owner.isMe ? ' (you)' : ''}`}
              value={b.active}
              max={maxOwner}
            />
          ))}
        </Card>
      </div>

      <Card title="All-time totals by category">
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}
        >
          <Total label="Event" value={allByCat.Event} />
          <Total label="Facilities" value={allByCat.Facilities} />
          <Total label="IT" value={allByCat.IT} />
        </div>
      </Card>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius)',
        padding: 'var(--space-4)',
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--text-secondary)',
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-mix)', fontSize: 36, lineHeight: 1.1, marginTop: 6 }}>
        {value}
      </div>
      {sub ? (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{sub}</div>
      ) : null}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius)',
        padding: 'var(--space-5)',
      }}
    >
      <p
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--text-secondary)',
          margin: '0 0 var(--space-3)',
          fontWeight: 600,
        }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div style={{ marginBottom: 'var(--space-3)' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 13,
          marginBottom: 4,
        }}
      >
        <span>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)' }}>{value}</span>
      </div>
      <div
        style={{
          height: 8,
          background: 'var(--bg-page)',
          borderRadius: 'var(--radius-pill)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: 'var(--accent-interactive)',
            borderRadius: 'var(--radius-pill)',
          }}
        />
      </div>
    </div>
  );
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--text-secondary)',
          fontWeight: 600,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-mix)', fontSize: 28 }}>{value}</div>
    </div>
  );
}
