import { useMemo } from 'react';

import { apiRowToPhase1Contract } from '@/lib/phase1Data';
import type { Phase1Contract } from '@/types/phase1';
import { formatFullDate } from '@/lib/formatters';
import { Card } from '@/mws/Card';
import { Kpi } from '@/mws/Kpi';
import { useContractList } from './hooks';

import styles from './Phase1.module.css';

export function ReportsScreen() {
  // Server-side view scoping — 'master' returns everything the caller can see across the team.
  const listQuery = useContractList({ view: 'master' });

  const all = useMemo(
    () => (listQuery.data?.items ?? []).map(apiRowToPhase1Contract),
    [listQuery.data],
  );

  const active = all.filter((c) => c.overallStatus === 'active');
  const completed = all.filter((c) => c.overallStatus === 'completed');
  const canceled = all.filter((c) => c.overallStatus === 'canceled');
  const reviewedYTD = active.length + completed.length + canceled.length;

  const byCategory = (rows: Phase1Contract[]) => {
    const out: Record<string, number> = { Event: 0, Facilities: 0, IT: 0 };
    rows.forEach((c) => {
      out[c.category] = (out[c.category] || 0) + 1;
    });
    return out;
  };

  const allByCat = byCategory(all);
  const activeByCat = byCategory(active);

  const owners = useMemo(() => {
    const buckets = new Map<string, { active: number; completed: number }>();
    for (const c of all) {
      const key = c.owner || 'Unassigned';
      const bucket = buckets.get(key) ?? { active: 0, completed: 0 };
      if (c.overallStatus === 'active') bucket.active++;
      else if (c.overallStatus === 'completed') bucket.completed++;
      buckets.set(key, bucket);
    }
    return Array.from(buckets.entries())
      .map(([name, counts]) => ({ name, ...counts }))
      .sort((a, b) => b.active - a.active);
  }, [all]);

  const maxOwner = Math.max(1, ...owners.map((o) => o.active));
  const maxCat = Math.max(1, ...Object.values(activeByCat));

  const now = new Date();
  const yearToDateLabel = `YTD · Jan 1 – ${formatFullDate(now.toISOString())} (${now.getFullYear()})`;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Reports</h1>
          <p className={styles.subtitle}>{yearToDateLabel}</p>
        </div>
      </header>

      {listQuery.error ? (
        <div className={styles.banner} role="alert">
          <i className="ph ph-warning-circle" aria-hidden="true" />
          <span>Couldn&apos;t load reports. Refresh to try again.</span>
        </div>
      ) : null}

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
        <Card eyebrow="Active by category">
          <Bar label="Event" value={activeByCat.Event} max={maxCat} />
          <Bar label="Facilities" value={activeByCat.Facilities} max={maxCat} />
          <Bar label="IT" value={activeByCat.IT} max={maxCat} />
        </Card>
        <Card eyebrow="Active by procurement owner">
          {owners.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No active contracts yet.</p>
          ) : (
            owners.map((o) => <Bar key={o.name} label={o.name} value={o.active} max={maxOwner} />)
          )}
        </Card>
      </div>

      <Card eyebrow="All-time totals by category">
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
