import { Card } from '@/mws/Card';
import { CATEGORIES_CONFIG, type CategoryConfig } from '@/lib/categoriesConfig';

import styles from './CategoriesSettingsScreen.module.css';

/**
 * Phase 1 — this screen is a read-only preview of the category schema.
 * The Phase 1 schema is data-driven config (see lib/categoriesConfig.ts); editing
 * moves to this screen in Phase 2. Marked "Soon" in the sidebar to match Renewals.
 */
export function CategoriesSettingsScreen() {
  const totalFields = CATEGORIES_CONFIG.reduce((sum, cat) => sum + cat.fields.length, 0);

  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.title}>Categories &amp; fields</h1>
        <p className={styles.subtitle}>
          What Procurement admins will be able to configure once Phase 2 ships. The Phase 1 schema
          is data-driven config — a code-side edit, not an in-app one.
        </p>
      </header>

      <div className={styles.phase2Banner} role="status">
        <i className={`ph ph-clock ${styles.phase2BannerIcon}`} aria-hidden="true" />
        <div className={styles.phase2BannerBody}>
          <span className={styles.phase2BannerTitle}>Coming in Phase 2.</span>
          <span>
            Adding categories, renaming fields, changing field types, and toggling helper text will
            all happen here. For Phase 1, the schema below is read-only — talk to a Procurement
            admin (or open a ticket) if you need a change.
          </span>
        </div>
      </div>

      <p className={styles.previewEyebrow}>
        Current schema — {CATEGORIES_CONFIG.length} categories · {totalFields} fields
      </p>

      {CATEGORIES_CONFIG.map((cat) => (
        <CategoryPreview key={cat.id} cat={cat} />
      ))}
    </div>
  );
}

function CategoryPreview({ cat }: { cat: CategoryConfig }) {
  return (
    <Card>
      <div className={styles.categoryHeader}>
        <i className={`ph ph-${cat.icon} ${styles.categoryIcon}`} aria-hidden="true" />
        <h2 className={styles.categoryName}>{cat.label}</h2>
        <span className={styles.categoryMeta}>
          {cat.fields.length} {cat.fields.length === 1 ? 'field' : 'fields'}
        </span>
      </div>
      <ul className={styles.fieldList}>
        {cat.fields.map((f) => (
          <li key={f.id} className={styles.fieldRow}>
            <span className={styles.fieldLabel}>{f.label}</span>
            <span className={styles.fieldType}>{f.type}</span>
            <span className={f.helper ? styles.fieldHelper : styles.fieldHelperEmpty}>
              {f.helper || '—'}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
