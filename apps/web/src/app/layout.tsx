import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'SN Connect',
  description: 'Where Policy Meets Productivity',
  icons: {
    icon: [{ url: '/sn-logo.png', sizes: '192x192', type: 'image/png' }],
    shortcut: ['/sn-logo.png'],
    apple: [{ url: '/sn-logo.png', sizes: '180x180', type: 'image/png' }],
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
