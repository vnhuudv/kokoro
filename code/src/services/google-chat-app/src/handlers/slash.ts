import { buildPresendCard } from '../cards/presend';
import { logRequest } from '../middleware/logger';

const ANNOTATION_URL = 'http://annotation-pipeline:8001/annotate/';
const TENANT_ID = process.env.KOKORO_TENANT_ID ?? 'default-tenant';
const SOURCE_LANG = process.env.KOKORO_SOURCE_LANG ?? 'ja';
const TARGET_LANG = process.env.KOKORO_TARGET_LANG ?? 'vi';

function usageCard(): any {
  return {
    cardsV2: [{
      cardId: 'usageCard',
      card: {
        header: { title: 'Kokoro — Pre-Send Check' },
        sections: [{
          widgets: [{
            textParagraph: {
              text: 'Usage: <b>/kokoro &lt;your draft message&gt;</b> — Kokoro will check it before you send.',
            },
          }],
        }],
      },
    }],
  };
}

export async function handleSlashCommand(draft: string): Promise<any> {
  if (!draft.trim()) return usageCard();

  try {
    const res = await fetch(ANNOTATION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message_id: `presend-${Date.now()}`,
        tenant_id: TENANT_ID,
        source_language: SOURCE_LANG,
        target_language: TARGET_LANG,
        redacted_text: draft,
      }),
    });

    if (!res.ok) throw new Error(`pipeline ${res.status}`);
    const { result } = await res.json() as { result: any };
    logRequest('presend.checked', { intent: result.intent_label });
    return buildPresendCard(result, SOURCE_LANG);
  } catch (err) {
    logRequest('presend.error', { error: String(err) });
    return {
      text: 'Kokoro is temporarily unavailable. You can send your message.',
    };
  }
}
