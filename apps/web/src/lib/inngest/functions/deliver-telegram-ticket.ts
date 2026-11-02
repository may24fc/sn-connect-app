import { deliverTicketEvent, queuePendingTicketDeliveries } from '@/lib/telegram-community';
import { inngest } from '../client';

export const deliverTelegramTicket = inngest.createFunction(
  { id: 'deliver-telegram-ticket', retries: 6 },
  { event: 'telegram/ticket-delivery.requested' },
  async ({ event, step }) =>
    step.run('deliver-ticket-event', () => deliverTicketEvent(event.data.deliveryEventId))
);

export const sweepTelegramTicketDeliveries = inngest.createFunction(
  { id: 'sweep-telegram-ticket-deliveries' },
  { cron: '*/10 * * * *' },
  async ({ step }) => step.run('queue-pending-ticket-events', () => queuePendingTicketDeliveries())
);
