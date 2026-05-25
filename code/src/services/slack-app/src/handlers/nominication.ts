import type { WebClient } from '@slack/web-api';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL ?? 'http://api-gateway:3001';

export async function handleNomicationCommand(
  channelId: string,
  text: string,
  userId: string,
  client: WebClient,
): Promise<void> {
  const parts = text.trim().split(/\s+/);
  const scheduledAt = parts.length >= 2 ? tryParseDate(parts[0], parts[1]) : undefined;
  const venue = parts.length >= 3 ? parts.slice(2).join(' ') : undefined;

  const res = await fetch(`${API_GATEWAY_URL}/nominication/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channelId,
      scheduledAt,
      venue,
      triggerType: 'manual',
      initiatorSlackUserId: userId,
    }),
  });

  if (!res.ok) {
    await client.chat.postEphemeral({
      channel: channelId,
      user: userId,
      text: 'Failed to create Nominication. Please try again.',
    });
    return;
  }

  const session = await res.json() as { id: string };
  const dateLabel = scheduledAt ? ` for ${new Date(scheduledAt).toLocaleDateString()}` : '';
  await client.chat.postEphemeral({
    channel: channelId,
    user: userId,
    text: `Nominication created${dateLabel}.`,
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `✅ *Nominication created${dateLabel}!*` },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Invite team', emoji: false },
            action_id: 'nominication_invite',
            value: session.id,
          },
        ],
      },
    ],
  });
}

function tryParseDate(datePart: string, timePart: string): string | undefined {
  try {
    const d = new Date(`${datePart} ${timePart}`);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  } catch {
    return undefined;
  }
}
