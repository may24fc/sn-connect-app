import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@hr-portal/ui', '@hr-portal/database', '@hr-portal/auth', '@hr-portal/ai'],
  output: 'export',
};

export default nextConfig;
