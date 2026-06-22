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
  status: 'OutForSignature',
  vendorName: 'Adobe Inc.',
  vendorId: 99,
  assignedReviewerName: 'Lisa Farkas',
  assignedReviewerTeam: 'Procurement',
  assignedReviewerUserId: '11111111-1111-1111-1111-111111111111',
  totalCostUsd: 218000,
  termEndDate: '2027-07-31',
  lastActionAt: '2026-06-25T00:00:00Z',
  nextActionDueAt: '2026-07-15T00:00:00Z',
  needsAttention: false,
  attentionReason: null,
};

describe('ContractTable', () => {
  it('ContractTable — loading state — shows the loading row', () => {
    // Arrange + Act
    const { getByText } = render(
      <MemoryRouter>
        <ContractTable rows={[]} isLoading error={null} />
      </MemoryRouter>,
    );

    // Assert
    expect(getByText(/loading contracts/i)).toBeInTheDocument();
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

  it('ContractTable — populated rows — renders the contract title and status badge', () => {
    // Arrange + Act
    const { getByText } = render(
      <MemoryRouter>
        <ContractTable rows={[ROW]} isLoading={false} error={null} />
      </MemoryRouter>,
    );

    // Assert — the contract row hits the table; status maps to "Out for signature".
    expect(getByText(ROW.title)).toBeInTheDocument();
    expect(getByText('Out for signature')).toBeInTheDocument();
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
