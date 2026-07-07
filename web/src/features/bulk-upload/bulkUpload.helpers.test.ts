import { describe, expect, it } from 'vitest';
import type { BulkUploadRowDto, VendorSuggestionDto } from '@/types/api';
import {
  applyVendorMatch,
  applyVendorMatchToAll,
  revalidateEditedField,
} from './bulkUpload.helpers';

function buildRow(overrides: Partial<BulkUploadRowDto> = {}): BulkUploadRowDto {
  return {
    rowNumber: 1,
    contractNumber: null,
    contractTitle: 'Acme SaaS renewal',
    vendorName: 'Acme',
    matchedVendorId: null,
    category: 'IT',
    priority: 'Medium',
    procurementOwnerUserId: null,
    requesterName: 'Alex',
    requesterEmail: 'alex@firm.example',
    totalCost: 12000,
    termStartDate: null,
    termEndDate: null,
    submittedDate: null,
    legacyStatus: null,
    isValid: false,
    errors: [],
    ...overrides,
  };
}

const acmeVendor: VendorSuggestionDto = {
  vendorId: 42,
  name: 'Acme Inc.',
  preferredStatus: 'Preferred',
};

describe('applyVendorMatch — vendor error present — row resolves to valid', () => {
  it('drops vendor errors, sets matched id, and canonicalizes the name', () => {
    // Arrange
    const row = buildRow({
      errors: ["Unknown vendor 'Acme'. Add the vendor first or correct the name."],
    });

    // Act
    const result = applyVendorMatch(row, acmeVendor);

    // Assert
    expect(result.matchedVendorId).toBe(42);
    expect(result.vendorName).toBe('Acme Inc.');
    expect(result.errors).toEqual([]);
    expect(result.isValid).toBe(true);
  });
});

describe('applyVendorMatch — vendor plus other errors — only vendor errors dropped', () => {
  it('keeps unrelated errors and leaves isValid false', () => {
    // Arrange
    const row = buildRow({
      errors: [
        "Unknown vendor 'Acme'. Add the vendor first or correct the name.",
        'Title is required.',
      ],
    });

    // Act
    const result = applyVendorMatch(row, acmeVendor);

    // Assert
    expect(result.errors).toEqual(['Title is required.']);
    expect(result.isValid).toBe(false);
    expect(result.matchedVendorId).toBe(42);
  });
});

describe('applyVendorMatchToAll — duplicate vendor names — cascades to every matching row', () => {
  it('resolves every row whose name matches (case-insensitive) and leaves others untouched', () => {
    // Arrange
    const rows = [
      buildRow({
        rowNumber: 1,
        vendorName: 'Acme',
        errors: ["Unknown vendor 'Acme'."],
      }),
      buildRow({
        rowNumber: 2,
        vendorName: 'ACME',
        errors: ["Unknown vendor 'ACME'."],
      }),
      buildRow({
        rowNumber: 3,
        vendorName: 'Globex',
        errors: ["Unknown vendor 'Globex'."],
      }),
    ];

    // Act
    const result = applyVendorMatchToAll(rows, 'Acme', acmeVendor);

    // Assert
    expect(result[0].matchedVendorId).toBe(42);
    expect(result[1].matchedVendorId).toBe(42);
    expect(result[2].matchedVendorId).toBeNull();
    expect(result[2].errors).toEqual(["Unknown vendor 'Globex'."]);
  });
});

describe('revalidateEditedField — title edited to non-empty — title error dropped', () => {
  it('removes the title error and marks row valid if it was the only error', () => {
    // Arrange
    const row = buildRow({ contractTitle: 'Filled in', errors: ['Title is required.'] });

    // Act
    const result = revalidateEditedField(row, 'contractTitle', 'Filled in');

    // Assert
    expect(result.errors).toEqual([]);
    expect(result.isValid).toBe(true);
  });
});

describe('revalidateEditedField — category edited to invalid value — error kept', () => {
  it('does not drop the category error if the new value is not a known category', () => {
    // Arrange
    const row = buildRow({ category: 'Junk', errors: ["Unknown category 'Junk'."] });

    // Act
    const result = revalidateEditedField(row, 'category', 'Junk');

    // Assert
    expect(result.errors).toEqual(["Unknown category 'Junk'."]);
    expect(result.isValid).toBe(false);
  });
});

describe('revalidateEditedField — vendorName edited — vendor error preserved', () => {
  it('never drops the vendor error on plain text edit (only pick/create clears it)', () => {
    // Arrange
    const row = buildRow({
      vendorName: 'Acme Inc.',
      errors: ["Unknown vendor 'Acme'."],
    });

    // Act
    const result = revalidateEditedField(row, 'vendorName', 'Acme Inc.');

    // Assert
    expect(result.errors).toEqual(["Unknown vendor 'Acme'."]);
    expect(result.matchedVendorId).toBeNull();
    expect(result.isValid).toBe(false);
  });
});
