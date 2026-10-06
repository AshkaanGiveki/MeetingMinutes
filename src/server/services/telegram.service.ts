import crypto from 'crypto';
import fs from 'fs/promises';
import { logger } from './logger';

export interface TelegramUserData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export class TelegramService {
  private botToken: string;

  constructor(botToken?: string) { this.botToken = botToken || process.env.TELEGRAM_BOT_TOKEN || ''; }

  getBotUsername(): string {
    return String(process.env.TELEGRAM_BOT_USERNAME || '').replace(/^@/, '').trim();
  }

  async resolveBotUsername(): Promise<string> {
    const configured = this.getBotUsername();
    if (configured || !this.botToken) return configured;
    try {
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/getMe`);
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
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/setWebhook`, {
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

  async sendSignRequestPM(chatId: string | number, meetingId: string, meetingTitle: string, organizerName: string, actionToken: string): Promise<boolean> {
    const text = `📋 <b>درخواست امضای صورت‌جلسه</b>\n\nجلسه: <b>${meetingTitle}</b>\nبرگزارکننده: ${organizerName}\n\nلطفاً یکی از گزینه‌های زیر را انتخاب کنید:`;
    const appUrl = process.env.APP_URL || 'https://metameet.ir';
    const viewUrl = `${appUrl.replace(/\/$/, '')}/meeting/${encodeURIComponent(meetingId)}`;
    const replyMarkup = { inline_keyboard: [[
      { text: '✅ قبول و امضا', callback_data: `mm:accept:${actionToken}` },
      { text: '❌ رد درخواست', callback_data: `mm:reject:${actionToken}` },
    ], [{ text: 'مشاهده در وب‌سایت', url: viewUrl }]] };
    if (!this.botToken) { logger.info(`[MOCK TELEGRAM PM] To: ${chatId} | Meeting: ${meetingTitle} | Persian action buttons prepared`); return true; }
    try {
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', reply_markup: replyMarkup }) });
      const data = await response.json() as { ok?: boolean; description?: string; error_code?: number };
      if (!data.ok) logger.error('Telegram rejected sign-request message.', { metadata: { status: response.status, errorCode: data.error_code, description: data.description } });
      return !!data.ok;
    } catch (err) { logger.error('Failed to dispatch Telegram PM sign request:', { metadata: { error: String(err) } }); return false; }
  }

  async answerCallbackQuery(callbackQueryId: string, text: string): Promise<boolean> {
    if (!this.botToken) return true;
    try {
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/answerCallbackQuery`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false }) });
      const data = await response.json() as { ok?: boolean };
      return !!data.ok;
    } catch (err) { logger.error('Failed to acknowledge Telegram callback', { metadata: { error: String(err) } }); return false; }
  }

  async sendNotification(chatId: string | number, message: string): Promise<boolean> {
    if (!this.botToken) { logger.info(`[MOCK TELEGRAM] message to ${chatId}: ${message}`); return true; }
    try {
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }) });
      const data = await response.json() as { ok?: boolean; description?: string; error_code?: number };
      if (!data.ok) logger.error('Telegram rejected notification message.', { metadata: { status: response.status, errorCode: data.error_code, description: data.description } });
      return !!data.ok;
    } catch (err) { logger.error('Failed to dispatch telegram notification', { metadata: { error: String(err) } }); return false; }
  }

  async sendDocument(chatId: string | number, filePath: string, caption: string): Promise<boolean> {
    if (!this.botToken) { logger.info(`[MOCK TELEGRAM DOCUMENT] To: ${chatId} | ${caption}`); return true; }
    try {
      const bytes = await fs.readFile(filePath);
      const form = new FormData();
      form.append('chat_id', String(chatId));
      form.append('caption', caption);
      form.append('document', new Blob([bytes], { type: 'application/pdf' }), 'صورت-جلسه.pdf');
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendDocument`, { method: 'POST', body: form });
      const data = await response.json() as { ok?: boolean; description?: string };
      if (!data.ok) logger.error('Telegram rejected PDF document.', { metadata: { status: response.status, description: data.description } });
      return !!data.ok;
    } catch (err) { logger.error('Failed to dispatch PDF to Telegram', { metadata: { error: String(err) } }); return false; }
  }
}

export const telegramService = new TelegramService();
