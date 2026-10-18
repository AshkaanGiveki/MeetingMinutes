import { Meeting, AuditRecord } from '../../types';
import { logger } from '../services/logger';
import { getDb } from '../db/mongodb';
import crypto from 'crypto';
import { repairMojibake } from '../../utils/text';

function requireDb() {
  const db = getDb();
  if (!db) throw new Error('Persistent MongoDB connection is required.');
  return db;
}

function normalizeLegacyMeetingText(meeting: Meeting): Meeting {
  const statusLabel = repairMojibake(meeting.statusLabel) || meeting.statusLabel;
  const organizerStatusText = repairMojibake(meeting.organizer?.statusText);
  const organizer = meeting.organizer && organizerStatusText
    ? { ...meeting.organizer, statusText: organizerStatusText }
    : meeting.organizer;
  const participants = (meeting.participants || []).map((participant) => {
    const statusText = repairMojibake(participant.statusText);
    return statusText ? { ...participant, statusText } : participant;
  });
  return { ...meeting, statusLabel, organizer, participants };
}

function normalizeSignatureRequirement(meeting: Meeting): Meeting {
  const signerIds = new Set<string>();
  for (const participant of [meeting.organizer, ...(meeting.participants || [])]) {
    if (participant?.id && (participant.roles || [participant.role]).includes('Signer') && participant.requiresSignature !== false) signerIds.add(participant.id);
  }
  const totalSignaturesRequired = signerIds.size;
  const signatureRecords = Array.isArray(meeting.signatures) ? meeting.signatures : undefined;
  if (!signatureRecords) {
    return normalizeLegacyMeetingText({
      ...meeting,
      organizer: meeting.organizer ? { ...meeting.organizer, hasSigned: false } : meeting.organizer,
      participants: (meeting.participants || []).map((participant) => ({ ...participant, hasSigned: false })),
      totalSignaturesRequired,
    });
  }

  const signedIds = new Set(signatureRecords
    .map((signature) => signature.signerId)
    .filter((signerId) => signerIds.has(signerId)));
  const participants = (meeting.participants || []).map((participant) => {
    const hasSigned = signedIds.has(participant.id);
    return {
      ...participant,
      hasSigned,
      statusText: hasSigned ? 'امضا دریافت شد' : participant.statusText === 'امضا دریافت شد' ? undefined : participant.statusText,
    };
  });
  return normalizeLegacyMeetingText({
    ...meeting,
    organizer: meeting.organizer && signedIds.has(meeting.organizer.id)
      ? { ...meeting.organizer, hasSigned: true, statusText: 'امضا دریافت شد' }
      : meeting.organizer,
    participants,
    signatureCount: signedIds.size,
    totalSignaturesRequired,
  });
}

export class MeetingRepository {
  async getAll(): Promise<Meeting[]> {
    const docs = await requireDb().collection('meetings').find({}).sort({ updatedAt: -1 }).toArray();
    return docs.map(({ _id, ...rest }) => normalizeSignatureRequirement(rest as unknown as Meeting));
  }

  async getAllForOrganization(organizationId: string): Promise<Meeting[]> {
    const docs = await requireDb().collection('meetings')
      .find({ organizationId })
      .sort({ updatedAt: -1 })
      .toArray();
    return docs.map(({ _id, ...rest }) => normalizeSignatureRequirement(rest as unknown as Meeting));
  }

  async getById(id: string): Promise<Meeting | null> {
    const doc = await requireDb().collection('meetings').findOne({ id });
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return normalizeSignatureRequirement(rest as unknown as Meeting);
  }

  async create(meeting: Meeting): Promise<Meeting> {
    await requireDb().collection('meetings').updateOne({ id: meeting.id }, { $set: meeting }, { upsert: true });
    logger.info(`Saved meeting ${meeting.id} to MongoDB.`);
    return { ...meeting };
  }

  async update(id: string, updates: Partial<Meeting>, expectedVersion?: number): Promise<Meeting | null> {
    const db = requireDb();
    const existing = await this.getById(id);
    if (!existing) return null;
    const currentVersion = Number((existing as Meeting & { version?: number }).version || 0);
    if (expectedVersion !== undefined && expectedVersion !== currentVersion) return null;
    const updated = { ...existing, ...updates, version: currentVersion + 1 };
    const filter = expectedVersion === undefined ? { id } : { id, version: currentVersion };
    const result = await db.collection('meetings').updateOne(filter, { $set: { ...updates, version: currentVersion + 1 } });
    if (!result.matchedCount) return null;
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const result = await requireDb().collection('meetings').deleteOne({ id });
    return result.deletedCount > 0;
  }

  async search(query: string, status?: string): Promise<Meeting[]> {
    const filter: Record<string, unknown> = {
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { discussion: { $regex: query, $options: 'i' } },
        { 'agenda.text': { $regex: query, $options: 'i' } },
        { 'decisions.text': { $regex: query, $options: 'i' } },
      ],
    };
    if (status) filter.status = status;
    const docs = await requireDb().collection('meetings').find(filter).sort({ updatedAt: -1 }).toArray();
    return docs.map(({ _id, ...rest }) => normalizeSignatureRequirement(rest as unknown as Meeting));
  }

  async addAudit(record: AuditRecord): Promise<void> {
    const db = requireDb();
    const previous = await db.collection<AuditRecord>('audit_logs').findOne({ meetingId: record.meetingId }, { sort: { timestamp: -1 } });
    const previousHash = previous?.metadata?.auditHash || '';
    const auditHash = crypto.createHash('sha256').update(JSON.stringify({ ...record, previousHash })).digest('hex');
    const enriched: AuditRecord = { ...record, metadata: { ...(record.metadata || {}), previousHash, auditHash } };
    await db.collection('audit_logs').insertOne(enriched);
    logger.info(`Audit log recorded: [${enriched.action}] for meeting ${enriched.meetingId}`);
  }

  async getAuditLogs(meetingId: string, page = 1, limit = 50): Promise<AuditRecord[]> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const logs = await requireDb().collection('audit_logs').find({ meetingId }).sort({ timestamp: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).toArray();
    return logs.map(({ _id, ...rest }) => rest as unknown as AuditRecord);
  }
}

export const meetingRepository = new MeetingRepository();
