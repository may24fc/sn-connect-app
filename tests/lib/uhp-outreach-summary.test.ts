import {
  type UhpOutreachActivityRow,
  summarizeUhpOutreach,
  updateUhpReplyMetrics,
} from '@/lib/uhp';
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
      repliedAfterOutreach: 1,
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

  it('counts timestamp-filtered manual replies and activity replies once per client', () => {
    const ticked = { interest_state: 'unknown', replied: true };
    const unticked = { interest_state: 'unknown', replied: false };
    const summary = summarizeUhpOutreach(
      [
        row({ client_id: 'a', direction: 'outbound', client: ticked }),
        row({ client_id: 'a', direction: 'outbound', client: ticked }),
        row({ client_id: 'b', direction: 'outbound', client: unticked }),
        row({ client_id: 'c', direction: 'outbound', client: unticked }),
        row({ client_id: 'd', direction: 'outbound', reply_received: true, client: ticked }),
        // Synthetic row emitted only when 'a' was manually marked Replied in this period.
        row({ client_id: 'a', direction: null, reply_received: true, client: ticked }),
        // A current all-time flag alone is not a reply event in this period.
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

  it('does not leak an all-time Replied boolean into the selected period', () => {
    const summary = summarizeUhpOutreach(
      [
        row({
          client_id: 'old-reply',
          direction: 'outbound',
          client: { interest_state: 'unknown', replied: true },
        }),
        row({
          client_id: 'reply-in-period',
          reply_received: true,
          client: { interest_state: 'unknown', replied: true },
        }),
      ],
      0
    );

    expect(summary).toMatchObject({ clientsReplied: 1, responseRate: 0 });
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

  it('optimistically updates reply cards for a reached client and reverses cleanly', () => {
    const before = {
      outreachAttempts: 5,
      replies: 1,
      clientsReachedOut: 4,
      repliedAfterOutreach: 1,
      reachedOutClientIds: ['client-1', 'client-2', 'client-3', 'client-4'],
      repliedClientIds: ['client-1'],
      activityReplyClientIds: [],
      responseRate: 25,
      interested: 0,
      declined: 0,
      wellnessEvaluationsScheduled: 0,
      callsScheduled: 0,
    };

    const checked = updateUhpReplyMetrics(before, 'client-2', true);
    expect(checked).toMatchObject({ replies: 2, repliedAfterOutreach: 2, responseRate: 50 });
    expect(updateUhpReplyMetrics(checked, 'client-2', false)).toEqual(before);
  });

  it('updates Replies without changing Response rate for a client not reached in the period', () => {
    const before = {
      replies: 1,
      responseRate: 50,
      clientsReachedOut: 2,
      repliedAfterOutreach: 1,
      reachedOutClientIds: ['client-1', 'client-2'],
      repliedClientIds: ['client-1'],
      activityReplyClientIds: [],
    };

    expect(updateUhpReplyMetrics(before, 'older-client', true)).toMatchObject({
      replies: 2,
      repliedAfterOutreach: 1,
      responseRate: 50,
    });
  });

  it('does not double-count a client who already has reply activity', () => {
    const before = {
      replies: 1,
      responseRate: 50,
      clientsReachedOut: 2,
      repliedAfterOutreach: 1,
      reachedOutClientIds: ['client-1', 'client-2'],
      repliedClientIds: ['client-1'],
      activityReplyClientIds: ['client-1'],
    };

    expect(updateUhpReplyMetrics(before, 'client-1', true)).toEqual(before);
    expect(updateUhpReplyMetrics(before, 'client-1', false)).toEqual(before);
  });
});
