import crypto from 'crypto';
import { getDb } from '../db/mongodb';

export interface NotificationRecord {
  id: string;
  userId: string;
  organizationId: string;
  type: 'system' | 'signature' | 'review' | 'meeting';
  title: string;
  message: string;
  meetingId?: string;
  readAt?: string;
  createdAt: string;
}

class NotificationService {
  async list(userId: string, organizationId: string, unreadOnly = false): Promise<NotificationRecord[]> {
    const filter: Record<string, unknown> = { userId, organizationId };
    if (unreadOnly) filter.readAt = { $exists: false };
    const rows = await this.requireDb().collection<NotificationRecord>('notifications')
      .find(filter).sort({ createdAt: -1 }).limit(100).toArray();
    return rows.map(({ _id: _ignored, ...row }) => row as NotificationRecord);
  }

  async markRead(userId: string, organizationId: string, id: string): Promise<boolean> {
    const readAt = new Date().toISOString();
    const result = await this.requireDb().collection<NotificationRecord>('notifications')
      .updateOne({ id, userId, organizationId }, { $set: { readAt } });
    return result.matchedCount > 0;
  }

  async markAllRead(userId: string, organizationId: string): Promise<void> {
    const readAt = new Date().toISOString();
    await this.requireDb().collection<NotificationRecord>('notifications')
      .updateMany({ userId, organizationId, readAt: { $exists: false } }, { $set: { readAt } });
  }

  async create(input: Omit<NotificationRecord, 'id' | 'createdAt'>): Promise<NotificationRecord> {
    const record: NotificationRecord = {
      ...input,
      id: `ntf_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
    };
    await this.requireDb().collection<NotificationRecord>('notifications').insertOne(record);
    return record;
  }

  private requireDb() {
    const db = getDb();
    if (!db) throw new Error('Persistent MongoDB connection is required.');
    return db;
  }
}

export const notificationService = new NotificationService();
