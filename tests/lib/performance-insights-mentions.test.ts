import { detectMentions } from '@/lib/performance/insights/mentions';
import { redactPersonalDetails } from '@/lib/performance/insights/personal-details';
import { createPseudonymizer, pseudonymizeSource } from '@/lib/performance/insights/pseudonymize';
import { renderInsightContext } from '@/lib/performance/insights/render';
import { buildInsightSource } from '@/lib/performance/insights/source';
import { buildInsightStats } from '@/lib/performance/insights/stats';
import { describe, expect, it } from 'vitest';

describe('detectMentions', () => {
  it.each([
    ['My wife Bea and our son Migo went to Tagaytay last weekend.', ['Bea', 'Migo', 'Tagaytay']],
    ['Tita Lorna visited from Cebu; I miss Lola Remy.', ['Lorna', 'Cebu', 'Remy']],
    [
      'Client Acme Corporation loved the deck. I met Sir Jun from Globe Telecom.',
      ['Acme Corporation', 'Jun', 'Globe Telecom'],
    ],
    [
      'Spent time with John Smith and Maria at Jollibee in Quezon City.',
      ['John Smith', 'Maria', 'Jollibee', 'Quezon City'],
    ],
    ["My daughter Ella had a fever and I took her to St. Luke's.", ['Ella', 'St', 'Luke']],
    ['Grateful for Kuya Paolo and Ate Joy who helped with the move.', ['Paolo', 'Joy']],
    ['Bea and I finally rested.', ['Bea']],
  ])('finds names in %j', (text, expected) => {
    expect(detectMentions(text)).toEqual(expected);
  });

  it('ignores sentence-initial verbs, dates, acronyms, tools, departments, and tokens', () => {
    expect(
      detectMentions(
        'Shipped the revamp on Monday before Christmas with the Marketing team. OKR review in Slack with Person-03 went well.',
        new Set(['marketing'])
      )
    ).toEqual([]);
  });

  it('does not join names across lines', () => {
    expect(detectMentions('Lunch with Jo\nTime together')).toEqual(['Jo']);
  });
});

describe('redactPersonalDetails', () => {
  it('replaces links, handles, IDs, addresses, and birth dates', () => {
    expect(
      redactPersonalDetails(
        'See https://example.com/x or www.site.ph, ping @bea_c, SSS 34-1234567-8, I live at 123 Mabini Street, Blk 5 Lot 12, Brgy. San Isidro; my birthday is March 3, 1995.'
      )
    ).toBe(
      'See [url] or [url] ping [handle], SSS [id-number], I live at [address], [address] [address], [address]; my birthday is [birth-date].'
    );
  });

  it('leaves ordinary text, years, amounts, and role phrases alone', () => {
    const text = 'In 2026 the Unit Head approved Phase Two and we saved 150,000 pesos by Q4.';
    expect(redactPersonalDetails(text)).toBe(text);
  });
});

describe('pseudonymizer with mentions', () => {
  const source = buildInsightSource({
    periodKey: '2026-10',
    monthsBack: 0,
    audience: [{ userId: 'u-ana', fullName: 'Ana Cruz', departmentRole: 'Marketing' }],
    rows: [
      {
        user_id: 'u-ana',
        full_name: 'Ana Cruz',
        month_key: '2026-10',
        department_role: 'Marketing',
        work_rank: 7,
        family_rank: 4,
        personal_rank: 6,
        family_feelings: 'Worried. My son Migo was sick, so Tita Lorna came over from Cebu.',
        personal_headline: 'Moved to 45 Rizal Avenue; follow me @ana.c',
      },
    ],
  });

  // Mention tokens follow sorted mention text: Cebu, Lorna, Migo.
  it('removes mentioned names and personal details from the prompt data', () => {
    const pseudonymizer = createPseudonymizer(source);
    const safe = pseudonymizeSource(source, pseudonymizer);
    const { text } = renderInsightContext(safe, buildInsightStats(safe));

    for (const identifier of ['Ana Cruz', 'Migo', 'Lorna', 'Cebu', 'Rizal', '@ana.c']) {
      expect(text).not.toContain(identifier);
    }
    expect(text).toContain(
      'My son Mention-003 was sick, so Tita Mention-002 came over from Mention-001.'
    );
    expect(text).toContain('Moved to [address]; follow me [handle]');
    expect(pseudonymizer.mentionCount()).toBe(3);
  });

  it('tokenizes new mentions in later questions and restores them in answers', () => {
    const pseudonymizer = createPseudonymizer(source);
    pseudonymizeSource(source, pseudonymizer);

    expect(pseudonymizer.pseudonymizeText('Did Migo recover? Ask about Bea too.')).toBe(
      'Did Mention-003 recover? Ask about Mention-004 too.'
    );

    const restorer = pseudonymizer.createStreamRestorer();
    const answer = 'Person-01 said Mention-003 recovered; Mention-004 is not in the data.';
    let restored = '';
    for (const char of answer) restored += restorer.push(char);
    restored += restorer.flush();
    expect(restored).toBe('Ana Cruz said Migo recovered; Bea is not in the data.');
  });
});
