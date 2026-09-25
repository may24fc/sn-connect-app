import { describe, expect, it } from 'vitest';

// The importer stays executable as a plain Node script while exposing its pure preparation step.
// @ts-expect-error The JavaScript backfill script intentionally has no declaration file.
import { prepareUhpImport } from './import-uhp-workspace.mjs';

describe('prepareUhpImport', () => {
  it('excludes unrelated clients and keeps source relationships for the second pass', () => {
    const result = prepareUhpImport({
      clients: [
        { notion_page_id: 'client-1', name: 'Included', client_type: 'Retail' },
        { notion_page_id: 'client-2', name: 'Excluded', client_type: 'Property Development' },
      ],
      activities: [
        {
          notion_page_id: 'activity-1',
          client_notion_page_id: 'client-1',
          title: 'Follow-up call',
          occurred_at: '2026-09-25T01:00:00.000Z',
        },
        {
          notion_page_id: 'activity-2',
          client_notion_page_id: 'client-2',
          title: 'Excluded client call',
          occurred_at: '2026-09-25T02:00:00.000Z',
        },
      ],
    });

    expect(result.clients).toHaveLength(1);
    expect(result.activities).toMatchObject([
      {
        notion_page_id: 'activity-1',
        client_notion_page_id: 'client-1',
        title: 'Follow-up call',
      },
    ]);
    expect(result.counts.excludedClients).toBe(1);
  });

  it('rejects a related record whose source client cannot be resolved', () => {
    expect(() =>
      prepareUhpImport({
        clients: [{ notion_page_id: 'client-1', name: 'Included', client_type: 'Retail' }],
        notes: [
          {
            notion_page_id: 'note-1',
            client_notion_page_id: 'missing-client',
            title: 'Unresolved note',
          },
        ],
      })
    ).toThrow('notes row references unresolved client missing-client');
  });

  it('normalizes stable volume-point keys and database column names', () => {
    const result = prepareUhpImport({
      volumePoints: [
        {
          sourceSheet: 'September',
          sourceRow: 42,
          orderDate: '2026-09-25',
          category: 'personal',
          memberName: 'Steven',
          volumePoints: 125.5,
        },
      ],
    });

    expect(result.volumePoints[0]).toMatchObject({
      source_sheet: 'September',
      source_row: 42,
      reporting_month: '2026-09-01',
      order_date: '2026-09-25',
      member_name: 'Steven',
      volume_points: 125.5,
    });
  });
});
