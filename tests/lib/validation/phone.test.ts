import { describe, expect, it } from 'vitest';
import {
  SUPPORTED_COUNTRIES,
  formatPhoneNumber,
  getDefaultCountryCode,
  getPhoneCountryCode,
  validatePhoneNumber,
} from '../../../apps/web/src/lib/validation/phone';

describe('Phone Validation', () => {
  describe('validatePhoneNumber', () => {
    it('validates Philippine numbers (+63)', () => {
      expect(validatePhoneNumber('+639171234567')).toBe(true);
      expect(validatePhoneNumber('09171234567', 'PH')).toBe(true);
      expect(validatePhoneNumber('+639171234567', 'PH')).toBe(true);
    });

    it('validates Italian numbers (+39)', () => {
      expect(validatePhoneNumber('+393401234567')).toBe(true);
      expect(validatePhoneNumber('3401234567', 'IT')).toBe(true);
    });

    it('validates US numbers (+1)', () => {
      expect(validatePhoneNumber('+12025551234')).toBe(true);
      expect(validatePhoneNumber('2025551234', 'US')).toBe(true);
    });

    it('validates Australian numbers (+61)', () => {
      expect(validatePhoneNumber('+61412345678')).toBe(true);
      expect(validatePhoneNumber('0412345678', 'AU')).toBe(true);
    });

    it('validates UK numbers (+44)', () => {
      expect(validatePhoneNumber('+447911123456')).toBe(true);
      expect(validatePhoneNumber('07911123456', 'GB')).toBe(true);
    });

    it('validates German numbers (+49)', () => {
      expect(validatePhoneNumber('+4915112345678')).toBe(true);
      expect(validatePhoneNumber('015112345678', 'DE')).toBe(true);
    });

    it('rejects empty or invalid input', () => {
      expect(validatePhoneNumber('')).toBe(false);
      expect(validatePhoneNumber('   ')).toBe(false);
      expect(validatePhoneNumber('abc')).toBe(false);
      expect(validatePhoneNumber('123')).toBe(false);
    });

    it('rejects numbers that are too short', () => {
      expect(validatePhoneNumber('+6391712', 'PH')).toBe(false);
    });

    it('rejects numbers that are too long', () => {
      expect(validatePhoneNumber('+63917123456789012', 'PH')).toBe(false);
    });
  });

  describe('formatPhoneNumber', () => {
    it('formats PH number to international format', () => {
      const formatted = formatPhoneNumber('09171234567', 'PH');
      expect(formatted).toBe('+63 917 123 4567');
    });

    it('formats US number to international format', () => {
      const formatted = formatPhoneNumber('2025551234', 'US');
      expect(formatted).toBe('+1 202 555 1234');
    });

    it('returns original string for invalid numbers', () => {
      expect(formatPhoneNumber('abc')).toBe('abc');
      expect(formatPhoneNumber('')).toBe('');
    });
  });

  describe('getPhoneCountryCode', () => {
    it('detects PH country code', () => {
      expect(getPhoneCountryCode('+639171234567')).toBe('PH');
    });

    it('detects US country code', () => {
      expect(getPhoneCountryCode('+12025551234')).toBe('US');
    });

    it('returns null for invalid numbers', () => {
      expect(getPhoneCountryCode('')).toBeNull();
      expect(getPhoneCountryCode('abc')).toBeNull();
    });
  });

  describe('getDefaultCountryCode', () => {
    it('returns a supported country code', () => {
      const result = getDefaultCountryCode();
      const supportedCodes = SUPPORTED_COUNTRIES.map((c) => c.code);
      expect(supportedCodes).toContain(result);
    });
  });

  describe('SUPPORTED_COUNTRIES', () => {
    it('contains at least PH, US, IT, AU, GB, DE', () => {
      const codes = SUPPORTED_COUNTRIES.map((c) => c.code);
      expect(codes).toContain('PH');
      expect(codes).toContain('US');
      expect(codes).toContain('IT');
      expect(codes).toContain('AU');
      expect(codes).toContain('GB');
      expect(codes).toContain('DE');
    });

    it('each country has required fields', () => {
      for (const country of SUPPORTED_COUNTRIES) {
        expect(country.code).toBeTruthy();
        expect(country.label).toBeTruthy();
        expect(country.dialCode).toBeTruthy();
        expect(country.flag).toBeTruthy();
      }
    });
  });
});
