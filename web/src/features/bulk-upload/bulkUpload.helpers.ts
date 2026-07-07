import type { BulkUploadRowDto, VendorSuggestionDto } from '@/types/api';

type EditableField = 'contractTitle' | 'vendorName' | 'category' | 'totalCost';

const VALID_CATEGORIES = new Set(['Event', 'Facilities', 'IT']);

/**
 * Apply a resolved vendor to a row: canonicalize the name, set the matched id,
 * and drop any vendor-related error. Rebuilds isValid from the remaining errors
 * so the row becomes committable if this was its only outstanding issue.
 */
export function applyVendorMatch(
  row: BulkUploadRowDto,
  vendor: VendorSuggestionDto,
): BulkUploadRowDto {
  const remainingErrors = row.errors.filter((message) => !mentionsVendor(message));
  return {
    ...row,
    vendorName: vendor.name,
    matchedVendorId: vendor.vendorId,
    errors: remainingErrors,
    isValid: remainingErrors.length === 0,
  };
}

/**
 * Apply a resolved vendor to every row whose current vendorName matches
 * (case-insensitive). Used after picking or creating a vendor so the fix
 * cascades to duplicate rows in the same batch.
 */
export function applyVendorMatchToAll(
  rows: BulkUploadRowDto[],
  targetName: string,
  vendor: VendorSuggestionDto,
): BulkUploadRowDto[] {
  const key = normalizeName(targetName);
  if (!key) return rows;
  return rows.map((row) =>
    normalizeName(row.vendorName) === key ? applyVendorMatch(row, vendor) : row,
  );
}

/**
 * After an inline edit, drop the error mentioning the edited field if the new
 * value now satisfies a client-side check. Vendor errors are NOT cleared here —
 * they only clear when the user picks/creates a vendor (which sets
 * matchedVendorId), because the commit endpoint requires a real vendor id.
 */
export function revalidateEditedField(
  row: BulkUploadRowDto,
  field: EditableField,
  value: string,
): BulkUploadRowDto {
  if (field === 'vendorName') return row;
  if (!fieldPassesClientCheck(field, value)) return row;

  const remainingErrors = row.errors.filter((message) => !mentionsField(message, field));
  if (remainingErrors.length === row.errors.length) return row;
  return {
    ...row,
    errors: remainingErrors,
    isValid: remainingErrors.length === 0,
  };
}

function fieldPassesClientCheck(field: EditableField, value: string): boolean {
  const trimmed = value.trim();
  if (field === 'contractTitle') return trimmed.length > 0;
  if (field === 'category') return VALID_CATEGORIES.has(trimmed);
  if (field === 'totalCost') return trimmed.length === 0 || !Number.isNaN(Number(trimmed));
  return false;
}

function mentionsField(message: string, field: EditableField): boolean {
  const lower = message.toLowerCase();
  if (field === 'contractTitle') return lower.includes('title');
  if (field === 'category') return lower.includes('category');
  if (field === 'totalCost')
    return lower.includes('cost') || lower.includes('value') || lower.includes('amount');
  return false;
}

function mentionsVendor(message: string): boolean {
  return message.toLowerCase().includes('vendor');
}

function normalizeName(name: string | null | undefined): string {
  return (name ?? '').trim().toLowerCase();
}
