'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, useTransition } from 'react';
import { PaginationBar, type PaginationBarProps } from './PaginationBar';

/**
 * PaginationBar for server-rendered lists that read `?page=` from the URL.
 * Server Components cannot pass an onPageChange callback, so this sets the param itself.
 */
export function UrlPaginationBar(
  props: Omit<PaginationBarProps, 'onPageChange' | 'isLoading'>
): ReactNode {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  return (
    <PaginationBar
      {...props}
      isLoading={isPending}
      onPageChange={(page) => {
        const next = new URLSearchParams(searchParams.toString());
        if (page <= 1) next.delete('page');
        else next.set('page', String(page));
        startTransition(() => router.push(`${pathname}?${next.toString()}`));
      }}
    />
  );
}
