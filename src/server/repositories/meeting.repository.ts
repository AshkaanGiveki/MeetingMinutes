import { initialMeeting, sampleMeetingsList, sampleAuditLogs } from '../../data/mockData';
import { Meeting, AuditRecord } from '../../types';
import { logger } from '../services/logger';
import { getDb } from '../db/mongodb';
import crypto from 'crypto';

export class MeetingRepository {
  private meetings: Map<string, Meeting> = new Map();
  private auditLogs: AuditRecord[] = [...sampleAuditLogs];

  constructor() {
    sampleMeetingsList.forEach((m) => this.meetings.set(m.id, { ...m }));
    logger.info(`Meeting repository initialized with ${this.meetings.size} local template records.`);
  }

  private get allowsLocalFallback() {
    return process.env.NODE_ENV !== 'production';
  }

  async getAll(): Promise<Meeting[]> {
    const db = getDb();
    if (db) {
      try {
        const mongoMeetings = await db.collection('meetings').find({}).toArray();
        return mongoMeetings.map((doc) => {
          const { _id, ...rest } = doc;
          return rest as unknown as Meeting;
        });
      } catch (err) {
        logger.warn('Failed to read from MongoDB, using local store:', { metadata: { error: String(err) } });
      }
    }
    return this.allowsLocalFallback ? Array.from(this.meetings.values()) : [];
  }

  async getById(id: string): Promise<Meeting | null> {
    const db = getDb();
    if (db) {
      try {
        const doc = await db.collection('meetings').findOne({ id });
        if (doc) {
          const { _id, ...rest } = doc;
          return rest as unknown as Meeting;
        }
      } catch (err) {
        logger.warn(`Failed to fetch meeting ${id} from MongoDB:`, { metadata: { error: String(err) } });
      }
    }
    if (!this.allowsLocalFallback) return null;
    const meeting = this.meetings.get(id);
    return meeting ? { ...meeting } : null;
  }

  async create(meeting: Meeting): Promise<Meeting> {
    this.meetings.set(meeting.id, { ...meeting });

    const db = getDb();
    if (db) {
      try {
        await db.collection('meetings').updateOne(
          { id: meeting.id },
          { $set: meeting },
          { upsert: true }
        );
        logger.info(`Saved meeting ${meeting.id} directly to MongoDB.`);
      } catch (err) {
        if (!this.allowsLocalFallback) throw err;
        logger.error(`Error saving meeting ${meeting.id} to MongoDB:`, { metadata: { error: String(err) } });
      }
    }

    if (!getDb() && !this.allowsLocalFallback) {
      throw new Error('Persistent database is required in production.');
    }
    return { ...meeting };
  }

  async update(id: string, updates: Partial<Meeting>, expectedVersion?: number): Promise<Meeting | null> {
    const existing = await this.getById(id);
    if (!existing) return null;
    const currentVersion = Number((existing as Meeting & { version?: number }).version || 0);
    if (expectedVersion !== undefined && expectedVersion !== currentVersion) return null;

    const updated = { ...existing, ...updates, version: currentVersion + 1 };
    this.meetings.set(id, updated);

    const db = getDb();
    if (db) {
      try {
        const result = await db.collection('meetings').updateOne(
          expectedVersion === undefined ? { id } : { id, version: currentVersion },
          { $set: { ...updates, version: currentVersion + 1 } },
        );
        if (expectedVersion !== undefined && result.matchedCount === 0) return null;
        logger.info(`Updated meeting ${id} in MongoDB.`);
      } catch (err) {
        if (!this.allowsLocalFallback) throw err;
        logger.warn(`Failed to update meeting ${id} in MongoDB:`, { metadata: { error: String(err) } });
      }
    }

    if (!getDb() && !this.allowsLocalFallback) {
      throw new Error('Persistent database is required in production.');
    }
    return { ...updated };
  }

  async delete(id: string): Promise<boolean> {
    this.meetings.delete(id);
    const db = getDb();
    if (db) {
      try {
        await db.collection('meetings').deleteOne({ id });
      } catch (err) {
        logger.warn(`Failed to delete meeting ${id} in MongoDB:`, { metadata: { error: String(err) } });
      }
    }
    return true;
  }

  async search(query: string, status?: string): Promise<Meeting[]> {
    const db = getDb();
    if (db && query.trim()) {
      try {
        const filter: Record<string, unknown> = {
          $or: [
            { title: { $regex: query, $options: 'i' } },
            { discussion: { $regex: query, $options: 'i' } },
            { 'agenda.text': { $regex: query, $options: 'i' } },
            { 'decisions.text': { $regex: query, $options: 'i' } },
          ],
        };
        if (status) {
          filter.status = status;
        }
        const docs = await db.collection('meetings').find(filter).toArray();
        return docs.map((d) => {
          const { _id, ...rest } = d;
          return rest as unknown as Meeting;
        });
      } catch (err) {
        logger.warn('MongoDB search fallback:', { metadata: { error: String(err) } });
      }
    }

    if (!this.allowsLocalFallback) return [];
    const normalized = query.trim().toLowerCase();
    return Array.from(this.meetings.values()).filter((m) => {
      const matchStatus = !status || m.status === status;
      const matchTitle = m.title.toLowerCase().includes(normalized);
      const matchDiscussion = m.discussion.toLowerCase().includes(normalized);
      const matchAgenda = m.agenda.some((a) => a.text.toLowerCase().includes(normalized));
      const matchDecisions = m.decisions.some((d) => d.text.toLowerCase().includes(normalized));
      return matchStatus && (matchTitle || matchDiscussion || matchAgenda || matchDecisions);
    });
  }

  async addAudit(record: AuditRecord): Promise<void> {
    const db = getDb();
    const previous = db
      ? await db.collection<AuditRecord>('audit_logs').findOne({ meetingId: record.meetingId }, { sort: { timestamp: -1 } })
      : [...this.auditLogs].reverse().find((item) => item.meetingId === record.meetingId);
    const previousHash = previous?.metadata?.auditHash || '';
    const auditHash = crypto.createHash('sha256').update(JSON.stringify({ ...record, previousHash })).digest('hex');
    const enriched: AuditRecord = { ...record, metadata: { ...(record.metadata || {}), previousHash, auditHash } };
    this.auditLogs.push(enriched);
    if (db) {
      try {
        await db.collection('audit_logs').insertOne({ ...enriched });
      } catch (err) {
        if (!this.allowsLocalFallback) throw err;
        logger.warn('Failed to record audit in MongoDB:', { metadata: { error: String(err) } });
      }
    }
    logger.info(`Audit log recorded: [${enriched.action}] for meeting ${enriched.meetingId}`);
  }

  async getAuditLogs(meetingId: string, page = 1, limit = 50): Promise<AuditRecord[]> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const db = getDb();
    if (db) {
      try {
        const logs = await db.collection('audit_logs').find({ meetingId }).sort({ timestamp: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).toArray();
        return logs.map((d) => {
          const { _id, ...rest } = d;
          return rest as unknown as AuditRecord;
        });
      } catch (err) {
        logger.warn('Failed to fetch audit from MongoDB:', { metadata: { error: String(err) } });
      }
    }
    return this.allowsLocalFallback
      ? this.auditLogs.filter((a) => a.meetingId === meetingId).sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice((safePage - 1) * safeLimit, safePage * safeLimit)
      : [];
  }
}

export const meetingRepository = new MeetingRepository();
