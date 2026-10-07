export const FINANCE_CATEGORIES = [
  { code: 'advertising', name: 'Advertising & Marketing', example: 'Meta, Google Ads, email tools, promotions', legacyType: 'other' },
  { code: 'ai_cloud', name: 'AI & Cloud', example: 'AI tools, AWS, hosting', legacyType: 'software' },
  { code: 'software', name: 'Software & Subscriptions', example: 'Canva, Adobe, Xero, Salesforce', legacyType: 'software' },
  { code: 'travel', name: 'Travel', example: 'Flights, hotels, transport', legacyType: 'travel' },
  { code: 'meals', name: 'Meals & Entertainment', example: 'Team and client meals', legacyType: 'meals' },
  { code: 'office_supplies', name: 'Office Supplies', example: 'Consumable office items', legacyType: 'office_supplies' },
  { code: 'equipment', name: 'Equipment', example: 'Durable equipment', legacyType: 'equipment' },
  { code: 'rent_workspace', name: 'Rent & Workspace', example: 'Office and coworking rent', legacyType: 'other' },
  { code: 'utilities', name: 'Utilities', example: 'Internet, power, phone', legacyType: 'utilities' },
  { code: 'maintenance', name: 'Repairs & Maintenance', example: 'Service and repairs', legacyType: 'maintenance' },
  { code: 'professional_services', name: 'Professional Services', example: 'Accounting, legal, contractors', legacyType: 'other' },
  { code: 'other', name: 'Other', example: 'Provide an explanation', legacyType: 'other' },
] as const;

export type FinanceCategoryCode = (typeof FINANCE_CATEGORIES)[number]['code'];

export function categoryToLegacyType(code: FinanceCategoryCode) {
  return FINANCE_CATEGORIES.find((category) => category.code === code)?.legacyType ?? 'other';
}
