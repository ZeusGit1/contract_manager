import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/mws/Badge';
import { Button } from '@/mws/Button';
import { TableEmptyRow, TableShell, TableSkeletonRows } from '@/mws/Table';
import { api, apiJson, ApiError } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import type { PagedResult, VendorRowDto, VendorSummaryDto } from '@/types/api';
import type { PreferredStatus, VendorType } from '@/types/contract';
import styles from './VendorMasterScreen.module.css';

const STATUS_BADGE: Record<PreferredStatus, 'live' | 'info' | 'pending' | 'failed'> = {
  Preferred: 'live',
  Standard: 'info',
  Difficult: 'pending',
  Blacklisted: 'failed',
};

const PREFERRED_STATUSES: PreferredStatus[] = ['Preferred', 'Standard', 'Difficult', 'Blacklisted'];
const VENDOR_TYPES: VendorType[] = [
  'EventVenue',
  'FacilitiesService',
  'Software',
  'ProfessionalServices',
];

interface CreateVendorPayload {
  name: string;
  type: VendorType;
  preferredStatus: PreferredStatus;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
}

interface UpdateVendorPayload {
  name?: string;
  preferredStatus?: PreferredStatus;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
  primaryContactPhone?: string | null;
  primaryContactRole?: string | null;
  location?: string | null;
  notes?: string | null;
}

export function VendorMasterScreen() {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PreferredStatus>('all');
  const [modalVendorId, setModalVendorId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const params = useMemo(
    () => ({
      query: query.trim() || undefined,
      preferredStatus: statusFilter === 'all' ? undefined : statusFilter,
    }),
    [query, statusFilter],
  );

  const vendorsQuery = useQuery<PagedResult<VendorRowDto>>({
    queryKey: queryKeys.vendors.list(params),
    queryFn: () => {
      const search = new URLSearchParams();
      if (params.query) search.set('query', params.query);
      if (params.preferredStatus) search.set('preferredStatus', params.preferredStatus);
      const qs = search.toString();
      return apiJson<PagedResult<VendorRowDto>>(`/api/vendors${qs ? `?${qs}` : ''}`);
    },
  });

  return (
    <div className={styles.page}>
      <header className={styles.headRow}>
        <div>
          <h1 className={styles.title}>Vendors</h1>
          <p className={styles.subtitle}>
            Every vendor the firm works with — status, contact, contract footprint.
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <i className="ph ph-plus" aria-hidden="true" /> Add vendor
        </Button>
      </header>
      <div className={styles.toolbar}>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search vendors"
          className={styles.search}
          aria-label="Search vendors"
        />
        <label className={styles.filterLabel}>
          <span className="visually-hidden">Filter by status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | PreferredStatus)}
            className={styles.filter}
          >
            <option value="all">All statuses</option>
            {PREFERRED_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>
      <TableShell minWidth={720}>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Type</th>
            <th scope="col">Status</th>
            <th scope="col">Primary contact</th>
            <th scope="col" className={styles.numeric}>
              Contracts
            </th>
          </tr>
        </thead>
        <tbody>
          {vendorsQuery.isLoading ? (
            <TableSkeletonRows columnCount={5} />
          ) : vendorsQuery.error ? (
            <TableEmptyRow colSpan={5}>
              Couldn&apos;t load vendors. Refresh to try again.
            </TableEmptyRow>
          ) : (vendorsQuery.data?.items ?? []).length === 0 ? (
            <TableEmptyRow colSpan={5}>No vendors match your search.</TableEmptyRow>
          ) : (
            (vendorsQuery.data?.items ?? []).map((vendor) => (
              <tr
                key={vendor.vendorId}
                className={styles.vendorRow}
                onClick={() => setModalVendorId(vendor.vendorId)}
              >
                <td>
                  <button
                    type="button"
                    className={styles.vendorNameButton}
                    onClick={(event) => {
                      event.stopPropagation();
                      setModalVendorId(vendor.vendorId);
                    }}
                    aria-haspopup="dialog"
                  >
                    {vendor.name}
                  </button>
                </td>
                <td>{vendor.type}</td>
                <td>
                  <Badge status={STATUS_BADGE[vendor.preferredStatus]}>
                    {vendor.preferredStatus}
                  </Badge>
                </td>
                <td>{vendor.primaryContactName ?? '—'}</td>
                <td className={styles.numeric}>{vendor.contractCount}</td>
              </tr>
            ))
          )}
        </tbody>
      </TableShell>
      {modalVendorId !== null ? (
        <VendorModal vendorId={modalVendorId} onClose={() => setModalVendorId(null)} />
      ) : null}
      {showAdd ? <AddVendorModal onClose={() => setShowAdd(false)} /> : null}
    </div>
  );
}

function VendorModal({ vendorId, onClose }: { vendorId: number; onClose: () => void }) {
  const detailQuery = useQuery<VendorSummaryDto>({
    queryKey: queryKeys.vendors.detail(vendorId),
    queryFn: () => apiJson<VendorSummaryDto>(`/api/vendors/${vendorId}`),
  });

  return (
    <div role="dialog" aria-modal="true" className={styles.modalScrim} onClick={onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <header className={styles.modalHead}>
          <h2 className={styles.modalTitle}>{detailQuery.data?.name ?? 'Vendor'}</h2>
          <button
            type="button"
            className={styles.closeBtn}
            aria-label="Close vendor summary"
            onClick={onClose}
          >
            <i className="ph ph-x" aria-hidden="true" />
          </button>
        </header>
        {detailQuery.isLoading ? (
          <p>Loading vendor…</p>
        ) : detailQuery.error || !detailQuery.data ? (
          <p>Couldn&apos;t load this vendor.</p>
        ) : (
          // Keying on the vendor's Updated marker means each fresh copy remounts the
          // form, seeding local state from props — no set-state-in-effect anti-pattern.
          <VendorEditForm
            key={`${detailQuery.data.vendorId}:${detailQuery.data.name}:${detailQuery.data.preferredStatus}`}
            vendor={detailQuery.data}
            vendorId={vendorId}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

/**
 * In-modal edit form for a vendor. Reads seed values from the loaded summary; PATCH-only
 * sends fields the user actually touched. Also carries a Delete affordance — the server
 * returns 409 if the vendor still has contracts, which we surface as an inline message.
 */
function VendorEditForm({
  vendor,
  vendorId,
  onClose,
}: {
  vendor: VendorSummaryDto;
  vendorId: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(vendor.name);
  const [preferredStatus, setPreferredStatus] = useState<PreferredStatus>(vendor.preferredStatus);
  const [primaryContactName, setPrimaryContactName] = useState(vendor.primaryContactName ?? '');
  const [primaryContactEmail, setPrimaryContactEmail] = useState(vendor.primaryContactEmail ?? '');
  const [primaryContactPhone, setPrimaryContactPhone] = useState(vendor.primaryContactPhone ?? '');
  const [primaryContactRole, setPrimaryContactRole] = useState(vendor.primaryContactRole ?? '');
  const [location, setLocation] = useState(vendor.location ?? '');
  const [notes, setNotes] = useState(vendor.notes ?? '');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const updateVendor = useMutation<void, ApiError, UpdateVendorPayload>({
    mutationFn: async (payload) => {
      await api(`/api/vendors/${vendorId}`, { method: 'PATCH', body: payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.detail(vendorId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all });
    },
  });

  const deleteVendor = useMutation<void, ApiError, void>({
    mutationFn: async () => {
      await api(`/api/vendors/${vendorId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all });
      onClose();
    },
  });

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    setSaveError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setSaveError('Vendor name is required.');
      return;
    }
    // PATCH only sends fields that differ from the loaded record — avoids sending
    // "empty string wins" for fields the user didn't touch.
    const payload: UpdateVendorPayload = {};
    if (trimmedName !== vendor.name) payload.name = trimmedName;
    if (preferredStatus !== vendor.preferredStatus) payload.preferredStatus = preferredStatus;
    if (primaryContactName !== (vendor.primaryContactName ?? '')) {
      payload.primaryContactName = primaryContactName || null;
    }
    if (primaryContactEmail !== (vendor.primaryContactEmail ?? '')) {
      payload.primaryContactEmail = primaryContactEmail || null;
    }
    if (primaryContactPhone !== (vendor.primaryContactPhone ?? '')) {
      payload.primaryContactPhone = primaryContactPhone || null;
    }
    if (primaryContactRole !== (vendor.primaryContactRole ?? '')) {
      payload.primaryContactRole = primaryContactRole || null;
    }
    if (location !== (vendor.location ?? '')) payload.location = location || null;
    if (notes !== (vendor.notes ?? '')) payload.notes = notes || null;

    if (Object.keys(payload).length === 0) {
      // Nothing changed — treat as a no-op close.
      onClose();
      return;
    }
    updateVendor.mutate(payload, {
      onSuccess: () => onClose(),
      onError: (err) => setSaveError(err.message),
    });
  };

  const handleDelete = () => {
    setDeleteError(null);
    deleteVendor.mutate(undefined, {
      onError: (err) => setDeleteError(err.message),
    });
  };

  return (
    <form onSubmit={handleSave}>
      <div className={styles.modalStatus}>
        <Badge status={STATUS_BADGE[vendor.preferredStatus]}>{vendor.preferredStatus}</Badge>
        <span>{vendor.type}</span>
      </div>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Vendor name</span>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          className={styles.fieldInput}
        />
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Vendor status</span>
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
      <label className={styles.field}>
        <span className={styles.fieldLabel}>
          Primary contact <span className={styles.fieldOptional}>(optional)</span>
        </span>
        <input
          type="text"
          value={primaryContactName}
          onChange={(event) => setPrimaryContactName(event.target.value)}
          className={styles.fieldInput}
        />
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>
          Contact email <span className={styles.fieldOptional}>(optional)</span>
        </span>
        <input
          type="email"
          value={primaryContactEmail}
          onChange={(event) => setPrimaryContactEmail(event.target.value)}
          className={styles.fieldInput}
        />
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>
          Contact phone <span className={styles.fieldOptional}>(optional)</span>
        </span>
        <input
          type="tel"
          value={primaryContactPhone}
          onChange={(event) => setPrimaryContactPhone(event.target.value)}
          className={styles.fieldInput}
        />
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>
          Contact role <span className={styles.fieldOptional}>(optional)</span>
        </span>
        <input
          type="text"
          value={primaryContactRole}
          onChange={(event) => setPrimaryContactRole(event.target.value)}
          className={styles.fieldInput}
        />
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>
          Location <span className={styles.fieldOptional}>(optional)</span>
        </span>
        <input
          type="text"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          className={styles.fieldInput}
        />
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>
          Notes <span className={styles.fieldOptional}>(optional)</span>
        </span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          className={styles.fieldInput}
        />
      </label>

      {saveError ? <p className={styles.fieldError}>{saveError}</p> : null}
      {deleteError ? <p className={styles.fieldError}>{deleteError}</p> : null}

      {vendor.contracts.length > 0 ? (
        <>
          <h3 className={styles.contractsHeading}>Contracts ({vendor.contracts.length})</h3>
          <ul className={styles.contractList}>
            {vendor.contracts.map((contract) => (
              <li key={contract.contractId}>
                <a href={`/contracts/${contract.contractId}`}>{contract.title}</a>
                <span className={styles.contractMeta}>
                  {contract.contractNumber} · {contract.category}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <div className={styles.modalActions}>
        {confirmingDelete ? (
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleteVendor.isPending}
            >
              Keep
            </Button>
            <Button
              type="button"
              icon="trash"
              onClick={handleDelete}
              disabled={deleteVendor.isPending}
            >
              {deleteVendor.isPending ? 'Deleting…' : 'Confirm delete'}
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="secondary"
              icon="trash"
              onClick={() => setConfirmingDelete(true)}
              disabled={vendor.contracts.length > 0}
              title={
                vendor.contracts.length > 0
                  ? 'Vendor has contracts — reassign or delete them first.'
                  : undefined
              }
            >
              Delete vendor
            </Button>
            <div style={{ flex: 1 }} />
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateVendor.isPending}>
              {updateVendor.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}

function AddVendorModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [type, setType] = useState<VendorType>('Software');
  const [preferredStatus, setPreferredStatus] = useState<PreferredStatus>('Standard');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const createVendor = useMutation<VendorSummaryDto, Error, CreateVendorPayload>({
    mutationFn: (payload) =>
      apiJson<VendorSummaryDto>('/api/vendors', { method: 'POST', body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all });
      onClose();
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
    <div role="dialog" aria-modal="true" className={styles.modalScrim} onClick={onClose}>
      <form
        className={styles.modal}
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <header className={styles.modalHead}>
          <h2 className={styles.modalTitle}>Add vendor</h2>
          <button
            type="button"
            className={styles.closeBtn}
            aria-label="Close add vendor"
            onClick={onClose}
          >
            <i className="ph ph-x" aria-hidden="true" />
          </button>
        </header>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Vendor name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className={styles.fieldInput}
            autoFocus
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
          <p className={styles.fieldError}>
            {createVendor.error.message || "Couldn't save the vendor. Try again."}
          </p>
        ) : null}
        <div className={styles.modalActions}>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createVendor.isPending || !name.trim()}>
            {createVendor.isPending ? 'Adding…' : 'Add vendor'}
          </Button>
        </div>
      </form>
    </div>
  );
}
