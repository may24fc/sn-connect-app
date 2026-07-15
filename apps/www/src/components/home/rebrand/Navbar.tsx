'use client';

import { getLenis } from '@/hooks/useSmoothScroll';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { usePageTransitionNav } from '@/components/layout/PageTransitionContext';

interface MenuItem {
  name: string;
  href: string;
}

interface NavbarProps {
  alwaysLogoPill?: boolean;
  withSpacer?: boolean;
}

const menuItems: MenuItem[] = [
  { name: 'Services', href: '/services' },
  { name: 'About Us', href: '/about' },
  { name: 'Our Team', href: '/team' },
];

export default function Navbar({ alwaysLogoPill = false, withSpacer = true }: NavbarProps) {
  const [inWhatWeDo, setInWhatWeDo] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { navigate } = usePageTransitionNav();

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
      {/* ── Mobile full-screen overlay — sits behind the nav pill ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-overlay"
            className="fixed inset-3 z-[9998] rounded-2xl bg-[#0c1d2e] flex flex-col lg:hidden overflow-hidden"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.19, 1, 0.22, 1] }}
          >
            {/* Centered links */}
            <div className="flex-1 flex flex-col items-center justify-center gap-1">
              {[{ name: 'Home', href: '/' }, ...menuItems, { name: 'Work with us', href: '/contact' }].map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => { setMobileOpen(false); navigate(item.href); }}
                  className={`font-sans font-normal tracking-tight leading-tight transition-colors duration-200 ${
                    pathname === item.href ? 'text-white' : 'text-white/35 hover:text-white/70'
                  }`}
                  style={{ fontSize: 'clamp(2.4rem, 9vw, 3.5rem)' }}
                >
                  {item.name}
                </button>
              ))}
            </div>

            {/* Email at bottom */}
            <div className="pb-14 flex justify-center">
              <a
                href="mailto:info@sngroup.com.au"
                className="button-mono text-lg text-white tracking-[0.1em] underline underline-offset-4 hover:text-white/70 transition-colors"
              >
                info@sngroup.com.au
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.nav
        className="w-full px-5 pt-5 md:px-6 lg:px-12 lg:pt-6 fixed top-0 left-0 right-0 z-[9999] bg-transparent"
        id="navbar"
        initial={{ y: '-100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1.0, delay: 0.8, ease: [0.19, 1, 0.22, 1] }}
      >
        {/* ── Mobile: single pill ── */}
        <div className="flex lg:hidden items-center justify-between gap-2 border border-white/30 bg-white/85 backdrop-blur-sm px-3 py-3 shadow-sm" style={{ borderRadius: '0.60rem' }}>
          {/* Logo */}
          <a
            href="/"
            onClick={handleLogoClick}
            className="flex items-center gap-2 min-w-0"
          >
            <img src="/sn-logomark-dark.png" alt="SN" className="h-6 w-6 object-contain shrink-0" />
            <span className="font-medium tracking-tight text-xl text-[#0c1d2e] truncate">
              SN International Group
            </span>
          </a>

          {/* Hamburger square pill */}
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="flex shrink-0 items-center justify-center w-12 h-12 rounded-md bg-[#0c1d2e] text-white"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            <motion.span
              className="flex flex-col gap-[5px]"
              animate={mobileOpen ? 'open' : 'closed'}
            >
              <motion.span
                className="block h-[1.5px] w-[20px] bg-white origin-center"
                variants={{ closed: { rotate: 0, y: 0 }, open: { rotate: 45, y: 3.25 } }}
                transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
              />
              <motion.span
                className="block h-[1.5px] w-[20px] bg-white origin-center"
                variants={{ closed: { rotate: 0, y: 0 }, open: { rotate: -45, y: -3.25 } }}
                transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
              />
            </motion.span>
          </button>
        </div>

        {/* ── Desktop: existing layout ── */}
        <div className="hidden lg:flex items-center justify-between">
          <a
            href="/"
            onClick={handleLogoClick}
            id="navbar-logo-container"
            className={`logo-container ${inWhatWeDo || alwaysLogoPill ? 'logo-pill' : ''}`}
          >
            <img src="/sn-logomark-dark.png" alt="SN" className="h-6 w-6 object-contain" />
            <span className="font-medium tracking-tight text-lg" id="navbar-logo-text">
              SN International Group
            </span>
          </a>

          <div className="flex items-center" id="navbar-menu">
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
                <span
                  className="block px-5 py-2 invisible select-none pointer-events-none whitespace-nowrap"
                  aria-hidden="true"
                >
                  Work with us
                </span>
                <div className="absolute inset-0 rounded-[0.5rem] overflow-hidden">
                  <div className="flex flex-col h-[200%] transition-transform duration-[750ms] ease-[cubic-bezier(0.19,1,0.22,1)] delay-0 group-hover:delay-[150ms] group-hover:-translate-y-1/2">
                    <div className="flex items-center justify-center h-1/2 bg-[#0c1d2e] text-white whitespace-nowrap">
                      Work with us
                    </div>
                    <div className="flex items-center justify-center h-1/2 bg-white text-[#0c1d2e] whitespace-nowrap rounded-[0.5rem]">
                      Work with us
                    </div>
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </motion.nav>
      {/* spacer to preserve layout since nav is fixed */}
      {withSpacer && <div aria-hidden="true" className="h-14 lg:h-16" />}
    </>
  );
}
