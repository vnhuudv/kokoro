export interface SuggestionChip {
  label: string;
  register: 'formal' | 'neutral' | 'informal';
  text: string;
}

export interface AnnotationResult {
  messageId: string;
  caseId: string | null;
  register: 'formal' | 'neutral' | 'informal';
  intentLabel: string;
  riskCategory: string | null;
  microText: string;
  coachingRationale: string;
  suggestions: SuggestionChip[];
}

export interface AnnotateRequest {
  messageId: string;
  channelId: string;
  senderId: string;
  senderCulture: 'vi' | 'ja';
  text: string;
}

const TIMEOUT_MS = 1400;

const TENANT_ID = process.env.SLACK_TENANT_ID ?? 'default-tenant';
const SOURCE_LANG = (process.env.KOKORO_SOURCE_LANG ?? 'ja') as 'ja' | 'vi';
const TARGET_LANG = (process.env.KOKORO_TARGET_LANG ?? 'vi') as 'ja' | 'vi';

export async function annotate(
  pipelineUrl: string,
  request: AnnotateRequest
): Promise<AnnotationResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // Map camelCase AnnotateRequest → snake_case AnnotationRequest for existing pipeline
    const sourceLang = request.senderCulture;
    const targetLang = sourceLang === 'vi' ? 'ja' : 'vi';

    const response = await fetch(`${pipelineUrl}/annotate/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message_id: request.messageId,
        tenant_id: TENANT_ID,
        source_language: sourceLang,
        target_language: targetLang,
        redacted_text: request.text,
        slack_user_id: request.senderId,
        channel_id: request.channelId,
      }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const d = await response.json() as { result: Record<string, unknown>; message_id: string };
    const r = d.result;
    return {
      messageId: d.message_id as string,
      caseId: r.case_id as string | null,
      register: r.register as AnnotationResult['register'],
      intentLabel: r.intent_label as string,
      riskCategory: r.risk_category as string | null,
      microText: r.micro_text as string,
      coachingRationale: r.coaching_rationale as string,
      suggestions: (r.suggestions as SuggestionChip[]) ?? [],
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
