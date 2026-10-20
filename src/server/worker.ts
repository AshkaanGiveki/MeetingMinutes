import { queueManager, QueueJob } from './queues/queue.service';
import { emailService, EmailMessage } from './services/email.service';
import { telegramService } from './services/telegram.service';
import { logger } from './services/logger';
import { meetingRepository } from './repositories/meeting.repository';
import { generateHtmlMeetingPdf } from './services/html-pdf.service';
import { authService } from './services/auth.service';
import { redisService } from './services/redis.service';
import { Meeting } from '../types';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

export function initializeWorker() {
  logger.info('Initializing Accord asynchronous background worker...');

  // 1. Email consumer
  queueManager.registerHandler<EmailMessage>('metameet.email.send', async (job: QueueJob<EmailMessage>) => {
    logger.info(`Worker processing email job ${job.id} for ${job.payload.to}`);
    const result = await emailService.sendSignatureRequest(
      job.payload.to,
      job.payload.metadata?.signerName || 'کاربر گرامی',
      job.payload.metadata?.meetingTitle || 'صورت‌جلسه سازمان',
      job.payload.metadata?.organizerName || 'مدیر جلسه',
      job.payload.metadata?.signingLink || 'https://metameet.ir',
      job.payload.metadata?.expiresAt || '۲۴ ساعت آینده'
    );
    if (!result.success) throw new Error(result.error || 'Email delivery failed.');
  });

  // 2. Telegram consumer
  queueManager.registerHandler<{ chatId: string; message: string }>('metameet.telegram.send', async (job) => {
    logger.info(`Worker processing telegram job ${job.id} for chatId ${job.payload.chatId}`);
    await telegramService.sendNotification(job.payload.chatId, job.payload.message);
  });

  // 3. PDF generator consumer
  queueManager.registerHandler<{ meetingId: string; title: string }>('metameet.pdf.generate', async (job) => {
    logger.info(`Worker generating high-fidelity PDF artifact for meeting ${job.payload.meetingId}`);
    const meeting = await meetingRepository.getById(job.payload.meetingId);
    if (!meeting) throw new Error(`Meeting ${job.payload.meetingId} not found for PDF generation.`);
    const organizationId = (meeting as Meeting & { organizationId?: string }).organizationId || '';
    const sessionToken = await authService.createInternalSession(meeting.organizer.id, organizationId);
    try {
      await generateHtmlMeetingPdf(meeting, sessionToken);
    } finally {
      await authService.revokeSession(sessionToken);
    }
  });

  // 4. Audit record consumer
  queueManager.registerHandler<{ action: string; actor: string; timestamp: string }>('metameet.audit.record', async (job) => {
    logger.info(`Worker logging immutable audit trail: [${job.payload.action}] by ${job.payload.actor}`);
  });

  queueManager.registerHandler<{ text?: string; action?: string }>('metameet.ai.process', async (job) => {
    if (!job.payload?.text || job.payload.text.length > 100_000) {
      throw new Error('AI job payload is invalid or too large.');
    }
    logger.info(`Worker accepted AI processing job ${job.id} for action ${job.payload.action || 'default'}`);
  });

  queueManager.registerHandler<{
    chatId: string;
    meetingId: string;
    participantId?: string;
    organizationId: string;
    meetingTitle: string;
    organizerName: string;
    actionToken: string;
    pdfPath?: string;
    pdfBase64?: string;
  }>('metameet.telegram.sign_request', async (job) => {
    logger.info(`Worker sending Telegram sign-request for meeting ${job.payload.meetingId}`);
    let tokenUserId = job.payload.participantId || '';
    const tokenRecord = await redisService.get(`telegram-sign:${job.payload.actionToken}`);
    if (tokenRecord) {
      try { tokenUserId = (JSON.parse(tokenRecord) as { userId?: string }).userId || tokenUserId; } catch { /* ignore malformed legacy token */ }
    }
    // Completion markers can outlive signatures cancelled during revision.
    // Only the current persisted signature records determine whether to skip.
    const meeting = await meetingRepository.getById(job.payload.meetingId);
    if (!meeting) throw new Error(`Meeting ${job.payload.meetingId} not found for Telegram delivery.`);
    if (tokenUserId && meeting.signatures?.some((signature) => signature.signerId === tokenUserId)) {
      logger.info('Skipping Telegram sign-request because the signer has an active signature.', { metadata: { meetingId: job.payload.meetingId, participantId: tokenUserId } });
      return;
    }
    const organizationId = job.payload.organizationId || (meeting as (Meeting & { organizationId?: string }) | null)?.organizationId || '';
    let pdfPath = job.payload.pdfPath;
    let temporaryPdfPath: string | undefined;
    if (job.payload.pdfBase64) {
      temporaryPdfPath = path.join(os.tmpdir(), `accord-${job.payload.meetingId}-${job.id}.pdf`);
      await fs.writeFile(temporaryPdfPath, Buffer.from(job.payload.pdfBase64, 'base64'));
      pdfPath = temporaryPdfPath;
    } else if (meeting) {
      const sessionToken = await authService.createInternalSession(meeting.organizer.id, organizationId);
      try {
        pdfPath = await generateHtmlMeetingPdf(meeting, sessionToken);
      } finally {
        await authService.revokeSession(sessionToken);
      }
    }
    const sent = await telegramService.sendSignRequestPM(
      job.payload.chatId,
      job.payload.meetingId,
      job.payload.meetingTitle || meeting?.title || 'صورت‌جلسه',
      job.payload.organizerName || meeting?.organizer.name || 'مدیر جلسه',
      job.payload.actionToken,
      pdfPath,
    );
    if (temporaryPdfPath) await fs.unlink(temporaryPdfPath).catch(() => undefined);
    if (!sent) throw new Error('Telegram sign-request delivery failed.');
  });

  logger.info('Worker initialized and listening on all queues.');
}
