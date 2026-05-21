export interface AnnotationResult {
  case_id: string | null;
  register: string;
  intent_label: string;
  risk_category: string | null;
  micro_text: string;
  coaching_rationale: string;
  suggestions: Array<{ label: string; text: string; register: string }>;
}

export function buildCoachingParams(result: AnnotationResult, sourceLang: string): Array<{ key: string; value: string }> {
  return [
    { key: 'register', value: result.register },
    { key: 'intent_label', value: result.intent_label },
    { key: 'risk_category', value: result.risk_category ?? '' },
    { key: 'micro_text', value: result.micro_text },
    { key: 'coaching_rationale', value: result.coaching_rationale },
    { key: 'source_lang', value: sourceLang },
  ];
}

export function buildAnnotationCard(result: AnnotationResult, sourceLang: string): any {
  const isNeutral = !result.risk_category && result.intent_label === 'Neutral message';
  const headerTitle = isNeutral
    ? `Kokoro · ✅ ${result.intent_label}`
    : `Kokoro · ⚠ ${result.risk_category ?? 'Cultural flag'} · Before you send`;

  const coachingParams = buildCoachingParams(result, sourceLang);

  const suggestionButtons = result.suggestions.map((s, i) => ({
    text: s.label,
    onClick: {
      action: {
        function: `suggestion_${i}`,
        parameters: [
          { key: 'suggestionText', value: s.text || s.label },
          { key: 'caseId', value: result.case_id ?? '' },
        ],
      },
    },
  }));

  suggestionButtons.push({
    text: 'Learn more',
    onClick: {
      action: {
        function: 'coaching_open',
        parameters: coachingParams,
      },
    },
  });

  return {
    cardsV2: [{
      cardId: 'annotationCard',
      card: {
        header: { title: headerTitle },
        sections: [
          {
            widgets: [{ textParagraph: { text: `<i>${result.micro_text}</i>` } }],
          },
          ...(result.coaching_rationale ? [{
            widgets: [{ textParagraph: { text: result.coaching_rationale } }],
          }] : []),
          {
            widgets: [{ buttonList: { buttons: suggestionButtons } }],
          },
        ],
      },
    }],
  };
}
