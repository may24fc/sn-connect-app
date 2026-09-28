'use client';

import { OKRDetailWorkspace } from '@/components/performance/OKRDetailWorkspace';
import type { ReactNode } from 'react';

export default function MyPerformanceOKRDetailPage(): ReactNode {
  return <OKRDetailWorkspace backPath="/my-performance" deleteRedirectPath="/my-performance" />;
}