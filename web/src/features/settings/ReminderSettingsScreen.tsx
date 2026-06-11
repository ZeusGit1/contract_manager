import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/mws/Button';
import { apiJson } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import type { ReminderSettingDto } from '@/types/api';
import type { Category } from '@/types/contract';
import styles from './ReminderSettingsScreen.module.css';

const CATEGORIES: Category[] = ['Event', 'Facilities', 'IT'];
const CADENCE_OPTIONS = [
  { value: 7, label: 'Every week' },
  { value: 14, label: 'Every 2 weeks' },
  { value: 28, label: 'Every 4 weeks' },
  { value: 56, label: 'Every 8 weeks' },
];

export function ReminderSettingsScreen() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery<ReminderSettingDto[]>({
    queryKey: queryKeys.reminderSettings,
    queryFn: () => apiJson<ReminderSettingDto[]>('/api/reminder-settings'),
  });

  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.title}>Reminder settings</h1>
        <p className={styles.subtitle}>
          Configure the cadence and message for the &quot;out for signature&quot; reminder loop.
          Reminders fire only while a contract is awaiting signature, and stop on any other status
          change.
        </p>
      </header>
      {settingsQuery.isLoading ? (
        <p>Loading settings…</p>
      ) : settingsQuery.error ? (
        <p className={styles.error}>Couldn&apos;t load reminder settings.</p>
      ) : (
        <div className={styles.grid}>
          {CATEGORIES.map((category) => {
            const setting = (settingsQuery.data ?? []).find((row) => row.category === category);
            // Remount when the underlying setting identity changes so form state seeds from the
            // latest server value without an effect-based sync (lint rule react-hooks/set-state-in-effect).
            const remountKey = `${category}:${setting?.cadenceDays ?? -1}:${setting?.isEnabled ?? 'unset'}`;
            return (
              <CategoryCard
                key={remountKey}
                category={category}
                initial={setting}
                onSaved={() =>
                  queryClient.invalidateQueries({ queryKey: queryKeys.reminderSettings })
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

interface CardProps {
  category: Category;
  initial: ReminderSettingDto | undefined;
  onSaved: () => void;
}

function CategoryCard({ category, initial, onSaved }: CardProps) {
  // Form state seeded once on mount; parent remounts via key when `initial` changes.
  const [cadence, setCadence] = useState<number>(initial?.cadenceDays ?? 14);
  const [template, setTemplate] = useState<string>(initial?.templateBody ?? '');
  const [enabled, setEnabled] = useState<boolean>(initial?.isEnabled ?? true);

  const saveMutation = useMutation<ReminderSettingDto, Error, void>({
    mutationFn: () =>
      apiJson<ReminderSettingDto>(`/api/reminder-settings/${category}`, {
        method: 'PUT',
        body: { cadenceDays: cadence, templateBody: template, isEnabled: enabled },
      }),
    onSuccess: onSaved,
  });

  return (
    <section className={styles.card}>
      <header className={styles.cardHead}>
        <h2 className={styles.cardTitle}>{category}</h2>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          {enabled ? 'On' : 'Off'}
        </label>
      </header>
      <label className={styles.field}>
        <span className={styles.label}>Cadence</span>
        <select
          className={styles.input}
          value={cadence}
          onChange={(event) => setCadence(Number.parseInt(event.target.value, 10))}
        >
          {CADENCE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Reminder message</span>
        <textarea
          className={styles.input}
          rows={4}
          value={template}
          onChange={(event) => setTemplate(event.target.value)}
        />
        <span className={styles.helper}>
          Merge fields available: <code>{`{contractName}`}</code>, <code>{`{vendorName}`}</code>,{' '}
          <code>{`{requesterName}`}</code>.
        </span>
      </label>
      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
        Save {category} settings
      </Button>
      {saveMutation.error ? <p className={styles.error}>{saveMutation.error.message}</p> : null}
      {saveMutation.isSuccess ? <p className={styles.success}>Saved.</p> : null}
    </section>
  );
}
