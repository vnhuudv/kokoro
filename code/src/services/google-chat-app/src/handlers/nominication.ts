import type { Response } from 'express';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL ?? 'http://api-gateway:3001';

export async function handleNomicationCommand(
  spaceId: string,
  userId: string,
  text: string,
  res: Response,
): Promise<void> {
  const res_ = await fetch(`${API_GATEWAY_URL}/nominication/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channelId: spaceId, triggerType: 'manual', initiatorSlackUserId: userId }),
  });

  if (!res_.ok) {
    res.json({ text: 'Failed to create Nominication. Please try again.' });
    return;
  }

  const session = await res_.json() as { id: string };
  res.json({
    text: '✅ Nominication created!',
    cardsV2: [
      {
        cardId: 'nominication-created',
        card: {
          sections: [
            {
              widgets: [
                { textParagraph: { text: `✅ <b>Nominication created!</b>` } },
                {
                  buttonList: {
                    buttons: [
                      {
                        text: 'Invite team',
                        onClick: { action: { function: 'nominication_invite', parameters: [{ key: 'sessionId', value: session.id }] } },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  });
}

export async function pollAndSendNudgesGChat(sendMessage: (spaceId: string, userId: string, text: string) => Promise<void>): Promise<void> {
  let nudges: Array<{ id: string; channelId: string; targetSlackUserId: string; reason: string }>;
  try {
    const r = await fetch(`${API_GATEWAY_URL}/nominication/nudges/pending`);
    if (!r.ok) return;
    nudges = await r.json() as typeof nudges;
  } catch {
    return;
  }

  for (const nudge of nudges) {
    try {
      await sendMessage(nudge.channelId, nudge.targetSlackUserId,
        `📊 ${nudge.reason}. A team gathering might help bridge the gap. Reply /nominication to start one.`);
      await fetch(`${API_GATEWAY_URL}/nominication/nudges/${nudge.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent' }),
      });
    } catch {
      // best-effort
    }
  }
}
