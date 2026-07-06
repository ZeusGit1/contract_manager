import type { ReactNode } from 'react';
import styles from './Table.module.css';

interface TableShellProps {
  children: ReactNode;
  /** Minimum width in px — triggers horizontal scroll within the shell below this width. */
  minWidth?: number;
  className?: string;
  ariaLabel?: string;
}

/** McDermott table shell — overflow-x scroll + 1px border + 2px radius.
 *  Sticky thead + accent sort icons come from the shared CSS module. */
export function TableShell({ children, minWidth = 720, className, ariaLabel }: TableShellProps) {
  return (
    <div className={`${styles.shell} ${className ?? ''}`}>
      <table className={styles.table} style={{ minWidth: `${minWidth}px` }} aria-label={ariaLabel}>
        {children}
      </table>
    </div>
  );
}

interface SortHeaderProps<K extends string> {
  columnKey: K;
  activeKey: K | null;
  dir: 'asc' | 'desc';
  onSort: (key: K) => void;
  children: ReactNode;
  numeric?: boolean;
}

/** Sortable column header. Renders <th aria-sort>...<button> with the accent-interactive
 *  active caret per data-visualization.md. */
export function SortHeader<K extends string>({
  columnKey,
  activeKey,
  dir,
  onSort,
  children,
  numeric,
}: SortHeaderProps<K>) {
  const active = activeKey === columnKey;
  const iconName = active ? (dir === 'asc' ? 'caret-up' : 'caret-down') : 'caret-up-down';
  const ariaSort: 'ascending' | 'descending' | 'none' = active
    ? dir === 'asc'
      ? 'ascending'
      : 'descending'
    : 'none';
  return (
    <th aria-sort={ariaSort} scope="col" className={numeric ? styles.numeric : undefined}>
      <button type="button" className={styles.sortBtn} onClick={() => onSort(columnKey)}>
        <span>{children}</span>
        <i
          className={`ph ph-${iconName} ${styles.sortIcon} ${active ? styles.sortIconActive : ''}`}
          aria-hidden="true"
        />
      </button>
    </th>
  );
}

interface TableEmptyRowProps {
  colSpan: number;
  children: ReactNode;
  /** Optional "Clear filters" action link (rendered inline after the message). */
  onClearFilters?: () => void;
  clearFiltersLabel?: string;
}

/** Filtered-to-zero / no-data row. Uses --bg-surface + text center per
 *  loading-empty-and-error-states.md (never a pale fill). */
export function TableEmptyRow({
  colSpan,
  children,
  onClearFilters,
  clearFiltersLabel = 'Clear filters',
}: TableEmptyRowProps) {
  return (
    <tr>
      <td colSpan={colSpan} className={styles.emptyRow}>
        {children}
        {onClearFilters ? (
          <button type="button" className={styles.clearFilters} onClick={onClearFilters}>
            {clearFiltersLabel}
          </button>
        ) : null}
      </td>
    </tr>
  );
}

interface TableSkeletonRowsProps {
  columnCount: number;
  rowCount?: number;
}

/** Skeleton rows matching column structure. Rendered for the 500ms – 3s loading window
 *  per loading-empty-and-error-states.md. Screen-reader hidden. */
export function TableSkeletonRows({ columnCount, rowCount = 6 }: TableSkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <tr key={`skel-${rowIndex}`} className={styles.skelRow} aria-hidden="true">
          {Array.from({ length: columnCount }).map((__, colIndex) => (
            <td key={colIndex}>
              <span className={styles.skelBar} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
