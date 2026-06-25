'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, type ReactNode } from 'react';
import { PageTransitionContext } from './PageTransitionContext';
import PageTransition from './PageTransition';

export function PageTransitionWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router]
  );

  return (
    <PageTransitionContext.Provider value={{ navigate }}>
      {pathname !== '/' && <PageTransition key={pathname} />}
      {children}
    </PageTransitionContext.Provider>
  );
}
