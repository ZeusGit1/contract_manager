import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiJson } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import type { VendorSuggestionDto } from '@/types/api';
import styles from './BulkUploadScreen.module.css';

interface VendorPickerCellProps {
  rowNumber: number;
  value: string;
  matchedVendorId: number | null;
  errorMessage: string | null;
  isSkipped: boolean;
  isEditing: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  onBeginEdit: () => void;
  onCancel: () => void;
  onResolve: (vendor: VendorSuggestionDto) => void;
  onRequestAdd: (name: string) => void;
}

/**
 * Vendor cell: read mode shows the current value + any vendor error; edit mode
 * opens a typeahead popover backed by /api/vendors/autocomplete. Picking a
 * suggestion resolves the row (the parent applies it to duplicates). "New
 * vendor" hands the current draft to the side-sheet modal. Draft state is
 * owned by the parent so it stays in sync with the rest of the editing flow.
 */
export function VendorPickerCell({
  rowNumber,
  value,
  matchedVendorId,
  errorMessage,
  isSkipped,
  isEditing,
  draft,
  onDraftChange,
  onBeginEdit,
  onCancel,
  onResolve,
  onRequestAdd,
}: VendorPickerCellProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const query = draft.trim();
  const suggestionsQuery = useQuery<VendorSuggestionDto[]>({
    queryKey: queryKeys.vendors.autocomplete(query),
    queryFn: () =>
      apiJson<VendorSuggestionDto[]>(
        `/api/vendors/autocomplete${query ? `?q=${encodeURIComponent(query)}` : ''}`,
      ),
    enabled: isEditing,
    staleTime: 30_000,
  });

  if (!isEditing) {
    const showResolvedBadge = matchedVendorId != null && !errorMessage;
    return (
      <td
        className={`${errorMessage ? styles.cellError : ''} ${isSkipped ? '' : styles.cellClickable}`}
        onClick={isSkipped ? undefined : onBeginEdit}
      >
        <span className={styles.cellValue}>{value || '—'}</span>
        {showResolvedBadge ? <span className={styles.vendorResolvedBadge}>Matched</span> : null}
        {errorMessage ? <span className={styles.cellErrorMsg}>{errorMessage}</span> : null}
      </td>
    );
  }

  const suggestions = suggestionsQuery.data ?? [];
  const exactMatch = suggestions.find(
    (vendor) => vendor.name.toLowerCase() === query.toLowerCase(),
  );

  return (
    <td className={styles.cellEditing}>
      <div className={styles.vendorPickerWrap}>
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              if (exactMatch) onResolve(exactMatch);
              else if (suggestions.length === 1) onResolve(suggestions[0]);
            }
            if (event.key === 'Escape') onCancel();
          }}
          className={styles.cellInput}
          aria-label={`Vendor for row ${rowNumber}`}
          aria-autocomplete="list"
          aria-expanded="true"
          role="combobox"
        />
        <div className={styles.vendorPickerPopover} role="listbox">
          {suggestionsQuery.isLoading ? (
            <p className={styles.vendorPickerHint}>Searching…</p>
          ) : suggestions.length === 0 ? (
            <p className={styles.vendorPickerHint}>
              No vendors match. Use “New vendor” below to add one.
            </p>
          ) : (
            <ul className={styles.vendorPickerList}>
              {suggestions.map((vendor) => (
                <li key={vendor.vendorId}>
                  <button
                    type="button"
                    onClick={() => onResolve(vendor)}
                    className={styles.vendorPickerOption}
                    role="option"
                    aria-selected={vendor.vendorId === matchedVendorId}
                  >
                    <span>{vendor.name}</span>
                    {vendor.preferredStatus === 'Blacklisted' ? (
                      <span className={styles.vendorPickerWarning}>Blacklisted</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className={styles.vendorPickerFooter}>
            <button
              type="button"
              onClick={() => onRequestAdd(draft.trim() || value)}
              className={styles.vendorPickerAddButton}
            >
              <i className="ph ph-plus" aria-hidden="true" /> New vendor
              {draft.trim() ? <span> “{draft.trim()}”</span> : null}
            </button>
            <button type="button" onClick={onCancel} className={styles.vendorPickerCancel}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </td>
  );
}
