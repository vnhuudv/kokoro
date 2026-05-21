import { buildAnnotationCard } from '../src/cards/annotation';
import { buildPresendCard } from '../src/cards/presend';
import { buildCoachingDialog } from '../src/cards/coaching';

describe('buildAnnotationCard', () => {
  const baseResult = {
    case_id: 'case-123',
    register: 'formal',
    intent_label: 'Polite request',
    risk_category: 'Register mismatch',
    micro_text: 'This phrasing may signal blame.',
    coaching_rationale: 'In Japanese culture, direct blame assignment...',
    suggestions: [
      { label: 'Formal equivalent', text: 'より丁寧な表現', register: 'formal' },
    ],
  };

  it('includes risk_category in header when flagged', () => {
    const card = buildAnnotationCard(baseResult, 'ja');
    const header = card.cardsV2[0].card.header;
    expect(header.title).toContain('Register mismatch');
  });

  it('includes micro_text in body', () => {
    const card = buildAnnotationCard(baseResult, 'ja');
    const section = card.cardsV2[0].card.sections[0];
    expect(JSON.stringify(section)).toContain('This phrasing may signal blame.');
  });

  it('includes suggestion buttons', () => {
    const card = buildAnnotationCard(baseResult, 'ja');
    const actionsSection = card.cardsV2[0].card.sections[2];
    expect(JSON.stringify(actionsSection)).toContain('Formal equivalent');
  });

  it('includes Learn more button with coaching context', () => {
    const card = buildAnnotationCard(baseResult, 'ja');
    const actionsSection = card.cardsV2[0].card.sections[2];
    expect(JSON.stringify(actionsSection)).toContain('coaching_open');
  });

  it('shows green check header when neutral (no risk_category)', () => {
    const neutralResult = { ...baseResult, risk_category: null, intent_label: 'Neutral message' };
    const card = buildAnnotationCard(neutralResult, 'ja');
    expect(card.cardsV2[0].card.header.title).toContain('✅');
  });
});

describe('buildPresendCard', () => {
  const flaggedResult = {
    case_id: 'case-456',
    register: 'formal',
    intent_label: 'Directive pressure',
    risk_category: 'Authority signal',
    micro_text: 'This may read as coercive.',
    coaching_rationale: 'Directive tone in Japanese workplace...',
    suggestions: [
      { label: 'Softer alternative', text: 'ご検討いただけますか', register: 'formal' },
    ],
  };

  it('shows green card when no risk', () => {
    const neutralResult = { ...flaggedResult, risk_category: null, intent_label: 'Neutral message' };
    const card = buildPresendCard(neutralResult, 'ja');
    expect(card.cardsV2[0].card.header.title).toContain('✅');
  });

  it('shows warning header when flagged', () => {
    const card = buildPresendCard(flaggedResult, 'ja');
    expect(card.cardsV2[0].card.header.title).toContain('⚠');
  });

  it('includes Send original button', () => {
    const card = buildPresendCard(flaggedResult, 'ja');
    expect(JSON.stringify(card)).toContain('presend_dismiss');
  });

  it('includes suggestion buttons', () => {
    const card = buildPresendCard(flaggedResult, 'ja');
    expect(JSON.stringify(card)).toContain('Softer alternative');
  });
});

describe('buildCoachingDialog', () => {
  const coaching = {
    register_label: 'Highly formal keigo',
    register_explanation: 'This message uses formal honorific markers.',
    intent: 'Urgency and accountability',
    cultural_risk: 'Loss of face for the client',
    rationale: 'In Japanese culture, nemawashi requires...',
    suggestion: 'ご確認いただけますでしょうか',
  };

  it('includes REGISTER section', () => {
    const dialog = buildCoachingDialog(coaching);
    expect(JSON.stringify(dialog)).toContain('REGISTER');
    expect(JSON.stringify(dialog)).toContain('Highly formal keigo');
  });

  it('includes CULTURAL RISK when present', () => {
    const dialog = buildCoachingDialog(coaching);
    expect(JSON.stringify(dialog)).toContain('CULTURAL RISK');
    expect(JSON.stringify(dialog)).toContain('Loss of face');
  });

  it('omits CULTURAL RISK when null', () => {
    const dialog = buildCoachingDialog({ ...coaching, cultural_risk: null });
    expect(JSON.stringify(dialog)).not.toContain('CULTURAL RISK');
  });

  it('includes SUGGESTED PHRASING when present', () => {
    const dialog = buildCoachingDialog(coaching);
    expect(JSON.stringify(dialog)).toContain('SUGGESTED PHRASING');
    expect(JSON.stringify(dialog)).toContain('ご確認いただけますでしょうか');
  });

  it('returns valid dialog action response shape', () => {
    const dialog = buildCoachingDialog(coaching);
    expect(dialog.actionResponse.type).toBe('DIALOG');
    expect(dialog.actionResponse.dialogAction.dialog.body).toBeDefined();
  });
});
