'use client';

import {
  ClearFiltersButton,
  FILTER_ALL_VALUE,
  FilterDateInput,
  FilterSearchInput,
  FilterSelect,
} from '@/components/data-display/FilterControls';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, useEffect, useState, useTransition } from 'react';

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Compact filter toolbar for the finance ledger. Filters apply as they change by
 * updating the URL; the server page still validates and runs every query.
 */
export function FinanceExpenseFilters({
  month,
  search,
  category,
  categories,
}: {
  month: string;
  search: string;
  category: string;
  categories: Array<{ code: string; name: string }>;
}): ReactNode {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [searchDraft, setSearchDraft] = useState(search);

  const apply = (updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete('page');
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: apply reads the latest URL on each call; only a new draft should restart the debounce
  useEffect(() => {
    if (searchDraft.trim() === search) return;
    const timer = setTimeout(() => apply({ q: searchDraft.trim() }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchDraft]);

  const activeCount = [month, search, category].filter(Boolean).length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSearchInput
        placeholder="Search vendor…"
        value={searchDraft}
        onChange={setSearchDraft}
        maxLength={100}
      />
      <FilterDateInput
        label="Month"
        type="month"
        value={month}
        onChange={(value) => apply({ month: value })}
      />
      <FilterSelect
        label="Category"
        value={category || FILTER_ALL_VALUE}
        onValueChange={(value) => apply({ category: value === FILTER_ALL_VALUE ? '' : value })}
        options={categories.map((item) => ({ value: item.code, label: item.name }))}
      />
      <ClearFiltersButton
        count={activeCount}
        onClear={() => {
          setSearchDraft('');
          apply({ month: '', q: '', category: '' });
        }}
      />
    </div>
  );
}
