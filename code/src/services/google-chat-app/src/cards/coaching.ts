export interface CoachingContent {
  register_label: string;
  register_explanation: string;
  intent: string;
  cultural_risk: string | null;
  rationale: string;
  suggestion: string | null;
}

function textSection(header: string, body: string): any {
  return {
    header,
    widgets: [{ textParagraph: { text: body } }],
  };
}

export function buildCoachingDialog(coaching: CoachingContent): any {
  const sections: any[] = [
    textSection('REGISTER', `<b>${coaching.register_label}</b>\n${coaching.register_explanation}`),
    textSection('INTENT', coaching.intent),
  ];

  if (coaching.cultural_risk) {
    sections.push(textSection('CULTURAL RISK', coaching.cultural_risk));
  }

  sections.push(textSection('WHY THIS MATTERS', coaching.rationale));

  if (coaching.suggestion) {
    sections.push(textSection('SUGGESTED PHRASING', `<i>${coaching.suggestion}</i>`));
  }

  return {
    actionResponse: {
      type: 'DIALOG',
      dialogAction: {
        dialog: {
          body: {
            header: { title: 'Kokoro — Cultural Coaching' },
            sections,
          },
        },
      },
    },
  };
}
