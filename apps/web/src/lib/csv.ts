/**
 * CSV Export Utility
 *
 * Provides functions for converting data to CSV format and triggering downloads
 */

/**
 * Escapes a value for CSV format
 */
export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';

  const str = String(value);

  // If the value contains commas, quotes, or newlines, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Options for CSV generation
 */
export interface CsvOptions<T> {
  /** Column headers */
  headers: string[];
  /** Function to extract row values from data item */
  rowMapper: (item: T) => (string | number | boolean | null | undefined)[];
}

/**
 * Converts an array of data to CSV string
 */
export function convertToCsv<T>(data: T[], options: CsvOptions<T>): string {
  const { headers, rowMapper } = options;

  const headerRow = headers.map(escapeCsvValue).join(',');

  const dataRows = data.map((item) => {
    const values = rowMapper(item);
    return values.map(escapeCsvValue).join(',');
  });

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Triggers a CSV file download in the browser
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Generates a filename with timestamp
 */
export function generateCsvFilename(baseName: string): string {
  const date = new Date().toISOString().split('T')[0];
  return `${baseName}-${date}.csv`;
}

/**
 * Convenience function: converts data to CSV and triggers download
 */
export function exportToCsv<T>(data: T[], options: CsvOptions<T> & { filename: string }): void {
  const { filename, ...csvOptions } = options;
  const csvContent = convertToCsv(data, csvOptions);
  downloadCsv(csvContent, generateCsvFilename(filename));
}

/**
 * Format a date for CSV export
 */
export function formatDateForCsv(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  const parts = d.toISOString().split('T');
  return parts[0] ?? '';
}

/**
 * Format a datetime for CSV export
 */
export function formatDateTimeForCsv(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  const withoutMs = d.toISOString().replace('T', ' ').split('.');
  return withoutMs[0] ?? '';
}

/**
 * Format a percentage for CSV export
 */
export function formatPercentageForCsv(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return `${Math.round(value)}%`;
}
