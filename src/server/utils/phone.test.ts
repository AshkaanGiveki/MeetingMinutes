import { describe, expect, it } from 'vitest';
import { normalizeIranianPhoneNumber } from './phone';

describe('normalizeIranianPhoneNumber', () => {
  it.each([
    ['+989121234567', '09121234567'],
    ['00989121234567', '09121234567'],
    ['989121234567', '09121234567'],
    ['9121234567', '09121234567'],
    ['۰۹۱۲۱۲۳۴۵۶۷', '09121234567'],
    ['09121234567', '09121234567'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeIranianPhoneNumber(input)).toBe(expected);
  });

  it('rejects non-Iranian or malformed numbers', () => {
    expect(() => normalizeIranianPhoneNumber('+14155552671')).toThrow();
    expect(() => normalizeIranianPhoneNumber('0912123456')).toThrow();
  });
});
