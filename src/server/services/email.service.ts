import { logger } from './logger';
import nodemailer from 'nodemailer';
import { getDb } from '../db/mongodb';

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  metadata?: Record<string, string>;
}

export interface EmailProvider {
  sendEmail(message: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

export class ResendEmailProvider implements EmailProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendEmail(message: EmailMessage) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: 'Accord <notifications@metameet.ir>',
          to: message.to,
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data?.message || 'Failed to send via Resend' };
      }
      return { success: true, messageId: data.id };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}

export class SmtpEmailProvider implements EmailProvider {
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER && process.env.SMTP_PASSWORD
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });

  async sendEmail(message: EmailMessage) {
    try {
      const result = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'Accord <notifications@metameet.ir>',
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error('SMTP delivery failed:', { metadata: { error: String(error) } });
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}

export class DevConsoleEmailProvider implements EmailProvider {
  async sendEmail(message: EmailMessage) {
    if (process.env.NODE_ENV === 'production') return { success: false, error: 'No production email provider is configured.' };
    logger.info(`[DEV EMAIL] To: ${message.to} | Subject: ${message.subject}`);
    logger.debug(`[DEV EMAIL BODY] ${message.html.slice(0, 150)}...`);
    return { success: true, messageId: `dev_${Date.now()}` };
  }
}

export class EmailService {
  private provider: EmailProvider;

  constructor() {
    if (process.env.EMAIL_PROVIDER === 'resend' && process.env.EMAIL_API_KEY) {
      this.provider = new ResendEmailProvider(process.env.EMAIL_API_KEY);
    } else if (process.env.EMAIL_PROVIDER === 'smtp') {
      this.provider = new SmtpEmailProvider();
    } else {
      this.provider = new DevConsoleEmailProvider();
    }
  }

  private async deliver(message: EmailMessage) {
    const result = await this.provider.sendEmail(message);
    const db = getDb();
    if (db) await db.collection('email_deliveries').insertOne({
      to: message.to,
      subject: message.subject,
      status: result.success ? 'sent' : 'failed',
      providerMessageId: result.messageId,
      error: result.error,
      createdAt: new Date().toISOString(),
    });
    return result;
  }

  async sendSignatureRequest(
    to: string,
    signerName: string,
    meetingTitle: string,
    organizerName: string,
    signingLink: string,
    expiresAt: string
  ) {
    signerName = escapeHtml(signerName);
    meetingTitle = escapeHtml(meetingTitle);
    organizerName = escapeHtml(organizerName);
    expiresAt = escapeHtml(expiresAt);
    signingLink = encodeURI(signingLink);
    const html = `
      <div dir="rtl" style="font-family: Tahoma, 'Vazirmatn', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 16px;">
        <h2 style="color: #4338ca;">درخواست امضای دیجیتال صورت‌جلسه در Accord</h2>
        <p>کاربر گرامی <strong>${signerName}</strong>،</p>
        <p>دعوت‌نامه‌ای از طرف <strong>${organizerName}</strong> جهت بررسی و امضای دیجیتال صورت‌جلسه زیر برای شما ارسال شده است:</p>
        <div style="background: #f8fafc; padding: 15px; border-radius: 12px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #1e293b;">${meetingTitle}</h3>
          <p style="margin: 0; font-size: 13px; color: #64748b;">مهلت امضا: تا ${expiresAt}</p>
        </div>
        <a href="${signingLink}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 10px; font-weight: bold;">مشاهده و امضای سند</a>
        <p style="font-size: 11px; color: #94a3b8; margin-top: 30px;">این لینک اختصاصی و دارای توکن احراز هویت انقضادار است. آن را با دیگران به اشتراک نگذارید.</p>
      </div>
    `;

    return this.deliver({
      to,
      subject: `درخواست امضای صورت‌جلسه: ${meetingTitle}`,
      html,
      text: `درخواست امضای صورت‌جلسه ${meetingTitle}. برای امضا به این پیوند مراجعه نمایید: ${signingLink}`,
    });
  }

  async sendPasswordReset(to: string, code: string) {
    code = escapeHtml(code);
    return this.deliver({
      to,
      subject: 'Accord password reset code',
      text: `Your Accord password reset code is ${code}. It expires in 10 minutes.`,
      html: `<div dir="rtl"><h2>کد بازیابی رمز عبور Accord</h2><p>کد شما: <strong>${code}</strong></p><p>این کد تا ۱۰ دقیقه معتبر است.</p></div>`,
    });
  }

  async sendMemberInvitation(to: string, name: string, invitationLink: string) {
    name = escapeHtml(name);
    invitationLink = encodeURI(invitationLink);
    return this.deliver({
      to,
      subject: 'Accord organization invitation',
      text: `Hello ${name}, accept your Accord invitation here: ${invitationLink}`,
      html: `<div dir="rtl"><h2>دعوت به سازمان Accord</h2><p>${name} عزیز، برای تکمیل عضویت از لینک زیر استفاده کنید:</p><p><a href="${invitationLink}">پذیرش دعوت‌نامه</a></p></div>`,
    });
  }
}

export const emailService = new EmailService();
