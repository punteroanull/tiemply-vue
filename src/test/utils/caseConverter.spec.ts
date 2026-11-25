import { describe, it, expect } from 'vitest';
import { convertKeysToCamelCase, snakeToCamelCase } from '@/utils/caseConverter';

describe('caseConverter', () => {
  it('converts keys at every depth, through arrays', () => {
    const result = convertKeysToCamelCase({
      employee_records: [{ company_id: 'c1', department: { supervisor_id: 'e1' } }],
    });

    expect(result).toEqual({
      employeeRecords: [{ companyId: 'c1', department: { supervisorId: 'e1' } }],
    });
  });

  it('converts a segment that starts with a digit', () => {
    // Used to stop half way, at "addressLine_1".
    expect(snakeToCamelCase('address_line_1')).toBe('addressLine1');
    expect(snakeToCamelCase('last_30_days')).toBe('last30Days');
  });

  it('leaves values alone, including strings that look like keys', () => {
    const result = convertKeysToCamelCase({ category: 'shift_start', work_minutes: 0, notes: null });

    expect(result).toEqual({ category: 'shift_start', workMinutes: 0, notes: null });
  });

  it('leaves date and uuid keys as they are', () => {
    const input = { '2026-11-23': 1, '9b1f6c1e-0000-4000-8000-000000000000': 2 };

    expect(convertKeysToCamelCase(input)).toEqual(input);
  });

  it('passes null, undefined and primitives through', () => {
    expect(convertKeysToCamelCase(null)).toBeNull();
    expect(convertKeysToCamelCase(undefined)).toBeUndefined();
    expect(convertKeysToCamelCase('snake_case')).toBe('snake_case');
    expect(convertKeysToCamelCase([1, 'a_b'])).toEqual([1, 'a_b']);
  });
});
