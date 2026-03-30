'use client';

import { type ReactNode, useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import {
  getAppLoginUrl,
  HIDE_EXPANSION_SECTIONS,
  isTemporarilyHiddenPublicPath,
} from '@/lib/site-config';
import { cn } from '@/lib/utils';
import { NAV_LINKS, BUSINESS_UNITS } from '@/data/placeholder';
import { MenuToggleIcon } from '@/components/ui/menu-toggle-icon';
import { useScroll } from '@/components/ui/use-scroll';
import { MegaMenu } from './MegaMenu';
import { MobileMenu } from './MobileMenu';

const LOGIN_URL = getAppLoginUrl();

export function Header(): ReactNode {
  const pathname = usePathname();
  const scrolled = useScroll(10);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
    setMegaOpen(false);
  }, [pathname]);

  const closeMega = useCallback(() => setMegaOpen(false), []);

  return (
    <>
      <header
        className={cn(
          'fixed top-0 right-0 left-0 z-50 w-full border-b border-transparent transition-all duration-300',
          scrolled
            ? 'bg-white/95 border-zinc-200 shadow-sm supports-[backdrop-filter]:bg-white/80 backdrop-blur-lg'
            : 'bg-white'
        )}
      >
        <div className="section-max px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <div className="shrink-0">
                <Image
                  src="/sn-logo.png"
                  alt="SN International logo"
                  width={60}
                  height={24}
                  priority
                  unoptimized
                  className="h-6 w-auto object-contain"
                  sizes="60px"
                />
              </div>
              <div className="leading-none">
                <span className="block text-sm font-semibold uppercase tracking-[0.2em] text-zinc-950">
                  SN International
                </span>
              </div>
            </Link>

            {/* Desktop Navigation — centered links */}
            <nav className="hidden items-center gap-0.5 lg:flex">
              {NAV_LINKS.filter(
                (link) => !HIDE_EXPANSION_SECTIONS || !isTemporarilyHiddenPublicPath(link.href)
              ).map((link) => {
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
                            ? 'text-primary-800'
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
                          <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-primary-800" />
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
                        ? 'text-primary-800'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                    )}
                  >
                    {link.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-primary-800" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Login / Sign Up */}
            <div className="hidden items-center gap-2 lg:flex">
              <a
                href={LOGIN_URL}
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
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              aria-label="Toggle menu"
            >
              <MenuToggleIcon open={mobileOpen} className="h-5 w-5" duration={300} />
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
