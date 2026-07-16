import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/mws/Button';
import { api, apiJson } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import type { BulkUploadPreviewDto, BulkUploadRowDto, VendorSuggestionDto } from '@/types/api';
import styles from './BulkUploadScreen.module.css';
import { AddVendorInline } from './AddVendorInline';
import { VendorPickerCell } from './VendorPickerCell';
import { applyVendorMatchToAll, revalidateEditedField } from './bulkUpload.helpers';

type BulkSourceId = 'spreadsheet' | 'spendconnect' | 'repository' | 'merger';

interface BulkSource {
  id: BulkSourceId;
  label: string;
  icon: string;
  desc: string;
  phase: string;
  enabled: boolean;
}

const BULK_SOURCES: BulkSource[] = [
  {
    id: 'spreadsheet',
    label: 'Procurement spreadsheet',
    icon: 'file-xls',
    desc: "Seed Phase 1 from Lisa's current tracking spreadsheet — in-process contracts that need to keep moving.",
    phase: 'Phase 1 onboarding',
    enabled: true,
  },
  {
    id: 'spendconnect',
    label: 'SpendConnect export',
    icon: 'database',
    desc: 'Import contract records from a SpendConnect CSV export.',
    phase: 'Phase 1',
    enabled: true,
  },
  {
    id: 'repository',
    label: 'Signed contracts repository',
    icon: 'archive',
    desc: 'Backfill historical signed contracts. Read-only after import — for searchable history.',
    phase: 'Phase 2 (placeholder)',
    enabled: false,
  },
  {
    id: 'merger',
    label: 'Merger / acquired-firm import',
    icon: 'arrows-merge',
    desc: 'One-time bulk import of contracts from an acquired firm or practice group.',
    phase: 'Phase 2 (placeholder)',
    enabled: false,
  },
];

interface CommitResponse {
  importedCount: number;
  skippedCount: number;
  createdContractIds: number[];
}

type EditableField = 'contractTitle' | 'vendorName' | 'category' | 'totalCost';
type EditingCell = { rowNumber: number; field: EditableField };

const COLUMNS: { key: EditableField; label: string }[] = [
  { key: 'contractTitle', label: 'Title' },
  { key: 'vendorName', label: 'Vendor' },
  { key: 'category', label: 'Category' },
  { key: 'totalCost', label: 'Value' },
];

export function BulkUploadScreen() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [source, setSource] = useState<BulkSourceId | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [rows, setRows] = useState<BulkUploadRowDto[]>([]);
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [draft, setDraft] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  // Prefill for the AddVendorInline modal. `null` = closed. Empty string = open with no prefill.
  const [addVendorPrefill, setAddVendorPrefill] = useState<string | null>(null);

  const previewMutation = useMutation<BulkUploadPreviewDto, Error, File>({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api('/api/bulk-upload/preview', {
        method: 'POST',
        asFormData: formData,
      });
      return (await response.json()) as BulkUploadPreviewDto;
    },
    onSuccess: (result) => {
      setRows(result.rows);
      setSkipped(new Set());
      setEditing(null);
    },
  });

  const commitMutation = useMutation<CommitResponse, Error, BulkUploadRowDto[]>({
    mutationFn: (commitRows) =>
      apiJson<CommitResponse>('/api/bulk-upload/commit', {
        method: 'POST',
        body: { rows: commitRows },
      }),
    onSuccess: () => {
      setRows([]);
      setSkipped(new Set());
      if (fileInput.current) fileInput.current.value = '';
      // Every contract list — Dashboard, Archive, MySubmissions, Reports — refreshes so
      // the newly-committed rows appear immediately.
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all });
    },
  });

  const stats = useMemo(() => computeStats(rows, skipped), [rows, skipped]);
  const validRows = rows.filter((row) => !skipped.has(row.rowNumber) && row.errors.length === 0);

  const beginEdit = (rowNumber: number, field: EditableField, currentValue: string) => {
    setEditing({ rowNumber, field });
    setDraft(currentValue);
  };

  const commitEdit = () => {
    if (!editing) return;
    const { rowNumber, field } = editing;
    const value = draft;
    setRows((prev) =>
      prev.map((row) => {
        if (row.rowNumber !== rowNumber) return row;
        const updated = { ...row, [field]: value } as BulkUploadRowDto;
        return revalidateEditedField(updated, field, value);
      }),
    );
    setEditing(null);
    setDraft('');
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraft('');
  };

  const resolveVendorForMatchingRows = (sourceName: string, vendor: VendorSuggestionDto) => {
    setRows((prev) => applyVendorMatchToAll(prev, sourceName, vendor));
    setEditing(null);
    setDraft('');
  };

  const openAddVendor = (name: string) => {
    setAddVendorPrefill(name);
  };

  const toggleSkip = (rowNumber: number) => {
    setSkipped((prev) => {
      const next = new Set(prev);
      if (next.has(rowNumber)) next.delete(rowNumber);
      else next.add(rowNumber);
      return next;
    });
  };

  if (!source) {
    return <SourcePicker onPick={setSource} />;
  }
  const sourceMeta = BULK_SOURCES.find((s) => s.id === source);
  if (sourceMeta && !sourceMeta.enabled) {
    return <Phase2Placeholder source={sourceMeta} onBack={() => setSource(null)} />;
  }

  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.title}>Bulk upload</h1>
        <p className={styles.subtitle}>
          {sourceMeta?.label ?? 'Source'}. Upload the spreadsheet to seed the system. Click any cell
          to fix it inline, then commit the rows that resolve.
        </p>
        <button
          type="button"
          onClick={() => setSource(null)}
          style={{
            background: 'none',
            border: 0,
            padding: 0,
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            marginTop: 'var(--space-2)',
          }}
        >
          <i className="ph ph-arrow-left" aria-hidden="true" /> Pick a different source
        </button>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>1. Upload spreadsheet</h2>
        <div
          className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ''}`}
          onDragEnter={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!isDragging) setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (event.currentTarget === event.target) setIsDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsDragging(false);
            const file = event.dataTransfer.files?.[0];
            if (file) previewMutation.mutate(file);
          }}
          onClick={() => fileInput.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              fileInput.current?.click();
            }
          }}
        >
          <i className="ph ph-cloud-arrow-up" aria-hidden="true" />
          <span className={styles.dropZoneTitle}>
            {isDragging ? 'Drop the spreadsheet to upload' : 'Drag a spreadsheet here'}
          </span>
          <span className={styles.dropZoneHint}>or click to browse · .xlsx files only</span>
          <input
            type="file"
            ref={fileInput}
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            style={{ display: 'none' }}
            onChange={(event) => {
              const input = event.currentTarget;
              const file = input.files?.[0];
              if (file) previewMutation.mutate(file);
              // Reset so re-selecting the same file after a fix or error re-fires onChange.
              input.value = '';
            }}
          />
        </div>
        {previewMutation.isPending ? <p>Parsing spreadsheet…</p> : null}
        {previewMutation.error ? (
          <p className={styles.error}>{previewMutation.error.message}</p>
        ) : null}
      </section>

      {rows.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>2. Preview &amp; fix</h2>
          <div className={styles.stats}>
            <Stat label="Total" value={stats.total} />
            <Stat label="Ready" value={stats.ready} tone="ok" />
            <Stat label="With errors" value={stats.errors} tone="warn" />
            <Stat label="Skipped" value={stats.skipped} />
          </div>

          <div className={styles.tableShell}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Row</th>
                  {COLUMNS.map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                  <th aria-label="Action" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <BulkRow
                    key={row.rowNumber}
                    row={row}
                    isSkipped={skipped.has(row.rowNumber)}
                    editing={editing}
                    draft={draft}
                    onBeginEdit={beginEdit}
                    onDraftChange={setDraft}
                    onCommit={commitEdit}
                    onCancel={cancelEdit}
                    onToggleSkip={toggleSkip}
                    onResolveVendor={resolveVendorForMatchingRows}
                    onRequestAddVendor={openAddVendor}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.actions}>
            <Button
              variant="secondary"
              onClick={() => {
                setRows([]);
                setSkipped(new Set());
                if (fileInput.current) fileInput.current.value = '';
              }}
            >
              Upload a different file
            </Button>
            <Button
              disabled={commitMutation.isPending || validRows.length === 0}
              onClick={() => commitMutation.mutate(validRows)}
            >
              Commit {validRows.length} row{validRows.length === 1 ? '' : 's'}
            </Button>
          </div>
          {commitMutation.data ? (
            <div className={styles.success}>
              <p style={{ margin: 0 }}>
                Imported {commitMutation.data.importedCount}; skipped{' '}
                {commitMutation.data.skippedCount}.
              </p>
              {commitMutation.data.importedCount > 0 ? (
                <Button
                  variant="secondary"
                  size="sm"
                  icon="arrow-right"
                  onClick={() => navigate('/master')}
                  style={{ marginTop: 'var(--space-3)' }}
                >
                  View contracts
                </Button>
              ) : null}
            </div>
          ) : null}
          {commitMutation.error ? (
            <p className={styles.error}>{commitMutation.error.message}</p>
          ) : null}
        </section>
      ) : null}

      {addVendorPrefill !== null ? (
        <AddVendorInline
          initialName={addVendorPrefill}
          onCancel={() => setAddVendorPrefill(null)}
          onCreated={(vendor) => {
            resolveVendorForMatchingRows(addVendorPrefill, vendor);
            setAddVendorPrefill(null);
          }}
        />
      ) : null}
    </div>
  );
}

function computeStats(rows: BulkUploadRowDto[], skipped: Set<number>) {
  let ready = 0;
  let errors = 0;
  for (const row of rows) {
    if (skipped.has(row.rowNumber)) continue;
    if (row.errors.length === 0) ready++;
    else errors++;
  }
  return { total: rows.length, ready, errors, skipped: skipped.size };
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'ok' | 'warn' }) {
  const cls = tone === 'ok' ? styles.statOk : tone === 'warn' ? styles.statWarn : styles.stat;
  return (
    <div className={cls}>
      <span className={styles.statKey}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  );
}

interface BulkRowProps {
  row: BulkUploadRowDto;
  isSkipped: boolean;
  editing: EditingCell | null;
  draft: string;
  onBeginEdit: (rowNumber: number, field: EditableField, currentValue: string) => void;
  onDraftChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  onToggleSkip: (rowNumber: number) => void;
  onResolveVendor: (sourceName: string, vendor: VendorSuggestionDto) => void;
  onRequestAddVendor: (name: string) => void;
}

function BulkRow({
  row,
  isSkipped,
  editing,
  draft,
  onBeginEdit,
  onDraftChange,
  onCommit,
  onCancel,
  onToggleSkip,
  onResolveVendor,
  onRequestAddVendor,
}: BulkRowProps) {
  return (
    <tr className={isSkipped ? styles.rowSkipped : undefined}>
      <td className={styles.rowNum}>{row.rowNumber}</td>
      {COLUMNS.map((col) => {
        const value = readField(row, col.key);
        const errorMessage = isSkipped ? null : findErrorFor(row.errors, col.key);
        const isEditing =
          editing != null && editing.rowNumber === row.rowNumber && editing.field === col.key;

        if (col.key === 'vendorName') {
          return (
            <VendorPickerCell
              key={col.key}
              rowNumber={row.rowNumber}
              value={value}
              matchedVendorId={row.matchedVendorId}
              errorMessage={errorMessage}
              isSkipped={isSkipped}
              isEditing={isEditing}
              draft={isEditing ? draft : ''}
              onDraftChange={onDraftChange}
              onBeginEdit={() => onBeginEdit(row.rowNumber, col.key, value)}
              onCancel={onCancel}
              onResolve={(vendor) => onResolveVendor(value, vendor)}
              onRequestAdd={onRequestAddVendor}
            />
          );
        }

        return (
          <BulkCell
            key={col.key}
            value={value}
            errorMessage={errorMessage}
            isEditing={isEditing}
            isSkipped={isSkipped}
            field={col.key}
            draft={draft}
            onBeginEdit={() => onBeginEdit(row.rowNumber, col.key, value)}
            onDraftChange={onDraftChange}
            onCommit={onCommit}
            onCancel={onCancel}
          />
        );
      })}
      <td className={styles.skipCell}>
        <button
          type="button"
          className={styles.skipButton}
          onClick={() => onToggleSkip(row.rowNumber)}
        >
          {isSkipped ? 'Restore' : 'Skip'}
        </button>
      </td>
    </tr>
  );
}

interface BulkCellProps {
  value: string;
  errorMessage: string | null;
  isEditing: boolean;
  isSkipped: boolean;
  field: EditableField;
  draft: string;
  onBeginEdit: () => void;
  onDraftChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}

function BulkCell({
  value,
  errorMessage,
  isEditing,
  isSkipped,
  field,
  draft,
  onBeginEdit,
  onDraftChange,
  onCommit,
  onCancel,
}: BulkCellProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <td className={styles.cellEditing}>
        <input
          ref={inputRef}
          type={field === 'totalCost' ? 'number' : 'text'}
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onBlur={onCommit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onCommit();
            if (event.key === 'Escape') onCancel();
          }}
          className={styles.cellInput}
        />
      </td>
    );
  }

  return (
    <td
      className={`${errorMessage ? styles.cellError : ''} ${isSkipped ? '' : styles.cellClickable}`}
      onClick={isSkipped ? undefined : onBeginEdit}
    >
      <span className={styles.cellValue}>{value || '—'}</span>
      {errorMessage ? <span className={styles.cellErrorMsg}>{errorMessage}</span> : null}
    </td>
  );
}

function readField(row: BulkUploadRowDto, field: EditableField): string {
  const value = row[field];
  if (value == null) return '';
  return String(value);
}

function findErrorFor(errors: string[], field: EditableField): string | null {
  const lookup: Record<EditableField, string[]> = {
    contractTitle: ['title'],
    vendorName: ['vendor'],
    category: ['category'],
    totalCost: ['cost', 'value', 'amount'],
  };
  const keywords = lookup[field];
  for (const message of errors) {
    const lower = message.toLowerCase();
    if (keywords.some((keyword) => lower.includes(keyword))) return message;
  }
  return null;
}

function SourcePicker({ onPick }: { onPick: (id: BulkSourceId) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <header>
        <h1 style={{ fontFamily: 'var(--font-mix)', fontSize: 32, margin: 0 }}>Bulk upload</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
          Four import paths. Phase 1 priority is the procurement spreadsheet — that&apos;s how the
          tool gets seeded with in-process contracts.
        </p>
      </header>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        {BULK_SOURCES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onPick(s.id)}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius)',
              padding: 'var(--space-5)',
              cursor: 'pointer',
              textAlign: 'left',
              font: 'inherit',
              color: 'inherit',
              opacity: s.enabled ? 1 : 0.7,
            }}
          >
            <i
              className={`ph ph-${s.icon}`}
              aria-hidden="true"
              style={{ fontSize: 32, display: 'block', marginBottom: 'var(--space-3)' }}
            />
            <h3
              style={{
                fontFamily: 'var(--font-mix)',
                fontSize: 22,
                margin: 0,
                marginBottom: 'var(--space-2)',
              }}
            >
              {s.label}
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>{s.desc}</p>
            <p
              style={{
                marginTop: 'var(--space-3)',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
                fontWeight: 600,
              }}
            >
              {s.phase}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function Phase2Placeholder({ source, onBack }: { source: BulkSource; onBack: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          background: 'none',
          border: 0,
          padding: 0,
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <i className="ph ph-arrow-left" aria-hidden="true" /> Pick a different source
      </button>
      <h1 style={{ fontFamily: 'var(--font-mix)', fontSize: 32, margin: 0 }}>{source.label}</h1>
      <div
        style={{
          background: 'var(--color-pale-blue)',
          borderLeft: '4px solid var(--color-blue)',
          padding: 'var(--space-4)',
          borderRadius: 'var(--radius)',
          color: 'var(--color-navy)',
          fontSize: 14,
        }}
      >
        <strong>Phase 2.</strong> {source.desc} This import path is planned but not built in Phase 1
        — the priority for Phase 1 is the procurement spreadsheet seed.
      </div>
    </div>
  );
}
