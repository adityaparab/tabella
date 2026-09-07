import type { Attribute, FieldValue } from '@tabella/shared';

export interface ValidationIssue {
  path: string;
  message: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?$/;

/**
 * Validate record data against the object's attribute definitions. Unknown keys are
 * rejected — the catalog is the contract (ADR-0001: field types are the app layer's job).
 */
export function validateRecordData(
  attributes: Attribute[],
  data: Record<string, FieldValue>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const byKey = new Map(attributes.map((attr) => [attr.key, attr]));

  for (const [key, value] of Object.entries(data)) {
    const attr = byKey.get(key);
    if (!attr) {
      issues.push({ path: key, message: `Unknown attribute "${key}"` });
      continue;
    }
    if (value === null) continue; // null clears a field
    const issue = validateValue(attr, value);
    if (issue) issues.push({ path: key, message: issue });
  }
  return issues;
}

function validateValue(attr: Attribute, value: Exclude<FieldValue, null>): string | null {
  switch (attr.type) {
    case 'text':
    case 'email':
    case 'url':
    case 'select':
    case 'date':
      if (typeof value !== 'string') return `Expected a string, got ${typeof value}`;
      if (attr.type === 'select' && attr.options.length > 0 && !attr.options.includes(value)) {
        return `"${value}" is not one of the allowed options`;
      }
      if (attr.type === 'date' && !ISO_DATE.test(value)) {
        return 'Expected an ISO date (YYYY-MM-DD or full ISO 8601)';
      }
      return null;
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
        ? null
        : 'Expected a finite number';
    case 'checkbox':
      return typeof value === 'boolean' ? null : 'Expected a boolean';
  }
}
