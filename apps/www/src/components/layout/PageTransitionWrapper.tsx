'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import PageTransition from './PageTransition';

export function PageTransitionWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      {pathname !== '/' && <PageTransition key={pathname} />}
      {children}
    </>
  );
}
