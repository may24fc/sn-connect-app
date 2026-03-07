'use client';

import { type ReactNode, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_LINKS, BUSINESS_UNITS } from '@/data/placeholder';

const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL ?? 'http://localhost:3001';

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  pathname: string;
}

export function MobileMenu({ open, onClose, pathname }: MobileMenuProps): ReactNode {
  const [businessesExpanded, setBusinessesExpanded] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-zinc-950/20 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close menu"
      />

      {/* Panel */}
      <div className="absolute top-14 right-0 bottom-0 w-full max-w-sm overflow-y-auto bg-white border-l border-zinc-200 shadow-xl">
        <nav className="flex flex-col p-4">
          {NAV_LINKS.map((link) => {
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
                      isActive ? 'text-indigo-600' : 'text-zinc-700 hover:bg-zinc-50'
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
                        href="/businesses"
                        onClick={onClose}
                        className="rounded-md px-3 py-2 text-sm text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                      >
                        All Businesses
                      </Link>
                      {BUSINESS_UNITS.map((unit) => (
                        <Link
                          key={unit.slug}
                          href={`/businesses/${unit.slug}`}
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
                  isActive ? 'text-indigo-600' : 'text-zinc-700 hover:bg-zinc-50'
                )}
              >
                {link.label}
              </Link>
            );
          })}

          {/* Login / Sign Up */}
          <div className="mt-4 border-t border-zinc-200 pt-4 px-3 flex flex-col gap-2">
            <a
              href={`${PORTAL_URL}/login`}
              onClick={onClose}
              className="flex items-center justify-center rounded-md border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Log in
            </a>
            <a
              href={`${PORTAL_URL}/signup`}
              onClick={onClose}
              className="flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              Sign up
            </a>
          </div>
        </nav>
      </div>
    </div>
  );
}
