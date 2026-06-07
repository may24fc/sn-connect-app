'use client';

import { getLenis } from '@/hooks/useSmoothScroll';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface MenuItem {
  name: string;
  href: string;
}

const menuItems: MenuItem[] = [
  { name: 'Services', href: '/businesses' },
  { name: 'About Us', href: '/about' },
  { name: 'Our Team', href: '/team' },
];

export default function Navbar() {
  const [inWhatWeDo, setInWhatWeDo] = useState(false);
  const pathname = usePathname();

  const handleLogoClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (pathname === '/') {
        e.preventDefault();
        const lenis = getLenis();
        if (lenis) {
          lenis.scrollTo(0, { duration: 1.4, easing: (t: number) => 1 - Math.pow(1 - t, 3) });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    },
    [pathname]
  );

  useEffect(() => {
    const startEl = document.getElementById('what-we-do-scroll-root');
    const endEl = document.getElementById('footer-section');
    if (!startEl) return;

    let rafId: number | null = null;

    const onScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const startTop = startEl.getBoundingClientRect().top + window.scrollY;
        const footerTop = endEl
          ? endEl.getBoundingClientRect().top + window.scrollY
          : Number.POSITIVE_INFINITY;
        const scrollY = window.scrollY + 1; // small offset so at very top it's 0

        if (scrollY >= startTop && scrollY < footerTop) {
          setInWhatWeDo(true);
        } else {
          setInWhatWeDo(false);
        }
      });
    };

    // run once to initialize
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <>
      <motion.nav
        className="w-full px-6 pt-6 md:px-12 fixed top-0 left-0 right-0 z-[9999] bg-transparent"
        id="navbar"
        initial={{ y: '-100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1.0, delay: 0.8, ease: [0.19, 1, 0.22, 1] }}
      >
        <div className="flex items-center justify-between">
          <a
            href="/"
            onClick={handleLogoClick}
            id="navbar-logo-container"
            className={`logo-container ${inWhatWeDo ? 'logo-pill' : ''}`}
          >
            <img src="/sn-logomark-dark.png" alt="SN" className="h-6 w-6 object-contain" />
            <span className="font-medium tracking-tight text-lg" id="navbar-logo-text">
              SN International Group
            </span>
          </a>

          <div className="hidden lg:flex items-center" id="navbar-menu">
            <div className="mono-ui nav-pill uppercase tracking-[0.2em] text-[#0c1d2e]">
              {menuItems.map((item) => (
                <a
                  key={item.name}
                  className="nav-item transition-colors hover:bg-white hover:text-[#0c1d2e] text-[14px]"
                  href={item.href}
                >
                  {item.name}
                </a>
              ))}

              <a
                className="group button-mono nav-cta uppercase tracking-[0.2em] text-[14px]"
                id="navbar-cta"
                href="/contact"
              >
                {/* Invisible spacer — gives <a> the exact same natural size as nav items */}
                <span
                  className="block px-5 py-2 invisible select-none pointer-events-none whitespace-nowrap"
                  aria-hidden="true"
                >
                  Work with us
                </span>
                {/* Clipping wrapper — fills the <a> bounds, masks the slide */}
                <div className="absolute inset-0 rounded-[0.5rem] overflow-hidden">
                  <div className="flex flex-col h-[200%] transition-transform duration-[750ms] ease-[cubic-bezier(0.19,1,0.22,1)] delay-0 group-hover:delay-[150ms] group-hover:-translate-y-1/2">
                    {/* Slot 1 — default */}
                    <div className="flex items-center justify-center h-1/2 bg-[#0c1d2e] text-white whitespace-nowrap">
                      Work with us
                    </div>
                    {/* Slot 2 — hover */}
                    <div className="flex items-center justify-center h-1/2 bg-white text-[#0c1d2e] whitespace-nowrap rounded-[0.5rem]">
                      Work with us
                    </div>
                  </div>
                </div>
              </a>
            </div>
          </div>

          <button
            type="button"
            className="inline-flex h-9 w-10 items-center justify-center rounded-full border border-white/50 bg-white/10 lg:hidden"
            aria-label="Toggle menu"
          >
            <span className="flex flex-col gap-1">
              <span className="h-0.5 w-4 bg-white" />
              <span className="h-0.5 w-4 bg-white" />
            </span>
          </button>
        </div>
      </motion.nav>
      {/* spacer to preserve layout since nav is fixed */}
      <div aria-hidden="true" className="h-14 md:h-16" />
    </>
  );
}
