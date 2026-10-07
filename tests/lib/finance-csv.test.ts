import { describe, expect, it } from 'vitest';
import { csvObjects, parseCsv, writeCsv } from '../../apps/web/src/lib/finance/csv';

describe('finance CSV', () => {
  it('round trips quoted commas and newlines', () => {
    const rows = [['recipientId', 'reference'], ['123', 'SN, invoice\nA']];
    expect(parseCsv(writeCsv(rows))).toEqual(rows);
  });

  it('escapes formula-like fields and rejects malformed quoting', () => {
    expect(csvObjects(writeCsv([['name'], ['=SUM(1)']]))[0]?.name).toBe("'=SUM(1)");
    expect(() => parseCsv('a,"broken')).toThrow('unclosed');
  });
});
