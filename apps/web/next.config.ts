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
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist', 'googleapis'],
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
};

export default nextConfig;
