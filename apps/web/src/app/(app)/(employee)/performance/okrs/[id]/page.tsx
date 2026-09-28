'use client';

import { OKRDetailWorkspace } from '@/components/performance/OKRDetailWorkspace';
import type { ReactNode } from 'react';

export default function OKRDetailPage(): ReactNode {
  return <OKRDetailWorkspace backPath="/performance" deleteRedirectPath="/performance" />;
}
