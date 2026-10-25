import type { ClaimInput } from '@/src/types/api';

export type ClaimField = Exclude<keyof ClaimInput, 'itemCode' | 'evidence'>;
export type ClaimErrors = Partial<Record<ClaimField, string>>;

export function validateClaim(input: ClaimInput): ClaimErrors {
  const errors: ClaimErrors = {};
  const fields: [ClaimField, string, number, boolean][] = [
    ['firstName', 'First name', 50, true],
    ['middleName', 'Middle name', 50, false],
    ['lastName', 'Last name', 50, true],
    ['contactNumber', 'Contact number', 20, true],
    ['email', 'Email address', 254, true],
    ['lastSeenLocation', 'Last-seen location', 255, false],
    ['itemDescription', 'Item description', 1000, true],
    ['identifyingFeatures', 'Identifying features', 1000, true],
    ['contents', 'Contents', 1000, false],
    ['additionalEvidence', 'Additional evidence', 1000, false],
  ];
  for (const [field, label, max, required] of fields) {
    const value = input[field].trim();
    if (required && !value) errors[field] = `${label} is required.`;
    else if (value.length > max) errors[field] = `${label} must be ${max} characters or fewer.`;
  }
  if (input.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }
  if (input.lastSeenDateTime.trim()) {
    const value = input.lastSeenDateTime.trim();
    const date = new Date(value + ':00Z');
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 16) !== value) {
      errors.lastSeenDateTime = 'Enter a valid date/time as YYYY-MM-DDTHH:MM, or leave it blank.';
    }
  }
  return errors;
}
