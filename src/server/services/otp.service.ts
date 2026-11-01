import crypto from 'crypto';
import { redisService } from './redis.service';
import { smsService } from './sms.service';

export type OtpPurpose = 'login' | 'invitation_acceptance' | 'mobile_new' | 'mobile_old' | 'recovery';

interface OtpRecord {
  purpose: OtpPurpose;
  destination: string;
  codeHash: string;
  expiresAt: number;
  attempts: number;
  consumed: boolean;
}

const OTP_TTL_SECONDS = 120;
const OTP_ATTEMPT_LIMIT = 5;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

const hashCode = (code: string) => crypto.createHash('sha256').update(code).digest('hex');
const keyFor = (purpose: OtpPurpose, destination: string, reference = '') => `auth-otp:${purpose}:${destination}:${reference}`;
const cooldownKeyFor = (purpose: OtpPurpose, destination: string, reference = '') => `auth-otp-cooldown:${purpose}:${destination}:${reference}`;

export class OtpService {
  async issue(purpose: OtpPurpose, destination: string, reference = ''): Promise<{ ok: boolean; code?: string; reason?: string; expiresAt?: number }> {
    const burst = await redisService.checkRateLimit(`${purpose}:${destination}`, 'otp_burst', 5, 600);
    const daily = await redisService.checkRateLimit(`${purpose}:${destination}`, 'otp_daily', 20, 86400);
    if (!burst.allowed || !daily.allowed) return { ok: false, reason: 'OTP request rate limit exceeded. Please try again later.' };
    const cooldown = await redisService.get(cooldownKeyFor(purpose, destination, reference));
    if (cooldown) return { ok: false, reason: 'OTP resend cooldown is active.' };
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + OTP_TTL_SECONDS * 1000;
    const record: OtpRecord = { purpose, destination, codeHash: hashCode(code), expiresAt, attempts: 0, consumed: false };
    await redisService.set(keyFor(purpose, destination, reference), JSON.stringify(record), OTP_TTL_SECONDS);
    await redisService.set(cooldownKeyFor(purpose, destination, reference), '1', OTP_RESEND_COOLDOWN_SECONDS);
    const delivery = await smsService.sendOtp(destination, code);
    if (!delivery.success) {
      await redisService.del(keyFor(purpose, destination, reference));
      await redisService.del(cooldownKeyFor(purpose, destination, reference));
      return { ok: false, reason: delivery.error || 'OTP delivery failed.' };
    }
    return { ok: true, ...(process.env.NODE_ENV !== 'production' ? { code } : {}), expiresAt };
  }

  async verify(purpose: OtpPurpose, destination: string, code: string, reference = ''): Promise<{ ok: boolean; reason?: string }> {
    const raw = await redisService.get(keyFor(purpose, destination, reference));
    if (!raw) return { ok: false, reason: 'OTP is invalid or expired.' };
    let record: OtpRecord;
    try { record = JSON.parse(raw) as OtpRecord; } catch { return { ok: false, reason: 'OTP is invalid or expired.' }; }
    if (record.consumed || record.expiresAt < Date.now()) return { ok: false, reason: 'OTP is invalid or expired.' };
    if (record.attempts >= OTP_ATTEMPT_LIMIT) {
      await redisService.del(keyFor(purpose, destination, reference));
      return { ok: false, reason: 'OTP attempt limit exceeded.' };
    }
    if (record.codeHash !== hashCode(String(code).trim())) {
      record.attempts += 1;
      if (record.attempts >= OTP_ATTEMPT_LIMIT) await redisService.del(keyFor(purpose, destination, reference));
      else await redisService.set(keyFor(purpose, destination, reference), JSON.stringify(record), Math.max(1, Math.ceil((record.expiresAt - Date.now()) / 1000)));
      return { ok: false, reason: 'OTP is invalid or expired.' };
    }
    record.consumed = true;
    await redisService.del(keyFor(purpose, destination, reference));
    return { ok: true };
  }
}

export const otpService = new OtpService();
