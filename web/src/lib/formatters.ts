/** Locale-aware formatters used across the UI. */

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const shortDateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
});

const fullDateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const weekdayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'long' });
const longMonthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long' });

export function formatUsd(value: number | null | undefined): string {
  if (value == null) return '—';
  return currencyFormatter.format(value);
}

export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return shortDateFormatter.format(new Date(iso));
}

export function formatFullDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return fullDateFormatter.format(new Date(iso));
}

export function formatTodayHeader(now = new Date()): string {
  const weekday = weekdayFormatter.format(now);
  const month = longMonthFormatter.format(now);
  return `${weekday}, ${now.getDate()} ${month}`;
}

export function daysFromToday(iso: string | null | undefined, today = new Date()): number | null {
  if (!iso) return null;
  const target = new Date(iso);
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const targetUtc = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((targetUtc - todayUtc) / (1000 * 60 * 60 * 24));
}
