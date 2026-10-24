import {
  AMBIGUOUS_PERSON,
  createPseudonymizer,
  pseudonymizeSource,
} from '@/lib/performance/insights/pseudonymize';
import { renderInsightContext } from '@/lib/performance/insights/render';
import { buildInsightSource } from '@/lib/performance/insights/source';
import { buildInsightStats } from '@/lib/performance/insights/stats';
import { describe, expect, it } from 'vitest';

function row(userId: string, fullName: string, overrides: Record<string, unknown> = {}) {
  return {
    user_id: userId,
    full_name: fullName,
    month_key: '2026-10',
    department_role: 'Marketing',
    work_feelings: 'Fine',
    work_headline: 'Shipped',
    work_significance: 'Impact',
    work_rank: 7,
    work_action: 'Plan',
    family_feelings: 'Good',
    family_headline: 'Dinner',
    family_significance: 'Time',
    family_rank: 6,
    family_action: 'Trip',
    personal_feelings: 'Okay',
    personal_headline: 'Gym',
    personal_significance: 'Health',
    personal_rank: 5,
    personal_action: 'Sleep',
    deep_dive_parking_lot: 'Career',
    exploration_topics: 'Leadership',
    ...overrides,
  };
}

const audience = [
  { userId: 'u-ana', fullName: 'Ana Cruz', departmentRole: 'Marketing' },
  { userId: 'u-ben', fullName: 'Benedict Lim', departmentRole: 'Operations' },
  { userId: 'u-grace', fullName: 'Grace Tan', departmentRole: 'Finance' },
  { userId: 'u-jo1', fullName: 'Jo Reyes', departmentRole: 'Sales' },
  { userId: 'u-jo2', fullName: 'Jo Reyes', departmentRole: 'Support' },
  { userId: 'u-maria', fullName: 'María Núñez', departmentRole: 'Design' },
];

function fixture() {
  return buildInsightSource({
    periodKey: '2026-10',
    monthsBack: 0,
    audience,
    rows: [
      row('u-ana', 'Ana Cruz', {
        work_feelings: 'Benedict helped me a lot; ana cruz is my own name. Grace under pressure.',
        family_headline: 'Lunch with María Núñez and with Jo',
      }),
    ],
  });
}

describe('createPseudonymizer', () => {
  it('assigns stable, padded tokens in display-label order', () => {
    const pseudonymizer = createPseudonymizer(fixture());
    expect(pseudonymizer.tokenCount).toBe(6);
    expect(pseudonymizer.tokenForUser('u-ana')).toBe('Person-01');
    expect(pseudonymizer.tokenForUser('u-maria')).toBe('Person-06');
    expect(createPseudonymizer(fixture()).tokenForUser('u-grace')).toBe(
      pseudonymizer.tokenForUser('u-grace')
    );
  });

  it('replaces full names case-insensitively and unique name parts case-sensitively', () => {
    const { pseudonymizeText, tokenForUser } = createPseudonymizer(fixture());
    const ben = tokenForUser('u-ben') as string;
    const maria = tokenForUser('u-maria') as string;

    expect(pseudonymizeText('What did ANA CRUZ and Benedict say?')).toBe(
      `What did Person-01 and ${ben} say?`
    );
    expect(pseudonymizeText('María said hi; María Núñez agreed.')).toBe(
      `${maria} said hi; ${maria} agreed.`
    );
    // Lower-case words are not treated as first names.
    expect(pseudonymizeText('benedict is a word here')).toBe('benedict is a word here');
  });

  it('never replaces common-word names alone and marks shared names as ambiguous', () => {
    const { pseudonymizeText, restoreText, tokenForUser } = createPseudonymizer(fixture());
    const grace = tokenForUser('u-grace') as string;

    // A common-word name is never mapped to a teammate. Capitalized, it is still
    // treated as an unknown mention (privacy first) and restored in answers.
    const idiom = pseudonymizeText('Grace under pressure');
    expect(idiom).toMatch(/^Mention-\d{3} under pressure$/);
    expect(idiom).not.toContain(grace);
    expect(restoreText(idiom)).toBe('Grace under pressure');
    expect(pseudonymizeText('Grace Tan led it')).toBe(`${grace} led it`);
    // Two people are named "Jo Reyes": full name and parts are ambiguous.
    expect(pseudonymizeText('Jo Reyes and Reyes')).toBe(
      `${AMBIGUOUS_PERSON} and ${AMBIGUOUS_PERSON}`
    );
    // Display labels disambiguate them and map to distinct tokens.
    const jo1 = tokenForUser('u-jo1') as string;
    expect(pseudonymizeText('Jo Reyes (Sales) said')).toBe(`${jo1} said`);
  });

  it('restores tokens to display labels and leaves unknown tokens alone', () => {
    const { restoreText, tokenForUser } = createPseudonymizer(fixture());
    const ben = tokenForUser('u-ben') as string;

    expect(restoreText(`**Person-01** and ${ben.toLowerCase()} — Person-99`)).toBe(
      '**Ana Cruz** and Benedict Lim — Person-99'
    );
  });

  it('restores tokens split across stream chunks without leaking partial tokens', () => {
    const { createStreamRestorer } = createPseudonymizer(fixture());
    const text = 'Person-01 said Person-06 helped. Plan ahead.';

    for (const size of [1, 2, 3, 7]) {
      const restorer = createStreamRestorer();
      const pieces: Array<string> = [];
      for (let index = 0; index < text.length; index += size) {
        pieces.push(restorer.push(text.slice(index, index + size)));
      }
      pieces.push(restorer.flush());

      expect(pieces.join('')).toBe('Ana Cruz said María Núñez helped. Plan ahead.');
      expect(pieces.some((piece) => /Person-\d?$/.test(piece))).toBe(false);
    }
  });
});

describe('pseudonymizeSource', () => {
  it('removes every known name from the rendered prompt data', () => {
    const source = fixture();
    const pseudonymizer = createPseudonymizer(source);
    const safe = pseudonymizeSource(source, pseudonymizer);
    const { text } = renderInsightContext(safe, buildInsightStats(safe));

    for (const name of ['Ana Cruz', 'Benedict', 'María', 'Núñez', 'Grace Tan', 'Jo Reyes']) {
      expect(text).not.toContain(name);
    }
    expect(text).toContain('person="Person-01"');
    expect(text).toContain('Pending (5)');
    expect(text).toMatch(/Mention-\d{3} under pressure/);
    // "Jo" is not a known teammate, so it is detected as a mention.
    expect(text).toMatch(
      new RegExp(`Lunch with ${pseudonymizer.tokenForUser('u-maria')} and with Mention-\\d{3}`)
    );
    expect(text).not.toMatch(/with Jo\b/);
  });
});
