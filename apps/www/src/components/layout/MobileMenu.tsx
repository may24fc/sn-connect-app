'use client';

import { type ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';
import {
  getAppLoginUrl,
  HIDE_EXPANSION_SECTIONS,
  isTemporarilyHiddenPublicPath,
} from '@/lib/site-config';
import { cn } from '@/lib/utils';
import { NAV_LINKS, BUSINESS_UNITS } from '@/data/placeholder';

const LOGIN_URL = getAppLoginUrl();

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  pathname: string;
}

export function MobileMenu({ open, onClose, pathname }: MobileMenuProps): ReactNode {
  const [businessesExpanded, setBusinessesExpanded] = useState(false);

  // Lock body scroll while menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open || typeof window === 'undefined') return null;

  return createPortal(
    <div
      id="mobile-menu"
      className="fixed top-14 right-0 bottom-0 left-0 z-40 flex flex-col overflow-hidden border-t border-zinc-200 bg-white/95 supports-[backdrop-filter]:bg-white/80 backdrop-blur-lg lg:hidden"
    >
      <div className="animate-slide-down size-full overflow-y-auto">
        <nav className="flex flex-col p-4">
          {NAV_LINKS.filter(
            (link) => !HIDE_EXPANSION_SECTIONS || !isTemporarilyHiddenPublicPath(link.href)
          ).map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== '/' && pathname.startsWith(link.href));

            if ('hasMegaMenu' in link && link.hasMegaMenu) {
              return (
                <div key={link.href}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive ? 'text-primary-800' : 'text-zinc-700 hover:bg-zinc-50'
                    )}
                    onClick={() => setBusinessesExpanded((v) => !v)}
                  >
                    {link.label}
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform',
                        businessesExpanded && 'rotate-180'
                      )}
                    />
                  </button>

                  {businessesExpanded && (
                    <div className="ml-3 flex flex-col gap-0.5 border-l border-zinc-200 pl-3">
                      <Link
                        href="/#services"
                        onClick={onClose}
                        className="rounded-md px-3 py-2 text-sm text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                      >
                        All Services
                      </Link>
                      {BUSINESS_UNITS.map((unit) => (
                        <Link
                          key={unit.slug}
                          href={`/contact?service=${unit.slug}`}
                          onClick={onClose}
                          className="rounded-md px-3 py-2 text-sm text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                        >
                          {unit.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={cn(
                  'rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'text-primary-800' : 'text-zinc-700 hover:bg-zinc-50'
                )}
              >
                {link.label}
              </Link>
            );
          })}

          {/* Login / Sign Up */}
          <div className="mt-4 border-t border-zinc-200 pt-4 px-3 flex flex-col gap-2">
            <a
              href={LOGIN_URL}
              onClick={onClose}
              className="flex items-center justify-center rounded-md border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Log in
            </a>
            <a
              href={LOGIN_URL}
              onClick={onClose}
              className="flex items-center justify-center rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-900"
            >
              Sign up
            </a>
          </div>
        </nav>
      </div>
    </div>,
    document.body,
  );
}
