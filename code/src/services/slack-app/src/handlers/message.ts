import type { WebClient } from '@slack/web-api';
import type { ProfileCache } from '../cache/profile-cache';
import type { ChannelCache } from '../cache/channel-cache';
import { annotate } from '../clients/annotation-pipeline-client';
import { renderAnnotationBlock } from '../renderers/annotation-block';
import { logRequest } from '../middleware/logger';

export interface MessageEvent {
  text: string;
  user: string;
  channel: string;
  ts: string;
}

export async function handleIncomingMessage(
  event: MessageEvent,
  client: WebClient,
  profileCache: ProfileCache,
  channelCache: ChannelCache,
): Promise<void> {
  logRequest('message.received', { channel: event.channel, ts: event.ts });

  const senderProfile = await profileCache.get(event.user);
  if (!senderProfile?.optedIn) return;

  try {
    const memberIds = await channelCache.getMembers(event.channel);
    const profiles = await profileCache.getMany(memberIds);

    const recipients = [...profiles.entries()].filter(
      ([id, p]) => id !== event.user && p.optedIn && p.language !== senderProfile.language
    );
    if (recipients.length === 0) return;

    const pipelineUrl = process.env.ANNOTATION_PIPELINE_URL ?? 'http://annotation-pipeline:8001';
    const result = await annotate(pipelineUrl, {
      messageId: event.ts,
      channelId: event.channel,
      senderId: event.user,
      senderCulture: senderProfile.language,
      text: event.text,
    });

    if (!result) {
      logRequest('annotation.dropped', { channel: event.channel, ts: event.ts });
      return;
    }

    for (const [recipientId, recipientProfile] of recipients) {
      const blocks = renderAnnotationBlock(result, recipientProfile.fluencyScore);
      await client.chat.postEphemeral({
        channel: event.channel,
        user: recipientId,
        text: `Cultural context: ${result.register} · ${result.intentLabel}`,
        blocks,
      });
    }
  } catch (err) {
    logRequest('annotation.error', { channel: event.channel, ts: event.ts, error: String(err) });
  }
}
