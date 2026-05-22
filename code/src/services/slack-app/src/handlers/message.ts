import { WebClient } from '@slack/web-api';
import type { Block, KnownBlock } from '@slack/bolt';
import { logRequest } from '../middleware/logger';

const ANNOTATION_URL = 'http://annotation-pipeline:8001/annotate/';
const TENANT_ID = process.env.SLACK_TENANT_ID ?? 'default-tenant';
const SOURCE_LANG = (process.env.KOKORO_SOURCE_LANG ?? 'ja') as 'ja' | 'vi';
const TARGET_LANG = (process.env.KOKORO_TARGET_LANG ?? 'vi') as 'ja' | 'vi';

export interface MessageEvent {
  text: string;
  user: string;
  channel: string;
  ts: string;
}

interface SuggestionChip {
  label: string;
  register: string;
  text: string;
}

interface AnnotationResult {
  message_id: string;
  case_id: string | null;
  register: string;
  intent_label: string;
  risk_category: string | null;
  micro_text: string;
  coaching_rationale: string;
  suggestions: SuggestionChip[];
}

interface AnnotationResponse {
  message_id: string;
  result: AnnotationResult;
  latency_ms: number;
}

async function callAnnotationPipeline(event: MessageEvent): Promise<AnnotationResult | null> {
  try {
    const res = await fetch(ANNOTATION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message_id: event.ts,
        tenant_id: TENANT_ID,
        source_language: SOURCE_LANG,
        target_language: TARGET_LANG,
        redacted_text: event.text,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as AnnotationResponse;
    return data.result;
  } catch {
    return null;
  }
}

function buildAnnotationBlocks(result: AnnotationResult): (KnownBlock | Block)[] {
  const blocks: (KnownBlock | Block)[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Kokoro* ${result.risk_category ? `· :warning: ${result.risk_category}` : '· :white_check_mark: ' + result.intent_label}`,
      },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `_${result.micro_text}_` },
    },
  ];

  if (result.coaching_rationale) {
    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: result.coaching_rationale }],
    });
  }

  // Coaching context encoded in the button value for the modal
  const coachingValue = JSON.stringify({
    register: result.register,
    intent_label: result.intent_label,
    risk_category: result.risk_category,
    micro_text: result.micro_text,
    coaching_rationale: result.coaching_rationale,
    source_lang: SOURCE_LANG,
  });

  const actionElements: import('@slack/bolt').ActionsBlock['elements'] = result.suggestions.map((s, i) => ({
    type: 'button',
    text: { type: 'plain_text', text: s.label },
    action_id: `suggestion_${i}`,
    value: JSON.stringify({ text: s.text || s.label, case_id: result.case_id }),
  }));

  actionElements.push({
    type: 'button',
    text: { type: 'plain_text', text: 'Learn more' },
    action_id: 'coaching_open',
    value: coachingValue,
  });

  blocks.push({ type: 'actions', elements: actionElements });

  return blocks;
}

export async function handleIncomingMessage(event: MessageEvent, client: WebClient): Promise<void> {
  logRequest('message.received', { channel: event.channel, ts: event.ts });

  const result = await callAnnotationPipeline(event);
  if (!result) {
    logRequest('annotation.skipped', { ts: event.ts });
    return;
  }

  // Only surface annotation if there is something culturally meaningful
  if (!result.risk_category && result.intent_label === 'Neutral message') {
    logRequest('annotation.neutral', { ts: event.ts });
    return;
  }

  try {
    await client.chat.postEphemeral({
      channel: event.channel,
      user: event.user,
      text: result.micro_text,
      blocks: buildAnnotationBlocks(result),
    });
    logRequest('annotation.posted', { ts: event.ts, intent: result.intent_label });
  } catch (err) {
    logRequest('annotation.post_failed', { ts: event.ts, error: String(err) });
  }
}
