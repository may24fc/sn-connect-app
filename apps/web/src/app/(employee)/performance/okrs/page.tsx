'use client';

import { OKRSelfServiceWorkspace } from '@/components/performance/OKRSelfServiceWorkspace';
import type { ReactNode } from 'react';

export default function OKRsPage(): ReactNode {
  return <OKRSelfServiceWorkspace fallbackPath="/performance" />;
}
