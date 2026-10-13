import { logger } from './logger';
import { normalizeIranianPhoneNumber } from '../utils/phone';

export interface SmsResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

// Live SMS is deliberately opt-in. This prevents a local process with
// production-looking environment variables from ever spending money.
export const isSmsLiveEnabled = () => process.env.NODE_ENV === 'production'
  && process.env.SMS_LIVE === 'true'
  && process.env.SMS_DRY_RUN !== 'true';

export class SmsService {
  private async sendSmsIr(phone: string, message: string): Promise<SmsResult> {
    const apiKey = process.env.SMS_API_KEY;
    const lineNumber = process.env.SMS_LINE_NUMBER;
    if (!apiKey || !lineNumber) return { success: false, error: 'SMS.ir configuration is incomplete.' };

    try {
      const response = await fetch('https://api.sms.ir/v1/send/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKey,
        },
        body: JSON.stringify({
          lineNumber: Number(lineNumber),
          MessageText: message,
          Mobiles: [phone],
        }),
      });
      const data = await response.json() as { status?: number; messageId?: number; packId?: number; message?: string };
      if (!response.ok || (typeof data.status === 'number' && data.status !== 1 && data.status !== 200)) {
        return { success: false, error: data.message || `SMS.ir rejected the message (${response.status}).` };
      }
      return { success: true, providerMessageId: String(data.messageId || data.packId || `smsir_${Date.now()}`) };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async sendMessage(phone: string, message: string): Promise<SmsResult> {
    const normalized = normalizeIranianPhoneNumber(phone);
    // Never spend money during local development. Production is the only
    // environment allowed to reach the SMS provider.
    if (!isSmsLiveEnabled()) {
      logger.info(`[DEV SMS DRY RUN] Message for ${normalized}: ${message}`);
      return { success: true, providerMessageId: `dev_sms_${Date.now()}` };
    }
    const provider = process.env.SMS_PROVIDER;
    if (provider === 'sms.ir' || provider === 'smsir' || process.env.SMS_API_KEY) return this.sendSmsIr(normalized, message);
    if (process.env.NODE_ENV === 'production') return { success: false, error: 'No production SMS provider is configured.' };
    logger.info(`[DEV SMS] Message dispatched to ${normalized}`);
    return { success: true, providerMessageId: `dev_sms_${Date.now()}` };
  }

  async sendOtp(phone: string, code: string): Promise<SmsResult> {
    const normalized = normalizeIranianPhoneNumber(phone);
    // OTPs are returned to the local UI by the route in development; this
    // branch guarantees that no provider request is made first.
    if (!isSmsLiveEnabled()) {
      logger.info(`[DEV SMS DRY RUN] OTP for ${normalized}: ${code}`);
      return { success: true, providerMessageId: `dev_sms_${Date.now()}` };
    }
    const provider = process.env.SMS_PROVIDER;
    if (provider === 'sms.ir' || provider === 'smsir' || process.env.SMS_API_KEY) {
      return this.sendSmsIr(normalized, `کد تأیید اکورد: ${code}`);
    }

    if (process.env.NODE_ENV === 'production') return { success: false, error: 'No production SMS provider is configured.' };
    logger.info(`[DEV SMS] OTP dispatched to ${normalized}`);
    return { success: true, providerMessageId: `dev_sms_${Date.now()}` };
  }
}

export const smsService = new SmsService();
