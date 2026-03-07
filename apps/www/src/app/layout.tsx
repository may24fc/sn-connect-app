import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ScrollProgress } from '@/components/shared/ScrollProgress';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'SN International Group',
  url: 'https://sninternational.com',
  logo: 'https://sninternational.com/logo.svg',
  description:
    'SN International Group is a diversified conglomerate committed to excellence across food service, healthcare, fitness, and construction in the Philippines.',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'SN International Tower, Bonifacio Global City',
    addressLocality: 'Taguig',
    addressRegion: 'Metro Manila',
    addressCountry: 'PH',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+63-2-8123-4567',
    contactType: 'customer service',
    availableLanguage: ['English', 'Filipino'],
  },
  sameAs: [
    'https://facebook.com/sninternational',
    'https://linkedin.com/company/sninternational',
    'https://instagram.com/sninternational',
  ],
};

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
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-touch-icon.svg', type: 'image/svg+xml' }],
  },
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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <Providers>
          <ScrollProgress />
          <Header />
          <main id="main-content">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
