import { describe, it, expect } from 'vitest';
import { buildContractsCsv } from './exportCsv';
import type { ContractLane, Phase1Contract } from '@/types/phase1';

function lane(
  id: ContractLane['id'],
  status: ContractLane['status'],
  overrides: Partial<ContractLane> = {},
): ContractLane {
  return {
    id,
    status,
    owner: null,
    dueDate: null,
    lastUpdated: '2026-06-01',
    note: null,
    ...overrides,
  };
}

function makeContract(overrides: Partial<Phase1Contract> = {}): Phase1Contract {
  return {
    num: 'CTR-2026-0001',
    title: 'Example contract',
    vendor: 'Acme Corp',
    category: 'IT',
    requester: 'Alice Example',
    owner: 'Lisa Farkas',
    priority: 'medium',
    overallStatus: 'active',
    value: 10_000,
    startDate: '2026-01-01',
    endDate: '2027-01-01',
    description: '',
    lanes: [lane('procurement', 'in_review')],
    ...overrides,
  };
}

describe('buildContractsCsv', () => {
  it('buildContractsCsv — no rows — returns header row only', () => {
    // Arrange
    const sut = buildContractsCsv;

    // Act
    const csv = sut([]);

    // Assert
    expect(csv.split('\r\n')).toHaveLength(1);
    expect(csv).toMatch(/^Contract number,Title,Vendor,/);
  });

  it('buildContractsCsv — one contract — emits header + one row', () => {
    // Arrange
    const sut = buildContractsCsv;
    const rows = [makeContract()];

    // Act
    const csv = sut(rows);
    const lines = csv.split('\r\n');

    // Assert
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('CTR-2026-0001');
    expect(lines[1]).toContain('Acme Corp');
  });

  it('buildContractsCsv — title contains comma — quotes the field', () => {
    // Arrange
    const sut = buildContractsCsv;
    const rows = [makeContract({ title: 'Smith, Jones & Co' })];

    // Act
    const csv = sut(rows);

    // Assert
    expect(csv).toContain('"Smith, Jones & Co"');
  });

  it('buildContractsCsv — title contains a quote — escapes by doubling', () => {
    // Arrange
    const sut = buildContractsCsv;
    const rows = [makeContract({ title: 'He said "hi"' })];

    // Act
    const csv = sut(rows);

    // Assert
    expect(csv).toContain('"He said ""hi"""');
  });

  it('buildContractsCsv — collects only in_review and waiting lanes — into open-lanes cell', () => {
    // Arrange
    const sut = buildContractsCsv;
    const rows = [
      makeContract({
        lanes: [
          lane('legal', 'in_review'),
          lane('vendor', 'waiting'),
          lane('privacy', 'approved'),
          lane('infosec', 'not_started'),
        ],
      }),
    ];

    // Act
    const csv = sut(rows);
    const dataRow = csv.split('\r\n')[1];

    // Assert
    expect(dataRow).toContain('legal; vendor');
    expect(dataRow).not.toContain('privacy');
    expect(dataRow).not.toContain('infosec');
  });

  it('buildContractsCsv — null term dates — emits empty cells', () => {
    // Arrange
    const sut = buildContractsCsv;
    const rows = [makeContract({ startDate: null, endDate: null })];

    // Act
    const csv = sut(rows);
    const cells = csv.split('\r\n')[1].split(',');

    // Assert — start (index 9) and end (index 10) are empty
    expect(cells[9]).toBe('');
    expect(cells[10]).toBe('');
  });
});
