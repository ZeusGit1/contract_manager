import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/mws/Badge';
import { SortHeader, TableEmptyRow, TableShell, TableSkeletonRows } from '@/mws/Table';
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
  /** When filters are active and result is empty, expose a Clear-filters affordance. */
  onClearFilters?: () => void;
}

export function ContractTable({
  rows,
  isLoading,
  error,
  emptyMessage = 'No contracts match this view.',
  columns = DEFAULT_COLUMNS,
  onClearFilters,
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
    <TableShell minWidth={920}>
      <thead>
        <tr>
          {columns.map((column) => {
            if (column.key === 'flag') {
              return (
                <th key={column.key} scope="col" className={styles.flagCell}>
                  <span className="visually-hidden">Attention indicator</span>
                </th>
              );
            }
            if (SORTABLE.has(column.key)) {
              return (
                <SortHeader<ColumnKey>
                  key={column.key}
                  columnKey={column.key}
                  activeKey={sort?.key ?? null}
                  dir={sort?.dir ?? 'asc'}
                  onSort={onSort}
                  numeric={column.numeric}
                >
                  {column.label}
                </SortHeader>
              );
            }
            return (
              <th
                key={column.key}
                scope="col"
                className={column.numeric ? styles.numeric : undefined}
              >
                {column.label}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {isLoading ? (
          <TableSkeletonRows columnCount={columns.length} />
        ) : error ? (
          <TableEmptyRow colSpan={columns.length}>
            Couldn&apos;t load contracts. Refresh to try again.
          </TableEmptyRow>
        ) : sortedRows.length === 0 ? (
          <TableEmptyRow colSpan={columns.length} onClearFilters={onClearFilters}>
            {emptyMessage}
          </TableEmptyRow>
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
    </TableShell>
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
