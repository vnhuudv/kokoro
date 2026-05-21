import { App, LogLevel } from '@slack/bolt';
import { handleIncomingMessage } from './handlers/message';
import { logRequest } from './middleware/logger';

const ANNOTATION_URL = 'http://annotation-pipeline:8001/annotate/';
const COACHING_URL = 'http://annotation-pipeline:8001/coaching/panel';
const TENANT_ID = process.env.SLACK_TENANT_ID ?? 'default-tenant';
const SOURCE_LANG = process.env.KOKORO_SOURCE_LANG ?? 'ja';
const TARGET_LANG = process.env.KOKORO_TARGET_LANG ?? 'vi';

export function createApp(): App {
  const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true,
    logLevel: LogLevel.DEBUG,
  });

  // Log every incoming payload
  app.use(async ({ payload, next }) => {
    logRequest('slack.event', { type: (payload as any)?.type ?? 'unknown' });
    await next();
  });

  // DM diagnostic
  app.event('message', async ({ event, say }) => {
    logRequest('slack.message_event', { channel_type: (event as any).channel_type, ts: event.ts });
    if ((event as any).channel_type === 'im') {
      await say('Kokoro is connected and receiving events.');
    }
  });

  // Inline annotation on channel messages
  app.message(async ({ message, client }) => {
    if (message.subtype) return;
    const ev = message as import('@slack/bolt').GenericMessageEvent;
    await handleIncomingMessage(
      { text: ev.text ?? '', user: ev.user, channel: ev.channel, ts: ev.ts },
      client,
    );
  });

  // ── Pre-send check: /kokoro <draft message> ──────────────────────────────────
  app.command('/kokoro', async ({ command, ack, client }) => {
    await ack();

    const draft = command.text.trim();
    if (!draft) {
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: 'Usage: `/kokoro <your draft message>` — Kokoro will check it before you send.',
      });
      return;
    }

    // Show loading state
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: ':hourglass_flowing_sand: Checking your draft…',
    });

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

      const noRisk = !result.risk_category && result.intent_label === 'Neutral message';

      if (noRisk) {
        await client.chat.postEphemeral({
          channel: command.channel_id,
          user: command.user_id,
          text: ':white_check_mark: Your message looks good to send.',
          blocks: [
            {
              type: 'section',
              text: { type: 'mrkdwn', text: '*Kokoro* · :white_check_mark: Your message looks good to send.' },
            },
            {
              type: 'context',
              elements: [{ type: 'mrkdwn', text: `Register: ${result.register} · No cultural flags detected.` }],
            },
          ],
        });
        return;
      }

      const coachingValue = JSON.stringify({
        register: result.register,
        intent_label: result.intent_label,
        risk_category: result.risk_category,
        micro_text: result.micro_text,
        coaching_rationale: result.coaching_rationale,
        source_lang: SOURCE_LANG,
      });

      const suggestionElements: object[] = (result.suggestions ?? []).map((s: any, i: number) => ({
        type: 'button',
        text: { type: 'plain_text', text: s.label },
        action_id: `presend_suggestion_${i}`,
        value: JSON.stringify({ text: s.text || s.label, case_id: result.case_id }),
      }));

      suggestionElements.push({
        type: 'button',
        text: { type: 'plain_text', text: 'Send original' },
        action_id: 'presend_send_original',
        value: 'dismiss',
        style: 'primary',
      });

      suggestionElements.push({
        type: 'button',
        text: { type: 'plain_text', text: 'Learn more' },
        action_id: 'coaching_open',
        value: coachingValue,
      });

      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: result.micro_text,
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `*Kokoro* · :warning: ${result.risk_category ?? 'Cultural flag'} · Before you send` },
          },
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `_${result.micro_text}_` },
          },
          ...(result.coaching_rationale ? [{
            type: 'context',
            elements: [{ type: 'mrkdwn', text: result.coaching_rationale }],
          }] : []),
          { type: 'actions', elements: suggestionElements },
        ],
      });

      logRequest('presend.flagged', { user: command.user_id, intent: result.intent_label });

    } catch (err) {
      logRequest('presend.error', { error: String(err) });
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: 'Kokoro is temporarily unavailable. You can send your message.',
      });
    }
  });

  // ── Dismiss pre-send (send original) ────────────────────────────────────────
  app.action('presend_send_original', async ({ ack }) => {
    await ack();
  });

  // Handle pre-send suggestion buttons (same flow as inline suggestions)
  app.action(/^presend_suggestion_\d+$/, async ({ action, body, ack, client }) => {
    await ack();
    const btn = action as import('@slack/bolt').ButtonAction;
    const channel = (body as any).channel?.id;
    const user = body.user.id;

    let suggestionText = btn.value;
    let caseId: string | null = null;
    try {
      const parsed = JSON.parse(btn.value) as { text: string; case_id: string | null };
      suggestionText = parsed.text;
      caseId = parsed.case_id;
    } catch { /* plain text fallback */ }

    if (caseId) {
      fetch(`http://annotation-pipeline:8001/feedback/suggestion-used`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: caseId, slack_user_id: user, tenant_id: TENANT_ID, language: SOURCE_LANG }),
      }).catch(e => logRequest('feedback.post_failed', { error: String(e) }));
    }

    if (!channel) return;
    await client.chat.postEphemeral({
      channel,
      user,
      text: suggestionText,
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text: `*Kokoro* · :bulb: Suggested phrasing` } },
        { type: 'section', text: { type: 'mrkdwn', text: `>>>${suggestionText}` } },
        { type: 'context', elements: [{ type: 'mrkdwn', text: 'Copy the text above to use it in your message.' }] },
      ],
    });
  });

  // ── Inline annotation suggestion buttons ────────────────────────────────────
  app.action(/^suggestion_\d+$/, async ({ action, body, ack, client }) => {
    await ack();
    const btn = action as import('@slack/bolt').ButtonAction;
    const label = btn.text.text;
    const channel = (body as any).channel?.id;
    const user = body.user.id;

    let suggestionText = btn.value;
    let caseId: string | null = null;
    try {
      const parsed = JSON.parse(btn.value) as { text: string; case_id: string | null };
      suggestionText = parsed.text;
      caseId = parsed.case_id;
    } catch { /* plain text fallback */ }

    logRequest('suggestion.selected', { label, user, caseId });

    if (caseId) {
      fetch(`http://annotation-pipeline:8001/feedback/suggestion-used`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: caseId, slack_user_id: user, tenant_id: TENANT_ID, language: SOURCE_LANG }),
      }).catch(e => logRequest('feedback.post_failed', { error: String(e) }));
    }

    if (!channel) return;

    await client.chat.postEphemeral({
      channel,
      user,
      text: suggestionText,
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text: `*Kokoro* · :bulb: You selected: _${label}_` } },
        { type: 'section', text: { type: 'mrkdwn', text: `>>>${suggestionText}` } },
        { type: 'context', elements: [{ type: 'mrkdwn', text: 'Copy the text above to use it in your message.' }] },
      ],
    });
  });

  // ── Coaching panel modal ─────────────────────────────────────────────────────
  app.action('coaching_open', async ({ action, body, ack, client }) => {
    await ack();
    const btn = action as import('@slack/bolt').ButtonAction;
    const triggerId = (body as any).trigger_id as string;

    let ctx: any = {};
    try { ctx = JSON.parse(btn.value); } catch { return; }

    // Open loading modal immediately (trigger_id expires in 3s)
    const loadingView = await client.views.open({
      trigger_id: triggerId,
      view: {
        type: 'modal',
        callback_id: 'coaching_modal',
        title: { type: 'plain_text', text: 'Kokoro — Coaching' },
        close: { type: 'plain_text', text: 'Close' },
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: ':hourglass_flowing_sand: Loading cultural coaching…' } },
        ],
      },
    });

    const viewId = (loadingView as any).view?.id;
    if (!viewId) return;

    try {
      const res = await fetch(COACHING_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ctx),
      });
      if (!res.ok) throw new Error(`coaching ${res.status}`);
      const coaching = await res.json() as {
        register_label: string;
        register_explanation: string;
        intent: string;
        cultural_risk: string | null;
        rationale: string;
        suggestion: string | null;
      };

      const modalBlocks: object[] = [
        { type: 'section', text: { type: 'mrkdwn', text: `*REGISTER*\n${coaching.register_label}` } },
        { type: 'section', text: { type: 'mrkdwn', text: coaching.register_explanation } },
        { type: 'divider' },
        { type: 'section', text: { type: 'mrkdwn', text: `*INTENT*\n${coaching.intent}` } },
      ];

      if (coaching.cultural_risk) {
        modalBlocks.push({ type: 'divider' });
        modalBlocks.push({ type: 'section', text: { type: 'mrkdwn', text: `*CULTURAL RISK*\n${coaching.cultural_risk}` } });
      }

      modalBlocks.push({ type: 'divider' });
      modalBlocks.push({ type: 'section', text: { type: 'mrkdwn', text: `*WHY THIS MATTERS*\n${coaching.rationale}` } });

      if (coaching.suggestion) {
        modalBlocks.push({ type: 'divider' });
        modalBlocks.push({ type: 'section', text: { type: 'mrkdwn', text: `*SUGGESTED PHRASING*\n>>>${coaching.suggestion}` } });
      }

      await client.views.update({
        view_id: viewId,
        view: {
          type: 'modal',
          callback_id: 'coaching_modal',
          title: { type: 'plain_text', text: 'Kokoro — Coaching' },
          close: { type: 'plain_text', text: 'Close' },
          blocks: modalBlocks,
        },
      });

      logRequest('coaching.opened', { user: body.user.id, register: ctx.register });

    } catch (err) {
      logRequest('coaching.error', { error: String(err) });
      await client.views.update({
        view_id: viewId,
        view: {
          type: 'modal',
          callback_id: 'coaching_modal',
          title: { type: 'plain_text', text: 'Kokoro — Coaching' },
          close: { type: 'plain_text', text: 'Close' },
          blocks: [
            { type: 'section', text: { type: 'mrkdwn', text: ':warning: Coaching is temporarily unavailable. The annotation above provides a brief explanation.' } },
          ],
        },
      });
    }
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  (async () => {
    await app.start();
    logRequest('slack-app.started');
  })();
}
