import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/mws/Button';
import { ApiError, apiJson } from '@/lib/apiClient';
import { RoutingPreview } from './RoutingPreview';
import { queryKeys } from '@/lib/queryKeys';
import type { ContractDetailDto, VendorSuggestionDto } from '@/types/api';
import styles from './IntakeITScreen.module.css';

type ITType = 'Software' | 'ProfessionalServices';
type Licensing = 'Subscription' | 'Perpetual' | 'PerUser';
type Hosting = 'Cloud' | 'OnPremise' | 'Hybrid';

interface FormState {
  title: string;
  vendorId: number | null;
  totalCostUsd: string;
  termStartDate: string;
  termEndDate: string;
  description: string;
  itType: ITType | '';
  applicationName: string;
  applicationVersion: string;
  licensingType: Licensing | '';
  numberOfUsers: string;
  cloudOrOnPrem: Hosting | '';
  systemAccess: string;
  permissions: string;
  integrations: string;
  accessesPersonalData: boolean;
  accessesPHI: boolean;
  usesAI: boolean;
}

const INITIAL_FORM: FormState = {
  title: '',
  vendorId: null,
  totalCostUsd: '',
  termStartDate: '',
  termEndDate: '',
  description: '',
  itType: '',
  applicationName: '',
  applicationVersion: '',
  licensingType: '',
  numberOfUsers: '',
  cloudOrOnPrem: '',
  systemAccess: '',
  permissions: '',
  integrations: '',
  accessesPersonalData: false,
  accessesPHI: false,
  usesAI: false,
};

export function IntakeITScreen() {
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
        body: buildCreateBody(input),
      }),
    onSuccess: (detail) => navigate(`/contracts/${detail.contractId}`),
  });

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit.mutate(form);
  };

  return (
    <form className={styles.page} onSubmit={handleSubmit}>
      <header>
        <h1 className={styles.title}>New IT contract</h1>
        <p className={styles.subtitle}>
          Fill in everything Procurement needs to start the review on day one.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Contract basics</h2>
        <Field label="Contract title">
          <input
            type="text"
            value={form.title}
            onChange={(event) => updateField('title', event.target.value)}
            required
            className={styles.input}
          />
        </Field>
        <Field label="Vendor">
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
                      updateField('vendorId', vendor.vendorId);
                      setVendorQuery(vendor.name);
                    }}
                    className={`${styles.vendorOption} ${form.vendorId === vendor.vendorId ? styles.vendorOptionActive : ''}`}
                  >
                    <span>{vendor.name}</span>
                    {vendor.preferredStatus === 'Blacklisted' ? (
                      <span className={styles.warning}>Blacklisted</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </Field>
        <div className={styles.row}>
          <Field label="Total cost (USD)">
            <input
              type="text"
              inputMode="decimal"
              value={form.totalCostUsd}
              onChange={(event) => updateField('totalCostUsd', event.target.value)}
              className={styles.input}
            />
          </Field>
          <Field label="Term start">
            <input
              type="date"
              value={form.termStartDate}
              onChange={(event) => updateField('termStartDate', event.target.value)}
              className={styles.input}
            />
          </Field>
          <Field label="Term end">
            <input
              type="date"
              value={form.termEndDate}
              onChange={(event) => updateField('termEndDate', event.target.value)}
              className={styles.input}
            />
          </Field>
        </div>
        <Field label="Description (optional)">
          <textarea
            value={form.description}
            onChange={(event) => updateField('description', event.target.value)}
            rows={3}
            className={styles.input}
          />
        </Field>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>IT specifics</h2>
        <Field label="IT type">
          <select
            value={form.itType}
            onChange={(event) => updateField('itType', event.target.value as ITType | '')}
            required
            className={styles.input}
          >
            <option value="">Select…</option>
            <option value="Software">Software</option>
            <option value="ProfessionalServices">Professional services</option>
          </select>
        </Field>
        {form.itType === 'Software' ? (
          <>
            <div className={styles.row}>
              <Field label="Application name">
                <input
                  type="text"
                  value={form.applicationName}
                  onChange={(event) => updateField('applicationName', event.target.value)}
                  className={styles.input}
                />
              </Field>
              <Field label="Version / flavor (optional)">
                <input
                  type="text"
                  value={form.applicationVersion}
                  onChange={(event) => updateField('applicationVersion', event.target.value)}
                  className={styles.input}
                />
              </Field>
            </div>
            <div className={styles.row}>
              <Field label="Licensing">
                <select
                  value={form.licensingType}
                  onChange={(event) =>
                    updateField('licensingType', event.target.value as Licensing | '')
                  }
                  className={styles.input}
                >
                  <option value="">Select…</option>
                  <option value="Subscription">Subscription</option>
                  <option value="Perpetual">Perpetual</option>
                  <option value="PerUser">Per-user</option>
                </select>
              </Field>
              <Field label="Number of users">
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.numberOfUsers}
                  onChange={(event) => updateField('numberOfUsers', event.target.value)}
                  className={styles.input}
                />
              </Field>
              <Field label="Hosting">
                <select
                  value={form.cloudOrOnPrem}
                  onChange={(event) =>
                    updateField('cloudOrOnPrem', event.target.value as Hosting | '')
                  }
                  className={styles.input}
                >
                  <option value="">Select…</option>
                  <option value="Cloud">Cloud</option>
                  <option value="OnPremise">On-premise</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </Field>
            </div>
          </>
        ) : null}
        <Field label="System access (optional)">
          <textarea
            value={form.systemAccess}
            onChange={(event) => updateField('systemAccess', event.target.value)}
            rows={2}
            className={styles.input}
          />
        </Field>
        <Field label="Permissions (optional)">
          <textarea
            value={form.permissions}
            onChange={(event) => updateField('permissions', event.target.value)}
            rows={2}
            className={styles.input}
          />
        </Field>
        <Field label="Integrations (optional)">
          <textarea
            value={form.integrations}
            onChange={(event) => updateField('integrations', event.target.value)}
            rows={2}
            className={styles.input}
          />
        </Field>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Risk review</h2>
        <RiskToggle
          label="Accesses personal data"
          value={form.accessesPersonalData}
          onChange={(value) => updateField('accessesPersonalData', value)}
        />
        <RiskToggle
          label="Accesses PHI"
          value={form.accessesPHI}
          onChange={(value) => updateField('accessesPHI', value)}
        />
        <RiskToggle
          label="Uses AI"
          value={form.usesAI}
          onChange={(value) => updateField('usesAI', value)}
        />
      </section>

      <RoutingPreview
        category="IT"
        totalCostUsd={form.totalCostUsd ? Number(form.totalCostUsd) : null}
        flags={{
          cloudOrOnPrem: form.cloudOrOnPrem || null,
          accessesPHI: form.accessesPHI,
          accessesPersonalData: form.accessesPersonalData,
          usesAI: form.usesAI,
        }}
      />

      <footer className={styles.footer}>
        <Button variant="secondary" type="button" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button type="submit" disabled={submit.isPending || form.vendorId === null}>
          Submit for review
        </Button>
      </footer>
      {submit.error ? (
        <p className={styles.error}>Couldn&apos;t submit: {summariseError(submit.error)}</p>
      ) : null}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      {children}
    </label>
  );
}

function RiskToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <fieldset className={styles.risk}>
      <legend>{label}</legend>
      <label>
        <input type="radio" name={label} checked={value === true} onChange={() => onChange(true)} />
        Yes
      </label>
      <label>
        <input
          type="radio"
          name={label}
          checked={value === false}
          onChange={() => onChange(false)}
        />
        No
      </label>
    </fieldset>
  );
}

function buildCreateBody(form: FormState): Record<string, unknown> {
  return {
    title: form.title,
    category: 'IT',
    vendorId: form.vendorId,
    totalCostUsd: form.totalCostUsd ? Number(form.totalCostUsd) : null,
    termStartDate: form.termStartDate || null,
    termEndDate: form.termEndDate || null,
    description: form.description || null,
    itType: form.itType || null,
    applicationName: form.applicationName || null,
    applicationVersion: form.applicationVersion || null,
    licensingType: form.licensingType || null,
    numberOfUsers: form.numberOfUsers ? Number(form.numberOfUsers) : null,
    cloudOrOnPrem: form.cloudOrOnPrem || null,
    systemAccess: form.systemAccess || null,
    permissions: form.permissions || null,
    integrations: form.integrations || null,
    accessesPersonalData: form.accessesPersonalData,
    accessesPHI: form.accessesPHI,
    usesAI: form.usesAI,
  };
}

function summariseError(error: ApiError | Error): string {
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
