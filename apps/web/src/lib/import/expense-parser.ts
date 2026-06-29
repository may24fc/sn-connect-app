import {
  type ExpenseImportRow,
  expenseImportBatchSchema,
  expenseImportRowSchema,
} from '@/lib/schemas/expense-import.schema';
import ExcelJS from 'exceljs';
import { Readable } from 'node:stream';
import { z } from 'zod';
import { EXPENSE_IMPORT_TEMPLATE_HEADERS } from './expense-template';

export type ParsedExpenseImport = {
  validRows: ExpenseImportRow[];
  errors: Array<{
    rowNumber: number;
    message: string;
  }>;
  totalRows: number;
};

function parseDecimalValue(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim().replace(/,/g, '');
    if (!trimmed) {
      return 0;
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      throw new Error(`Invalid numeric value: ${value}`);
    }

    return parsed;
  }

  if (value === null || value === undefined) {
    return 0;
  }

  throw new Error(`Invalid numeric value type: ${typeof value}`);
}

function normalizeCellToString(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString().split('T')[0] ?? '';
  }

  return '';
}

function mapWorksheetRowToRecord(row: ExcelJS.Row, headerIndexMap: Map<string, number>): Record<string, unknown> {
  const transactionDateIndex = headerIndexMap.get('transactiondate');
  const vendorNameIndex = headerIndexMap.get('vendorname');
  const totalAmountIndex = headerIndexMap.get('totalamount');
  const taxAmountIndex = headerIndexMap.get('taxamount');
  const currencyIndex = headerIndexMap.get('currency');
  const businessJustificationIndex = headerIndexMap.get('businessjustification');
  const aiDebitAccountIndex = headerIndexMap.get('aidebitaccount');
  const aiCreditAccountIndex = headerIndexMap.get('aicreditaccount');

  if (!(transactionDateIndex && vendorNameIndex && totalAmountIndex && taxAmountIndex && currencyIndex)) {
    throw new Error('Template header mismatch. Download the latest import template and try again.');
  }

  return {
    transactionDate: normalizeCellToString(row.getCell(transactionDateIndex).value),
    vendorName: normalizeCellToString(row.getCell(vendorNameIndex).value),
    totalAmount: parseDecimalValue(row.getCell(totalAmountIndex).value),
    taxAmount: parseDecimalValue(row.getCell(taxAmountIndex).value),
    currency: normalizeCellToString(row.getCell(currencyIndex).value),
    businessJustification: normalizeCellToString(row.getCell(businessJustificationIndex ?? 0).value) || null,
    aiDebitAccount: normalizeCellToString(row.getCell(aiDebitAccountIndex ?? 0).value) || null,
    aiCreditAccount: normalizeCellToString(row.getCell(aiCreditAccountIndex ?? 0).value) || null,
  };
}

function parseHeaders(headerRow: ExcelJS.Row): Map<string, number> {
  const map = new Map<string, number>();

  for (let i = 1; i <= headerRow.cellCount; i += 1) {
    const cellValue = normalizeCellToString(headerRow.getCell(i).value);
    if (cellValue) {
      map.set(cellValue.toLowerCase(), i);
    }
  }

  const missingHeaders = EXPENSE_IMPORT_TEMPLATE_HEADERS.filter((header) => !map.has(header.toLowerCase()));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
  }

  return map;
}

async function loadWorkbook(fileBuffer: ArrayBuffer, fileType: string): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();

  if (fileType === 'text/csv' || fileType === 'application/csv') {
    const csvText = new TextDecoder('utf-8').decode(fileBuffer);
    await workbook.csv.read(Readable.from([csvText]));
    return workbook;
  }

  await workbook.xlsx.load(fileBuffer);
  return workbook;
}

export async function parseExpenseImportFile(file: File): Promise<ParsedExpenseImport> {
  const workbook = await loadWorkbook(await file.arrayBuffer(), file.type);
  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new Error('Import file has no worksheet.');
  }

  const headerRow = worksheet.getRow(1);
  const headerIndexMap = parseHeaders(headerRow);

  const validRows: ExpenseImportRow[] = [];
  const errors: ParsedExpenseImport['errors'] = [];

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);

    // Skip fully blank rows so finance can leave spacing in templates.
    const rowValues = Array.isArray(row.values) ? row.values : [];
    const hasData = rowValues.some((value, idx) => idx > 0 && normalizeCellToString(value).length > 0);
    if (!hasData) {
      continue;
    }

    try {
      const rawRecord = mapWorksheetRowToRecord(row, headerIndexMap);
      const parsed = expenseImportRowSchema.parse(rawRecord);
      validRows.push(parsed);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const message = error.issues.map((issue) => issue.message).join('; ');
        errors.push({ rowNumber, message });
      } else {
        const message = error instanceof Error ? error.message : 'Unknown parsing error';
        errors.push({ rowNumber, message });
      }
    }
  }

  const batchResult = expenseImportBatchSchema.safeParse({ rows: validRows });
  if (!batchResult.success && validRows.length === 0) {
    errors.push({ rowNumber: 0, message: batchResult.error.issues.map((issue) => issue.message).join('; ') });
  }

  return {
    validRows,
    errors,
    totalRows: validRows.length + errors.length,
  };
}
