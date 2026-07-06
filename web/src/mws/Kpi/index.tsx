import type { ReactNode } from 'react';
import styles from './Kpi.module.css';

interface KpiProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}

/** McDermott KPI number — Mix-serif 48pt (36pt at ≤480px), tabular numerals,
 *  eyebrow label above, optional secondary line below. See data-visualization.md. */
export function Kpi({ label, value, sub }: KpiProps) {
  return (
    <div className={styles.kpi}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      {sub ? <span className={styles.sub}>{sub}</span> : null}
    </div>
  );
}
