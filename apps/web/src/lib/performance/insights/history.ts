import { type ChatMessage, estimateTokenCount } from '@hr-portal/ai';
import { INSIGHT_HISTORY_ASSISTANT_CHARS, INSIGHT_TOKEN_BUDGET } from './config';
import type { InsightMessage } from './conversations';

/**
 * Replays stored history (never client-supplied history), clipping older
 * answers and dropping the oldest turns until the history budget fits.
 */
export function buildHistoryMessages(
  history: Array<InsightMessage>,
  budgetTokens: number = INSIGHT_TOKEN_BUDGET.history
): Array<ChatMessage> {
  const messages: Array<ChatMessage> = history.map((message) => ({
    role: message.role,
    content:
      message.role === 'assistant' && message.content.length > INSIGHT_HISTORY_ASSISTANT_CHARS
        ? `${message.content.slice(0, INSIGHT_HISTORY_ASSISTANT_CHARS)}…`
        : message.content,
  }));

  while (
    messages.length > 0 &&
    estimateTokenCount(messages.map((message) => message.content).join('\n')) > budgetTokens
  ) {
    messages.shift();
  }

  // Start on a user turn so the replay never opens with an orphaned answer.
  while (messages[0]?.role === 'assistant') {
    messages.shift();
  }

  return messages;
}
