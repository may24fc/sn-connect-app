import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { PageTransitionWrapper } from '@/components/layout/PageTransitionWrapper';
import { SiteFrame } from '@/components/layout/SiteFrame';
import { aspekta, robotoMono } from './fonts';
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
    default: 'SN International Group',
    template: '%s | SN International Group',
  },
  description:
    'SN International Group helps founders, operators, and growing teams build dependable offshore support — executive assistance, marketing support, content creation, and AI operations.',
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
      { url: '/sn-logomark-dark.png', media: '(prefers-color-scheme: light)', type: 'image/png' },
      { url: '/sn-logomark.png', media: '(prefers-color-scheme: dark)', type: 'image/png' },
    ],
    shortcut: ['/sn-logomark-dark.png'],
    apple: [{ url: '/sn-logomark-dark.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    locale: 'en_PH',
    siteName: 'SN International Group Pty. Ltd.',
    title: 'SN International Group — Remote Support Teams, Matched with Care',
    description:
      'We build dependable offshore support around your workflow — executive assistance, marketing support, content creation, and AI operations.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <html
      lang="en"
      className={`font-sans ${aspekta.variable} ${robotoMono.variable} aspekta-fonts button-fonts`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen overflow-x-clip font-sans antialiased">
        <Providers>
          <PageTransitionWrapper>
            <SiteFrame>{children}</SiteFrame>
          </PageTransitionWrapper>
        </Providers>
      </body>
    </html>
  );
}
