import { Badge } from '@/mws/Badge';
import styles from './RenewalsScreen.module.css';

/**
 * Renewals screen — Coming Soon stub per ADR-038.
 *
 * The route at /renewals is reserved so the sidebar entry has a destination. The actual
 * renewal report (TermEndDate within N days, in-flight-renewal detection) is deferred to
 * a later phase; Reports' Active KPI tiles + Archive search cover near-term needs.
 *
 * This screen does NOT call the API and has no data state — it's intentionally static.
 */
export function RenewalsScreen() {
  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1>Renewals</h1>
      </header>

      <section className={styles.card} aria-labelledby="renewals-stub-title">
        <Badge status="pending">Coming soon</Badge>
        <h2 id="renewals-stub-title" className={styles.title}>
          Renewal reporting will be available in a later phase.
        </h2>
        <p className={styles.body}>
          Until then, the <strong>Reports</strong> dashboard&apos;s &ldquo;Active right now&rdquo;
          KPI and the <strong>Completed / canceled</strong> archive cover near-term needs.
        </p>
      </section>
    </div>
  );
}
