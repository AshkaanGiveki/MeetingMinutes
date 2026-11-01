import crypto from 'crypto';
import { getDb } from '../db/mongodb';
import { ObjectId } from 'mongodb';
import { MeetingRole, OrganizationRole, Permission, RolePermissionsMap } from '../policies/rbac';

export interface OrganizationRecord {
  id: string;
  name: string;
  createdBy: string;
  visibility: 'private' | 'organization';
  createdAt: string;
  updatedAt?: string;
}

export interface OrganizationMembership {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  permissions: Permission[];
  status: 'active' | 'suspended' | 'left';
  joinedAt: string;
}

export interface OrganizationInvitation {
  id: string;
  token: string;
  organizationId: string;
  invitedBy: string;
  phoneNumber?: string;
  email?: string;
  name?: string;
  role: OrganizationRole;
  status: 'pending' | 'processing' | 'accepted' | 'rejected' | 'cancelled' | 'expired';
  createdAt: string;
  expiresAt: number;
  acceptedAt?: string;
  acceptedAccountId?: string;
  meetingId?: string;
  meetingAssignment?: MeetingRole;
  meetingRoles?: MeetingRole[];
  meetingRequiresSignature?: boolean;
  organizationName?: string;
  deliveryStatus?: 'Not sent by SMS' | 'Queued' | 'Submitted to SMS provider' | 'Failed';
  deliveryAttempts?: Array<{ attemptedAt: string; channel: 'sms' | 'email' | 'copy'; status: string; providerMessageId?: string; error?: string }>;
  lastSentAt?: string;
  tokenHistory?: Array<{ tokenHash: string; rotatedAt: string }>;
  copyCount?: number;
  scopeType?: 'organization' | 'project';
  projectId?: string;
  offeredRole?: 'OrganizationAdmin' | 'InternalMember' | 'ProjectManager' | 'ReceivingLead' | 'ReceivingMember';
}

export interface OrganizationContext {
  organization: OrganizationRecord;
  membership: OrganizationMembership;
}

export interface OrganizationMemberPreview {
  id: string;
  name: string;
  avatar?: string;
}

function requireDb() {
  const db = getDb();
  if (!db) throw new Error('Persistent MongoDB connection is required.');
  return db;
}

async function recordInvitationAudit(action: string, actorId: string, organizationId: string, invitationId?: string) {
  await requireDb().collection('access_audit_logs').insertOne({
    id: `audit_${crypto.randomUUID()}`,
    action,
    actorId,
    organizationId,
    invitationId,
    createdAt: new Date().toISOString(),
  });
}

export function normalizeOrganizationRole(role: string): OrganizationRole {
  return role === 'Owner' || role === 'Admin' ? role : 'User';
}

export class OrganizationService {
  private async findInvitationById(organizationId: string, invitationId: string): Promise<OrganizationInvitation | null> {
    const objectId = /^[a-f\d]{24}$/i.test(invitationId) ? new ObjectId(invitationId) : null;
    const query = objectId
      ? { organizationId, $or: [{ id: invitationId }, { _id: objectId }] }
      : { organizationId, id: invitationId };
    return requireDb().collection<OrganizationInvitation>("organization_invitations").findOne(query as any);
  }

  async create(userId: string, name: string): Promise<OrganizationContext> {
    const db = requireDb();
    const organization: OrganizationRecord = {
      id: `org_${crypto.randomUUID()}`,
      name: name.trim(),
      createdBy: userId,
      visibility: 'private',
      createdAt: new Date().toISOString(),
    };
    const membership: OrganizationMembership = {
      id: `membership_${crypto.randomUUID()}`,
      organizationId: organization.id,
      userId,
      role: 'Owner',
      permissions: RolePermissionsMap.Owner,
      status: 'active',
      joinedAt: organization.createdAt,
    };
    await db.collection<OrganizationRecord>('organizations').insertOne(organization);
    await db.collection<OrganizationMembership>('organization_memberships').insertOne(membership);
    return { organization, membership };
  }

  async rename(userId: string, organizationId: string, name: string): Promise<OrganizationRecord | null> {
    const db = requireDb();
    const membership = await db.collection<OrganizationMembership>('organization_memberships').findOne({ organizationId, userId, status: 'active', role: { $in: ['Owner', 'Admin'] } });
    if (!membership) return null;
    const updatedAt = new Date().toISOString();
    const result = await db.collection<OrganizationRecord>('organizations').findOneAndUpdate({ id: organizationId }, { $set: { name: name.trim(), updatedAt } }, { returnDocument: 'after' });
    return result || null;
  }

  async remove(userId: string, organizationId: string): Promise<{ ok: boolean; reason?: string }> {
    const db = requireDb();
    const owner = await db.collection<OrganizationMembership>('organization_memberships').findOne({ organizationId, userId, status: 'active', role: 'Owner' });
    if (!owner) return { ok: false, reason: 'Only an organization owner can delete it.' };
    const meetingCount = await db.collection('meetings').countDocuments({ organizationId });
    if (meetingCount > 0) return { ok: false, reason: 'Organizations with meetings cannot be deleted.' };
    await db.collection('organization_invitations').deleteMany({ organizationId });
    await db.collection('organization_memberships').deleteMany({ organizationId });
    await db.collection('templates').deleteMany({ organizationId });
    await db.collection('notifications').deleteMany({ organizationId });
    const result = await db.collection<OrganizationRecord>('organizations').deleteOne({ id: organizationId });
    return result.deletedCount ? { ok: true } : { ok: false, reason: 'Organization not found.' };
  }

  async getContext(userId: string, organizationId?: string): Promise<OrganizationContext | null> {
    const db = requireDb();
    const membership = await db.collection<OrganizationMembership>('organization_memberships').findOne({
      userId,
      status: 'active',
      ...(organizationId ? { organizationId } : {}),
    });
    if (!membership) return null;
    const organization = await db.collection<OrganizationRecord>('organizations').findOne({ id: membership.organizationId });
    if (!organization) return null;
    const normalizedRole = normalizeOrganizationRole(membership.role);
    return {
      organization,
      membership: {
        ...membership,
        role: normalizedRole,
        // Older memberships may not have persisted permission arrays.
        permissions: Array.isArray(membership.permissions)
          ? membership.permissions
          : (RolePermissionsMap[normalizedRole] || []),
      },
    };
  }

  async listForUser(userId: string): Promise<Array<OrganizationContext & { memberCount: number; memberPreviews: OrganizationMemberPreview[] }>> {
    const db = requireDb();
    const memberships = await db.collection<OrganizationMembership>('organization_memberships').find({ userId, status: 'active' }).toArray();
    if (memberships.length === 0) return [];

    const organizationIds = memberships.map((membership) => membership.organizationId);
    const [organizations, memberCounts, memberMemberships] = await Promise.all([
      db.collection<OrganizationRecord>('organizations').find({ id: { $in: organizationIds } }).toArray(),
      db.collection<OrganizationMembership>('organization_memberships').aggregate<{ _id: string; count: number }>([
        { $match: { organizationId: { $in: organizationIds }, status: 'active' } },
        { $group: { _id: '$organizationId', count: { $sum: 1 } } },
      ]).toArray(),
      db.collection<OrganizationMembership>('organization_memberships').find({ organizationId: { $in: organizationIds }, status: 'active' }, { projection: { organizationId: 1, userId: 1 } }).toArray(),
    ]);

    const memberIds = Array.from(new Set(memberMemberships.map((membership) => membership.userId)));
    const users = await db.collection<{ id: string; name?: string; avatar?: string }>('users').find({ id: { $in: memberIds } }, { projection: { id: 1, name: 1, avatar: 1 } }).toArray();
    const userById = new Map(users.map((user) => [user.id, user]));

    const organizationById = new Map(organizations.map((organization) => [organization.id, organization]));
    const memberCountByOrganization = new Map(memberCounts.map((entry) => [entry._id, entry.count]));

    return memberships.flatMap((membership) => {
      const organization = organizationById.get(membership.organizationId);
      if (!organization) return [];
      return [{
        organization,
        membership: {
          ...membership,
          role: normalizeOrganizationRole(membership.role),
          permissions: RolePermissionsMap[normalizeOrganizationRole(membership.role)],
        },
        memberCount: memberCountByOrganization.get(organization.id) || 0,
        memberPreviews: memberMemberships
          .filter((member) => member.organizationId === organization.id)
          .slice(0, 5)
          .map((member) => ({
            id: member.userId,
            name: userById.get(member.userId)?.name || 'کاربر سازمان',
            avatar: userById.get(member.userId)?.avatar,
          })),
      }];
    });
  }

  async listAdministrativeOrganizations() {
    const db = requireDb();
    const organizations = await db.collection<OrganizationRecord>('organizations').find({}).sort({ createdAt: -1 }).toArray();
    const counts = await db.collection<OrganizationMembership>('organization_memberships').aggregate<{ _id: string; count: number }>([
      { $match: { status: 'active' } }, { $group: { _id: '$organizationId', count: { $sum: 1 } } },
    ]).toArray();
    const countMap = new Map(counts.map((entry) => [entry._id, entry.count]));
    return organizations.map((organization) => ({ ...organization, memberCount: countMap.get(organization.id) || 0 }));
  }

  async invite(input: Omit<OrganizationInvitation, 'id' | 'token' | 'status' | 'createdAt' | 'expiresAt'>): Promise<OrganizationInvitation> {
    const db = requireDb();
    const existing = await db.collection<OrganizationInvitation>('organization_invitations').findOne({
      organizationId: input.organizationId,
      status: 'pending',
      ...(input.phoneNumber ? { phoneNumber: input.phoneNumber } : { email: input.email }),
      ...(input.meetingId ? { meetingId: input.meetingId } : {}),
      ...(input.scopeType ? { scopeType: input.scopeType } : { scopeType: { $ne: 'project' } }),
      ...(input.offeredRole ? { offeredRole: input.offeredRole } : {}),
    });
    if (existing) return existing;
    const invitation: OrganizationInvitation = {
      ...input,
      id: `inv_${crypto.randomUUID()}`,
      token: crypto.randomBytes(32).toString('hex'),
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      deliveryStatus: input.phoneNumber ? 'Queued' : 'Not sent by SMS',
      deliveryAttempts: [],
      copyCount: 0,
    };
    await db.collection<OrganizationInvitation>('organization_invitations').insertOne(invitation);
    await recordInvitationAudit('organization_invitation_issued', input.invitedBy, input.organizationId, invitation.id);
    return invitation;
  }

  async markDelivery(token: string, channel: 'sms' | 'email' | 'copy', status: string, providerMessageId?: string, error?: string): Promise<void> {
    const db = requireDb();
    const deliveryStatus = channel === 'copy' ? 'Not sent by SMS' : status === 'Failed' ? 'Failed' : 'Submitted to SMS provider';
    await db.collection<OrganizationInvitation>('organization_invitations').updateOne(
      { token },
      { $set: { deliveryStatus, lastSentAt: new Date().toISOString() }, $push: { deliveryAttempts: { attemptedAt: new Date().toISOString(), channel, status, providerMessageId, error } } },
    );
  }

  async getInvitationForActor(actorId: string, organizationId: string, token: string): Promise<OrganizationInvitation | null> {
    const db = requireDb();
    const invitation = await db.collection<OrganizationInvitation>('organization_invitations').findOne({ organizationId, token });
    if (!invitation) return null;
    const [authorized, actor] = await Promise.all([
      db.collection<OrganizationMembership>('organization_memberships').findOne({ organizationId, userId: actorId, status: 'active', role: { $in: ['Owner', 'Admin'] } }),
      db.collection<{ platformRole?: string }>('users').findOne({ id: actorId }, { projection: { platformRole: 1 } }),
    ]);
    return authorized || actor?.platformRole === 'SuperAdmin' ? invitation : null;
  }

  async copyLink(actorId: string, organizationId: string, token: string): Promise<string | null> {
    const invitation = await this.getInvitationForActor(actorId, organizationId, token);
    if (!invitation || invitation.status !== 'pending' || invitation.expiresAt < Date.now()) return null;
    await requireDb().collection<OrganizationInvitation>('organization_invitations').updateOne({ organizationId, token, status: 'pending' }, { $inc: { copyCount: 1 }, $push: { deliveryAttempts: { attemptedAt: new Date().toISOString(), channel: 'copy', status: 'Copied' } } });
    await recordInvitationAudit('organization_invitation_copied', actorId, organizationId, invitation.id);
    return invitation.token;
  }

  async reissueInvitation(actorId: string, organizationId: string, token: string): Promise<OrganizationInvitation | null> {
    const invitation = await this.getInvitationForActor(actorId, organizationId, token);
    if (!invitation || ['accepted', 'cancelled'].includes(invitation.status)) return null;
    const nextToken = crypto.randomBytes(32).toString('hex');
    const now = new Date().toISOString();
    const tokenHash = crypto.createHash('sha256').update(invitation.token).digest('hex');
    const updated: Partial<OrganizationInvitation> = { token: nextToken, status: 'pending', createdAt: now, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, tokenHistory: [...(invitation.tokenHistory || []), { tokenHash, rotatedAt: now }] };
    const result = await requireDb().collection<OrganizationInvitation>('organization_invitations').updateOne({ organizationId, token }, { $set: updated });
    if (result.modifiedCount) await recordInvitationAudit('organization_invitation_reissued', actorId, organizationId, invitation.id);
    return result.modifiedCount ? { ...invitation, ...updated, token: nextToken, status: 'pending' } as OrganizationInvitation : null;
  }

  async copyLinkById(actorId: string, organizationId: string, invitationId: string): Promise<string | null> {
    const invitation = await this.findInvitationById(organizationId, invitationId);
    return invitation ? this.copyLink(actorId, organizationId, invitation.token) : null;
  }

  async reissueInvitationById(actorId: string, organizationId: string, invitationId: string): Promise<OrganizationInvitation | null> {
    const invitation = await this.findInvitationById(organizationId, invitationId);
    return invitation ? this.reissueInvitation(actorId, organizationId, invitation.token) : null;
  }

  async cancelInvitationById(actorId: string, organizationId: string, invitationId: string): Promise<boolean> {
    const invitation = await this.findInvitationById(organizationId, invitationId);
    return invitation ? this.cancelInvitation(actorId, invitation.token) : false;
  }

  async listOrganizationInvitations(actorId: string, organizationId: string): Promise<Array<Omit<OrganizationInvitation, 'token'>>> {
    const db = requireDb();
    const [authorized, actor] = await Promise.all([
      db.collection<OrganizationMembership>('organization_memberships').findOne({ organizationId, userId: actorId, status: 'active', role: { $in: ['Owner', 'Admin'] } }),
      db.collection<{ platformRole?: string }>('users').findOne({ id: actorId }, { projection: { platformRole: 1 } }),
    ]);
    if (!authorized && actor?.platformRole !== 'SuperAdmin') return [];
    await db.collection<OrganizationInvitation>('organization_invitations').updateMany({ organizationId, status: 'pending', expiresAt: { $lt: Date.now() } }, { $set: { status: 'expired' } });
    const invitations = await db.collection<OrganizationInvitation>('organization_invitations').find({ organizationId, status: 'pending', expiresAt: { $gt: Date.now() } }).sort({ createdAt: -1 }).toArray();
    return invitations.map(({ token: _token, phoneNumber, email, _id: mongoId, ...safe }) => ({
      ...safe,
      id: safe.id || String(mongoId || ''),
      phoneNumber: phoneNumber ? `${phoneNumber.slice(0, 4)} **** ${phoneNumber.slice(-2)}` : undefined,
      email: email ? `${email.slice(0, 2)}***${email.includes('@') ? email.slice(email.indexOf('@')) : ''}` : undefined,
    }));
  }

  async listInvitations(userId: string): Promise<Array<Omit<OrganizationInvitation, 'token'>>> {
    const db = requireDb();
    const user = await db.collection<{ id: string; phoneNumber: string; email: string; name?: string; avatar?: string }>('users').findOne({ id: userId });
    if (!user) return [];
    const recipientFilters = [{ phoneNumber: user.phoneNumber }, ...(user.email ? [{ email: user.email }] : [])];
    const invitations = await db.collection<OrganizationInvitation>('organization_invitations').find({
      status: 'pending',
      expiresAt: { $gt: Date.now() },
      $or: recipientFilters,
    }).sort({ createdAt: -1 }).toArray();
    const organizations = await db.collection<OrganizationRecord>('organizations').find({ id: { $in: invitations.map((invitation) => invitation.organizationId) } }).project({ _id: 0, id: 1, name: 1 }).toArray();
    const names = new Map(organizations.map((organization) => [organization.id, organization.name]));
    return invitations.map(({ token: _token, phoneNumber, email, ...invitation }) => ({
      ...invitation,
      phoneNumber: phoneNumber ? `${phoneNumber.slice(0, 4)} **** ${phoneNumber.slice(-2)}` : undefined,
      email: email ? `${email.slice(0, 2)}***${email.includes('@') ? email.slice(email.indexOf('@')) : ''}` : undefined,
      organizationName: names.get(invitation.organizationId),
    }));
  }

  async acceptInvitation(userId: string, token: string): Promise<OrganizationContext | null> {
    const db = requireDb();
    const user = await db.collection<{ id: string; phoneNumber: string; email: string; name?: string; avatar?: string }>('users').findOne({ id: userId });
    const invitation = await db.collection<OrganizationInvitation>('organization_invitations').findOne({ token, status: { $in: ['pending', 'processing'] } });
    if (!user || !invitation || invitation.expiresAt < Date.now()) return null;
    if (invitation.scopeType === 'project') return null;
    if (invitation.phoneNumber !== user.phoneNumber && invitation.email !== user.email) return null;
    const issuer = await db.collection<{ id: string; platformRole?: string }>('users').findOne({ id: invitation.invitedBy }, { projection: { id: 1, platformRole: 1 } });
    const issuerHasAuthority = invitation.role === 'Admin'
      ? issuer?.platformRole === 'SuperAdmin'
      : Boolean(await db.collection<OrganizationMembership>('organization_memberships').findOne({ organizationId: invitation.organizationId, userId: invitation.invitedBy, status: 'active', role: { $in: ['Owner', 'Admin'] } }));
    if (!issuerHasAuthority) return null;
    const organizationRole = normalizeOrganizationRole(invitation.role);
    const existing = await db.collection<OrganizationMembership>('organization_memberships').findOne({ organizationId: invitation.organizationId, userId });
    if (!existing) {
      await db.collection<OrganizationMembership>('organization_memberships').insertOne({
        id: `membership_${crypto.randomUUID()}`,
        organizationId: invitation.organizationId,
        userId,
        role: organizationRole,
        permissions: RolePermissionsMap[organizationRole],
        status: 'active',
        joinedAt: new Date().toISOString(),
      });
    } else if (existing.status !== 'active') {
      await db.collection<OrganizationMembership>('organization_memberships').updateOne(
        { organizationId: invitation.organizationId, userId },
        { $set: { status: 'active', role: organizationRole, permissions: RolePermissionsMap[organizationRole], joinedAt: new Date().toISOString() } },
      );
    } else if (invitation.role === 'Admin' && existing.role !== 'Admin' && existing.role !== 'Owner') {
      await db.collection<OrganizationMembership>('organization_memberships').updateOne(
        { organizationId: invitation.organizationId, userId, status: 'active' },
        { $set: { role: 'Admin', permissions: RolePermissionsMap.Admin, updatedAt: new Date().toISOString() } },
      );
    }
    if (invitation.offeredRole === 'ProjectManager') {
      const now = new Date().toISOString();
      await db.collection('project_manager_eligibility').updateOne(
        { organizationId: invitation.organizationId, userId, status: 'active' },
        { $set: { status: 'active', grantedBy: invitation.invitedBy, grantedAt: now, revokedAt: undefined, revokedBy: undefined }, $setOnInsert: { id: `pm_eligibility_${crypto.randomUUID()}`, organizationId: invitation.organizationId, userId, status: 'active', grantedBy: invitation.invitedBy, grantedAt: now } },
        { upsert: true },
      );
    }
    await db.collection<OrganizationInvitation>('organization_invitations').updateOne({ token }, { $set: { status: 'accepted', acceptedAt: new Date().toISOString(), acceptedAccountId: user.id } });
    await recordInvitationAudit('organization_invitation_accepted', userId, invitation.organizationId, invitation.id);
    if (invitation.meetingId && invitation.meetingAssignment) {
      const meeting = await db.collection<any>('meetings').findOne({ id: invitation.meetingId, organizationId: invitation.organizationId });
      if (meeting) {
        const participant = {
          id: user.id,
          name: user.name,
          role: invitation.meetingAssignment,
          roles: invitation.meetingRoles || [invitation.meetingAssignment],
          email: user.email,
          avatar: user.avatar,
          initials: String(user.name || '').slice(0, 2),
          hasSigned: false,
          requiresSignature: (invitation.meetingRoles || [invitation.meetingAssignment]).includes('Signer'),
          membershipStatus: 'active',
        };
        const participants = [...(meeting.participants || []).filter((item: any) => item.id !== user.id), participant];
        await db.collection('meetings').updateOne({ id: meeting.id }, {
          $set: {
            participants,
            totalSignaturesRequired: participants.filter((item: any) => (item.roles || [item.role]).includes('Signer') && item.requiresSignature !== false).length,
            ...(meeting.status === 'IN_REVIEW' ? { status: 'DRAFT', statusLabel: 'نیازمند اصلاح' } : {}),
            updatedAt: new Date().toISOString(),
          },
          $inc: { version: 1 },
        });
        await db.collection('meeting_members').updateOne(
          { meetingId: meeting.id, userId: user.id },
          { $set: { organizationId: invitation.organizationId, assignment: invitation.meetingAssignment, roles: invitation.meetingRoles || [invitation.meetingAssignment], permissions: Array.from(new Set((invitation.meetingRoles || [invitation.meetingAssignment]).flatMap((role) => RolePermissionsMap[role] || []))), updatedAt: new Date().toISOString() }, $setOnInsert: { id: `meeting_member_${crypto.randomUUID()}`, meetingId: meeting.id, userId: user.id, assignedBy: invitation.invitedBy, createdAt: new Date().toISOString() } },
          { upsert: true },
        );
      }
    }
    return this.getContext(userId, invitation.organizationId);
  }

  async rejectInvitation(userId: string, token: string): Promise<boolean> {
    const db = requireDb();
    const user = await db.collection<{ id: string; phoneNumber: string; email: string }>('users').findOne({ id: userId });
    const invitation = await db.collection<OrganizationInvitation>('organization_invitations').findOne({ token, status: { $in: ['pending', 'processing'] } });
    if (!user || !invitation || (invitation.phoneNumber !== user.phoneNumber && invitation.email !== user.email)) return false;
    const result = await db.collection('organization_invitations').updateOne({ token }, { $set: { status: 'rejected' } });
    return result.modifiedCount > 0;
  }

  async cancelInvitation(actorId: string, token: string): Promise<boolean> {
    const db = requireDb();
    const invitation = await db.collection<OrganizationInvitation>('organization_invitations').findOne({ token, status: 'pending' });
    if (!invitation) return false;
    if (invitation.invitedBy !== actorId) {
      const [membership, actor] = await Promise.all([
        db.collection<OrganizationMembership>('organization_memberships').findOne({ organizationId: invitation.organizationId, userId: actorId, status: 'active', role: { $in: ['Owner', 'Admin'] } }),
        db.collection<{ platformRole?: string }>('users').findOne({ id: actorId }, { projection: { platformRole: 1 } }),
      ]);
      if (!membership && actor?.platformRole !== 'SuperAdmin') return false;
    }
    const result = await db.collection('organization_invitations').updateOne({ token, status: 'pending' }, { $set: { status: 'cancelled' } });
    if (result.modifiedCount) await recordInvitationAudit('organization_invitation_cancelled', actorId, invitation.organizationId, invitation.id);
    return result.modifiedCount > 0;
  }

  async listMembers(organizationId: string) {
    const db = requireDb();
    const memberships = await db.collection<OrganizationMembership>('organization_memberships').find({ organizationId, status: 'active' }).toArray();
    const members = [];
    for (const membership of memberships) {
      const user = await db.collection('users').findOne({ id: membership.userId }, { projection: { passwordHash: 0 } });
      if (user) members.push({ ...user, membership: { ...membership, role: normalizeOrganizationRole(membership.role), permissions: RolePermissionsMap[normalizeOrganizationRole(membership.role)] } });
    }
    return members;
  }

  async listMembersPage(organizationId: string, offset = 0, limit = 10, search = '', includeRevoked = false) {
    const db = requireDb();
    const safeOffset = Math.max(0, Math.floor(offset));
    const safeLimit = Math.min(500, Math.max(1, Math.floor(limit)));
    const normalizedSearch = search.trim();
    const matchSearch = normalizedSearch ? [{ $match: { $or: [
      { 'user.name': { $regex: normalizedSearch, $options: 'i' } },
      { 'user.email': { $regex: normalizedSearch, $options: 'i' } },
    ] } }] : [];
    const [result] = await db.collection<OrganizationMembership>('organization_memberships').aggregate<any>([
      { $match: { organizationId, ...(includeRevoked ? {} : { status: 'active' }) } },
      { $lookup: { from: 'users', localField: 'userId', foreignField: 'id', as: 'user' } },
      { $unwind: '$user' },
      ...matchSearch,
      { $sort: { joinedAt: 1, userId: 1 } },
      { $facet: {
        data: [{ $skip: safeOffset }, { $limit: safeLimit }, { $project: { _id: 0, membership: '$$ROOT' } }],
        total: [{ $count: 'count' }],
      } },
    ]).toArray();
    const pageEntries = result?.data || [];
    const eligibility = await db.collection<{ userId: string; status: string }>('project_manager_eligibility').find({ organizationId, userId: { $in: pageEntries.map((entry: any) => entry.membership.userId) }, status: 'active' }).project({ _id: 0, userId: 1 }).toArray();
    const eligibleIds = new Set(eligibility.map((entry) => entry.userId));
    const members = pageEntries.map((entry: { membership: OrganizationMembership & { user: Record<string, unknown> } }) => {
      const { user, ...membership } = entry.membership;
      const { passwordHash: _passwordHash, ...safeUser } = user as Record<string, unknown> & { passwordHash?: string };
      const normalizedRole = normalizeOrganizationRole(String(membership.role));
      return { ...safeUser, membership: { ...membership, role: normalizedRole, permissions: RolePermissionsMap[normalizedRole], projectManagerEligible: eligibleIds.has(membership.userId) } };
    });
    const total = Number(result?.total?.[0]?.count || 0);
    return { members, total, offset: safeOffset, limit: safeLimit, hasMore: safeOffset + members.length < total, nextOffset: safeOffset + members.length };
  }

  async updateMembership(organizationId: string, userId: string, role: OrganizationRole, permissions?: Permission[]) {
    const result = await requireDb().collection<OrganizationMembership>('organization_memberships').updateOne(
      { organizationId, userId, status: 'active' },
      { $set: { role, permissions: permissions || RolePermissionsMap[role] } },
    );
    return result.modifiedCount > 0;
  }

  async updateMembershipAs(actorId: string, organizationId: string, userId: string, role: OrganizationRole, permissions?: Permission[]) {
    const db = requireDb();
    const actor = await db.collection<OrganizationMembership>('organization_memberships').findOne({ organizationId, userId: actorId, status: 'active' });
    const target = await db.collection<OrganizationMembership>('organization_memberships').findOne({ organizationId, userId, status: 'active' });
    if (!actor || !target || !['Owner', 'Admin'].includes(actor.role)) return false;
    if (target.role === 'Owner' && actor.role !== 'Owner') return false;
    if (role === 'Owner' && actor.role !== 'Owner') return false;
    if (target.role === 'Owner' && role !== 'Owner') {
      const ownerCount = await db.collection<OrganizationMembership>('organization_memberships').countDocuments({ organizationId, role: 'Owner', status: 'active' });
      if (ownerCount <= 1) return false;
    }
    const result = await db.collection<OrganizationMembership>('organization_memberships').updateOne(
      { organizationId, userId, status: 'active' },
      { $set: { role, permissions: permissions || RolePermissionsMap[role] } },
    );
    return result.modifiedCount > 0;
  }

  async removeMember(actorId: string, organizationId: string, userId: string): Promise<{ ok: boolean; reason?: string }> {
    const db = requireDb();
    const actor = await db.collection<OrganizationMembership>('organization_memberships').findOne({ organizationId, userId: actorId, status: 'active' });
    const target = await db.collection<OrganizationMembership>('organization_memberships').findOne({ organizationId, userId, status: 'active' });
    if (!actor || !target || !['Owner', 'Admin'].includes(actor.role)) return { ok: false, reason: 'You do not have permission to remove this member.' };
    if (target.role === 'Owner' && actor.role !== 'Owner') return { ok: false, reason: 'Only an owner can remove another owner.' };
    if (target.role === 'Owner') {
      const ownerCount = await db.collection<OrganizationMembership>('organization_memberships').countDocuments({ organizationId, role: 'Owner', status: 'active' });
      if (ownerCount <= 1) return { ok: false, reason: 'The last owner cannot be removed.' };
    }
    const result = await db.collection<OrganizationMembership>('organization_memberships').updateOne({ organizationId, userId, status: 'active' }, { $set: { status: 'left' } });
    return result.modifiedCount > 0 ? { ok: true } : { ok: false, reason: 'Member could not be removed.' };
  }

  async leave(userId: string, organizationId: string): Promise<{ ok: boolean; reason?: string }> {
    const db = requireDb();
    const membership = await db.collection<OrganizationMembership>('organization_memberships').findOne({ organizationId, userId, status: 'active' });
    if (!membership) return { ok: false, reason: 'Membership not found.' };
    if (membership.role === 'Owner') {
      const ownerCount = await db.collection<OrganizationMembership>('organization_memberships').countDocuments({ organizationId, role: 'Owner', status: 'active' });
      if (ownerCount <= 1) return { ok: false, reason: 'The last owner cannot leave the organization.' };
    }
    const result = await db.collection<OrganizationMembership>('organization_memberships').updateOne(
      { organizationId, userId, status: 'active' },
      { $set: { status: 'left' } },
    );
    return result.modifiedCount > 0 ? { ok: true } : { ok: false, reason: 'Membership could not be updated.' };
  }
}

export const organizationService = new OrganizationService();
