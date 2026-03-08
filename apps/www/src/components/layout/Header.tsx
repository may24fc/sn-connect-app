'use client';

import { type ReactNode, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_LINKS, BUSINESS_UNITS } from '@/data/placeholder';
import { MegaMenu } from './MegaMenu';
import { MobileMenu } from './MobileMenu';

const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL ?? 'http://localhost:3001';

export function Header(): ReactNode {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMegaOpen(false);
  }, [pathname]);

  const closeMega = useCallback(() => setMegaOpen(false), []);

  return (
    <>
      <header
        className={cn(
          'fixed top-0 right-0 left-0 z-50 transition-all duration-300 bg-white',
          scrolled && 'border-b border-zinc-200 shadow-sm'
        )}
      >
        <div className="section-max px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
                SN
              </div>
              <span className="text-base font-semibold text-zinc-900">
                SN International
              </span>
            </Link>

            {/* Desktop Navigation — centered links */}
            <nav className="hidden items-center gap-0.5 lg:flex">
              {NAV_LINKS.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== '/' && pathname.startsWith(link.href));

                if ('hasMegaMenu' in link && link.hasMegaMenu) {
                  return (
                    <div
                      key={link.href}
                      className="relative"
                      onMouseEnter={() => setMegaOpen(true)}
                      onMouseLeave={() => setMegaOpen(false)}
                    >
                      <button
                        type="button"
                        className={cn(
                          'relative flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                          isActive
                            ? 'text-indigo-600'
                            : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                        )}
                        onClick={() => setMegaOpen((v) => !v)}
                        aria-expanded={megaOpen}
                        aria-haspopup="true"
                      >
                        {link.label}
                        <ChevronDown
                          className={cn(
                            'h-3.5 w-3.5 transition-transform',
                            megaOpen && 'rotate-180'
                          )}
                        />
                        {isActive && (
                          <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-indigo-600" />
                        )}
                      </button>
                      <MegaMenu
                        open={megaOpen}
                        onClose={closeMega}
                        businesses={BUSINESS_UNITS}
                      />
                    </div>
                  );
                }

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'text-indigo-600'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                    )}
                  >
                    {link.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-indigo-600" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Login / Sign Up */}
            <div className="hidden items-center gap-2 lg:flex">
              <a
                href={`${PORTAL_URL}/login`}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 hover:bg-zinc-50"
              >
                Log in
              </a>
            </div>

            {/* Mobile Hamburger */}
            <button
              type="button"
              className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100 lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <MobileMenu
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        pathname={pathname}
      />

      {/* Header spacer */}
      <div className="h-14" />
    </>
  );
}
