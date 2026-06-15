import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/mws/Button';
import { api, apiJson } from '@/lib/apiClient';
import type { BulkUploadPreviewDto, BulkUploadRowDto } from '@/types/api';
import styles from './BulkUploadScreen.module.css';

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
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [rows, setRows] = useState<BulkUploadRowDto[]>([]);
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [draft, setDraft] = useState('');

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
    setRows((prev) =>
      prev.map((row) =>
        row.rowNumber === editing.rowNumber ? { ...row, [editing.field]: draft } : row,
      ),
    );
    setEditing(null);
    setDraft('');
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraft('');
  };

  const toggleSkip = (rowNumber: number) => {
    setSkipped((prev) => {
      const next = new Set(prev);
      if (next.has(rowNumber)) next.delete(rowNumber);
      else next.add(rowNumber);
      return next;
    });
  };

  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.title}>Bulk upload</h1>
        <p className={styles.subtitle}>
          Upload the legacy SpendConnect spreadsheet to seed the system. Click any cell to fix it
          inline, then commit the rows that resolve.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>1. Upload spreadsheet</h2>
        <input
          type="file"
          ref={fileInput}
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) previewMutation.mutate(file);
          }}
        />
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
            <p className={styles.success}>
              Imported {commitMutation.data.importedCount}; skipped{' '}
              {commitMutation.data.skippedCount}.
            </p>
          ) : null}
          {commitMutation.error ? (
            <p className={styles.error}>{commitMutation.error.message}</p>
          ) : null}
        </section>
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
}: BulkRowProps) {
  return (
    <tr className={isSkipped ? styles.rowSkipped : undefined}>
      <td className={styles.rowNum}>{row.rowNumber}</td>
      {COLUMNS.map((col) => {
        const value = readField(row, col.key);
        const errorMessage = isSkipped ? null : findErrorFor(row.errors, col.key);
        const isEditing =
          editing != null && editing.rowNumber === row.rowNumber && editing.field === col.key;
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
