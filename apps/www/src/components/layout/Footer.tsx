import type { ReactNode } from 'react';
import Link from 'next/link';
import { COMPANY, BUSINESS_UNITS, NAV_LINKS } from '@/data/placeholder';

export function Footer(): ReactNode {
  return (
    <footer className="border-t border-zinc-200 bg-white text-zinc-900">
      <div className="section-max section-padding py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Business Units */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Business Units
            </h3>
            <ul className="space-y-2">
              {BUSINESS_UNITS.map((unit) => (
                <li key={unit.slug}>
                  <Link
                    href={`/businesses/${unit.slug}`}
                    className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
                  >
                    {unit.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Quick Links
            </h3>
            <ul className="space-y-2">
              {NAV_LINKS.filter((l) => !('hasMegaMenu' in l)).map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Contact
            </h3>
            <ul className="space-y-2">
              <li className="text-sm text-zinc-500">{COMPANY.address}</li>
              <li>
                <a
                  href={`tel:${COMPANY.phone}`}
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
                >
                  {COMPANY.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${COMPANY.email}`}
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
                >
                  {COMPANY.email}
                </a>
              </li>
            </ul>
          </div>

          {/* Branding */}
          <div>
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
                SN
              </div>
              <span className="text-sm font-semibold text-zinc-900">
                SN International Group
              </span>
            </Link>
            <p className="mt-2 text-sm text-zinc-500">
              Building Futures, Empowering Lives
            </p>
            <div className="mt-4 flex gap-4">
              <a
                href={COMPANY.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-zinc-400 transition-colors hover:text-zinc-700"
              >
                Facebook
              </a>
              <a
                href={COMPANY.social.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-zinc-400 transition-colors hover:text-zinc-700"
              >
                LinkedIn
              </a>
              <a
                href={COMPANY.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-zinc-400 transition-colors hover:text-zinc-700"
              >
                Instagram
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 border-t border-zinc-200 pt-6">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-zinc-400">
              &copy; {new Date().getFullYear()} SN International Group. All rights reserved.
            </p>
            <div className="flex gap-5">
              <Link
                href="/privacy"
                className="text-sm text-zinc-400 transition-colors hover:text-zinc-700"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-zinc-400 transition-colors hover:text-zinc-700"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
