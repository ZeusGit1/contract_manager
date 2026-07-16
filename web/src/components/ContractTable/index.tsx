import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, type BadgeStatus } from '@/mws/Badge';
import { SortHeader, TableEmptyRow, TableShell, TableSkeletonRows } from '@/mws/Table';
import { formatShortDate, formatUsd } from '@/lib/formatters';
import { OVERALL_STATUS_LABEL, PRIORITY_LABEL } from '@/lib/laneMap';
import type { ContractRowDto } from '@/types/api';
import type { OverallStatusApi, PriorityApi } from '@/types/contract';
import styles from './ContractTable.module.css';

type ColumnKey =
  | 'contract'
  | 'vendor'
  | 'category'
  | 'priority'
  | 'overall'
  | 'owner'
  | 'value'
  | 'expires'
  | 'submitted';

interface Column {
  key: ColumnKey;
  label: string;
  numeric?: boolean;
}

const DEFAULT_COLUMNS: Column[] = [
  { key: 'contract', label: 'Contract' },
  { key: 'vendor', label: 'Vendor' },
  { key: 'category', label: 'Category' },
  { key: 'priority', label: 'Priority' },
  { key: 'overall', label: 'Status' },
  { key: 'owner', label: 'Procurement owner' },
  { key: 'value', label: 'Value', numeric: true },
  { key: 'expires', label: 'Expires' },
];

const SORTABLE: ReadonlySet<ColumnKey> = new Set([
  'contract',
  'vendor',
  'category',
  'priority',
  'overall',
  'owner',
  'value',
  'expires',
  'submitted',
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
          sortedRows.map((row) => (
            <tr
              key={row.contractId}
              className={styles.bodyRow}
              onClick={() => navigate(`/contracts/${row.contractId}`)}
            >
              {columns.map((column) => (
                <td key={column.key} className={column.numeric ? styles.numeric : undefined}>
                  {renderCell(column, row)}
                </td>
              ))}
            </tr>
          ))
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
    case 'priority':
      return priorityOrder(a.priority) - priorityOrder(b.priority);
    case 'overall':
      return a.overallStatus.localeCompare(b.overallStatus);
    case 'owner':
      return (a.procurementOwnerName ?? '').localeCompare(b.procurementOwnerName ?? '');
    case 'value':
      return compareNumbers(a.totalCostUsd, b.totalCostUsd);
    case 'expires':
      return compareDates(a.termEndDate, b.termEndDate);
    case 'submitted':
      return compareDates(a.submittedAt, b.submittedAt);
    default:
      return 0;
  }
}

function priorityOrder(p: PriorityApi): number {
  switch (p) {
    case 'Critical':
      return 0;
    case 'High':
      return 1;
    case 'Medium':
      return 2;
    case 'Low':
      return 3;
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

function overallBadge(status: OverallStatusApi): BadgeStatus {
  switch (status) {
    case 'Active':
      return 'info';
    case 'Completed':
      return 'live';
    case 'Canceled':
      return 'failed';
  }
}

function renderCell(column: Column, row: ContractRowDto): React.ReactNode {
  switch (column.key) {
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
    case 'priority':
      return PRIORITY_LABEL[row.priority];
    case 'overall':
      return (
        <Badge status={overallBadge(row.overallStatus)}>
          {OVERALL_STATUS_LABEL[row.overallStatus]}
        </Badge>
      );
    case 'owner':
      return row.procurementOwnerName ?? <span className={styles.muted}>Unassigned</span>;
    case 'value':
      return formatUsd(row.totalCostUsd);
    case 'expires':
      return formatShortDate(row.termEndDate);
    case 'submitted':
      return formatShortDate(row.submittedAt);
  }
}
