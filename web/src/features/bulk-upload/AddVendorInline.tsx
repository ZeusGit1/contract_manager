import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/mws/Button';
import { apiJson } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import type { VendorSuggestionDto, VendorSummaryDto } from '@/types/api';
import type { PreferredStatus, VendorType } from '@/types/contract';
import styles from './BulkUploadScreen.module.css';

interface AddVendorInlineProps {
  initialName: string;
  onCreated: (vendor: VendorSuggestionDto) => void;
  onCancel: () => void;
}

interface CreateVendorPayload {
  name: string;
  type: VendorType;
  preferredStatus: PreferredStatus;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
}

const PREFERRED_STATUSES: PreferredStatus[] = ['Preferred', 'Standard', 'Difficult', 'Blacklisted'];
const VENDOR_TYPES: VendorType[] = [
  'EventVenue',
  'FacilitiesService',
  'Software',
  'ProfessionalServices',
];

/**
 * Add-vendor modal opened from a bulk-upload row. On success returns the new
 * vendor's suggestion shape so the parent can apply it to every row that had
 * the same unresolved vendor name.
 */
export function AddVendorInline({ initialName, onCreated, onCancel }: AddVendorInlineProps) {
  const queryClient = useQueryClient();
  // Modal is destroyed and remounted on close, so seeding once from initialName
  // is sufficient — no need to sync via useEffect (parent never mutates
  // initialName while the modal is mounted).
  const [name, setName] = useState(initialName);
  const [type, setType] = useState<VendorType>('Software');
  const [preferredStatus, setPreferredStatus] = useState<PreferredStatus>('Standard');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const createVendor = useMutation<VendorSummaryDto, Error, CreateVendorPayload>({
    mutationFn: (payload) =>
      apiJson<VendorSummaryDto>('/api/vendors', { method: 'POST', body: payload }),
    onSuccess: (vendor) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all });
      onCreated({
        vendorId: vendor.vendorId,
        name: vendor.name,
        preferredStatus: vendor.preferredStatus,
      });
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    createVendor.mutate({
      name: trimmedName,
      type,
      preferredStatus,
      primaryContactName: contactName.trim() || null,
      primaryContactEmail: contactEmail.trim() || null,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add vendor"
      className={styles.modalScrim}
      onClick={onCancel}
    >
      <form
        className={styles.modal}
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <header className={styles.modalHead}>
          <h2 className={styles.modalTitle}>New vendor</h2>
          <button
            type="button"
            className={styles.closeBtn}
            aria-label="Close new vendor"
            onClick={onCancel}
          >
            <i className="ph ph-x" aria-hidden="true" />
          </button>
        </header>
        <p className={styles.modalHint}>
          Adding a vendor here also resolves every upload row that references this name.
        </p>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Vendor name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            autoFocus
            className={styles.fieldInput}
          />
        </label>
        <div className={styles.fieldRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Type</span>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as VendorType)}
              className={styles.fieldInput}
            >
              {VENDOR_TYPES.map((vendorType) => (
                <option key={vendorType} value={vendorType}>
                  {vendorType}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Status</span>
            <select
              value={preferredStatus}
              onChange={(event) => setPreferredStatus(event.target.value as PreferredStatus)}
              className={styles.fieldInput}
            >
              {PREFERRED_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>
            Primary contact <span className={styles.fieldOptional}>(optional)</span>
          </span>
          <input
            type="text"
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
            className={styles.fieldInput}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>
            Contact email <span className={styles.fieldOptional}>(optional)</span>
          </span>
          <input
            type="email"
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
            className={styles.fieldInput}
          />
        </label>
        {createVendor.error ? (
          <p className={styles.modalError}>
            Couldn&apos;t save the vendor. Check for a similar existing name, or try again.
          </p>
        ) : null}
        <div className={styles.modalActions}>
          <Button variant="secondary" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={createVendor.isPending || !name.trim()}>
            {createVendor.isPending ? 'Adding…' : 'Add vendor & resolve rows'}
          </Button>
        </div>
      </form>
    </div>
  );
}
