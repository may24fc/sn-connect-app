'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ScrollProgress } from '@/components/shared/ScrollProgress';
import { AnnouncementBanner } from '@/components/layout/AnnouncementBanner';

const HIDE_LAYOUT_PATHS = new Set(['/']);

export function SiteFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideLayout = HIDE_LAYOUT_PATHS.has(pathname);

  return (
    <>
      {!hideLayout && (
        <>
          <ScrollProgress />
          <Header />
          <AnnouncementBanner />
        </>
      )}
      <main id="main-content">{children}</main>
      {!hideLayout && <Footer />}
    </>
  );
}
