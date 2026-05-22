import type { KnownBlock, ActionsBlock, SectionBlock, ContextBlock } from '@slack/bolt';
import type { AnnotationResult } from '../clients/annotation-pipeline-client';

const FLUENCY_FULL_MAX = parseInt(process.env.FLUENCY_FULL_MAX ?? '30', 10);
const FLUENCY_CONDENSED_MAX = parseInt(process.env.FLUENCY_CONDENSED_MAX ?? '70', 10);

const REGISTER_EMOJI: Record<string, string> = {
  formal: '🔵',
  neutral: '⚪',
  informal: '🟡',
};

export function renderAnnotationBlock(
  result: AnnotationResult,
  fluencyScore: number
): KnownBlock[] {
  if (fluencyScore <= FLUENCY_FULL_MAX) return renderFull(result);
  if (fluencyScore < FLUENCY_CONDENSED_MAX) return renderCondensed(result);
  return renderBadgeOnly(result);
}

function renderFull(result: AnnotationResult): KnownBlock[] {
  const header: SectionBlock = {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `${REGISTER_EMOJI[result.register] ?? '⚪'} *${result.register.toUpperCase()}* · ${result.intentLabel}`,
    },
  };
  const micro: SectionBlock = {
    type: 'section',
    text: { type: 'mrkdwn', text: result.microText },
  };
  const learn: ContextBlock = {
    type: 'context',
    elements: [{ type: 'mrkdwn', text: '_Learn more →_' }],
  };
  if (result.suggestions.length === 0) {
    return [header, micro, learn];
  }
  const chips: ActionsBlock = {
    type: 'actions',
    elements: result.suggestions.map(s => ({
      type: 'button' as const,
      text: { type: 'plain_text' as const, text: s.label, emoji: false },
      value: s.text,
      action_id: `suggestion_${s.register}`,
    })),
  };
  return [header, micro, chips, learn];
}

function renderCondensed(result: AnnotationResult): KnownBlock[] {
  const block: SectionBlock = {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `${REGISTER_EMOJI[result.register] ?? '⚪'} *${result.register.toUpperCase()}* · ${result.intentLabel} · _Expand_`,
    },
  };
  return [block];
}

function renderBadgeOnly(result: AnnotationResult): KnownBlock[] {
  const block: SectionBlock = {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `${REGISTER_EMOJI[result.register] ?? '⚪'} *${result.register.toUpperCase()}* · _Show more_`,
    },
  };
  return [block];
}
