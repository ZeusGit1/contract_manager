import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/mws/Badge';
import { Button } from '@/mws/Button';
import { TableEmptyRow, TableShell, TableSkeletonRows } from '@/mws/Table';
import { apiJson } from '@/lib/apiClient';
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

interface UpdateVendorStatusPayload {
  preferredStatus: PreferredStatus;
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
  const queryClient = useQueryClient();
  const detailQuery = useQuery<VendorSummaryDto>({
    queryKey: queryKeys.vendors.detail(vendorId),
    queryFn: () => apiJson<VendorSummaryDto>(`/api/vendors/${vendorId}`),
  });

  const updateStatus = useMutation<void, Error, UpdateVendorStatusPayload>({
    mutationFn: (payload) =>
      apiJson<void>(`/api/vendors/${vendorId}`, { method: 'PATCH', body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.detail(vendorId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all });
    },
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
          <>
            <div className={styles.modalStatus}>
              <Badge status={STATUS_BADGE[detailQuery.data.preferredStatus]}>
                {detailQuery.data.preferredStatus}
              </Badge>
              <span>{detailQuery.data.type}</span>
            </div>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Vendor status</span>
              <select
                value={detailQuery.data.preferredStatus}
                disabled={updateStatus.isPending}
                onChange={(event) =>
                  updateStatus.mutate({
                    preferredStatus: event.target.value as PreferredStatus,
                  })
                }
                className={styles.fieldInput}
              >
                {PREFERRED_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <span className={styles.fieldHint}>
                Procurement updates this as the vendor relationship evolves.
              </span>
              {updateStatus.error ? (
                <span className={styles.fieldError}>
                  Couldn&apos;t save the new status. Try again.
                </span>
              ) : null}
            </label>
            {detailQuery.data.notes ? <p>{detailQuery.data.notes}</p> : null}
            <dl className={styles.modalFacts}>
              <Fact label="Primary contact" value={detailQuery.data.primaryContactName} />
              <Fact label="Email" value={detailQuery.data.primaryContactEmail} />
              <Fact label="Phone" value={detailQuery.data.primaryContactPhone} />
              <Fact label="Location" value={detailQuery.data.location} />
            </dl>
            <h3 className={styles.contractsHeading}>
              Contracts ({detailQuery.data.contracts.length})
            </h3>
            <ul className={styles.contractList}>
              {detailQuery.data.contracts.map((contract) => (
                <li key={contract.contractId}>
                  <a href={`/contracts/${contract.contractId}`}>{contract.title}</a>
                  <span className={styles.contractMeta}>
                    {contract.contractNumber} · {contract.category}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value ?? '—'}</dd>
    </div>
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
