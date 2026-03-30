import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Providers } from './providers';

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
    <html lang="en" className="font-sans" suppressHydrationWarning>
      <body className="h-screen overflow-hidden font-sans antialiased">
        <Providers>
          <AuthProvider>{children}</AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
