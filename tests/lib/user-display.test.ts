import { describe, expect, it } from 'vitest';
import { resolveUserDisplayName } from '../../apps/web/src/lib/user-display';

describe('resolveUserDisplayName', () => {
  it('prefers employee names and preserves middle names', () => {
    expect(
      resolveUserDisplayName({
        employeeFirstName: 'Ceferino',
        employeeMiddleName: 'Jumao-as',
        employeeLastName: 'Velasco',
        metadataFirstName: 'Ignored',
        metadataLastName: 'Person',
      })
    ).toBe('Ceferino Jumao-as Velasco');
  });

  it('falls back to metadata names when there is no employee record', () => {
    expect(
      resolveUserDisplayName({
        metadataFirstName: 'Pat',
        metadataMiddleName: 'A.',
        metadataLastName: 'Rivera',
      })
    ).toBe('Pat A. Rivera');
  });

  it('falls back to onboarding profile names before email', () => {
    expect(
      resolveUserDisplayName({
        onboardingFirstName: 'Robin',
        onboardingMiddleName: 'M.',
        onboardingLastName: 'Santos',
        fallbackEmail: 'robin@example.com',
      })
    ).toBe('Robin M. Santos');
  });

  it('falls back to email when no name fields exist', () => {
    expect(
      resolveUserDisplayName({
        fallbackEmail: 'teammate@example.com',
        fallbackLabel: 'Team member',
      })
    ).toBe('teammate@example.com');
  });

  it('uses the fallback label when there is no usable data', () => {
    expect(resolveUserDisplayName({ fallbackLabel: 'Team member' })).toBe('Team member');
  });
});