import crypto from 'crypto';
import { getDb, getMongoClient } from '../db/mongodb';
import type { ClientSession } from 'mongodb';
import { normalizeIranianPhoneNumber } from '../utils/phone';
import { otpService } from './otp.service';
import { accessService } from './access.service';
import { smsService } from './sms.service';

export type MobileChangeStatus = 'pending' | 'completed' | 'rejected' | 'expired';

export interface MobileChangeRequest {
  id: string;
  organizationId: string;
  targetUserId: string;
  initiatedBy: string;
  oldPhoneNumber: string;
  newPhoneNumber: string;
  newVerified: boolean;
  oldVerified: boolean;
  recoveryStatus: 'not_required' | 'pending' | 'approved' | 'rejected' | 'inconclusive' | 'expired';
  status: MobileChangeStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

function requireDb() {
  const db = getDb();
  if (!db) throw new Error('Persistent MongoDB connection is required.');
  return db;
}

async function audit(action: string, actorId: string, request: MobileChangeRequest, metadata?: Record<string, unknown>, session?: ClientSession) {
  await requireDb().collection('access_audit_logs').insertOne({ id: `access_audit_${crypto.randomUUID()}`, action, actorId, organizationId: request.organizationId, targetUserId: request.targetUserId, metadata, createdAt: new Date().toISOString() }, session ? { session } : undefined);
}

export class MobileChangeService {
  async initiate(actorId: string, organizationId: string, targetUserId: string, rawNewPhone: string): Promise<MobileChangeRequest | null> {
    const db = requireDb();
    const superAdmin = await accessService.isSuperAdmin(actorId);
    if (!superAdmin && !(await accessService.canManageOrganization(actorId, organizationId))) return null;
    const targetMembership = await db.collection('organization_memberships').findOne({ organizationId, userId: targetUserId, status: 'active' });
    if (!targetMembership && !superAdmin) return null;
    const newPhoneNumber = normalizeIranianPhoneNumber(rawNewPhone);
    const existing = await db.collection('users').findOne({ phoneNumber: newPhoneNumber, id: { $ne: targetUserId } });
    if (existing) return null;
    const target = await db.collection<{ id: string; phoneNumber: string }>('users').findOne({ id: targetUserId }, { projection: { id: 1, phoneNumber: 1 } });
    if (!target) return null;
    const duplicateRequest = await db.collection<MobileChangeRequest>('mobile_change_requests').findOne({ targetUserId, status: 'pending' });
    if (duplicateRequest) return duplicateRequest;
    const now = new Date().toISOString();
    const request: MobileChangeRequest = {
      id: `mobile_change_${crypto.randomUUID()}`,
      organizationId,
      targetUserId,
      initiatedBy: actorId,
      oldPhoneNumber: target.phoneNumber,
      newPhoneNumber,
      newVerified: false,
      oldVerified: false,
      recoveryStatus: 'pending',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    await db.collection<MobileChangeRequest>('mobile_change_requests').insertOne(request);
    await audit('mobile_change_initiated', actorId, request);
    return request;
  }

  async get(actorId: string, id: string): Promise<MobileChangeRequest | null> {
    const db = requireDb();
    const request = await db.collection<MobileChangeRequest>('mobile_change_requests').findOne({ id });
    if (!request) return null;
    const allowed = request.targetUserId === actorId || await accessService.canManageOrganization(actorId, request.organizationId);
    return allowed ? request : null;
  }

  async list(actorId: string, organizationId?: string) {
    const db = requireDb();
    const superAdmin = await accessService.isSuperAdmin(actorId);
    const filter = superAdmin ? (organizationId ? { organizationId } : {}) : { organizationId };
    if (!superAdmin && !organizationId) return [];
    const requests = await db.collection<MobileChangeRequest>('mobile_change_requests').find({ ...filter, status: 'pending', recoveryStatus: 'pending', oldVerified: false }).sort({ createdAt: -1 }).limit(200).toArray();
    return requests.map((request) => ({ ...request, oldPhoneNumber: `${request.oldPhoneNumber.slice(0, 4)}****${request.oldPhoneNumber.slice(-2)}`, newPhoneNumber: `${request.newPhoneNumber.slice(0, 4)}****${request.newPhoneNumber.slice(-2)}`, evidenceReference: undefined }));
  }

  async requestOtp(actorId: string, id: string, side: 'new' | 'old') {
    const request = await this.get(actorId, id);
    if (!request || request.status !== 'pending') return { ok: false, reason: 'Mobile-change request is unavailable.' };
    const destination = side === 'new' ? request.newPhoneNumber : request.oldPhoneNumber;
    return otpService.issue(side === 'new' ? 'mobile_new' : 'mobile_old', destination, id);
  }

  async verifyOtp(actorId: string, id: string, side: 'new' | 'old', code: string) {
    const request = await this.get(actorId, id);
    if (!request || request.status !== 'pending') return { ok: false, reason: 'Mobile-change request is unavailable.' };
    const destination = side === 'new' ? request.newPhoneNumber : request.oldPhoneNumber;
    const result = await otpService.verify(side === 'new' ? 'mobile_new' : 'mobile_old', destination, code, id);
    if (!result.ok) return result;
    const db = requireDb();
    await db.collection<MobileChangeRequest>('mobile_change_requests').updateOne({ id, status: 'pending' }, { $set: { [side === 'new' ? 'newVerified' : 'oldVerified']: true, updatedAt: new Date().toISOString() } });
    await audit(`mobile_${side}_verified`, actorId, request);
    return { ok: true };
  }

  async reviewRecovery(actorId: string, id: string, decision: 'approved' | 'rejected' | 'inconclusive' | 'expired', evidenceReference = '', reason = '') {
    if (!(await accessService.isSuperAdmin(actorId))) return { ok: false, reason: 'Only a Super Admin can review mobile recovery.' };
    if (!evidenceReference.trim() || !reason.trim()) return { ok: false, reason: 'Evidence reference and reviewer reason are required.' };
    const db = requireDb();
    const result = await db.collection<MobileChangeRequest>('mobile_change_requests').updateOne({ id, status: 'pending', recoveryStatus: 'pending' }, { $set: { recoveryStatus: decision, evidenceReference: evidenceReference.slice(0, 500), reviewReason: reason.slice(0, 1000), updatedAt: new Date().toISOString(), reviewedBy: actorId, reviewedAt: new Date().toISOString() } });
    if (result.modifiedCount) { const request = await db.collection<MobileChangeRequest>('mobile_change_requests').findOne({ id }); if (request) await audit('mobile_recovery_reviewed', actorId, request, { decision }); }
    return result.modifiedCount ? { ok: true } : { ok: false, reason: 'Mobile-change request is unavailable.' };
  }

  async complete(actorId: string, id: string) {
    const request = await this.get(actorId, id);
    if (!request || request.status !== 'pending' || !request.newVerified || !(request.oldVerified || request.recoveryStatus === 'approved')) return { ok: false, reason: 'Both required ownership checks are not complete.' };
    const db = requireDb();
    const client = getMongoClient();
    if (!client) return { ok: false, reason: 'Persistent database connection is unavailable.' };
    const now = new Date().toISOString();
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        const collision = await db.collection('users').findOne({ phoneNumber: request.newPhoneNumber, id: { $ne: request.targetUserId } }, { session });
        if (collision) throw new Error('The target mobile number is already assigned to another account.');
        const updated = await db.collection('users').updateOne({ id: request.targetUserId, phoneNumber: request.oldPhoneNumber }, { $set: { phoneNumber: request.newPhoneNumber, mobileVerifiedAt: now, updatedAt: now } }, { session });
        if (!updated.modifiedCount) throw new Error('The account mobile number changed or the target is unavailable.');
        const requestUpdate = await db.collection('mobile_change_requests').updateOne({ id, status: 'pending' }, { $set: { status: 'completed', completedAt: now, updatedAt: now } }, { session });
        if (!requestUpdate.modifiedCount) throw new Error('The mobile-change request is no longer pending.');
        await db.collection('sessions').deleteMany({ userId: request.targetUserId }, { session });
        await audit('mobile_change_completed', actorId, request, undefined, session);
      });
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : 'Mobile change could not be completed.' };
    } finally {
      await session.endSession();
    }
    const notificationResults = await Promise.allSettled([
      smsService.sendMessage(request.oldPhoneNumber, 'Your account mobile number was changed. Contact support if this was not authorized.'),
      smsService.sendMessage(request.newPhoneNumber, 'Your account mobile number was changed successfully.'),
    ]);
    await db.collection('mobile_change_requests').updateOne({ id }, { $set: { notificationAttempts: notificationResults.map((result, index) => ({ destination: index === 0 ? 'old' : 'new', status: result.status, ...(result.status === 'fulfilled' ? { submitted: result.value.success, providerMessageId: result.value.providerMessageId, error: result.value.error } : { error: String(result.reason) }) })) } });
    return { ok: true };
  }
}

export const mobileChangeService = new MobileChangeService();
