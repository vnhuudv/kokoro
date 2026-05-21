import type { AnnotationResult } from './annotation';
import { buildCoachingParams } from './annotation';

export function buildPresendCard(result: AnnotationResult, sourceLang: string): any {
  const isClean = !result.risk_category && result.intent_label === 'Neutral message';

  if (isClean) {
    return {
      cardsV2: [{
        cardId: 'presendCard',
        card: {
          header: { title: 'Kokoro · ✅ Your message looks good to send.' },
          sections: [{
            widgets: [{
              textParagraph: { text: `Register: <b>${result.register}</b> · No cultural flags detected.` },
            }],
          }],
        },
      }],
    };
  }

  const coachingParams = buildCoachingParams(result, sourceLang);

  const suggestionButtons = result.suggestions.map((s, i) => ({
    text: s.label,
    onClick: {
      action: {
        function: `presend_suggestion_${i}`,
        parameters: [
          { key: 'suggestionText', value: s.text || s.label },
          { key: 'caseId', value: result.case_id ?? '' },
        ],
      },
    },
  }));

  suggestionButtons.push({
    text: 'Send original',
    onClick: { action: { function: 'presend_dismiss', parameters: [] } },
  });

  suggestionButtons.push({
    text: 'Learn more',
    onClick: { action: { function: 'coaching_open', parameters: coachingParams } },
  });

  return {
    cardsV2: [{
      cardId: 'presendCard',
      card: {
        header: { title: `Kokoro · ⚠ ${result.risk_category ?? 'Cultural flag'} · Before you send` },
        sections: [
          { widgets: [{ textParagraph: { text: `<i>${result.micro_text}</i>` } }] },
          ...(result.coaching_rationale ? [{
            widgets: [{ textParagraph: { text: result.coaching_rationale } }],
          }] : []),
          { widgets: [{ buttonList: { buttons: suggestionButtons } }] },
        ],
      },
    }],
  };
}
