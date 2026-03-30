'use client';

import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUp, Linkedin } from 'lucide-react';
import {
  isTemporarilyHiddenPublicPath,
} from '@/lib/site-config';
import { COMPANY, BUSINESS_UNITS, NAV_LINKS } from '@/data/placeholder';

function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-20 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-primary-800 text-white shadow-lg transition-all hover:bg-black hover:shadow-xl"
      aria-label="Back to top"
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}

export function Footer(): ReactNode {
  return (
    <>
      <footer className="relative overflow-hidden border-t border-zinc-800 bg-zinc-900 text-white">
        {/* Subtle gradient pattern at top */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-400/70 to-transparent" />

        <div className="section-max section-padding py-14">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Services
              </h3>
              <ul className="space-y-2">
                {BUSINESS_UNITS.map((unit) => (
                  <li key={unit.slug}>
                    <Link
                      href={`/contact?service=${unit.slug}`}
                      className="text-sm text-zinc-400 transition-colors hover:text-white"
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
                {NAV_LINKS.filter((l) => !('hasMegaMenu' in l))
                  .filter((link) => !isTemporarilyHiddenPublicPath(link.href))
                  .map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-zinc-400 transition-colors hover:text-white"
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
                {/* <li>
                  <a
                    href={`tel:${COMPANY.phone}`}
                    className="text-sm text-zinc-400 transition-colors hover:text-white"
                  >
                    {COMPANY.phone}
                  </a>
                </li> */}
                <li>
                  <a
                    href={`mailto:${COMPANY.email}`}
                    className="text-sm text-zinc-400 transition-colors hover:text-white"
                  >
                    {COMPANY.email}
                  </a>
                </li>
              </ul>
            </div>

            {/* Branding + Newsletter */}
            <div>
              <Link href="/" className="flex items-center">
                <div className="relative h-6 w-[3.75rem]">
                  <Image
                    src="/sn-logo.png"
                    alt="SN International logo"
                    fill
                    className="object-contain"
                    sizes="60px"
                  />
                </div>
                <div>
                  <span className="block text-sm font-semibold text-white">
                    SN International Group
                  </span>
                </div>
              </Link>
              <p className="mt-2 text-sm text-zinc-400">
                {COMPANY.tagline}
              </p>

              {/* Social icons */}
              <div className="mt-4 flex gap-3">
                <a
                  href={COMPANY.social.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-zinc-400 transition-all hover:bg-primary-800 hover:text-white"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
              </div>

              {/* Newsletter */}
              {/* <div className="mt-5">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Newsletter
                </h4>
                <NewsletterSignup />
              </div> */}
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-10 border-t border-zinc-800 pt-6">
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-sm text-zinc-500">
                &copy; {new Date().getFullYear()} SN International Group. All rights reserved.
              </p>
              <div className="flex gap-5">
                <Link
                  href="/privacy"
                  className="text-sm text-zinc-500 transition-colors hover:text-white"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/terms"
                  className="text-sm text-zinc-500 transition-colors hover:text-white"
                >
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
      <BackToTop />
    </>
  );
}
