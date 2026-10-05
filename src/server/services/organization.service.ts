import crypto from 'crypto';
import { getDb } from '../db/mongodb';
import { OrganizationRole, Permission, RolePermissionsMap } from '../policies/rbac';

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
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';
  createdAt: string;
  expiresAt: number;
  acceptedAt?: string;
}

export interface OrganizationContext {
  organization: OrganizationRecord;
  membership: OrganizationMembership;
}

function requireDb() {
  const db = getDb();
  if (!db) throw new Error('Persistent MongoDB connection is required.');
  return db;
}

export class OrganizationService {
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
    return {
      organization,
      membership: {
        ...membership,
        // Older memberships may not have persisted permission arrays.
        permissions: Array.isArray(membership.permissions)
          ? membership.permissions
          : (RolePermissionsMap[membership.role] || []),
      },
    };
  }

  async listForUser(userId: string): Promise<Array<OrganizationContext & { memberCount: number }>> {
    const db = requireDb();
    const memberships = await db.collection<OrganizationMembership>('organization_memberships').find({ userId, status: 'active' }).toArray();
    if (memberships.length === 0) return [];

    const organizationIds = memberships.map((membership) => membership.organizationId);
    const [organizations, memberCounts] = await Promise.all([
      db.collection<OrganizationRecord>('organizations').find({ id: { $in: organizationIds } }).toArray(),
      db.collection<OrganizationMembership>('organization_memberships').aggregate<{ _id: string; count: number }>([
        { $match: { organizationId: { $in: organizationIds }, status: 'active' } },
        { $group: { _id: '$organizationId', count: { $sum: 1 } } },
      ]).toArray(),
    ]);

    const organizationById = new Map(organizations.map((organization) => [organization.id, organization]));
    const memberCountByOrganization = new Map(memberCounts.map((entry) => [entry._id, entry.count]));

    return memberships.flatMap((membership) => {
      const organization = organizationById.get(membership.organizationId);
      if (!organization) return [];
      return [{
        organization,
        membership: {
          ...membership,
          permissions: Array.isArray(membership.permissions)
            ? membership.permissions
            : (RolePermissionsMap[membership.role] || []),
        },
        memberCount: memberCountByOrganization.get(organization.id) || 0,
      }];
    });
  }

  async invite(input: Omit<OrganizationInvitation, 'id' | 'token' | 'status' | 'createdAt' | 'expiresAt'>): Promise<OrganizationInvitation> {
    const invitation: OrganizationInvitation = {
      ...input,
      id: `inv_${crypto.randomUUID()}`,
      token: crypto.randomBytes(32).toString('hex'),
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };
    await requireDb().collection<OrganizationInvitation>('organization_invitations').insertOne(invitation);
    return invitation;
  }

  async listInvitations(userId: string): Promise<OrganizationInvitation[]> {
    const db = requireDb();
    const user = await db.collection<{ id: string; phoneNumber: string; email: string }>('users').findOne({ id: userId });
    if (!user) return [];
    const recipientFilters = [{ phoneNumber: user.phoneNumber }, ...(user.email ? [{ email: user.email }] : [])];
    const invitations = await db.collection<OrganizationInvitation>('organization_invitations').find({
      status: 'pending',
      expiresAt: { $gt: Date.now() },
      $or: recipientFilters,
    }).sort({ createdAt: -1 }).toArray();
    return invitations;
  }

  async acceptInvitation(userId: string, token: string): Promise<OrganizationContext | null> {
    const db = requireDb();
    const user = await db.collection<{ id: string; phoneNumber: string; email: string }>('users').findOne({ id: userId });
    const invitation = await db.collection<OrganizationInvitation>('organization_invitations').findOne({ token, status: 'pending' });
    if (!user || !invitation || invitation.expiresAt < Date.now()) return null;
    if (invitation.phoneNumber !== user.phoneNumber && invitation.email !== user.email) return null;
    const existing = await db.collection<OrganizationMembership>('organization_memberships').findOne({ organizationId: invitation.organizationId, userId });
    if (!existing) {
      await db.collection<OrganizationMembership>('organization_memberships').insertOne({
        id: `membership_${crypto.randomUUID()}`,
        organizationId: invitation.organizationId,
        userId,
        role: invitation.role,
        permissions: RolePermissionsMap[invitation.role],
        status: 'active',
        joinedAt: new Date().toISOString(),
      });
    } else if (existing.status !== 'active') {
      await db.collection<OrganizationMembership>('organization_memberships').updateOne(
        { organizationId: invitation.organizationId, userId },
        { $set: { status: 'active', role: invitation.role, permissions: RolePermissionsMap[invitation.role], joinedAt: new Date().toISOString() } },
      );
    }
    await db.collection<OrganizationInvitation>('organization_invitations').updateOne({ token }, { $set: { status: 'accepted', acceptedAt: new Date().toISOString() } });
    return this.getContext(userId, invitation.organizationId);
  }

  async rejectInvitation(userId: string, token: string): Promise<boolean> {
    const db = requireDb();
    const user = await db.collection<{ id: string; phoneNumber: string; email: string }>('users').findOne({ id: userId });
    const invitation = await db.collection<OrganizationInvitation>('organization_invitations').findOne({ token, status: 'pending' });
    if (!user || !invitation || (invitation.phoneNumber !== user.phoneNumber && invitation.email !== user.email)) return false;
    const result = await db.collection('organization_invitations').updateOne({ token }, { $set: { status: 'rejected' } });
    return result.modifiedCount > 0;
  }

  async cancelInvitation(actorId: string, token: string): Promise<boolean> {
    const db = requireDb();
    const invitation = await db.collection<OrganizationInvitation>('organization_invitations').findOne({ token, status: 'pending' });
    if (!invitation) return false;
    if (invitation.invitedBy !== actorId) {
      const membership = await db.collection<OrganizationMembership>('organization_memberships').findOne({ organizationId: invitation.organizationId, userId: actorId, status: 'active', role: { $in: ['Owner', 'Admin'] } });
      if (!membership) return false;
    }
    const result = await db.collection('organization_invitations').updateOne({ token, status: 'pending' }, { $set: { status: 'cancelled' } });
    return result.modifiedCount > 0;
  }

  async listMembers(organizationId: string) {
    const db = requireDb();
    const memberships = await db.collection<OrganizationMembership>('organization_memberships').find({ organizationId, status: 'active' }).toArray();
    const members = [];
    for (const membership of memberships) {
      const user = await db.collection('users').findOne({ id: membership.userId }, { projection: { passwordHash: 0 } });
      if (user) members.push({ ...user, membership });
    }
    return members;
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
