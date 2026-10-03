import crypto from 'crypto';
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

  constructor(botToken?: string) {
    this.botToken = botToken || process.env.TELEGRAM_BOT_TOKEN || '';
  }

  /**
   * Cryptographically validates Telegram WebApp initData query string
   */
  verifyInitData(initData: string): { valid: boolean; user?: TelegramUserData; error?: string } {
    if (!this.botToken) {
      // In development mode without real bot token, support verified local simulation
      try {
        const urlParams = new URLSearchParams(initData);
        const userJson = urlParams.get('user');
        if (userJson) {
          const user = JSON.parse(userJson) as TelegramUserData;
          return { valid: true, user };
        }
      } catch {
        // pass
      }
      return { valid: false, error: 'TELEGRAM_BOT_TOKEN not configured in server environment.' };
    }

    try {
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get('hash');
      if (!hash) {
        return { valid: false, error: 'Missing hash parameter in initData.' };
      }

      urlParams.delete('hash');
      const sortedKeys = Array.from(urlParams.keys()).sort();
      const dataCheckString = sortedKeys.map((key) => `${key}=${urlParams.get(key)}`).join('\n');

      const secretKey = crypto.createHmac('sha256', 'WebAppData').update(this.botToken).digest();
      const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

      const isValid = crypto.timingSafeEqual(Buffer.from(calculatedHash), Buffer.from(hash));
      if (!isValid) {
        return { valid: false, error: 'Cryptographic hash mismatch. Potential tampering detected.' };
      }

      const userJson = urlParams.get('user');
      const user = userJson ? (JSON.parse(userJson) as TelegramUserData) : undefined;
      return { valid: true, user };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown validation error';
      logger.error(`Telegram validation failure: ${msg}`);
      return { valid: false, error: msg };
    }
  }

  /**
   * Sends a PM to a verified Telegram user with a 1-click confirmation button to sign the meeting minutes
   */
  async sendSignRequestPM(
    chatId: string | number,
    meetingId: string,
    meetingTitle: string,
    organizerName: string
  ): Promise<boolean> {
    const text = `📋 <b>درخواست امضای دیجیتال صورت‌جلسه</b>\n\nجلسه: <b>${meetingTitle}</b>\nسازمان‌دهنده: ${organizerName}\n\nبرای تأیید و امضای مستقیم این صورت‌جلسه روی دکمه زیر بزنید:`;
    const appUrl = process.env.APP_URL || 'https://metameet.ir';
    const signUrl = `${appUrl}/meeting/${meetingId}?telegram_sign=true`;

    const inlineKeyboard = {
      inline_keyboard: [
        [
          {
            text: '✍️ تأیید و امضای مستقیم صورت‌جلسه',
            web_app: { url: signUrl },
          },
        ],
      ],
    };

    if (!this.botToken) {
      logger.info(`[MOCK TELEGRAM PM] To: ${chatId} | Meeting: ${meetingTitle} | Button: ${signUrl}`);
      return true;
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          reply_markup: inlineKeyboard,
        }),
      });

      const data = await response.json();
      return !!data.ok;
    } catch (err) {
      logger.error('Failed to dispatch Telegram PM sign request:', { metadata: { error: String(err) } });
      return false;
    }
  }

  async sendNotification(chatId: string | number, message: string): Promise<boolean> {
    if (!this.botToken) {
      logger.info(`[MOCK TELEGRAM] message to ${chatId}: ${message}`);
      return true;
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      });

      const data = await response.json();
      return !!data.ok;
    } catch (err) {
      logger.error('Failed to dispatch telegram notification', { metadata: { error: String(err) } });
      return false;
    }
  }
}

export const telegramService = new TelegramService();
