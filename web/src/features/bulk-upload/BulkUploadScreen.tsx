import { useRef, useState } from 'react';
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

export function BulkUploadScreen() {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<BulkUploadPreviewDto | null>(null);

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
    onSuccess: (result) => setPreview(result),
  });

  const commitMutation = useMutation<CommitResponse, Error, BulkUploadRowDto[]>({
    mutationFn: (rows) =>
      apiJson<CommitResponse>('/api/bulk-upload/commit', {
        method: 'POST',
        body: { rows },
      }),
    onSuccess: () => {
      setPreview(null);
      if (fileInput.current) fileInput.current.value = '';
    },
  });

  const validRows = preview?.rows.filter((row) => row.errors.length === 0) ?? [];
  const flaggedRows = preview?.rows.filter((row) => row.errors.length > 0) ?? [];

  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.title}>Bulk upload</h1>
        <p className={styles.subtitle}>
          Upload the legacy SpendConnect spreadsheet to seed the system. Review the preview, resolve
          any flagged rows, then commit.
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

      {preview ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>2. Preview &amp; commit</h2>
          <p>
            {preview.totalRows} rows · {preview.validRows} valid · {preview.invalidRows} flagged
          </p>
          {flaggedRows.length > 0 ? (
            <div>
              <h3>Flagged rows</h3>
              <ul className={styles.errorList}>
                {flaggedRows.map((row) => (
                  <li key={row.rowNumber}>
                    Row {row.rowNumber}: {row.errors.join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className={styles.actions}>
            <Button
              variant="secondary"
              onClick={() => {
                setPreview(null);
                if (fileInput.current) fileInput.current.value = '';
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={commitMutation.isPending || validRows.length === 0}
              onClick={() => commitMutation.mutate(validRows)}
            >
              Import {validRows.length} contract{validRows.length === 1 ? '' : 's'}
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
