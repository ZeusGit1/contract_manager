import type { ReactNode } from 'react';
import styles from './ContractDetail.module.css';

interface RailCardProps {
  title: string;
  children: ReactNode;
}

/** Sidebar card used for status/priority/owner controls and key facts.
 *  Same surface treatment as Card but a slimmer --space-4 padding and eyebrow-only header. */
export function RailCard({ title, children }: RailCardProps) {
  return (
    <div className={styles.railCard}>
      <p className={styles.railCardEyebrow}>{title}</p>
      {children}
    </div>
  );
}

interface FactProps {
  label: string;
  value: string;
}

/** Label ↔ value pair used inside a RailCard's Key-facts list. */
export function Fact({ label, value }: FactProps) {
  return (
    <div className={styles.fact}>
      <span className={styles.factLabel}>{label}</span>
      <span className={styles.factValue}>{value}</span>
    </div>
  );
}

interface DefProps {
  label: string;
  value: string;
  full?: boolean;
}

/** Definition entry — eyebrow label + value. `full` spans all grid columns. */
export function Def({ label, value, full }: DefProps) {
  return (
    <div className={`${styles.def} ${full ? styles.defFull : ''}`}>
      <span className={styles.defLabel}>{label}</span>
      <span className={styles.defValue}>{value}</span>
    </div>
  );
}
