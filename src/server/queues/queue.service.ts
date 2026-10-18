import { Client } from '@upstash/qstash';
import { logger } from '../services/logger';
import { getDb } from '../db/mongodb';

export type QueueName =
  | 'metameet.email.send'
  | 'metameet.telegram.send'
  | 'metameet.telegram.sign_request'
  | 'metameet.pdf.generate'
  | 'metameet.audit.record'
  | 'metameet.ai.process';

export const QUEUE_NAMES: QueueName[] = [
  'metameet.email.send',
  'metameet.telegram.send',
  'metameet.telegram.sign_request',
  'metameet.pdf.generate',
  'metameet.audit.record',
  'metameet.ai.process',
];

export interface QueueJob<T = unknown> {
  id: string;
  queue: QueueName;
  payload: T;
  attempts: number;
  maxAttempts: number;
  timestamp: string;
  idempotencyKey?: string;
}

export type JobHandler<T = unknown> = (job: QueueJob<T>) => Promise<void>;

export class QueueManager {
  private handlers = new Map<QueueName, JobHandler<any>>();
  private deadLetterQueue: QueueJob[] = [];
  private inMemoryQueue: QueueJob[] = [];
  private qstashClient: Client | null = null;

  constructor() {
    const qstashToken = process.env.QSTASH_TOKEN;
    if (qstashToken) {
      logger.info('Connected to Upstash QStash Message Broker.');
      this.qstashClient = new Client({ token: qstashToken });
    } else {
      logger.info('Using high-performance local queue manager with exponential backoff & DLQ.');
    }

    // Process local queue
    setInterval(() => this.processNext(), 400);
  }

  registerHandler<T>(queue: QueueName, handler: JobHandler<T>) {
    this.handlers.set(queue, handler);
  }

  async enqueue<T>(queue: QueueName, payload: T, idempotencyKey?: string): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const job: QueueJob<T> = {
      id: jobId,
      queue,
      payload,
      attempts: 0,
      maxAttempts: 3,
      timestamp: new Date().toISOString(),
      idempotencyKey,
    };

    // Local development must not silently publish work to the deployed APP_URL.
    // Use QStash automatically in production, or opt into it locally with
    // QSTASH_EXTERNAL_QUEUE=true when testing the public webhook flow.
    const useExternalBroker = Boolean(
      this.qstashClient
      && process.env.APP_URL
      && (process.env.NODE_ENV === 'production'
        || process.env.QSTASH_EXTERNAL_QUEUE === 'true'
        || queue === 'metameet.telegram.sign_request'),
    );
    const externalBroker = this.qstashClient;
    if (useExternalBroker && externalBroker) {
      try {
        const published = await externalBroker.publishJSON({
          url: `${process.env.APP_URL}/api/queues/${queue}`,
          body: job,
          // PDF generation plus Telegram's multipart rich-message upload can
          // exceed QStash's short default delivery window.
          ...(queue === 'metameet.telegram.sign_request' ? { timeout: 60 } : {}),
        });
        logger.info(`Dispatched job ${jobId} to Upstash QStash.`, { metadata: { qstashMessageId: published.messageId, queue, callbackUrl: `${process.env.APP_URL}/api/queues/${queue}` } });
        return jobId;
      } catch (err) {
        if (queue === 'metameet.telegram.sign_request') {
          logger.error('Failed to publish Telegram sign-request to QStash.', { metadata: { error: String(err) } });
          throw err;
        }
        logger.warn('Failed to publish to QStash, handling with local worker:', { metadata: { error: String(err) } });
      }
    }

    this.inMemoryQueue.push(job);
    logger.info(`Job enqueued: ${job.id} on queue ${queue}`);
    return jobId;
  }

  private async processNext() {
    if (this.inMemoryQueue.length === 0) return;
    const job = this.inMemoryQueue.shift();
    if (!job) return;

    const handler = this.handlers.get(job.queue);
    if (!handler) {
      logger.warn(`No handler registered for queue ${job.queue}. Job dropped.`);
      return;
    }

    try {
      job.attempts += 1;
      await handler(job);
      logger.info(`Job succeeded: ${job.id} on queue ${job.queue}`);
    } catch (err: unknown) {
      logger.error(`Job execution error on ${job.queue}:`, { metadata: { error: String(err) } });
      if (job.attempts < job.maxAttempts) {
        setTimeout(() => {
          this.inMemoryQueue.push(job);
        }, Math.pow(2, job.attempts) * 800);
      } else {
        logger.error(`Job moved to Dead-Letter Queue (DLQ): ${job.id}`);
        this.deadLetterQueue.push(job);
        await this.persistDeadLetter(job);
      }
    }
  }

  getDeadLetterQueue(): QueueJob[] {
    return [...this.deadLetterQueue];
  }

  async getDeadLetterQueueAsync(): Promise<QueueJob[]> {
    const db = getDb();
    if (!db) return this.getDeadLetterQueue();
    const jobs = await db.collection<QueueJob>('queue_dead_letters').find({}).sort({ timestamp: -1 }).limit(100).toArray();
    return jobs.map(({ _id: _ignored, ...job }) => job as QueueJob);
  }

  async replayDeadLetter(jobId: string): Promise<boolean> {
    const db = getDb();
    const job = db
      ? await db.collection<QueueJob>('queue_dead_letters').findOne({ id: jobId })
      : this.deadLetterQueue.find((item) => item.id === jobId);
    if (!job) return false;
    const replay = { ...job, attempts: 0, timestamp: new Date().toISOString() };
    if (db) await db.collection('queue_dead_letters').deleteOne({ id: jobId });
    this.inMemoryQueue.push(replay);
    return true;
  }

  getDiagnostics(queue?: QueueName) {
    const useExternalBroker = Boolean(
      this.qstashClient
      && process.env.APP_URL
      && (process.env.NODE_ENV === 'production' || process.env.QSTASH_EXTERNAL_QUEUE === 'true' || queue === 'metameet.telegram.sign_request'),
    );
    return {
      configuredQueues: [...QUEUE_NAMES],
      registeredHandlers: [...this.handlers.keys()],
      pendingJobs: this.inMemoryQueue.length,
      deadLetterJobs: this.deadLetterQueue.length,
      externalBroker: useExternalBroker,
    };
  }

  async processExternalJob(job: QueueJob): Promise<void> {
    if (job.idempotencyKey && !(await this.claimJob(job.idempotencyKey))) return;
    const handler = this.handlers.get(job.queue);
    if (!handler) throw new Error(`No handler registered for queue ${job.queue}.`);
    await handler(job);
  }

  private processedJobs = new Set<string>();

  private async claimJob(key: string): Promise<boolean> {
    if (this.processedJobs.has(key)) return false;
    this.processedJobs.add(key);
    return true;
  }

  private async persistDeadLetter(job: QueueJob): Promise<void> {
    const db = getDb();
    if (db) await db.collection<QueueJob>('queue_dead_letters').updateOne({ id: job.id }, { $set: job }, { upsert: true });
  }
}

export const queueManager = new QueueManager();
