import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import { ContractTable } from './index';
import type { ContractRowDto } from '@/types/api';

const ROW: ContractRowDto = {
  contractId: 42,
  contractNumber: 'CN-2026-0042',
  title: 'Adobe Creative Cloud renewal',
  category: 'IT',
  overallStatus: 'Active',
  priority: 'High',
  vendorId: 99,
  vendorName: 'Adobe Inc.',
  requesterUserId: '00000000-0000-0000-0000-000000000001',
  requesterName: 'Frank Moss',
  procurementOwnerUserId: '00000000-0000-0000-0000-000000000002',
  procurementOwnerName: 'Lisa Farkas',
  totalCostUsd: 218000,
  termStartDate: '2026-08-01T00:00:00Z',
  termEndDate: '2027-07-31T00:00:00Z',
  submittedAt: '2026-06-01T00:00:00Z',
  lastActionAt: '2026-06-25T00:00:00Z',
  activeLaneCount: 3,
  lanes: [
    { laneId: 'Procurement', status: 'InReview', ownerName: 'Lisa Farkas', dueDate: null },
    { laneId: 'Legal', status: 'Approved', ownerName: 'Outside counsel', dueDate: null },
    { laneId: 'InfoSec', status: 'Waiting', ownerName: 'Priya Nair', dueDate: null },
  ],
};

describe('ContractTable', () => {
  it('ContractTable — loading state — renders skeleton rows', () => {
    // Arrange + Act
    const { container, queryByText } = render(
      <MemoryRouter>
        <ContractTable rows={[]} isLoading error={null} />
      </MemoryRouter>,
    );

    // Assert — TableSkeletonRows emits aria-hidden rows with .skelBar cells.
    // Six skeleton rows is the primitive's default when rowCount is unspecified.
    const skeletonRows = container.querySelectorAll('tbody tr[aria-hidden="true"]');
    expect(skeletonRows.length).toBeGreaterThan(0);
    expect(queryByText(/no contracts/i)).toBeNull();
  });

  it('ContractTable — empty rows + not loading — shows the empty message', () => {
    // Arrange + Act
    const { getByText } = render(
      <MemoryRouter>
        <ContractTable rows={[]} isLoading={false} error={null} emptyMessage="Nothing here yet." />
      </MemoryRouter>,
    );

    // Assert
    expect(getByText('Nothing here yet.')).toBeInTheDocument();
  });

  it('ContractTable — populated rows — renders title, priority, and overall status', () => {
    // Arrange + Act
    const { getByText } = render(
      <MemoryRouter>
        <ContractTable rows={[ROW]} isLoading={false} error={null} />
      </MemoryRouter>,
    );

    // Assert — contract title, priority label, and overall-status badge render.
    expect(getByText(ROW.title)).toBeInTheDocument();
    expect(getByText('High')).toBeInTheDocument();
    expect(getByText('Active')).toBeInTheDocument();
  });

  it('ContractTable — accessibility — no axe violations on populated state', async () => {
    // Arrange + Act
    const { container } = render(
      <MemoryRouter>
        <ContractTable rows={[ROW]} isLoading={false} error={null} />
      </MemoryRouter>,
    );
    const results = await axe(container);

    // Assert
    expect(results.violations).toEqual([]);
  });
});
