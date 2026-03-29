import { describe, expect, it } from 'vitest';
import { getDisplayPhoneValue } from '../../packages/ui/src/components/forms/PhoneInput';

describe('PhoneInput', () => {
  it('hides the selected dial code when the value already includes the selected prefix', () => {
    expect(
      getDisplayPhoneValue('+639171234567', {
        code: 'PH',
        label: 'Philippines',
        dialCode: '+63',
        flag: '🇵🇭',
      })
    ).toBe('9171234567');
  });

  it('keeps numbers untouched when they do not match the selected prefix', () => {
    expect(
      getDisplayPhoneValue('+12025551234', {
        code: 'PH',
        label: 'Philippines',
        dialCode: '+63',
        flag: '🇵🇭',
      })
    ).toBe('+12025551234');
  });

  it('keeps global numbers untouched', () => {
    expect(
      getDisplayPhoneValue('+4989123456', {
        code: 'GLOBAL',
        label: 'Global',
        dialCode: '+',
        flag: '🌐',
      })
    ).toBe('+4989123456');
  });
});