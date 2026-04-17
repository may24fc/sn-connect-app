import path from 'node:path';
import type { NextConfig } from 'next';

// Suppress the url.parse() deprecation warning from Supabase/PostgREST internals (DEP0169)
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.name === 'DeprecationWarning' && warning.message.includes('url.parse()')) return;
  console.warn(warning);
});

const nextConfig: NextConfig = {
  transpilePackages: ['@hr-portal/ui', '@hr-portal/database', '@hr-portal/auth', '@hr-portal/ai'],
  serverExternalPackages: ['googleapis'],
  outputFileTracingRoot: path.join(__dirname, '../../'),
  async redirects() {
    return [
      {
        source: '/admin/probation',
        destination: '/admin/employee-management',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
