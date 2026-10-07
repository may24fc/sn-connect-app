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

  it('counts clients ticked Replied only when they were reached out to in the period', () => {
    const ticked = { interest_state: 'unknown', replied: true };
    const unticked = { interest_state: 'unknown', replied: false };
    const summary = summarizeUhpOutreach(
      [
        row({ client_id: 'a', direction: 'outbound', client: ticked }),
        row({ client_id: 'a', direction: 'outbound', client: ticked }),
        row({ client_id: 'b', direction: 'outbound', client: unticked }),
        row({ client_id: 'c', direction: 'outbound', client: unticked }),
        row({ client_id: 'd', direction: 'outbound', reply_received: true, client: ticked }),
        // 'e' is ticked Replied but was not contacted in this period.
        row({ client_id: 'e', direction: null, client: ticked }),
      ],
      0
    );

    expect(summary).toMatchObject({
      clientsReachedOut: 4,
      clientsReplied: 2,
      responseRate: 50,
      noResponse: 2,
    });
  });

  it('counts interest as it currently stands, once per client', () => {
    const summary = summarizeUhpOutreach(
      [
        // Marked interested, then declined: counts as declined only.
        row({
          client_id: 'a',
          prospect_outcome: 'interested',
          client: { interest_state: 'declined', replied: false },
        }),
        row({
          client_id: 'a',
          prospect_outcome: 'declined',
          client: { interest_state: 'declined', replied: false },
        }),
        // Marked interested, then reset to unknown: not counted.
        row({
          client_id: 'b',
          prospect_outcome: 'interested',
          client: { interest_state: 'unknown', replied: false },
        }),
        row({
          client_id: 'c',
          prospect_outcome: 'interested',
          client: { interest_state: 'interested', replied: false },
        }),
      ],
      0
    );

    expect(summary).toMatchObject({ interested: 1, declined: 1 });
  });

  it('returns a zero response rate with no outreach', () => {
    expect(summarizeUhpOutreach([], 0).responseRate).toBe(0);
  });
});
