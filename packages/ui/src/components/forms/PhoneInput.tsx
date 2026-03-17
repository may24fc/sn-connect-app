'use client';

import * as React from 'react';
import { cn } from '../../utils/cn';

export interface PhoneCountry {
  code: string;
  label: string;
  dialCode: string;
  flag: string;
}

export interface PhoneInputProps {
  /** Current phone number value */
  value?: string;
  /** Called when the phone number changes */
  onChange?: (value: string) => void;
  /** Called when the country changes */
  onCountryChange?: (countryCode: string) => void;
  /** Currently selected country code (e.g. 'PH') */
  countryCode?: string;
  /** List of supported countries */
  countries?: PhoneCountry[];
  /** Placeholder text */
  placeholder?: string;
  /** Whether the input has an error */
  error?: boolean;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether the field is required */
  required?: boolean;
  /** Input ID */
  id?: string;
  /** Additional class name for the wrapper */
  className?: string;
  /** Called on blur with the current value - can be used for formatting/validation */
  onBlur?: (value: string) => void;
}

const DEFAULT_COUNTRIES: PhoneCountry[] = [
  { code: 'PH', label: 'Philippines', dialCode: '+63', flag: '🇵🇭' },
  { code: 'US', label: 'United States', dialCode: '+1', flag: '🇺🇸' },
  { code: 'IT', label: 'Italy', dialCode: '+39', flag: '🇮🇹' },
  { code: 'AU', label: 'Australia', dialCode: '+61', flag: '🇦🇺' },
  { code: 'GB', label: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
  { code: 'DE', label: 'Germany', dialCode: '+49', flag: '🇩🇪' },
  { code: 'SG', label: 'Singapore', dialCode: '+65', flag: '🇸🇬' },
  { code: 'JP', label: 'Japan', dialCode: '+81', flag: '🇯🇵' },
  { code: 'KR', label: 'South Korea', dialCode: '+82', flag: '🇰🇷' },
  { code: 'IN', label: 'India', dialCode: '+91', flag: '🇮🇳' },
  { code: 'GLOBAL', label: 'Global', dialCode: '+', flag: '🌐' },
];

function normalizePhoneValue(value: string, country: PhoneCountry): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return country.code === 'GLOBAL' ? '' : country.dialCode;
  }

  if (trimmed.startsWith('+')) {
    return trimmed;
  }

  if (country.code === 'GLOBAL') {
    return trimmed;
  }

  const digitsOnly = trimmed.replace(/\s+/g, '').replace(/^0+/, '');
  return digitsOnly ? `${country.dialCode}${digitsOnly}` : country.dialCode;
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      value = '',
      onChange,
      onCountryChange,
      countryCode = 'PH',
      countries = DEFAULT_COUNTRIES,
      placeholder,
      error = false,
      disabled = false,
      required = false,
      id,
      className,
      onBlur,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    const fallbackCountry = countries[0] || DEFAULT_COUNTRIES[0]!;
    const selectedCountry = countries.find((c) => c.code === countryCode) || fallbackCountry;
    const displayPlaceholder = placeholder || `${selectedCountry?.dialCode || ''} Phone number`;

    // Close dropdown on outside click
    React.useEffect(() => {
      if (!isOpen) return undefined;
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleCountrySelect = (country: PhoneCountry) => {
      const normalized = normalizePhoneValue(value, country);
      onCountryChange?.(country.code);
      if (normalized !== value) {
        onChange?.(normalized);
      }
      setIsOpen(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.value);
    };

    const handleBlur = () => {
      const normalized = normalizePhoneValue(value, selectedCountry);
      if (normalized !== value) {
        onChange?.(normalized);
      }
      onBlur?.(normalized);
    };

    return (
      <div className={cn('relative flex items-center', className)} ref={dropdownRef}>
        {/* Country Selector Button */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'flex items-center gap-1 rounded-l-md border border-r-0 px-2.5 py-2 text-sm',
            'bg-zinc-50 hover:bg-zinc-100 transition-colors',
            'dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-700',
            'focus:outline-none focus:ring-2 focus:ring-slate-600/20',
            error && 'border-rose-600',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          aria-label="Select country code"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span className="text-base leading-none">{selectedCountry?.flag}</span>
          <span className="text-xs text-muted-foreground">{selectedCountry?.dialCode}</span>
          <svg
            className={cn(
              'h-3 w-3 text-muted-foreground transition-transform',
              isOpen && 'rotate-180'
            )}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Phone Number Input */}
        <input
          ref={ref}
          id={id}
          type="tel"
          value={value}
          onChange={handleInputChange}
          onBlur={handleBlur}
          disabled={disabled}
          required={required}
          placeholder={displayPlaceholder}
          className={cn(
            'flex h-10 w-full rounded-r-md border border-input bg-background px-3 py-2 text-sm',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-600/20 focus-visible:border-slate-600',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-rose-600 focus-visible:ring-rose-600/20 focus-visible:border-rose-600'
          )}
        />

        {/* Country Dropdown */}
        {isOpen && (
          <div
            className={cn(
              'absolute left-0 top-full z-50 mt-1 max-h-60 w-64 overflow-auto rounded-md border border-border bg-popover py-1 shadow-lg',
            )}
            role="listbox"
            aria-label="Select country"
          >
            {countries.map((country) => (
              <button
                key={country.code}
                type="button"
                role="option"
                aria-selected={country.code === countryCode}
                onClick={() => handleCountrySelect(country)}
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors',
                  'hover:bg-zinc-100 dark:hover:bg-zinc-800',
                  country.code === countryCode &&
                    'bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-400'
                )}
              >
                <span className="text-base">{country.flag}</span>
                <span className="flex-1 text-left">{country.label}</span>
                <span className="text-xs text-muted-foreground">{country.dialCode}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';
