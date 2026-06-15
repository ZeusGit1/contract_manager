import styles from './RoutingPreview.module.css';

interface RoutingPreviewProps {
  category: 'IT' | 'Event' | 'Facilities';
  totalCostUsd: number | null;
  flags?: {
    cloudOrOnPrem?: string | null;
    accessesPHI?: boolean;
    accessesPersonalData?: boolean;
    usesAI?: boolean;
  };
}

interface Stage {
  key: string;
  label: string;
  reason: string;
}

const LEGAL: Stage = { key: 'WithLegal', label: 'Legal', reason: 'Standard for every contract.' };
const GCO: Stage = {
  key: 'WithGCO',
  label: 'GCO',
  reason: 'Spend over $50,000 triggers GCO review.',
};

export function RoutingPreview({ category, totalCostUsd, flags }: RoutingPreviewProps) {
  const stages = deriveStages(category, totalCostUsd, flags);

  return (
    <aside className={styles.panel} aria-label="Review routing preview">
      <header className={styles.head}>
        <h3 className={styles.title}>Review routing</h3>
        <p className={styles.subtitle}>
          Based on what you&apos;ve entered, your contract will move through these teams.
        </p>
      </header>
      <ol className={styles.list}>
        {stages.map((stage) => (
          <li key={stage.key} className={styles.item}>
            <span className={styles.dot} aria-hidden="true" />
            <div className={styles.body}>
              <span className={styles.label}>{stage.label}</span>
              <span className={styles.reason}>{stage.reason}</span>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}

function deriveStages(
  category: RoutingPreviewProps['category'],
  totalCostUsd: number | null,
  flags?: RoutingPreviewProps['flags'],
): Stage[] {
  const stages: Stage[] = [LEGAL];

  if ((totalCostUsd ?? 0) >= 50_000) {
    stages.push(GCO);
  }

  if (category === 'IT' && flags) {
    const isCloud = flags.cloudOrOnPrem === 'Cloud' || flags.cloudOrOnPrem === 'Hybrid';
    const infoSecReasons: string[] = [];
    if (isCloud) infoSecReasons.push('cloud-hosted');
    if (flags.usesAI) infoSecReasons.push('uses AI');
    if (infoSecReasons.length > 0) {
      stages.push({
        key: 'WithInfoSec',
        label: 'InfoSec',
        reason: `Triggered by ${infoSecReasons.join(' + ')}.`,
      });
    }

    const privacyReasons: string[] = [];
    if (flags.accessesPHI) privacyReasons.push('handles PHI');
    if (flags.accessesPersonalData) privacyReasons.push('handles personal data');
    if (privacyReasons.length > 0) {
      stages.push({
        key: 'WithPrivacy',
        label: 'Privacy',
        reason: `Triggered by ${privacyReasons.join(' + ')}.`,
      });
    }
  }

  return stages;
}
