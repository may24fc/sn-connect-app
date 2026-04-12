'use client';

import { MarketingReportEditor } from '@/components/reports/MarketingReportEditor';
import { use } from 'react';

export default function EditReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return <MarketingReportEditor mode="edit" reportId={id} />;
}