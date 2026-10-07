/** Small RFC 4180 reader for the CSV files exchanged with Wise. */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const value = input.replace(/^\uFEFF/, '');
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === '"') {
      if (quoted && value[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && value[index + 1] === '\n') index += 1;
      row.push(field);
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted field');
  row.push(field);
  if (row.some((cell) => cell.trim() !== '')) rows.push(row);
  return rows;
}

export function writeCsv(rows: readonly (readonly string[])[]): string {
  return rows
    .map((row) =>
      row
        .map((field) => {
          const safe = /^[=+@-]/.test(field) ? `'${field}` : field;
          return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
        })
        .join(',')
    )
    .join('\r\n');
}

export function csvObjects(input: string): Array<Record<string, string>> {
  const [headers, ...rows] = parseCsv(input);
  if (!headers?.length) throw new Error('CSV is empty');
  return rows.map((row) =>
    Object.fromEntries(headers.map((header, index) => [header.trim(), (row[index] ?? '').trim()]))
  );
}
