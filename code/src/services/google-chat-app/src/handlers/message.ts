import { buildAnnotationCard } from '../cards/annotation';
import { logRequest } from '../middleware/logger';

const ANNOTATION_URL = 'http://annotation-pipeline:8001/annotate/';
const TENANT_ID = process.env.KOKORO_TENANT_ID ?? 'default-tenant';
const SOURCE_LANG = process.env.KOKORO_SOURCE_LANG ?? 'ja';
const TARGET_LANG = process.env.KOKORO_TARGET_LANG ?? 'vi';

export interface MessageContext {
  text: string;
  senderName: string;   // e.g. "users/12345"
  spaceName: string;    // e.g. "spaces/abc"
}

export async function handleMessage(ctx: MessageContext): Promise<any | null> {
  try {
    const res = await fetch(ANNOTATION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message_id: `gchat-${Date.now()}`,
        tenant_id: TENANT_ID,
        source_language: SOURCE_LANG,
        target_language: TARGET_LANG,
        redacted_text: ctx.text,
      }),
    });

    if (!res.ok) {
      logRequest('annotation.error', { status: res.status, space: ctx.spaceName });
      return null;
    }
    const { result } = await res.json() as { result: any };

    if (!result.risk_category && result.intent_label === 'Neutral message') {
      logRequest('annotation.neutral', { space: ctx.spaceName });
      return null;
    }

    logRequest('annotation.flagged', { space: ctx.spaceName, intent: result.intent_label });
    return buildAnnotationCard(result, SOURCE_LANG);
  } catch (err) {
    logRequest('annotation.error', { error: String(err) });
    return null;
  }
}
