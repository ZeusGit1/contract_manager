import { useState } from 'react';

import { CATEGORIES_CONFIG, type CategoryConfig } from '@/lib/categoriesConfig';

import styles from '@/features/contracts/Phase1.module.css';

export function CategoriesSettingsScreen() {
  const [toast, setToast] = useState<string | null>(null);

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Categories &amp; fields</h1>
          <p className={styles.subtitle}>
            Procurement-admin configuration. Phase 1 ships the schema as data-driven config
            (read-only here). Phase 2 wires the in-app editor.
          </p>
        </div>
        <button className="btn" onClick={() => setToast('Phase 2: add category editor.')}>
          <i className="ph ph-plus" aria-hidden="true" /> Add category
        </button>
      </header>

      {toast ? (
        <div className={styles.banner} role="status">
          <i className="ph ph-info" aria-hidden="true" />
          <span>{toast}</span>
        </div>
      ) : null}

      {CATEGORIES_CONFIG.map((cat) => (
        <CategoryCard
          key={cat.id}
          cat={cat}
          onAddField={() => setToast('Phase 2: add field editor.')}
        />
      ))}
    </div>
  );
}

function CategoryCard({ cat, onAddField }: { cat: CategoryConfig; onAddField: () => void }) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius)',
        padding: 'var(--space-5)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-3)',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className={`ph ph-${cat.icon}`} style={{ fontSize: 20 }} aria-hidden="true" />
          <h2 style={{ fontSize: 18, margin: 0 }}>{cat.label}</h2>
        </div>
        <button className="btn btn--secondary btn--sm" onClick={onAddField}>
          <i className="ph ph-plus" aria-hidden="true" /> Add field
        </button>
      </div>
      <div className={styles.tableShell}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Field</th>
              <th>Type</th>
              <th>Helper text</th>
            </tr>
          </thead>
          <tbody>
            {cat.fields.map((f) => (
              <tr key={f.id}>
                <td>{f.label}</td>
                <td>{f.type}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{f.helper || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
