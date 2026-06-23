import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/mws/Badge';
import { formatShortDate, formatUsd } from '@/lib/formatters';
import { statusInfo } from '@/lib/statusMap';
import type { ContractRowDto } from '@/types/api';
import styles from './ContractTable.module.css';

type ColumnKey =
  | 'flag'
  | 'contract'
  | 'vendor'
  | 'category'
  | 'status'
  | 'reviewer'
  | 'value'
  | 'expires'
  | 'lastAction'
  | 'nextDue';

interface Column {
  key: ColumnKey;
  label: string;
  numeric?: boolean;
}

const DEFAULT_COLUMNS: Column[] = [
  { key: 'flag', label: '' },
  { key: 'contract', label: 'Contract' },
  { key: 'vendor', label: 'Vendor' },
  { key: 'category', label: 'Category' },
  { key: 'status', label: 'Stage' },
  { key: 'reviewer', label: 'Reviewer' },
  { key: 'value', label: 'Value', numeric: true },
  { key: 'expires', label: 'Expires' },
  { key: 'nextDue', label: 'Next due' },
];

const SORTABLE: ReadonlySet<ColumnKey> = new Set([
  'contract',
  'vendor',
  'category',
  'status',
  'reviewer',
  'value',
  'expires',
  'lastAction',
  'nextDue',
]);

type SortDir = 'asc' | 'desc';

interface ContractTableProps {
  rows: ContractRowDto[];
  isLoading: boolean;
  error: Error | null;
  emptyMessage?: string;
  columns?: Column[];
}

export function ContractTable({
  rows,
  isLoading,
  error,
  emptyMessage = 'No contracts match this view.',
  columns = DEFAULT_COLUMNS,
}: ContractTableProps) {
  const navigate = useNavigate();
  const [sort, setSort] = useState<{ key: ColumnKey; dir: SortDir } | null>(null);

  const sortedRows = useMemo(() => sortRows(rows, sort), [rows, sort]);

  const onSort = (key: ColumnKey) => {
    if (!SORTABLE.has(key)) return;
    setSort((prev) =>
      prev && prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' },
    );
  };

  return (
    <div className={styles.tableShell}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((column) => {
              const sortable = SORTABLE.has(column.key);
              const active = sort?.key === column.key;
              const ariaSort: 'ascending' | 'descending' | 'none' = active
                ? sort.dir === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none';
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={sortable ? ariaSort : undefined}
                  className={
                    column.numeric
                      ? styles.numeric
                      : column.key === 'flag'
                        ? styles.flagCell
                        : undefined
                  }
                >
                  {column.key === 'flag' ? (
                    <span className="visually-hidden">Attention indicator</span>
                  ) : sortable ? (
                    <button
                      type="button"
                      className={styles.sortBtn}
                      onClick={() => onSort(column.key)}
                    >
                      <span>{column.label}</span>
                      <i
                        className={`ph ph-${active ? (sort.dir === 'asc' ? 'caret-up' : 'caret-down') : 'caret-up-down'}`}
                        aria-hidden="true"
                      />
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className={styles.emptyRow}>
                Loading contracts…
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan={columns.length} className={styles.emptyRow}>
                Couldn&apos;t load contracts. Refresh to try again.
              </td>
            </tr>
          ) : sortedRows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.emptyRow}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedRows.map((row) => {
              const stage = statusInfo(row.status);
              return (
                <tr
                  key={row.contractId}
                  className={styles.bodyRow}
                  onClick={() => navigate(`/contracts/${row.contractId}`)}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={
                        column.numeric
                          ? styles.numeric
                          : column.key === 'flag'
                            ? styles.flagCell
                            : undefined
                      }
                    >
                      {renderCell(column, row, stage)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function sortRows(
  rows: ContractRowDto[],
  sort: { key: ColumnKey; dir: SortDir } | null,
): ContractRowDto[] {
  if (!sort) return rows;
  const out = rows.slice();
  const dir = sort.dir === 'asc' ? 1 : -1;
  out.sort((a, b) => compare(a, b, sort.key) * dir);
  return out;
}

function compare(a: ContractRowDto, b: ContractRowDto, key: ColumnKey): number {
  switch (key) {
    case 'contract':
      return a.title.localeCompare(b.title);
    case 'vendor':
      return a.vendorName.localeCompare(b.vendorName);
    case 'category':
      return a.category.localeCompare(b.category);
    case 'status':
      return a.status.localeCompare(b.status);
    case 'reviewer':
      return (a.assignedReviewerName ?? '').localeCompare(b.assignedReviewerName ?? '');
    case 'value':
      return compareNumbers(a.totalCostUsd, b.totalCostUsd);
    case 'expires':
      return compareDates(a.termEndDate, b.termEndDate);
    case 'lastAction':
      return compareDates(a.lastActionAt, b.lastActionAt);
    case 'nextDue':
      return compareDates(a.nextActionDueAt, b.nextActionDueAt);
    default:
      return 0;
  }
}

function compareDates(left: string | null, right: string | null): number {
  // Nulls sort to the end on ascending.
  if (left === right) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return left.localeCompare(right);
}

function compareNumbers(left: number | null, right: number | null): number {
  if (left === right) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return left - right;
}

function renderCell(
  column: Column,
  row: ContractRowDto,
  stage: ReturnType<typeof statusInfo>,
): React.ReactNode {
  switch (column.key) {
    case 'flag':
      return row.needsAttention ? (
        <span className={styles.flagDot} aria-label="Needs attention" />
      ) : null;
    case 'contract':
      return (
        <div className={styles.contractName}>
          <Link to={`/contracts/${row.contractId}`} onClick={(event) => event.stopPropagation()}>
            {row.title}
          </Link>
          <span className={styles.contractNumber}>{row.contractNumber}</span>
        </div>
      );
    case 'vendor':
      return row.vendorName;
    case 'category':
      return row.category;
    case 'status':
      return <Badge status={stage.badge}>{stage.label}</Badge>;
    case 'reviewer':
      return row.assignedReviewerName ?? <span className={styles.muted}>Unassigned</span>;
    case 'value':
      return formatUsd(row.totalCostUsd);
    case 'expires':
      return formatShortDate(row.termEndDate);
    case 'lastAction':
      return formatShortDate(row.lastActionAt);
    case 'nextDue':
      return formatShortDate(row.nextActionDueAt);
  }
}
