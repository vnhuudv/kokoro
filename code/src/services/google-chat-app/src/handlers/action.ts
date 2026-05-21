import { buildCoachingDialog } from '../cards/coaching';
import { logRequest } from '../middleware/logger';

const FEEDBACK_URL = 'http://annotation-pipeline:8001/feedback/suggestion-used';
const COACHING_URL = 'http://annotation-pipeline:8001/coaching/panel';
const TENANT_ID = process.env.KOKORO_TENANT_ID ?? 'default-tenant';
const SOURCE_LANG = process.env.KOKORO_SOURCE_LANG ?? 'ja';

function getParam(parameters: Array<{ key: string; value: string }>, key: string): string {
  return parameters.find(p => p.key === key)?.value ?? '';
}

function suggestionCard(text: string): any {
  return {
    cardsV2: [{
      cardId: 'suggestionCard',
      card: {
        header: { title: 'Kokoro · 💡 Suggested phrasing' },
        sections: [{
          widgets: [{ textParagraph: { text: `<blockquote>${text}</blockquote>` } }],
        }, {
          widgets: [{ textParagraph: { text: 'Copy the text above to use it in your message.' } }],
        }],
      },
    }],
  };
}

export async function handleAction(event: any): Promise<any> {
  const methodName: string = event.action?.function ?? event.action?.actionMethodName ?? '';
  const parameters: Array<{ key: string; value: string }> = event.action?.parameters ?? [];
  const userDisplayName: string = event.user?.name ?? '';

  // Dismiss: no-op
  if (methodName === 'presend_dismiss') return {};

  // Suggestion buttons (inline annotation or pre-send)
  if (methodName.startsWith('suggestion_') || methodName.startsWith('presend_suggestion_')) {
    const suggestionText = getParam(parameters, 'suggestionText');
    const caseId = getParam(parameters, 'caseId');

    if (caseId) {
      fetch(FEEDBACK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: caseId,
          slack_user_id: userDisplayName, // pipeline schema field name — used for all chat platforms
          tenant_id: TENANT_ID,
          language: SOURCE_LANG,
        }),
      }).catch(e => logRequest('feedback.post_failed', { error: String(e) }));
    }

    logRequest('suggestion.selected', { method: methodName, user: userDisplayName });
    return suggestionCard(suggestionText);
  }

  // Coaching dialog
  if (methodName === 'coaching_open') {
    try {
      const res = await fetch(COACHING_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          register: getParam(parameters, 'register'),
          intent_label: getParam(parameters, 'intent_label'),
          risk_category: getParam(parameters, 'risk_category') || null,
          micro_text: getParam(parameters, 'micro_text'),
          coaching_rationale: getParam(parameters, 'coaching_rationale'),
          source_lang: getParam(parameters, 'source_lang') || SOURCE_LANG,
        }),
      });
      if (!res.ok) throw new Error(`coaching ${res.status}`);
      const coaching = await res.json();
      logRequest('coaching.opened', { user: userDisplayName });
      return buildCoachingDialog(coaching);
    } catch (err) {
      logRequest('coaching.error', { error: String(err) });
      return buildCoachingDialog({
        register_label: 'Unknown',
        register_explanation: '',
        intent: '',
        cultural_risk: null,
        rationale: 'Coaching is temporarily unavailable.',
        suggestion: null,
      });
    }
  }

  logRequest('action.unknown', { method: methodName, user: userDisplayName });
  return {};
}
