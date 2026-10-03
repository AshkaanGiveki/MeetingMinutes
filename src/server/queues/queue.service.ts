import { Client } from '@upstash/qstash';
import { logger } from '../services/logger';

export type QueueName =
  | 'metameet.email.send'
  | 'metameet.telegram.send'
  | 'metameet.pdf.generate'
  | 'metameet.audit.record'
  | 'metameet.ai.process';

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

    if (this.qstashClient && process.env.APP_URL) {
      try {
        await this.qstashClient.publishJSON({
          url: `${process.env.APP_URL}/api/queues/${queue}`,
          body: job,
        });
        logger.info(`Dispatched job ${jobId} to Upstash QStash.`);
        return jobId;
      } catch (err) {
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
      }
    }
  }

  getDeadLetterQueue(): QueueJob[] {
    return [...this.deadLetterQueue];
  }
}

export const queueManager = new QueueManager();
