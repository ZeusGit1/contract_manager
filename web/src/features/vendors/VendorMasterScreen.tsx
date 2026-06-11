import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/mws/Badge';
import { apiJson } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import type { PagedResult, VendorRowDto, VendorSummaryDto } from '@/types/api';
import type { PreferredStatus } from '@/types/contract';
import styles from './VendorMasterScreen.module.css';

const STATUS_BADGE: Record<PreferredStatus, 'live' | 'info' | 'pending' | 'failed'> = {
  Preferred: 'live',
  Standard: 'info',
  Difficult: 'pending',
  Blacklisted: 'failed',
};

export function VendorMasterScreen() {
  const [query, setQuery] = useState('');
  const [modalVendorId, setModalVendorId] = useState<number | null>(null);

  const params = useMemo(() => ({ query: query.trim() || undefined }), [query]);

  const vendorsQuery = useQuery<PagedResult<VendorRowDto>>({
    queryKey: queryKeys.vendors.list(params),
    queryFn: () => {
      const qs = params.query ? `?query=${encodeURIComponent(params.query)}` : '';
      return apiJson<PagedResult<VendorRowDto>>(`/api/vendors${qs}`);
    },
  });

  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.title}>Vendors</h1>
        <p className={styles.subtitle}>
          Every vendor the firm works with — status, contact, contract footprint.
        </p>
      </header>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search vendors"
        className={styles.search}
        aria-label="Search vendors"
      />
      <div className={styles.tableShell}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Status</th>
              <th>Primary contact</th>
              <th className={styles.numeric}>Contracts</th>
            </tr>
          </thead>
          <tbody>
            {vendorsQuery.isLoading ? (
              <tr>
                <td colSpan={5} className={styles.emptyRow}>
                  Loading vendors…
                </td>
              </tr>
            ) : vendorsQuery.error ? (
              <tr>
                <td colSpan={5} className={styles.emptyRow}>
                  Couldn&apos;t load vendors. Refresh to try again.
                </td>
              </tr>
            ) : (vendorsQuery.data?.items ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.emptyRow}>
                  No vendors match your search.
                </td>
              </tr>
            ) : (
              (vendorsQuery.data?.items ?? []).map((vendor) => (
                <tr key={vendor.vendorId} onClick={() => setModalVendorId(vendor.vendorId)}>
                  <td>{vendor.name}</td>
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
        </table>
      </div>
      {modalVendorId !== null ? (
        <VendorModal vendorId={modalVendorId} onClose={() => setModalVendorId(null)} />
      ) : null}
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
          <>
            <div className={styles.modalStatus}>
              <Badge status={STATUS_BADGE[detailQuery.data.preferredStatus]}>
                {detailQuery.data.preferredStatus}
              </Badge>
              <span>{detailQuery.data.type}</span>
            </div>
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
