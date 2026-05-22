import { renderAnnotationBlock } from '../../../../src/services/slack-app/src/renderers/annotation-block';
import type { AnnotationResult } from '../../../../src/services/slack-app/src/clients/annotation-pipeline-client';

const mockResult: AnnotationResult = {
  messageId: '123.456',
  caseId: null,
  register: 'neutral',
  intentLabel: 'Firm deadline request',
  riskCategory: 'time_commitment_ambiguity',
  microText: '"End of week" is often read as soft in Japanese context.',
  coachingRationale: 'Vietnamese directness can read as ambiguous.',
  suggestions: [
    { label: 'Reply formally', register: 'formal', text: '承知いたしました。' },
    { label: 'Reply neutrally', register: 'neutral', text: 'わかりました。' },
  ],
};

describe('renderAnnotationBlock', () => {
  it('full state (score 15): returns 4 blocks including actions for suggestion chips', () => {
    const blocks = renderAnnotationBlock(mockResult, 15);
    expect(blocks).toHaveLength(4);
    expect(blocks[0].type).toBe('section');
    const header = (blocks[0] as any).text.text as string;
    expect(header).toContain('NEUTRAL');
    expect(header).toContain('Firm deadline request');
    expect(blocks[1].type).toBe('section');
    expect((blocks[1] as any).text.text).toContain('End of week');
    expect(blocks[2].type).toBe('actions');
    expect((blocks[2] as any).elements).toHaveLength(2);
    expect(blocks[3].type).toBe('context');
  });

  it('condensed state (score 50): returns 1 block with Expand text, no micro-text', () => {
    const blocks = renderAnnotationBlock(mockResult, 50);
    expect(blocks).toHaveLength(1);
    const text = (blocks[0] as any).text.text as string;
    expect(text).toContain('NEUTRAL');
    expect(text).toContain('Firm deadline request');
    expect(text).toContain('Expand');
    expect(text).not.toContain('End of week');
  });

  it('full state with no suggestions: returns 3 blocks (no actions block)', () => {
    const noSuggestions = { ...mockResult, suggestions: [] };
    const blocks = renderAnnotationBlock(noSuggestions, 15);
    expect(blocks).toHaveLength(3);
    expect(blocks.every(b => b.type !== 'actions')).toBe(true);
  });

  it('badge-only state (score 75): returns 1 block with register only', () => {
    const blocks = renderAnnotationBlock(mockResult, 75);
    expect(blocks).toHaveLength(1);
    const text = (blocks[0] as any).text.text as string;
    expect(text).toContain('NEUTRAL');
    expect(text).toContain('Show more');
    expect(text).not.toContain('Firm deadline request');
  });
});
