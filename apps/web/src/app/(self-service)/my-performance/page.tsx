'use client';

import { PerformanceWorkspace } from '@/components/performance/PerformanceWorkspace';
import type { ReactNode } from 'react';

export default function MyPerformancePage(): ReactNode {
  return <PerformanceWorkspace detailHrefBase="/my-performance/okrs" />;
}