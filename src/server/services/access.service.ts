import crypto from 'crypto';
import { getDb } from '../db/mongodb';
import type { OrganizationInvitation, OrganizationMembership } from './organization.service';

export type PlatformRole = 'SuperAdmin' | 'User';
export type ProjectRole = 'ProjectManager' | 'OrganizationUser' | 'Stakeholder' | 'CustomerClerk';
function normalizeProjectRole(role: string | undefined): ProjectRole | undefined {
  if (role === 'ExecutionMember') return 'OrganizationUser';
  if (role === 'ReceivingLead') return 'Stakeholder';
  if (role === 'ReceivingMember') return 'CustomerClerk';
  return role === 'ProjectManager' || role === 'OrganizationUser' || role === 'Stakeholder' || role === 'CustomerClerk' ? role : undefined;
}
export type ProjectMembershipStatus = 'active' | 'revoked';

export interface ProjectRecord {
  id: string;
  organizationId: string;
  name: string;
  createdBy: string;
  managerUserId: string;
  status: 'active';
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMembership {
  id: string;
  projectId: string;
  organizationId: string;
  userId: string;
  role: Exclude<ProjectRole, 'ProjectManager'>;
  status: ProjectMembershipStatus;
  assignedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectContext {
  project: ProjectRecord;
  role: ProjectRole | 'Owner';
}

function requireDb() {
  const db = getDb();
  if (!db) throw new Error('Persistent MongoDB connection is required.');
  return db;
}

async function recordAccessAudit(action: string, actorId: string, organizationId?: string, targetUserId?: string, projectId?: string, metadata?: Record<string, unknown>) {
  await requireDb().collection('access_audit_logs').insertOne({ id: `access_audit_${crypto.randomUUID()}`, action, actorId, organizationId, targetUserId, projectId, metadata, createdAt: new Date().toISOString() });
}

export class AccessService {
  async isSuperAdmin(userId: string): Promise<boolean> {
    const user = await requireDb().collection<{ id: string; platformRole?: PlatformRole }>('users').findOne({ id: userId }, { projection: { platformRole: 1 } });
    return user?.platformRole === 'SuperAdmin';
  }

  async canManageOrganization(userId: string, organizationId: string): Promise<boolean> {
    const membership = await requireDb().collection<{ userId: string; organizationId: string; role: string; status: string }>('organization_memberships').findOne({ userId, organizationId, status: 'active' });
    return membership?.role === 'Owner';
  }

  async createProject(actorId: string, organizationId: string, name: string, managerUserId: string): Promise<ProjectRecord | null> {
    const db = requireDb();
    if (!(await this.canManageOrganization(actorId, organizationId))) return null;
    const manager = await db.collection('organization_memberships').findOne({ organizationId, userId: managerUserId, status: 'active', role: { $in: ['Owner', 'User'] } });
    if (!manager) return null;
    const now = new Date().toISOString();
    const project: ProjectRecord = {
      id: `project_${crypto.randomUUID()}`,
      organizationId,
      name: name.trim(),
      createdBy: actorId,
      managerUserId,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    await db.collection<ProjectRecord>('projects').insertOne(project);
    await recordAccessAudit('project_created', actorId, organizationId, actorId, project.id);
    return project;
  }

  async canCreateProject(actorId: string, organizationId: string): Promise<boolean> {
    return this.canManageOrganization(actorId, organizationId);
  }

  async transferProjectManager(actorId: string, projectId: string, nextManagerUserId: string): Promise<{ ok: boolean; project?: ProjectRecord; reason?: string }> {
    const db = requireDb();
    const project = await db.collection<ProjectRecord>('projects').findOne({ id: projectId, status: 'active' });
    if (!project || !(await this.canManageOrganization(actorId, project.organizationId))) return { ok: false, reason: 'Project management permission is required.' };
    const internal = await db.collection('organization_memberships').findOne({ organizationId: project.organizationId, userId: nextManagerUserId, status: 'active', role: { $in: ['Owner', 'User'] } });
    if (!internal) return { ok: false, reason: 'The replacement must be an active organization user.' };
    const updatedAt = new Date().toISOString();
    const result = await db.collection<ProjectRecord>('projects').updateOne({ id: projectId, managerUserId: project.managerUserId }, { $set: { managerUserId: nextManagerUserId, updatedAt } });
    if (!result.modifiedCount) return { ok: false, reason: 'Project manager transfer was not applied.' };
    await recordAccessAudit('project_manager_transferred', actorId, project.organizationId, nextManagerUserId, projectId, { previousManagerUserId: project.managerUserId });
    return { ok: true, project: { ...project, managerUserId: nextManagerUserId, updatedAt } };
  }

  async addOrganizationUser(actorId: string, projectId: string, userId: string): Promise<ProjectMembership | null> {
    return this.addInternalProjectMember(actorId, projectId, userId, 'OrganizationUser');
  }

  async removeOrganizationUser(actorId: string, projectId: string, userId: string): Promise<boolean> {
    const db = requireDb();
    const project = await db.collection<ProjectRecord>('projects').findOne({ id: projectId, status: 'active' });
    if (!project || project.managerUserId === userId || !(await this.canManageOrganization(actorId, project.organizationId))) return false;
    const result = await db.collection('project_memberships').updateOne({ projectId, userId, role: { $in: ['OrganizationUser', 'ExecutionMember'] }, status: 'active' }, { $set: { status: 'revoked', updatedAt: new Date().toISOString() } });
    if (result.modifiedCount) await recordAccessAudit('organization_user_removed', actorId, project.organizationId, userId, projectId);
    return result.modifiedCount > 0;
  }

  async removeCustomerClerk(actorId: string, projectId: string, userId: string): Promise<boolean> {
    const db = requireDb();
    const project = await db.collection<ProjectRecord>('projects').findOne({ id: projectId, status: 'active' });
    if (!project) return false;
    const lead = await db.collection('project_memberships').findOne({ projectId, userId: actorId, role: { $in: ['Stakeholder', 'ReceivingLead'] }, status: 'active' });
    if (!lead || userId === actorId) return false;
    const result = await db.collection('project_memberships').updateOne({ projectId, userId, role: { $in: ['CustomerClerk', 'ReceivingMember'] }, status: 'active' }, { $set: { status: 'revoked', updatedAt: new Date().toISOString() } });
    if (result.modifiedCount) await recordAccessAudit('customer_clerk_removed', actorId, project.organizationId, userId, projectId);
    return result.modifiedCount > 0;
  }

  async appointStakeholder(actorId: string, projectId: string, userId: string): Promise<ProjectMembership | null> {
    const db = requireDb();
    const project = await db.collection<ProjectRecord>('projects').findOne({ id: projectId, status: 'active' });
    if (!project || !(await this.canManageOrganization(actorId, project.organizationId))) return null;
    if (await db.collection('organization_memberships').findOne({ organizationId: project.organizationId, userId, status: 'active' })) return null;
    const now = new Date().toISOString();
    await db.collection('project_memberships').updateOne({ projectId, userId, role: { $in: ['CustomerClerk', 'ReceivingMember'] }, status: 'active' }, { $set: { status: 'revoked', updatedAt: now } });
    const membership: ProjectMembership = { id: `project_member_${crypto.randomUUID()}`, projectId, organizationId: project.organizationId, userId, role: 'Stakeholder', status: 'active', assignedBy: actorId, createdAt: now, updatedAt: now };
    await db.collection<ProjectMembership>('project_memberships').updateOne({ projectId, userId, role: 'Stakeholder' }, { $set: { ...membership, status: 'active', updatedAt: now }, $setOnInsert: membership }, { upsert: true });
    // Establish the replacement before revoking the former stakeholder.
    await db.collection('project_memberships').updateMany({ projectId, role: { $in: ['Stakeholder', 'ReceivingLead'] }, userId: { $ne: userId }, status: 'active' }, { $set: { status: 'revoked', updatedAt: now } });
    await recordAccessAudit('stakeholder_appointed', actorId, project.organizationId, userId, projectId);
    return (await db.collection<ProjectMembership>('project_memberships').findOne({ projectId, userId, role: 'Stakeholder', status: 'active' })) || membership;
  }

  async removeInternalMembership(actorId: string, organizationId: string, userId: string): Promise<{ ok: boolean; reason?: string }> {
    if (!(await this.canManageOrganization(actorId, organizationId))) return { ok: false, reason: 'Organization management permission is required.' };
    const db = requireDb();
    const managed = await db.collection<ProjectRecord>('projects').findOne({ organizationId, managerUserId: userId, status: 'active' });
    if (managed) return { ok: false, reason: 'Reassign the person’s active projects before removing internal membership.' };
    const targetMembership = await db.collection<OrganizationMembership>('organization_memberships').findOne({ organizationId, userId, status: 'active' });
    const now = new Date().toISOString();
    const removed = await db.collection('organization_memberships').updateOne({ organizationId, userId, status: 'active' }, { $set: { status: 'left', leftAt: now, removedBy: actorId } });
    if (!removed.modifiedCount) return { ok: false, reason: 'Active internal membership not found.' };
    await db.collection('project_memberships').updateMany({ organizationId, userId, role: { $in: ['OrganizationUser', 'ExecutionMember'] }, status: 'active' }, { $set: { status: 'revoked', updatedAt: now, revokedBy: actorId } });
    await recordAccessAudit('internal_membership_removed', actorId, organizationId, userId);
    return { ok: true };
  }

  async addCustomerClerk(actorId: string, projectId: string, userId: string): Promise<ProjectMembership | null> {
    const db = requireDb();
    const project = await db.collection<ProjectRecord>('projects').findOne({ id: projectId, status: 'active' });
    if (!project) return null;
    const lead = await db.collection('project_memberships').findOne({ projectId, userId: actorId, role: { $in: ['Stakeholder', 'ReceivingLead'] }, status: 'active' });
    if (!lead) return null;
    if (await db.collection('organization_memberships').findOne({ organizationId: project.organizationId, userId, status: 'active' })) return null;
    const now = new Date().toISOString();
    const membership: ProjectMembership = { id: `project_member_${crypto.randomUUID()}`, projectId, organizationId: project.organizationId, userId, role: 'CustomerClerk', status: 'active', assignedBy: actorId, createdAt: now, updatedAt: now };
    await db.collection<ProjectMembership>('project_memberships').updateOne({ projectId, userId, role: 'CustomerClerk' }, { $set: { ...membership, status: 'active', updatedAt: now }, $setOnInsert: membership }, { upsert: true });
    await recordAccessAudit('customer_clerk_added', actorId, project.organizationId, userId, projectId);
    return (await db.collection<ProjectMembership>('project_memberships').findOne({ projectId, userId, role: 'CustomerClerk', status: 'active' })) || membership;
  }

  async listForUser(userId: string): Promise<ProjectContext[]> {
    const db = requireDb();
    const [managed, memberships] = await Promise.all([
      db.collection<ProjectRecord>('projects').find({ managerUserId: userId, status: 'active' }).toArray(),
      db.collection<ProjectMembership>('project_memberships').find({ userId, status: 'active' }).toArray(),
    ]);
    const projects = new Map<string, ProjectRecord>();
    const ownerMemberships = await db.collection<{ organizationId: string }>('organization_memberships').find({ userId, status: 'active', role: 'Owner' }).project({ _id: 0, organizationId: 1 }).toArray();
    const ownerOrganizationIds = ownerMemberships.map((item) => item.organizationId);
    managed.forEach((project) => projects.set(project.id, project));
    const ids = memberships.map((membership) => membership.projectId);
    if (ids.length) (await db.collection<ProjectRecord>('projects').find({ id: { $in: ids }, status: 'active' }).toArray()).forEach((project) => projects.set(project.id, project));
    const administrativeProjects = await db.collection<ProjectRecord>('projects').find({ organizationId: { $in: ownerOrganizationIds }, status: 'active' }).toArray();
    administrativeProjects.forEach((project) => projects.set(project.id, project));
    return [...projects.values()].map((project) => {
      const membership = memberships.find((item) => item.projectId === project.id && item.status === 'active');
      const isOwner = ownerOrganizationIds.includes(project.organizationId);
      return { project, role: isOwner ? 'Owner' : project.managerUserId === userId ? 'ProjectManager' : normalizeProjectRole(membership?.role) || 'OrganizationUser' };
    });
  }

  async getProjectDetails(userId: string, projectId: string) {
    const db = requireDb();
    const project = await db.collection<ProjectRecord>('projects').findOne({ id: projectId, status: 'active' });
    if (!project) return null;
    const membership = await db.collection<ProjectMembership>('project_memberships').find({ projectId, status: 'active' }).toArray();
    const internalAdmin = await db.collection('organization_memberships').findOne({ organizationId: project.organizationId, userId, status: 'active', role: 'Owner' });
    const administrativeAccess = Boolean(internalAdmin);
    const isManager = project.managerUserId === userId;
    const ownMembership = membership.find((item) => item.userId === userId);
    if (!isManager && !ownMembership && !administrativeAccess) return null;
    const users = await db.collection<{ id: string; name?: string }>('users').find({ id: { $in: membership.map((item) => item.userId).concat(project.managerUserId) } }).project({ _id: 0, id: 1, name: 1 }).toArray();
    const userMap = new Map(users.map((user) => [user.id, user]));
    return {
      project,
      role: internalAdmin ? 'Owner' : isManager ? 'ProjectManager' : normalizeProjectRole(ownMembership?.role) || 'OrganizationUser',
      members: membership.map((item) => ({ ...item, role: normalizeProjectRole(item.role) || item.role, user: userMap.get(item.userId) })),
      manager: userMap.get(project.managerUserId),
    };
  }

  async listInternalCandidates(actorId: string, projectId: string) {
    const db = requireDb();
    const project = await db.collection<ProjectRecord>('projects').findOne({ id: projectId, status: 'active' });
    if (!project || !(await this.canManageOrganization(actorId, project.organizationId))) return [];
    const members = await db.collection('organization_memberships').find({ organizationId: project.organizationId, status: 'active', role: { $in: ['Owner', 'User'] } }).project({ _id: 0, userId: 1, role: 1 }).toArray();
    const users = await db.collection<{ id: string; name?: string }>('users').find({ id: { $in: members.map((item) => item.userId) } }).project({ _id: 0, id: 1, name: 1 }).toArray();
    return users;
  }

  async createProjectInvitation(actorId: string, projectId: string, phoneNumber: string, offeredRole: 'Stakeholder' | 'CustomerClerk'): Promise<OrganizationInvitation | null> {
    const db = requireDb();
    const project = await db.collection<ProjectRecord>('projects').findOne({ id: projectId, status: 'active' });
    if (!project) return null;
    const ownerAllowed = await this.canManageOrganization(actorId, project.organizationId);
    const lead = await db.collection('project_memberships').findOne({ projectId, userId: actorId, role: { $in: ['Stakeholder', 'ReceivingLead'] }, status: 'active' });
    if ((offeredRole === 'Stakeholder' && !ownerAllowed) || (offeredRole === 'CustomerClerk' && !lead)) return null;
    const existingUser = await db.collection<{ id: string; phoneNumber: string }>('users').findOne({ phoneNumber }, { projection: { id: 1 } });
    if (existingUser && await db.collection('organization_memberships').findOne({ organizationId: project.organizationId, userId: existingUser.id, status: 'active' })) return null;
    const existing = await db.collection<OrganizationInvitation>('organization_invitations').findOne({ projectId, phoneNumber, offeredRole, status: 'pending' });
    if (existing) return existing;
    const now = new Date().toISOString();
    const invitation: OrganizationInvitation = {
      id: `inv_${crypto.randomUUID()}`,
      token: crypto.randomBytes(32).toString('hex'),
      organizationId: project.organizationId,
      projectId,
      scopeType: 'project',
      offeredRole,
      invitedBy: actorId,
      phoneNumber,
      role: 'User',
      status: 'pending',
      createdAt: now,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      deliveryStatus: 'Queued',
      deliveryAttempts: [],
      copyCount: 0,
    };
    await db.collection<OrganizationInvitation>('organization_invitations').insertOne(invitation);
    await recordAccessAudit('project_invitation_issued', actorId, project.organizationId, undefined, projectId, { offeredRole });
    return invitation;
  }

  private async getProjectInvitationForActor(actorId: string, projectId: string, token: string) {
    const db = requireDb();
    const invitation = await db.collection<OrganizationInvitation>('organization_invitations').findOne({ projectId, token });
    const project = await db.collection<ProjectRecord>('projects').findOne({ id: projectId, status: 'active' });
    if (!invitation || !project) return null;
    const stakeholder = Boolean(await db.collection('project_memberships').findOne({ projectId, userId: actorId, role: { $in: ['Stakeholder', 'ReceivingLead'] }, status: 'active' }));
    const owner = await this.canManageOrganization(actorId, project.organizationId);
    const invitedRole = normalizeProjectRole(invitation.offeredRole);
    if ((invitedRole === 'Stakeholder' && !owner) || (invitedRole === 'CustomerClerk' && !stakeholder) || !['Stakeholder', 'CustomerClerk'].includes(invitedRole || '')) return null;
    return { invitation, project };
  }

  async listProjectInvitations(actorId: string, projectId: string) {
    const db = requireDb();
    const project = await db.collection<ProjectRecord>('projects').findOne({ id: projectId, status: 'active' });
    if (!project || !(await this.getProjectDetails(actorId, projectId))) return [];
    const stakeholder = Boolean(await db.collection('project_memberships').findOne({ projectId, userId: actorId, role: { $in: ['Stakeholder', 'ReceivingLead'] }, status: 'active' }));
    const owner = await this.canManageOrganization(actorId, project.organizationId);
    if (!stakeholder && !owner) return [];
    await db.collection<OrganizationInvitation>('organization_invitations').updateMany({ projectId, status: 'pending', expiresAt: { $lt: Date.now() } }, { $set: { status: 'expired' } });
    const invitations = await db.collection<OrganizationInvitation>('organization_invitations').find({ projectId }).sort({ createdAt: -1 }).toArray();
    return invitations.map(({ token: _token, phoneNumber, email, ...safe }) => ({
      ...safe,
      phoneNumber: phoneNumber ? `${phoneNumber.slice(0, 4)}****${phoneNumber.slice(-2)}` : undefined,
      email: email ? `${email.slice(0, 2)}***${email.includes('@') ? email.slice(email.indexOf('@')) : ''}` : undefined,
    }));
  }

  async copyProjectInvitation(actorId: string, projectId: string, token: string) {
    const record = await this.getProjectInvitationForActor(actorId, projectId, token);
    if (!record || record.invitation.status !== 'pending' || record.invitation.expiresAt < Date.now()) return null;
    await requireDb().collection<OrganizationInvitation>('organization_invitations').updateOne({ projectId, token, status: 'pending' }, { $inc: { copyCount: 1 }, $push: { deliveryAttempts: { attemptedAt: new Date().toISOString(), channel: 'copy', status: 'Copied' } } });
    await recordAccessAudit('project_invitation_copied', actorId, record.project.organizationId, undefined, projectId);
    return record.invitation.token;
  }

  async reissueProjectInvitation(actorId: string, projectId: string, token: string) {
    const record = await this.getProjectInvitationForActor(actorId, projectId, token);
    if (!record || ['accepted', 'cancelled'].includes(record.invitation.status)) return null;
    const nextToken = crypto.randomBytes(32).toString('hex');
    const now = new Date().toISOString();
    const tokenHash = crypto.createHash('sha256').update(record.invitation.token).digest('hex');
    const updated = { token: nextToken, status: 'pending' as const, createdAt: now, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, tokenHistory: [...(record.invitation.tokenHistory || []), { tokenHash, rotatedAt: now }], deliveryStatus: 'Queued' as const };
    const result = await requireDb().collection<OrganizationInvitation>('organization_invitations').updateOne({ projectId, token, status: record.invitation.status }, { $set: updated });
    if (!result.modifiedCount) return null;
    await recordAccessAudit('project_invitation_reissued', actorId, record.project.organizationId, undefined, projectId);
    return { ...record.invitation, ...updated } as OrganizationInvitation;
  }

  async cancelProjectInvitation(actorId: string, projectId: string, token: string) {
    const record = await this.getProjectInvitationForActor(actorId, projectId, token);
    if (!record || record.invitation.status !== 'pending') return false;
    const result = await requireDb().collection<OrganizationInvitation>('organization_invitations').updateOne({ projectId, token, status: 'pending' }, { $set: { status: 'cancelled' } });
    if (result.modifiedCount) await recordAccessAudit('project_invitation_cancelled', actorId, record.project.organizationId, undefined, projectId);
    return result.modifiedCount > 0;
  }

  async reissueProjectInvitationById(actorId: string, projectId: string, invitationId: string) {
    const invitation = await requireDb().collection<OrganizationInvitation>('organization_invitations').findOne({ id: invitationId, projectId });
    return invitation ? this.reissueProjectInvitation(actorId, projectId, invitation.token) : null;
  }

  async cancelProjectInvitationById(actorId: string, projectId: string, invitationId: string) {
    const invitation = await requireDb().collection<OrganizationInvitation>('organization_invitations').findOne({ id: invitationId, projectId });
    return invitation ? this.cancelProjectInvitation(actorId, projectId, invitation.token) : false;
  }

  async acceptProjectInvitation(userId: string, token: string): Promise<ProjectContext | null> {
    const db = requireDb();
    const invitation = await db.collection<OrganizationInvitation>('organization_invitations').findOne({ token, scopeType: 'project', status: { $in: ['pending', 'processing'] } });
    if (!invitation || !invitation.projectId || !invitation.offeredRole || invitation.expiresAt < Date.now()) return null;
    const user = await db.collection<{ id: string; phoneNumber: string }>('users').findOne({ id: userId });
    if (!user || user.phoneNumber !== invitation.phoneNumber) return null;
    const project = await db.collection<ProjectRecord>('projects').findOne({ id: invitation.projectId, organizationId: invitation.organizationId, status: 'active' });
    if (!project) return null;
    const invitedRole = normalizeProjectRole(invitation.offeredRole);
    if (invitedRole !== 'Stakeholder' && invitedRole !== 'CustomerClerk') return null;
    const issuerStillAuthorized = invitedRole === 'Stakeholder'
      ? await this.canManageOrganization(invitation.invitedBy, project.organizationId)
      : Boolean(await db.collection('project_memberships').findOne({ projectId: project.id, userId: invitation.invitedBy, role: { $in: ['Stakeholder', 'ReceivingLead'] }, status: 'active' }));
    if (!issuerStillAuthorized) return null;
    if (await db.collection('organization_memberships').findOne({ organizationId: project.organizationId, userId, status: 'active' })) return null;
    const now = new Date().toISOString();
    const role = invitedRole;
    if (role === 'Stakeholder') await db.collection('project_memberships').updateOne({ projectId: project.id, userId, role: { $in: ['CustomerClerk', 'ReceivingMember'] }, status: 'active' }, { $set: { status: 'revoked', updatedAt: now } });
    const membership: ProjectMembership = { id: `project_member_${crypto.randomUUID()}`, projectId: project.id, organizationId: project.organizationId, userId, role, status: 'active', assignedBy: invitation.invitedBy, createdAt: now, updatedAt: now };
    await db.collection<ProjectMembership>('project_memberships').updateOne({ projectId: project.id, userId, role }, { $set: { ...membership, status: 'active', updatedAt: now }, $setOnInsert: membership }, { upsert: true });
    if (invitedRole === 'Stakeholder') {
      await db.collection('project_memberships').updateMany({ projectId: project.id, role: { $in: ['Stakeholder', 'ReceivingLead'] }, userId: { $ne: userId }, status: 'active' }, { $set: { status: 'revoked', updatedAt: now } });
    }
    const updated = await db.collection<OrganizationInvitation>('organization_invitations').updateOne({ token, status: { $in: ['pending', 'processing'] } }, { $set: { status: 'accepted', acceptedAt: now, acceptedAccountId: userId } });
    if (!updated.modifiedCount) return null;
    await recordAccessAudit('project_invitation_accepted', userId, project.organizationId, userId, project.id, { role });
    return { project, role };
  }

  private async addInternalProjectMember(actorId: string, projectId: string, userId: string, role: 'OrganizationUser'): Promise<ProjectMembership | null> {
    const db = requireDb();
    const project = await db.collection<ProjectRecord>('projects').findOne({ id: projectId, status: 'active' });
    if (!project || !(await this.canManageOrganization(actorId, project.organizationId))) return null;
    const internal = await db.collection('organization_memberships').findOne({ organizationId: project.organizationId, userId, status: 'active' });
    if (!internal) return null;
    const now = new Date().toISOString();
    const membership: ProjectMembership = { id: `project_member_${crypto.randomUUID()}`, projectId, organizationId: project.organizationId, userId, role, status: 'active', assignedBy: actorId, createdAt: now, updatedAt: now };
    await db.collection<ProjectMembership>('project_memberships').updateOne({ projectId, userId, role }, { $set: { ...membership, status: 'active', updatedAt: now }, $setOnInsert: membership }, { upsert: true });
    await recordAccessAudit('execution_member_added', actorId, project.organizationId, userId, projectId);
    return (await db.collection<ProjectMembership>('project_memberships').findOne({ projectId, userId, role, status: 'active' })) || membership;
  }
}

export const accessService = new AccessService();
