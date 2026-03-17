'use client';

import * as React from 'react';
import { cn } from '../../utils/cn';

export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
  flag: string;
}

export interface CurrencySelectorProps {
  /** Currently selected currency code */
  value?: string;
  /** Called when the currency selection changes */
  onChange?: (currencyCode: string) => void;
  /** List of available currencies */
  currencies?: CurrencyOption[];
  /** Current exchange rate display text (e.g., "1 USD = 55.50 PHP") */
  exchangeRateText?: string;
  /** Whether the selector has an error */
  error?: boolean;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Input ID */
  id?: string;
  /** Additional class name */
  className?: string;
}

const DEFAULT_CURRENCIES: CurrencyOption[] = [
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', flag: '🇵🇭' },
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵' },
];

export const CurrencySelector = React.forwardRef<HTMLButtonElement, CurrencySelectorProps>(
  (
    {
      value,
      onChange,
      currencies = DEFAULT_CURRENCIES,
      exchangeRateText,
      error = false,
      disabled = false,
      placeholder = 'Select currency',
      id,
      className,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    const selectedCurrency = currencies.find((c) => c.code === value);

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

    const handleSelect = (currency: CurrencyOption) => {
      onChange?.(currency.code);
      setIsOpen(false);
    };

    return (
      <div className={cn('relative', className)} ref={dropdownRef}>
        <button
          ref={ref}
          id={id}
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-slate-600/20 focus:border-slate-600',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-rose-600 focus:ring-rose-600/20'
          )}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          {selectedCurrency ? (
            <span className="flex items-center gap-2">
              <span>{selectedCurrency.flag}</span>
              <span className="font-medium">{selectedCurrency.code}</span>
              <span className="text-muted-foreground">({selectedCurrency.symbol})</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <svg
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
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

        {isOpen && (
          <div
            className={cn(
              'absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover py-1 shadow-lg',
            )}
            role="listbox"
          >
            {currencies.map((currency) => (
              <button
                key={currency.code}
                type="button"
                role="option"
                aria-selected={currency.code === value}
                onClick={() => handleSelect(currency)}
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors',
                  'hover:bg-zinc-100 dark:hover:bg-zinc-800',
                  currency.code === value &&
                    'bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-400'
                )}
              >
                <span className="text-base">{currency.flag}</span>
                <span className="font-medium">{currency.code}</span>
                <span className="flex-1 text-left text-muted-foreground">{currency.name}</span>
                <span className="text-xs text-muted-foreground">{currency.symbol}</span>
              </button>
            ))}
          </div>
        )}

        {exchangeRateText && (
          <p className="mt-1 text-xs text-muted-foreground">{exchangeRateText}</p>
        )}
      </div>
    );
  }
);

CurrencySelector.displayName = 'CurrencySelector';
