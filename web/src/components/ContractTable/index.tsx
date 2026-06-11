import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/mws/Badge';
import { formatShortDate, formatUsd } from '@/lib/formatters';
import { statusInfo } from '@/lib/statusMap';
import type { ContractRowDto } from '@/types/api';
import styles from './ContractTable.module.css';

interface Column {
  key:
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
  return (
    <div className={styles.tableShell}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
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
                ) : (
                  column.label
                )}
              </th>
            ))}
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
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.emptyRow}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
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
