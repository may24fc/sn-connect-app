import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

export default async function SuperAdminDirectoryDetailRedirectPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}): Promise<ReactNode> {
  const { userId } = await params;
  redirect(`/admin/directory/${userId}`);
}