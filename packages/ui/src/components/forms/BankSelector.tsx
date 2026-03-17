'use client';

import * as React from 'react';
import { cn } from '../../utils/cn';

export interface BankOption {
  id: string;
  bankName: string;
  bankCode?: string;
  countryCode: string;
}

export interface BankSelectorProps {
  /** Currently selected bank ID */
  value?: string;
  /** Called when a bank is selected (passes bank ID, or 'OTHER' for custom) */
  onChange?: (bankId: string, bankName: string) => void;
  /** List of available banks */
  banks?: BankOption[];
  /** Currently selected country code to filter banks */
  countryCode?: string;
  /** Whether to show the "Other" option with freeform input */
  allowOther?: boolean;
  /** Custom bank name when "Other" is selected */
  customBankName?: string;
  /** Called when custom bank name changes */
  onCustomBankNameChange?: (name: string) => void;
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
  /** Whether the field is required */
  required?: boolean;
}

export const BankSelector = React.forwardRef<HTMLDivElement, BankSelectorProps>(
  (
    {
      value,
      onChange,
      banks = [],
      countryCode,
      allowOther = true,
      customBankName = '',
      onCustomBankNameChange,
      error = false,
      disabled = false,
      placeholder = 'Search and select a bank...',
      id,
      className,
      required = false,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState('');
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const isOtherSelected = value === 'OTHER';

    // Filter banks by country code and search term
    const filteredBanks = React.useMemo(() => {
      let result = banks;
      if (countryCode) {
        result = result.filter(
          (bank) => bank.countryCode === countryCode || bank.countryCode === 'GLOBAL'
        );
      }
      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        result = result.filter(
          (bank) =>
            bank.bankName.toLowerCase().includes(lower) ||
            (bank.bankCode && bank.bankCode.toLowerCase().includes(lower))
        );
      }
      return result;
    }, [banks, countryCode, searchTerm]);

    const selectedBank = banks.find((b) => b.id === value);

    // Close dropdown on outside click
    React.useEffect(() => {
      if (!isOpen) return undefined;
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          setSearchTerm('');
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleOpen = () => {
      if (!disabled) {
        setIsOpen(true);
        setSearchTerm('');
        // Focus search input after opening
        setTimeout(() => inputRef.current?.focus(), 10);
      }
    };

    const handleSelect = (bank: BankOption) => {
      onChange?.(bank.id, bank.bankName);
      setIsOpen(false);
      setSearchTerm('');
    };

    const handleSelectOther = () => {
      onChange?.('OTHER', customBankName || '');
      setIsOpen(false);
      setSearchTerm('');
    };

    return (
      <div className={cn('relative', className)} ref={dropdownRef}>
        <div ref={ref}>
          {/* Trigger Button */}
          <button
            id={id}
            type="button"
            onClick={handleOpen}
            disabled={disabled}
            className={cn(
              'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-left',
              'focus:outline-none focus:ring-2 focus:ring-slate-600/20 focus:border-slate-600',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-rose-600 focus:ring-rose-600/20'
            )}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-required={required}
          >
            {selectedBank ? (
              <span className="flex items-center gap-2 truncate">
                <span className="font-medium">{selectedBank.bankName}</span>
                {selectedBank.bankCode && (
                  <span className="text-xs text-muted-foreground">({selectedBank.bankCode})</span>
                )}
              </span>
            ) : isOtherSelected ? (
              <span className="text-zinc-700 dark:text-zinc-300">Other Bank</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <svg
              className={cn(
                'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
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

          {/* Dropdown */}
          {isOpen && (
            <div
              className={cn(
                'absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-lg',
              )}
              role="listbox"
            >
              {/* Search Input */}
              <div className="border-b border-zinc-200 p-2 dark:border-zinc-700">
                <input
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search banks..."
                  className={cn(
                    'w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-slate-600/20 focus:border-slate-600',
                  )}
                />
              </div>

              {/* Bank List */}
              <div className="max-h-48 overflow-auto py-1">
                {filteredBanks.length === 0 && !allowOther ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No banks found{countryCode ? ` for ${countryCode}` : ''}.
                  </div>
                ) : (
                  <>
                    {filteredBanks.map((bank) => (
                      <button
                        key={bank.id}
                        type="button"
                        role="option"
                        aria-selected={bank.id === value}
                        onClick={() => handleSelect(bank)}
                        className={cn(
                          'flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors',
                          'hover:bg-zinc-100 dark:hover:bg-zinc-800',
                          bank.id === value &&
                            'bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-400'
                        )}
                      >
                        <span className="flex-1 text-left">{bank.bankName}</span>
                        {bank.bankCode && (
                          <span className="text-xs text-muted-foreground">{bank.bankCode}</span>
                        )}
                      </button>
                    ))}
                    {allowOther && (
                      <>
                        <div className="mx-3 my-1 border-t border-zinc-200 dark:border-zinc-700" />
                        <button
                          type="button"
                          role="option"
                          aria-selected={isOtherSelected}
                          onClick={handleSelectOther}
                          className={cn(
                            'flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors',
                            'hover:bg-zinc-100 dark:hover:bg-zinc-800',
                            isOtherSelected &&
                              'bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-400'
                          )}
                        >
                          <span className="flex-1 text-left italic">Other (enter manually)</span>
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Custom bank name input when "Other" is selected */}
        {isOtherSelected && (
          <input
            type="text"
            value={customBankName}
            onChange={(e) => onCustomBankNameChange?.(e.target.value)}
            placeholder="Enter bank name"
            className={cn(
              'mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-600/20 focus-visible:border-slate-600',
            )}
          />
        )}
      </div>
    );
  }
);

BankSelector.displayName = 'BankSelector';
