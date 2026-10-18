import crypto from 'crypto';
import fs from 'fs/promises';
import { logger } from './logger';

const escapeTelegramHtml = (value: string): string => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

export interface TelegramUserData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export class TelegramService {
  private botToken: string;
  private apiBaseUrl: string;

  constructor(botToken?: string) {
    this.botToken = botToken || process.env.TELEGRAM_BOT_TOKEN || '';
    this.apiBaseUrl = (process.env.TELEGRAM_API_BASE_URL || 'https://api.telegram.org').replace(/\/$/, '');
  }

  private apiUrl(method: string): string {
    return `${this.apiBaseUrl}/bot${this.botToken}/${method}`;
  }

  getBotUsername(): string {
    return String(process.env.TELEGRAM_BOT_USERNAME || '').replace(/^@/, '').trim();
  }

  async resolveBotUsername(): Promise<string> {
    const configured = this.getBotUsername();
    if (configured || !this.botToken) return configured;
    try {
      const response = await fetch(this.apiUrl('getMe'));
      const data = await response.json() as { ok?: boolean; result?: { username?: string } };
      return data.ok && data.result?.username ? data.result.username : '';
    } catch (err) {
      logger.warn('Unable to resolve Telegram bot username.', { metadata: { error: String(err) } });
      return '';
    }
  }

  async ensureWebhook(webhookUrl: string, secretToken?: string): Promise<boolean> {
    if (!this.botToken || !webhookUrl) return false;
    try {
      const response = await fetch(this.apiUrl('setWebhook'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl, ...(secretToken ? { secret_token: secretToken } : {}) }),
      });
      const data = await response.json() as { ok?: boolean; description?: string };
      if (!data.ok) logger.warn(`Telegram webhook registration failed: ${data.description || 'Unknown Telegram error.'}`);
      else logger.info(`Telegram webhook registered at ${webhookUrl}`);
      return !!data.ok;
    } catch (err) {
      logger.warn('Unable to register Telegram webhook.', { metadata: { error: String(err) } });
      return false;
    }
  }

  verifyInitData(initData: string): { valid: boolean; user?: TelegramUserData; error?: string } {
    if (!this.botToken) return { valid: false, error: 'TELEGRAM_BOT_TOKEN not configured in server environment.' };
    try {
      const params = new URLSearchParams(initData);
      const hash = params.get('hash');
      if (!hash) return { valid: false, error: 'Missing hash parameter in initData.' };
      params.delete('hash');
      const check = Array.from(params.keys()).sort().map((key) => `${key}=${params.get(key)}`).join('\n');
      const secret = crypto.createHmac('sha256', 'WebAppData').update(this.botToken).digest();
      const calculated = crypto.createHmac('sha256', secret).update(check).digest('hex');
      if (hash.length !== calculated.length || !crypto.timingSafeEqual(Buffer.from(calculated), Buffer.from(hash))) return { valid: false, error: 'Cryptographic hash mismatch. Potential tampering detected.' };
      const user = params.get('user');
      return { valid: true, user: user ? JSON.parse(user) as TelegramUserData : undefined };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown validation error';
      logger.error(`Telegram validation failure: ${message}`);
      return { valid: false, error: message };
    }
  }

  async sendSignRequestPM(chatId: string | number, meetingId: string, meetingTitle: string, organizerName: string, actionToken: string, pdfPath?: string): Promise<boolean> {
    const text = `📋 <b>درخواست امضای صورت‌جلسه</b>\n\nجلسه: <b>${meetingTitle}</b>\nبرگزارکننده: ${organizerName}\n\nنسخه PDF پیوست‌شده، نسخه نهایی قبل از ثبت امضاهاست. با انتخاب «قبول و امضا»، امضای شما مستقیماً ثبت می‌شود و نیازی به ورود رمز یک‌بارمصرف در وب‌سایت نیست.\n\nلطفاً یکی از گزینه‌های زیر را انتخاب کنید:`;
    const appUrl = process.env.APP_URL || 'https://metameet.ir';
    const viewUrl = `${appUrl.replace(/\/$/, '')}/meetings/${encodeURIComponent(meetingId)}`;
    const replyMarkup = { inline_keyboard: [[
      { text: '✅ قبول و امضا', callback_data: `mm:accept:${actionToken}` },
      { text: '❌ رد درخواست', callback_data: `mm:reject:${actionToken}` },
    ], [{ text: 'مشاهده در وب‌سایت', url: viewUrl }]] };
    if (!this.botToken) { logger.info(`[MOCK TELEGRAM PM] To: ${chatId} | Meeting: ${meetingTitle} | PDF attached: ${Boolean(pdfPath)} | Rich Persian action buttons prepared`); return true; }
    try {
      if (pdfPath) {
        const richSent = await this.sendRichSignRequestDocumentV2(chatId, pdfPath, meetingTitle, organizerName, actionToken, viewUrl);
        if (richSent) return true;
        logger.warn('Rich Telegram sign-request failed; falling back to a standard PDF message.');
        return this.sendDocument(chatId, pdfPath, text, replyMarkup);
      }
      const response = await fetch(this.apiUrl('sendMessage'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', reply_markup: replyMarkup }), signal: AbortSignal.timeout(15000) });
      const data = await response.json() as { ok?: boolean; description?: string; error_code?: number };
      if (!data.ok) logger.error('Telegram rejected sign-request message.', { metadata: { status: response.status, errorCode: data.error_code, description: data.description } });
      return !!data.ok;
    } catch (err) { logger.error('Failed to dispatch Telegram PM sign request:', { metadata: { error: String(err) } }); return false; }
  }

  private async sendRichSignRequestDocument(chatId: string | number, filePath: string, meetingTitle: string, organizerName: string, actionToken: string, viewUrl: string): Promise<boolean> {
    try {
      const bytes = await fs.readFile(filePath);
      const richMessage = {
        is_rtl: true,
        blocks: [
          { type: 'heading', size: 2, text: '📋 درخواست امضای صورت‌جلسه' },
          { type: 'paragraph', text: `جلسه: ${meetingTitle}` },
          { type: 'paragraph', text: `برگزارکننده: ${organizerName}` },
          { type: 'paragraph', text: 'نسخه PDF پیوست‌شده، نسخه نهایی قبل از ثبت امضاهاست. با انتخاب قبول و امضا، امضای شما مستقیماً ثبت می‌شود و نیازی به ورود رمز یک‌بارمصرف در وب‌سایت نیست.' },
          { type: 'divider' },
          {
            type: 'document',
            document: { type: 'document', media: 'attach://meeting_pdf' },
            caption: { text: 'نسخه پیش از امضا · برای بررسی و تصمیم‌گیری شما' },
          },
          {
            type: 'buttons',
            align: 'center',
            buttons: [
              { text: 'قبول و امضا', style: 'success', callback_data: `mm:accept:${actionToken}` },
              { text: 'رد درخواست', style: 'danger', callback_data: `mm:reject:${actionToken}` },
              { text: 'مشاهده در وب‌سایت', url: viewUrl },
            ],
          },
          { type: 'footer', text: 'Accord · امضای امن و مستقیم از تلگرام' },
        ],
      };
      const form = new FormData();
      form.append('chat_id', String(chatId));
      form.append('rich_message', JSON.stringify(richMessage));
      // The InputMediaDocument uses attach://meeting_pdf, so the multipart
      // field must use the exact same attachment name.
      form.append('meeting_pdf', new Blob([bytes], { type: 'application/pdf' }), 'meeting-minute.pdf');
      const response = await fetch(this.apiUrl('sendRichMessage'), { method: 'POST', body: form, signal: AbortSignal.timeout(15000) });
      const data = await response.json() as { ok?: boolean; description?: string; error_code?: number };
      if (!data.ok) logger.error('Telegram rejected rich sign-request message.', { metadata: { status: response.status, errorCode: data.error_code, description: data.description } });
      return !!data.ok;
    } catch (err) {
      logger.error('Failed to dispatch rich Telegram sign request:', { metadata: { error: String(err) } });
      return false;
    }
  }

  private async sendRichSignRequestDocumentV2(chatId: string | number, filePath: string, meetingTitle: string, organizerName: string, actionToken: string, viewUrl: string): Promise<boolean> {
    try {
      const bytes = await fs.readFile(filePath);
      const richMessage = {
        html: [
          '<h2>📋 درخواست امضای صورت‌جلسه</h2>',
          `<p>جلسه: <b>${escapeTelegramHtml(meetingTitle)}</b></p>`,
          `<p>برگزارکننده: ${escapeTelegramHtml(organizerName)}</p>`,
          '<p>نسخه PDF پیوست‌شده، نسخه نهایی قبل از ثبت امضاهاست. با انتخاب «قبول و امضا»، امضای شما مستقیماً ثبت می‌شود.</p>',
          '<hr/>',
          '<tg-document src="tg://document?id=meeting_pdf"></tg-document>',
          '<tg-button-row align="center">',
          `<tg-button type="callback_data" style="success" data="mm:accept:${escapeTelegramHtml(actionToken)}">✅ قبول و امضا</tg-button>`,
          `<tg-button type="callback_data" style="danger" data="mm:reject:${escapeTelegramHtml(actionToken)}">❌ رد درخواست</tg-button>`,
          `<tg-button type="url" url="${escapeTelegramHtml(viewUrl)}">مشاهده در وب‌سایت</tg-button>`,
          '</tg-button-row>',
          '<footer>Accord · امضای امن و مستقیم از تلگرام</footer>',
        ].join(''),
        media: [{ id: 'meeting_pdf', media: { type: 'document', media: 'attach://meeting_pdf' } }],
        is_rtl: true,
      };
      const form = new FormData();
      form.append('chat_id', String(chatId));
      form.append('rich_message', JSON.stringify(richMessage));
      form.append('meeting_pdf', new Blob([bytes], { type: 'application/pdf' }), 'meeting-minute.pdf');
      const response = await fetch(this.apiUrl('sendRichMessage'), { method: 'POST', body: form, signal: AbortSignal.timeout(30000) });
      const data = await response.json() as { ok?: boolean; description?: string; error_code?: number };
      if (!data.ok) logger.error('Telegram rejected rich sign-request message.', { metadata: { status: response.status, errorCode: data.error_code, description: data.description } });
      return !!data.ok;
    } catch (err) {
      logger.error('Failed to dispatch rich Telegram sign request:', { metadata: { error: String(err) } });
      return false;
    }
  }

  /** Send a private confirmation for a button interaction without cluttering the chat. */
  async sendEphemeralActionResult(
    chatId: string | number,
    receiverUserId: number,
    callbackQueryId: string,
    title: string,
    message: string,
    tone: 'success' | 'danger' = 'success',
  ): Promise<boolean> {
    if (!this.botToken) {
      logger.info(`[MOCK TELEGRAM EPHEMERAL] To: ${chatId} | ${title}: ${message}`);
      return true;
    }
    const richMessage = {
      html: `<h3>${escapeTelegramHtml(title)}</h3><p>${escapeTelegramHtml(message)}</p><footer>Accord · این پیام فقط برای شما نمایش داده می‌شود</footer>`,
      is_rtl: true,
    };
    try {
      const response = await fetch(this.apiUrl('sendRichMessage'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          rich_message: richMessage,
          ephemeral_message_parameters: {
            receiver_user_id: receiverUserId,
            callback_query_id: callbackQueryId,
            replace_callback_query_message: true,
          },
        }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json() as { ok?: boolean; description?: string; error_code?: number };
      if (!data.ok) logger.error('Telegram rejected ephemeral rich response.', { metadata: { status: response.status, errorCode: data.error_code, description: data.description } });
      return !!data.ok;
    } catch (err) {
      logger.error('Failed to dispatch ephemeral Telegram response.', { metadata: { error: String(err) } });
      return false;
    }
  }

  /** Replace the actionable sign-request message so its buttons become single-use. */
  async replaceSignRequestMessage(
    chatId: string | number,
    messageId: number,
    title: string,
    message: string,
    tone: 'success' | 'danger' = 'success',
  ): Promise<boolean> {
    if (!this.botToken) return true;
    const caption = `<b>${tone === 'success' ? '✅' : '❌'} ${escapeTelegramHtml(title)}</b>\n\n${escapeTelegramHtml(message)}\n\n<i>Accord · این درخواست دیگر قابل تغییر نیست</i>`;
    try {
      const response = await fetch(this.apiUrl('editMessageCaption'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId, caption, parse_mode: 'HTML', reply_markup: { inline_keyboard: [] } }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json() as { ok?: boolean; description?: string };
      if (data.ok) return true;

      // Standard-message fallback: remove its inline keyboard even if the rich
      // content itself cannot be edited by the current Telegram client.
      const markupResponse = await fetch(this.apiUrl('editMessageReplyMarkup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } }),
        signal: AbortSignal.timeout(15000),
      });
      const markupData = await markupResponse.json() as { ok?: boolean; description?: string };
      if (!markupData.ok) logger.warn('Telegram could not remove completed sign-request buttons.', { metadata: { description: markupData.description || data.description } });
      return !!markupData.ok;
    } catch (err) {
      logger.warn('Failed to replace completed Telegram sign-request message.', { metadata: { error: String(err) } });
      return false;
    }
  }

  async answerCallbackQuery(callbackQueryId: string, text: string): Promise<boolean> {
    if (!this.botToken) return true;
    try {
      const response = await fetch(this.apiUrl('answerCallbackQuery'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false }) });
      const data = await response.json() as { ok?: boolean };
      return !!data.ok;
    } catch (err) { logger.error('Failed to acknowledge Telegram callback', { metadata: { error: String(err) } }); return false; }
  }

  async replaceSignRequestMessageV2(
    chatId: string | number,
    messageId: number,
    title: string,
    message: string,
    tone: 'success' | 'danger' = 'success',
  ): Promise<boolean> {
    if (!this.botToken) return true;
    const richMessage = {
      html: `<h3>${tone === 'success' ? '✅' : '❌'} ${escapeTelegramHtml(title)}</h3><p>${escapeTelegramHtml(message)}</p><footer>Accord · این درخواست دیگر قابل تغییر نیست</footer>`,
      is_rtl: true,
    };
    try {
      const response = await fetch(this.apiUrl('editMessageText'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId, rich_message: richMessage, reply_markup: { inline_keyboard: [] } }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json() as { ok?: boolean; description?: string };
      if (!data.ok) logger.warn('Telegram could not replace rich sign-request message.', { metadata: { status: response.status, description: data.description } });
      return !!data.ok;
    } catch (err) {
      logger.warn('Failed to replace rich Telegram sign-request message.', { metadata: { error: String(err) } });
      return false;
    }
  }

  async sendNotification(chatId: string | number, message: string): Promise<boolean> {
    if (!this.botToken) { logger.info(`[MOCK TELEGRAM] message to ${chatId}: ${message}`); return true; }
    try {
      const response = await fetch(this.apiUrl('sendMessage'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }), signal: AbortSignal.timeout(15000) });
      const data = await response.json() as { ok?: boolean; description?: string; error_code?: number };
      if (!data.ok) logger.error('Telegram rejected notification message.', { metadata: { status: response.status, errorCode: data.error_code, description: data.description } });
      return !!data.ok;
    } catch (err) { logger.error('Failed to dispatch telegram notification', { metadata: { error: String(err) } }); return false; }
  }

  async sendDocument(chatId: string | number, filePath: string, caption: string, replyMarkup?: unknown): Promise<boolean> {
    if (!this.botToken) { logger.info(`[MOCK TELEGRAM DOCUMENT] To: ${chatId} | ${caption}`); return true; }
    try {
      const bytes = await fs.readFile(filePath);
      const form = new FormData();
      form.append('chat_id', String(chatId));
      form.append('caption', caption);
      form.append('parse_mode', 'HTML');
      if (replyMarkup) form.append('reply_markup', JSON.stringify(replyMarkup));
      form.append('document', new Blob([bytes], { type: 'application/pdf' }), 'صورت-جلسه.pdf');
      const response = await fetch(this.apiUrl('sendDocument'), { method: 'POST', body: form, signal: AbortSignal.timeout(15000) });
      const data = await response.json() as { ok?: boolean; description?: string };
      if (!data.ok) logger.error('Telegram rejected PDF document.', { metadata: { status: response.status, description: data.description } });
      return !!data.ok;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Failed to dispatch PDF to Telegram', { metadata: { error: error.message, name: error.name, cause: String((error as Error & { cause?: unknown }).cause || '') } });
      return false;
    }
  }
}

export const telegramService = new TelegramService();
