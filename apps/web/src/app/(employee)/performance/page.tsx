'use client';

import { PerformanceWorkspace } from '@/components/performance/PerformanceWorkspace';
import type { ReactNode } from 'react';

export default function PerformancePage(): ReactNode {
  return <PerformanceWorkspace detailHrefBase="/performance/okrs" />;
}
