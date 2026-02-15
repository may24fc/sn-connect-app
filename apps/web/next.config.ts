import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@hr-portal/ui', '@hr-portal/database', '@hr-portal/auth', '@hr-portal/ai'],
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

export default nextConfig;
