export const EXPENSE_IMPORT_TEMPLATE_HEADERS = [
  'transactionDate',
  'vendorName',
  'totalAmount',
  'taxAmount',
  'currency',
  'businessJustification',
  'aiDebitAccount',
  'aiCreditAccount',
] as const;

export type ExpenseImportTemplateHeader = (typeof EXPENSE_IMPORT_TEMPLATE_HEADERS)[number];

export const EXPENSE_IMPORT_TEMPLATE_SAMPLE_ROWS: Array<Record<ExpenseImportTemplateHeader, string>> = [
  {
    transactionDate: '2026-06-01',
    vendorName: 'Atlassian',
    totalAmount: '129.99',
    taxAmount: '11.82',
    currency: 'USD',
    businessJustification: 'Monthly software subscription for engineering team',
    aiDebitAccount: 'Software Subscriptions',
    aiCreditAccount: 'Company Credit Card',
  },
  {
    transactionDate: '2026-06-03',
    vendorName: 'Officeworks',
    totalAmount: '245.50',
    taxAmount: '22.32',
    currency: 'AUD',
    businessJustification: 'Office supplies for onboarding kit',
    aiDebitAccount: 'Office Supplies',
    aiCreditAccount: 'Accounts Payable',
  },
];
