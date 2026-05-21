import express, { Request, Response } from 'express';
import { google } from 'googleapis';
import { verifyGoogleToken } from './middleware/verify';
import { logRequest } from './middleware/logger';
import { handleMessage } from './handlers/message';
import { handleSlashCommand } from './handlers/slash';
import { handleAction } from './handlers/action';

const PORT = process.env.PORT ?? 8004;

// Initialized once at startup — null if GOOGLE_SERVICE_ACCOUNT_KEY is not set (local dev)
const chatClient = (() => {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString())
    : null;
  const auth = keyJson
    ? new google.auth.GoogleAuth({ credentials: keyJson, scopes: ['https://www.googleapis.com/auth/chat.bot'] })
    : null;
  return auth ? google.chat({ version: 'v1', auth }) : null;
})();

const app = express();
app.use(express.json());

// Workspace Add-on events (event.chat exists) require responses wrapped in hostAppAction.
// Pure Chat app events (event.type at top level) accept bare cardsV2/text directly.
function wrapIfAddon(isAddon: boolean, response: any): any {
  if (!isAddon) return response;
  if (!response || Object.keys(response).length === 0) return {};

  // Coaching dialog
  if (response.actionResponse?.type === 'DIALOG') {
    return {
      hostAppAction: {
        chatAction: {
          openDialogAction: {
            openDialog: { initialNavigation: { pushCard: response.actionResponse.dialogAction.dialog.body } },
          },
        },
      },
    };
  }

  // Card or text message
  return { hostAppAction: { chatAction: { createMessageAction: { message: response } } } };
}

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'google-chat-app' });
});

app.post('/webhook', async (req: Request, res: Response) => {
  // Verify Google bearer token
  const isValid = await verifyGoogleToken(req.headers.authorization);
  if (!isValid) {
    logRequest('webhook.unauthorized');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const event = req.body;

  // Support both pure Chat app format (event.type) and Workspace Add-on format (event.chat.*)
  const chat = event.chat ?? {};
  const isAddon = !!event.chat;
  let eventType: string = event.type ?? '';
  if (!eventType) {
    if (chat.appCommandPayload)        eventType = 'SLASH_COMMAND';
    else if (chat.buttonClickedPayload) eventType = 'CARD_CLICKED';
    else if (chat.messagePayload)       eventType = 'MESSAGE';
    else if (chat.addedToSpacePayload)  eventType = 'ADDED_TO_SPACE';
  }

  logRequest('webhook.received', { type: eventType });

  // ── SLASH_COMMAND ────────────────────────────────────────────
  if (eventType === 'SLASH_COMMAND') {
    const payload = chat.appCommandPayload ?? {};
    const draft = (payload.message?.argumentText ?? payload.message?.text ?? '').trim();
    const spaceName: string = payload.space?.name ?? '';
    const senderName: string = chat.user?.name ?? event.user?.name ?? '';

    res.json({});

    const card = await handleSlashCommand(draft);

    if (!chatClient) {
      logRequest('slash.no_chat_client', { space: spaceName });
      return;
    }
    if (!spaceName || !senderName) {
      logRequest('slash.missing_context', { spaceName, senderName });
      return;
    }

    try {
      await chatClient.spaces.messages.create({
        parent: spaceName,
        requestBody: { ...card, privateMessageViewer: { name: senderName } },
      });
      logRequest('slash.posted', { space: spaceName });
    } catch (err) {
      logRequest('slash.post_failed', { error: String(err) });
    }
    return;
  }

  // ── MESSAGE event ───────────────────────────────────────────
  if (eventType === 'MESSAGE') {
    // Pure Chat app: slash command inside MESSAGE
    if (event.message?.slashCommand) {
      const draft = (event.message?.argumentText ?? '').trim();
      const card = await handleSlashCommand(draft);
      res.json(wrapIfAddon(isAddon, card));
      return;
    }

    // Extract from Workspace Add-on messagePayload or pure Chat app fields
    const msgPayload = chat.messagePayload ?? {};
    const text: string = event.message?.text ?? msgPayload.message?.text ?? '';
    const senderName: string = event.user?.name ?? chat.user?.name ?? '';
    const spaceName: string = event.space?.name ?? msgPayload.space?.name ?? '';

    // Inline annotation — respond immediately, post private card async
    res.json({});
    if (!text || !senderName || !spaceName) return;

    const card = await handleMessage({ text, senderName, spaceName });
    if (!card) return;

    if (!chatClient) {
      logRequest('annotation.no_chat_client', { space: spaceName });
      return;
    }

    try {
      await chatClient.spaces.messages.create({
        parent: spaceName,
        requestBody: { ...card, privateMessageViewer: { name: senderName } },
      });
      logRequest('annotation.posted', { space: spaceName });
    } catch (err) {
      logRequest('annotation.post_failed', { error: String(err) });
    }
    return;
  }

  // ── CARD_CLICKED / button actions ───────────────────────────
  if (eventType === 'CARD_CLICKED') {
    // Remap Workspace Add-on buttonClickedPayload to the shape handleAction expects
    const clickPayload = chat.buttonClickedPayload ?? {};
    const remapped = {
      action: {
        function: clickPayload.action?.function ?? event.action?.function ?? event.action?.actionMethodName ?? '',
        parameters: clickPayload.action?.parameters ?? event.action?.parameters ?? [],
      },
      user: chat.user ?? event.user ?? {},
      message: clickPayload.message ?? event.message ?? {},
      space: clickPayload.space ?? event.space ?? {},
    };
    const result = await handleAction(remapped);
    res.json(wrapIfAddon(isAddon, result));
    return;
  }

  // ── ADDED_TO_SPACE ───────────────────────────────────────────
  if (eventType === 'ADDED_TO_SPACE') {
    res.json(wrapIfAddon(isAddon, { text: 'Kokoro is connected. I will privately annotate messages with cultural context.' }));
    return;
  }

  res.json({});
});

app.listen(PORT, () => {
  logRequest('google-chat-app.started', { port: PORT });
});
