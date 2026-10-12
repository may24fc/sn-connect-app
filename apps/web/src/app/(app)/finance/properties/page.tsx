import { redirect } from 'next/navigation';

export default async function LegacyFinancePropertiesPage({
  searchParams,
}: { searchParams: Promise<{ month?: string }> }) {
  const { month } = await searchParams;
  const query = month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? `?month=${month}` : '';
  redirect(`/property/properties${query}`);
}
