import { queueManager, QueueJob } from './queues/queue.service';
import { emailService, EmailMessage } from './services/email.service';
import { telegramService } from './services/telegram.service';
import { logger } from './services/logger';

export function initializeWorker() {
  logger.info('Initializing MetaMeet asynchronous background worker...');

  // 1. Email consumer
  queueManager.registerHandler<EmailMessage>('metameet.email.send', async (job: QueueJob<EmailMessage>) => {
    logger.info(`Worker processing email job ${job.id} for ${job.payload.to}`);
    await emailService.sendSignatureRequest(
      job.payload.to,
      job.payload.metadata?.signerName || 'کاربر گرامی',
      job.payload.metadata?.meetingTitle || 'صورت‌جلسه سازمان',
      job.payload.metadata?.organizerName || 'مدیر جلسه',
      job.payload.metadata?.signingLink || 'https://metameet.ir',
      job.payload.metadata?.expiresAt || '۲۴ ساعت آینده'
    );
  });

  // 2. Telegram consumer
  queueManager.registerHandler<{ chatId: string; message: string }>('metameet.telegram.send', async (job) => {
    logger.info(`Worker processing telegram job ${job.id} for chatId ${job.payload.chatId}`);
    await telegramService.sendNotification(job.payload.chatId, job.payload.message);
  });

  // 3. PDF generator consumer
  queueManager.registerHandler<{ meetingId: string; title: string }>('metameet.pdf.generate', async (job) => {
    logger.info(`Worker generating high-fidelity PDF artifact for meeting ${job.payload.meetingId}`);
    // Simulate generation of signed sealed PDF artifact
    await new Promise((resolve) => setTimeout(resolve, 300));
  });

  // 4. Audit record consumer
  queueManager.registerHandler<{ action: string; actor: string; timestamp: string }>('metameet.audit.record', async (job) => {
    logger.info(`Worker logging immutable audit trail: [${job.payload.action}] by ${job.payload.actor}`);
  });

  logger.info('Worker initialized and listening on all queues.');
}
