import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'SN International Group — Building Futures, Empowering Lives',
    template: '%s | SN International Group',
  },
  description:
    'SN International Group is a diversified conglomerate committed to excellence across food service, healthcare, fitness, and construction in the Philippines.',
  keywords: [
    'SN International Group',
    'SFO',
    'UHP',
    '24 Fit Club',
    'SN Construction',
    'Philippines',
    'conglomerate',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_PH',
    siteName: 'SN International Group',
    title: 'SN International Group — Building Futures, Empowering Lives',
    description:
      'A diversified conglomerate committed to excellence across food service, healthcare, fitness, and construction.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans antialiased">
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
