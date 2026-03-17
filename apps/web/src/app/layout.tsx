import type { Metadata } from 'next';
import { Source_Sans_3, Lexend } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Providers } from './providers';

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const lexend = Lexend({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SN Connect',
  description: 'Where Policy Meets Productivity',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-touch-icon.svg', type: 'image/svg+xml' }],
  },
};

export default function RootLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <html lang="en" className={`${sourceSans.variable} ${lexend.variable}`} suppressHydrationWarning>
      <body className="h-screen overflow-hidden font-sans antialiased">
        <Providers>
          <AuthProvider>{children}</AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
