import { type CountryCode, isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js';

/** Supported country codes with labels and dial codes */
export const SUPPORTED_COUNTRIES = [
  { code: 'PH' as CountryCode, label: 'Philippines', dialCode: '+63', flag: '🇵🇭' },
  { code: 'US' as CountryCode, label: 'United States', dialCode: '+1', flag: '🇺🇸' },
  { code: 'IT' as CountryCode, label: 'Italy', dialCode: '+39', flag: '🇮🇹' },
  { code: 'AU' as CountryCode, label: 'Australia', dialCode: '+61', flag: '🇦🇺' },
  { code: 'GB' as CountryCode, label: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
  { code: 'DE' as CountryCode, label: 'Germany', dialCode: '+49', flag: '🇩🇪' },
  { code: 'SG' as CountryCode, label: 'Singapore', dialCode: '+65', flag: '🇸🇬' },
  { code: 'JP' as CountryCode, label: 'Japan', dialCode: '+81', flag: '🇯🇵' },
  { code: 'KR' as CountryCode, label: 'South Korea', dialCode: '+82', flag: '🇰🇷' },
  { code: 'IN' as CountryCode, label: 'India', dialCode: '+91', flag: '🇮🇳' },
] as const;

export type SupportedCountryCode = (typeof SUPPORTED_COUNTRIES)[number]['code'];

/**
 * Validate a phone number, optionally against a specific country code.
 * Uses libphonenumber-js for industry-standard validation.
 */
export function validatePhoneNumber(number: string, countryCode?: CountryCode): boolean {
  if (!number || number.trim().length === 0) return false;
  try {
    return isValidPhoneNumber(number, countryCode);
  } catch {
    return false;
  }
}

/**
 * Format a phone number to international format.
 * Returns the original string if parsing fails.
 */
export function formatPhoneNumber(number: string, countryCode?: CountryCode): string {
  if (!number || number.trim().length === 0) return number;
  try {
    const parsed = parsePhoneNumber(number, countryCode);
    if (parsed) return parsed.formatInternational();
    return number;
  } catch {
    return number;
  }
}

/**
 * Detect the country code from a phone number string.
 * Returns null if detection fails.
 */
export function getPhoneCountryCode(number: string): CountryCode | null {
  if (!number || number.trim().length === 0) return null;
  try {
    const parsed = parsePhoneNumber(number);
    return (parsed?.country as CountryCode) ?? null;
  } catch {
    return null;
  }
}

/**
 * Get the default country code based on the browser's language/locale.
 * Falls back to 'PH' if detection fails.
 */
export function getDefaultCountryCode(): CountryCode {
  if (typeof navigator === 'undefined') return 'PH';

  const locale = navigator.language || 'en-PH';
  const regionMatch = locale.match(/-([A-Z]{2})$/i);
  if (regionMatch?.[1]) {
    const region = regionMatch[1].toUpperCase() as CountryCode;
    if (SUPPORTED_COUNTRIES.some((c) => c.code === region)) return region;
  }
  return 'PH';
}
