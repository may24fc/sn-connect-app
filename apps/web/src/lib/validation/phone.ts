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
  { code: 'GLOBAL' as const, label: 'Global', dialCode: '+', flag: '🌐' },
] as const;

export type SupportedCountryCode = (typeof SUPPORTED_COUNTRIES)[number]['code'];

export function isSupportedPhoneCountryCode(value: string): value is SupportedCountryCode {
  return SUPPORTED_COUNTRIES.some((country) => country.code === value);
}

export function getDialCode(countryCode?: SupportedCountryCode | CountryCode): string {
  if (!countryCode) return '+63';

  const match = SUPPORTED_COUNTRIES.find((country) => country.code === countryCode);
  return match?.dialCode || '+63';
}

export function prefixPhoneWithDialCode(
  number: string,
  countryCode: SupportedCountryCode | CountryCode = 'PH'
): string {
  const trimmed = number.trim();

  if (!trimmed) {
    return countryCode === 'GLOBAL' ? '' : getDialCode(countryCode);
  }

  if (trimmed.startsWith('+')) {
    return trimmed;
  }

  if (countryCode === 'GLOBAL') {
    return trimmed;
  }

  const stripped = trimmed.replace(/\s+/g, '').replace(/^0+/, '');
  return stripped ? `${getDialCode(countryCode)}${stripped}` : getDialCode(countryCode);
}

export function normalizePhoneNumber(
  number: string,
  countryCode: SupportedCountryCode | CountryCode = 'PH'
): string {
  const prefixed = prefixPhoneWithDialCode(number, countryCode);
  if (!prefixed) return prefixed;

  try {
    if (countryCode === 'GLOBAL') {
      const parsed = parsePhoneNumber(prefixed);
      return parsed?.number || prefixed;
    }

    const parsed = parsePhoneNumber(prefixed, countryCode as CountryCode);
    return parsed?.number || prefixed;
  } catch {
    return prefixed;
  }
}

/**
 * Validate a phone number, optionally against a specific country code.
 * Uses libphonenumber-js for industry-standard validation.
 */
export function validatePhoneNumber(
  number: string,
  countryCode: SupportedCountryCode | CountryCode = 'GLOBAL'
): boolean {
  if (!number || number.trim().length === 0) return false;

  const normalized = normalizePhoneNumber(number, countryCode);

  try {
    if (countryCode === 'GLOBAL') {
      return normalized.startsWith('+') && isValidPhoneNumber(normalized);
    }

    return isValidPhoneNumber(normalized, countryCode as CountryCode);
  } catch {
    return false;
  }
}

/**
 * Format a phone number to international format.
 * Returns the original string if parsing fails.
 */
export function formatPhoneNumber(
  number: string,
  countryCode: SupportedCountryCode | CountryCode = 'GLOBAL'
): string {
  if (!number || number.trim().length === 0) return number;
  try {
    const normalized = normalizePhoneNumber(number, countryCode);
    const parsed =
      countryCode === 'GLOBAL'
        ? parsePhoneNumber(normalized)
        : parsePhoneNumber(normalized, countryCode as CountryCode);
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
