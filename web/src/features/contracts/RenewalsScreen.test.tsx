import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { RenewalsScreen } from './RenewalsScreen';

/** Renewals screen — Coming Soon stub per ADR-038. */
describe('RenewalsScreen — Coming Soon stub', () => {
  it('RenewalsScreen — default render — surfaces the "Coming soon" badge and explanatory copy', () => {
    // Arrange + Act
    render(
      <MemoryRouter>
        <RenewalsScreen />
      </MemoryRouter>,
    );

    // Assert
    expect(screen.getByRole('heading', { name: /renewals/i })).toBeInTheDocument();
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
    expect(screen.getByText(/renewal reporting will be available/i)).toBeInTheDocument();
  });

  it('RenewalsScreen — axe accessibility — has no violations', async () => {
    // Arrange + Act
    const { container } = render(
      <MemoryRouter>
        <RenewalsScreen />
      </MemoryRouter>,
    );
    const results = await axe(container);

    // Assert
    expect(results.violations).toEqual([]);
  });
});
