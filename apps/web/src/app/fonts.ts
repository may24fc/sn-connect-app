import localFont from 'next/font/local';

export const aspekta = localFont({
  variable: '--font-aspekta',
  display: 'swap',
  src: [
    {
      path: '../../../www/public/fonts/AspektaVF.woff2',
      weight: '100 900',
      style: 'normal',
    },
  ],
});
