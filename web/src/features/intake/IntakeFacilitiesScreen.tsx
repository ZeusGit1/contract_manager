import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/mws/Button';
import { ApiError, apiJson } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import type { ContractDetailDto, VendorSuggestionDto } from '@/types/api';
import { RoutingPreview } from './RoutingPreview';
import styles from './IntakeITScreen.module.css';

interface FormState {
  title: string;
  vendorId: number | null;
  totalCostUsd: string;
  termStartDate: string;
  termEndDate: string;
  serviceDescription: string;
}

const INITIAL_FORM: FormState = {
  title: '',
  vendorId: null,
  totalCostUsd: '',
  termStartDate: '',
  termEndDate: '',
  serviceDescription: '',
};

export function IntakeFacilitiesScreen() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [vendorQuery, setVendorQuery] = useState('');

  const vendorsQuery = useQuery<VendorSuggestionDto[]>({
    queryKey: queryKeys.vendors.autocomplete(vendorQuery),
    queryFn: () =>
      apiJson<VendorSuggestionDto[]>(
        `/api/vendors/autocomplete${vendorQuery ? `?q=${encodeURIComponent(vendorQuery)}` : ''}`,
      ),
  });

  const submit = useMutation<ContractDetailDto, ApiError, FormState>({
    mutationFn: (input) =>
      apiJson<ContractDetailDto>('/api/contracts', {
        method: 'POST',
        body: {
          title: input.title,
          category: 'Facilities',
          vendorId: input.vendorId,
          totalCostUsd: input.totalCostUsd ? Number(input.totalCostUsd) : null,
          termStartDate: input.termStartDate || null,
          termEndDate: input.termEndDate || null,
          serviceDescription: input.serviceDescription || null,
        },
      }),
    onSuccess: (detail) => navigate(`/contracts/${detail.contractId}`),
  });

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <form
      className={styles.page}
      onSubmit={(event) => {
        event.preventDefault();
        submit.mutate(form);
      }}
    >
      <header>
        <h1 className={styles.title}>New facilities contract</h1>
        <p className={styles.subtitle}>
          Janitorial, property management, furniture, records storage — anything that keeps the
          building running.
        </p>
      </header>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Contract basics</h2>
        <label className={styles.field}>
          <span className={styles.label}>Contract title</span>
          <input
            type="text"
            required
            value={form.title}
            onChange={(event) => update('title', event.target.value)}
            className={styles.input}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Vendor</span>
          <input
            type="search"
            value={vendorQuery}
            onChange={(event) => setVendorQuery(event.target.value)}
            placeholder="Search vendors…"
            className={styles.input}
          />
          {vendorsQuery.data && vendorsQuery.data.length > 0 ? (
            <ul className={styles.vendorSuggestions} aria-label="Vendor suggestions">
              {vendorsQuery.data.map((vendor) => (
                <li key={vendor.vendorId}>
                  <button
                    type="button"
                    onClick={() => {
                      update('vendorId', vendor.vendorId);
                      setVendorQuery(vendor.name);
                    }}
                    className={`${styles.vendorOption} ${form.vendorId === vendor.vendorId ? styles.vendorOptionActive : ''}`}
                  >
                    {vendor.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </label>
        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.label}>Total cost (USD)</span>
            <input
              type="text"
              inputMode="decimal"
              value={form.totalCostUsd}
              onChange={(event) => update('totalCostUsd', event.target.value)}
              className={styles.input}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Term start</span>
            <input
              type="date"
              value={form.termStartDate}
              onChange={(event) => update('termStartDate', event.target.value)}
              className={styles.input}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Term end</span>
            <input
              type="date"
              value={form.termEndDate}
              onChange={(event) => update('termEndDate', event.target.value)}
              className={styles.input}
            />
          </label>
        </div>
        <label className={styles.field}>
          <span className={styles.label}>Service description</span>
          <textarea
            required
            rows={4}
            value={form.serviceDescription}
            onChange={(event) => update('serviceDescription', event.target.value)}
            className={styles.input}
          />
        </label>
      </section>
      <RoutingPreview
        category="Facilities"
        totalCostUsd={form.totalCostUsd ? Number(form.totalCostUsd) : null}
      />

      <footer className={styles.footer}>
        <Button variant="secondary" type="button" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button type="submit" disabled={submit.isPending || form.vendorId === null}>
          Submit for review
        </Button>
      </footer>
      {submit.error ? <p className={styles.error}>{summarise(submit.error)}</p> : null}
    </form>
  );
}

function summarise(error: ApiError | Error): string {
  if (
    error instanceof ApiError &&
    error.problem &&
    typeof error.problem === 'object' &&
    'detail' in error.problem
  ) {
    return String((error.problem as { detail: unknown }).detail);
  }
  return error.message;
}
