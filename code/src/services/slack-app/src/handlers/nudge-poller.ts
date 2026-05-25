import type { WebClient } from '@slack/web-api';
import { logRequest } from '../middleware/logger';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL ?? 'http://api-gateway:3001';

interface PendingNudge {
  id: string;
  channelId: string;
  targetSlackUserId: string;
  reason: string;
}

export async function pollAndSendNudges(client: WebClient): Promise<void> {
  let nudges: PendingNudge[];
  try {
    const res = await fetch(`${API_GATEWAY_URL}/nominication/nudges/pending`);
    if (!res.ok) return;
    nudges = await res.json() as PendingNudge[];
  } catch {
    return;
  }

  for (const nudge of nudges) {
    try {
      await client.chat.postEphemeral({
        channel: nudge.channelId,
        user: nudge.targetSlackUserId,
        text: `📊 ${nudge.reason}. A team gathering might help.`,
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `📊 *${nudge.reason}.*\nA team gathering might help bridge the gap.` },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Start a Nominication', emoji: false },
                action_id: 'nominication_start_nudged',
                value: nudge.id,
              },
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Dismiss', emoji: false },
                action_id: 'nominication_dismiss_nudge',
                value: nudge.id,
                style: 'danger',
              },
            ],
          },
        ],
      });
      await fetch(`${API_GATEWAY_URL}/nominication/nudges/${nudge.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent' }),
      });
      logRequest('nudge.sent', { nudgeId: nudge.id, channel: nudge.channelId });
    } catch (err) {
      logRequest('nudge.send_failed', { nudgeId: nudge.id, error: String(err) });
    }
  }
}
