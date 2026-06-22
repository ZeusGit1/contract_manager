/**
 * Phase 1 — categories and their per-category fields are data-driven config.
 * Adding a category or a field is a one-line edit here, not a code change
 * across the intake form, types, and tests. Phase 2 will expose an admin
 * UI that mutates this same shape at runtime.
 */

import type { Category } from '@/types/contract';

export type CategoryFieldType = 'text' | 'date' | 'select' | 'radio' | 'yn' | 'number';

export interface CategoryField {
  id: string;
  label: string;
  type: CategoryFieldType;
  helper?: string;
  options?: string[];
}

export interface CategoryConfig {
  id: Category;
  label: string;
  icon: string;
  fields: CategoryField[];
}

export const CATEGORIES_CONFIG: CategoryConfig[] = [
  {
    id: 'Event',
    label: 'Event',
    icon: 'ticket',
    fields: [
      { id: 'eventName', label: 'Event name', type: 'text' },
      { id: 'eventDate', label: 'Event date', type: 'date' },
      {
        id: 'venue',
        label: 'Venue',
        type: 'text',
        helper: 'Actual venue — may differ from the contracting vendor.',
      },
      {
        id: 'parentEvent',
        label: 'Parent conference / project',
        type: 'text',
        helper: 'Groups every contract tied to one larger event.',
      },
    ],
  },
  {
    id: 'Facilities',
    label: 'Facilities',
    icon: 'wrench',
    fields: [
      {
        id: 'building',
        label: 'Building / office',
        type: 'select',
        options: [
          '444 W Lake Street — Chicago',
          'One Vanderbilt — New York',
          '500 N Capitol — Washington DC',
          'Multi-office',
        ],
      },
    ],
  },
  {
    id: 'IT',
    label: 'IT',
    icon: 'desktop',
    fields: [
      {
        id: 'itType',
        label: 'Contract type',
        type: 'radio',
        options: ['Software', 'Professional services'],
      },
      { id: 'personalData', label: 'Accesses personal data', type: 'yn' },
      { id: 'phi', label: 'Accesses PHI', type: 'yn' },
      { id: 'usesAI', label: 'Uses AI or machine learning', type: 'yn' },
    ],
  },
];

export function categoryConfig(id: Category): CategoryConfig {
  const found = CATEGORIES_CONFIG.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown category: ${id}`);
  return found;
}
