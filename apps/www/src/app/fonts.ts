import { Roboto_Mono } from 'next/font/google';
import localFont from 'next/font/local';

export const aspekta = localFont({
  variable: '--font-aspekta',
  display: 'swap',
  src: [{ path: '../../public/fonts/AspektaVF.woff2', weight: '100 900', style: 'normal' }],
});

export const robotoMono = Roboto_Mono({
  weight: ['400'],
  subsets: ['latin'],
  variable: '--font-roboto-mono',
  display: 'swap',
});
