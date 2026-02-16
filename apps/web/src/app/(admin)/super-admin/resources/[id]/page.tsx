import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

export default async function SuperAdminResourceDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<ReactNode> {
  const { id } = await params;
  redirect(`/admin/resources/${id}`);
}
