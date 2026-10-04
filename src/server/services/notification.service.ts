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

const memory = new Map<string, NotificationRecord>();

class NotificationService {
  async list(userId: string, unreadOnly = false): Promise<NotificationRecord[]> {
    const db = getDb();
    if (db) {
      const filter: Record<string, unknown> = { userId };
      if (unreadOnly) filter.readAt = { $exists: false };
      const rows = await db.collection<NotificationRecord>('notifications')
        .find(filter).sort({ createdAt: -1 }).limit(100).toArray();
      return rows.map(({ _id: _ignored, ...row }) => row as NotificationRecord);
    }
    return Array.from(memory.values())
      .filter((item) => item.userId === userId && (!unreadOnly || !item.readAt))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async markRead(userId: string, id: string): Promise<boolean> {
    const readAt = new Date().toISOString();
    const db = getDb();
    if (db) {
      const result = await db.collection<NotificationRecord>('notifications')
        .updateOne({ id, userId }, { $set: { readAt } });
      return result.matchedCount > 0;
    }
    const item = memory.get(id);
    if (!item || item.userId !== userId) return false;
    memory.set(id, { ...item, readAt });
    return true;
  }

  async markAllRead(userId: string): Promise<void> {
    const readAt = new Date().toISOString();
    const db = getDb();
    if (db) {
      await db.collection<NotificationRecord>('notifications')
        .updateMany({ userId, readAt: { $exists: false } }, { $set: { readAt } });
      return;
    }
    for (const [id, item] of memory.entries()) {
      if (item.userId === userId && !item.readAt) memory.set(id, { ...item, readAt });
    }
  }

  async create(input: Omit<NotificationRecord, 'id' | 'createdAt'>): Promise<NotificationRecord> {
    const record: NotificationRecord = {
      ...input,
      id: `ntf_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
    };
    const db = getDb();
    if (db) await db.collection<NotificationRecord>('notifications').insertOne(record);
    else memory.set(record.id, record);
    return record;
  }
}

export const notificationService = new NotificationService();
