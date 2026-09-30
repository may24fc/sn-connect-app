import { type UhpOutreachActivityRow, summarizeUhpOutreach } from '@/lib/uhp';
import { describe, expect, it } from 'vitest';

function row(overrides: Partial<UhpOutreachActivityRow>): UhpOutreachActivityRow {
  return {
    client_id: 'a',
    direction: null,
    reply_received: false,
    prospect_outcome: null,
    appointment_type: null,
    ...overrides,
  };
}

describe('summarizeUhpOutreach', () => {
  it('counts people, not messages, for reach, replies, and response rate', () => {
    const summary = summarizeUhpOutreach(
      [
        row({ client_id: 'a', direction: 'outbound' }),
        row({ client_id: 'a', direction: 'outbound' }),
        row({ client_id: 'a', direction: 'inbound' }),
        row({ client_id: 'b', direction: 'outbound' }),
        row({ client_id: 'c', direction: 'outbound', prospect_outcome: 'declined' }),
        row({ client_id: 'd', direction: 'outbound' }),
      ],
      2
    );

    expect(summary).toMatchObject({
      clientsReachedOut: 4,
      outreachAttempts: 5,
      clientsReplied: 1,
      responseRate: 25,
      declined: 1,
      noResponse: 2,
      newClients: 2,
    });
  });

  it('counts appointments and interest', () => {
    const summary = summarizeUhpOutreach(
      [
        row({ appointment_type: 'wellness_evaluation', prospect_outcome: 'interested' }),
        row({ client_id: 'b', appointment_type: 'call' }),
      ],
      0
    );
    expect(summary).toMatchObject({
      wellnessEvaluationsScheduled: 1,
      callsScheduled: 1,
      interested: 1,
    });
  });

  it('returns a zero response rate with no outreach', () => {
    expect(summarizeUhpOutreach([], 0).responseRate).toBe(0);
  });
});
