import { describe, expect, it } from 'vitest';
import { isSfoReportsDepartment } from '../../apps/web/src/hooks/useMarketingReportsAccess';

describe('isSfoReportsDepartment', () => {
  it.each(['Marketing', 'Digital Marketing', 'Accounting', 'Accounting Department'])(
    'allows %s into SFO reports',
    (department) => {
      expect(isSfoReportsDepartment(department)).toBe(true);
    }
  );

  it.each([null, '', 'Human Resources', 'Engineering'])('rejects %s', (department) => {
    expect(isSfoReportsDepartment(department)).toBe(false);
  });
});
