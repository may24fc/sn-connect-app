import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ScrollProgress } from '@/components/shared/ScrollProgress';
import { AnnouncementBanner } from '@/components/layout/AnnouncementBanner';
import { Providers } from './providers';

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'SN International Group Pty. Ltd.',
  url: 'https://sninternational.com',
  logo: 'https://sninternational.com/sn-logo.png',
  description:
    'SN International Group Pty. Ltd. helps growing businesses build dependable offshore support teams across executive assistance, marketing support, content creation, and AI operations.',
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
    default: 'SN International Group Pty. Ltd. — VA Outsourcing and Remote Support',
    template: '%s | SN International Group Pty. Ltd.',
  },
  description:
    'SN International Group Pty. Ltd. helps growing businesses build dependable offshore support teams across executive assistance, marketing support, content creation, and AI operations.',
  keywords: [
    'SN International Group Pty. Ltd.',
    'virtual assistant outsourcing',
    'remote support teams',
    'executive assistance',
    'marketing support outsourcing',
    'content creation support',
    'AI operations support',
  ],
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/sn-logo.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: ['/favicon.svg'],
    apple: [{ url: '/sn-logo.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    locale: 'en_PH',
    siteName: 'SN International Group Pty. Ltd.',
    title: 'SN International Group Pty. Ltd. — VA Outsourcing and Remote Support',
    description:
      'Dependable offshore support across executive assistance, marketing support, content creation, and AI operations.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <html lang="en" className="font-sans">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen overflow-x-clip font-sans antialiased">
        <Providers>
          <ScrollProgress />
          <Header />
          <AnnouncementBanner />
          <main id="main-content">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
