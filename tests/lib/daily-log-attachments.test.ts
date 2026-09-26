import { resolveDailyLogAttachmentMimeType } from '@/lib/daily-log-attachments';
import { describe, expect, it } from 'vitest';

describe('resolveDailyLogAttachmentMimeType', () => {
  it('keeps an allowed reported type', () => {
    expect(resolveDailyLogAttachmentMimeType('shot.png', 'image/png')).toBe('image/png');
  });

  it('falls back to the extension when the browser reports no type', () => {
    expect(resolveDailyLogAttachmentMimeType('Report.DOCX', '')).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  });

  it('rejects types the bucket does not allow', () => {
    expect(resolveDailyLogAttachmentMimeType('photo.heic', 'image/heic')).toBeNull();
    expect(
      resolveDailyLogAttachmentMimeType(
        'sheet.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
    ).toBeNull();
  });
});
