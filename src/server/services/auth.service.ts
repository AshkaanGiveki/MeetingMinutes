import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { logger } from './logger';
import { getDb } from '../db/mongodb';
import { organizationService } from './organization.service';
import { Permission, RolePermissionsMap } from '../policies/rbac';
import { normalizeOrganizationRole } from './organization.service';
import { normalizeIranianPhoneNumber } from '../utils/phone';
import type { PlatformRole } from './access.service';

export interface AuthSession {
  userId: string;
  phoneNumber: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  organizationId: string;
  organizationName?: string;
  permissions?: Permission[];
  signatureData?: string;
  telegramChatId?: string;
  telegramUsername?: string;
  expiresAt: number;
  platformRole?: PlatformRole;
  hasProjectAccess?: boolean;
}

export interface AuthUser {
  id: string;
  phoneNumber: string;
  email: string;
  passwordHash: string;
  name: string;
  avatar?: string;
  telegramChatId?: string;
  telegramUsername?: string;
  activeOrganizationId?: string;
  preferences?: Record<string, unknown>;
  signatureData?: string;
  platformRole?: PlatformRole;
  firstName?: string;
  lastName?: string;
  mobileVerifiedAt?: string;
  accountStatus?: 'provisional' | 'active';
  createdAt?: string;
  updatedAt?: string;
}

export const normalizePhoneNumber = normalizeIranianPhoneNumber;
const effectiveOrganizationPermissions = (role: string, permissions: Permission[] | undefined, platformRole?: PlatformRole): Permission[] => platformRole === 'SuperAdmin' ? [] : role === 'Owner' ? RolePermissionsMap.Owner : role === 'User' ? RolePermissionsMap.User : [];

export class AuthService {
  private requireDb() {
    const db = getDb();
    if (!db) throw new Error('Persistent MongoDB connection is required.');
    return db;
  }

  private async ensureIdentityFields(user: AuthUser): Promise<AuthUser> {
    if (user.firstName && user.lastName) return user;
    const parts = String(user.name || '').trim().split(/\s+/).filter(Boolean);
    const firstName = user.firstName || parts.shift() || 'کاربر';
    const lastName = user.lastName || parts.join(' ') || 'Accord';
    const db = this.requireDb();
    await db.collection<AuthUser>('users').updateOne({ id: user.id }, { $set: { firstName, lastName, name: `${firstName} ${lastName}`.trim(), updatedAt: new Date().toISOString() } });
    return { ...user, firstName, lastName, name: `${firstName} ${lastName}`.trim() };
  }

  async login(identifier: string, passwordPlain: string): Promise<{ sessionToken: string; user: AuthSession } | null> {
    const normalizedIdentifier = identifier.includes('@') ? identifier.trim().toLowerCase() : normalizePhoneNumber(identifier);
    const db = this.requireDb();
    const foundUser = ((await db.collection<AuthUser>('users').findOne(identifier.includes('@') ? { email: normalizedIdentifier } : { phoneNumber: normalizedIdentifier })) || undefined) as AuthUser | undefined;
    const user = foundUser ? await this.ensureIdentityFields(foundUser) : undefined;
    if (!user) {
      logger.warn(`Failed login attempt for identifier: ${identifier}`);
      return null;
    }

    const isValid = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (!isValid) {
      logger.warn(`Invalid password for user identifier: ${identifier}`);
      return null;
    }

    // Keep the user's last selected organization as the source of truth across
    // logout, login, and server restarts. Fall back only when that membership
    // no longer exists or is no longer active.
    const context = (user.activeOrganizationId
      ? await organizationService.getContext(user.id, user.activeOrganizationId)
      : null) || await organizationService.getContext(user.id);
    const hasProjectAccess = Boolean(
      await db.collection('projects').findOne({ managerUserId: user.id, status: 'active' })
      || await db.collection('project_memberships').findOne({ userId: user.id, status: 'active' }),
    );
    if (context && user.activeOrganizationId !== context.organization.id) {
      await db.collection<AuthUser>('users').updateOne(
        { id: user.id },
        { $set: { activeOrganizationId: context.organization.id, updatedAt: new Date().toISOString() } },
      );
    }
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const session: AuthSession = {
      userId: user.id,
      phoneNumber: user.phoneNumber,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: context?.membership.role || 'User',
      organizationId: context?.organization.id || '',
      organizationName: context?.organization.name,
      permissions: effectiveOrganizationPermissions(context?.membership.role || 'User', context?.membership.permissions, user.platformRole),
      signatureData: user.signatureData,
      telegramChatId: user.telegramChatId,
      telegramUsername: user.telegramUsername,
      expiresAt: Date.now() + 7 * 24 * 3600 * 1000, // 7 days
      platformRole: user.platformRole,
      hasProjectAccess,
    };

    await db.collection('sessions').insertOne({ token: sessionToken, ...session, createdAt: new Date() });
    logger.info(`User logged in: ${user.email}`);
    return { sessionToken, user: session };
  }

  async createSessionForUser(userId: string): Promise<{ sessionToken: string; user: AuthSession } | null> {
    const db = this.requireDb();
    const foundUser = await db.collection<AuthUser>('users').findOne({ id: userId });
    const user = foundUser ? await this.ensureIdentityFields(foundUser) : null;
    if (!user) return null;
    const context = (user.activeOrganizationId
      ? await organizationService.getContext(user.id, user.activeOrganizationId)
      : null) || await organizationService.getContext(user.id);
    const hasProjectAccess = Boolean(
      await db.collection('projects').findOne({ managerUserId: user.id, status: 'active' })
      || await db.collection('project_memberships').findOne({ userId: user.id, status: 'active' }),
    );
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const session: AuthSession = {
      userId: user.id,
      phoneNumber: user.phoneNumber,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: context?.membership.role || 'User',
      organizationId: context?.organization.id || '',
      organizationName: context?.organization.name,
      permissions: effectiveOrganizationPermissions(context?.membership.role || 'User', context?.membership.permissions, user.platformRole),
      signatureData: user.signatureData,
      telegramChatId: user.telegramChatId,
      telegramUsername: user.telegramUsername,
      expiresAt: Date.now() + 7 * 24 * 3600 * 1000,
      platformRole: user.platformRole,
      hasProjectAccess,
    };
    await db.collection('sessions').insertOne({ token: sessionToken, ...session, createdAt: new Date() });
    return { sessionToken, user: session };
  }

  async register(email: string, passwordPlain: string, name: string, phoneNumber = '') {
    const userId = `usr_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const normalizedEmail = email.trim().toLowerCase() || `${userId}@local.invalid`;
    const normalizedPhone = normalizePhoneNumber(phoneNumber || email);
    const db = this.requireDb();
    const existing = await db.collection<AuthUser>('users').findOne({ $or: [{ email: normalizedEmail }, { phoneNumber: normalizedPhone }] });
    if (existing) {
      throw new Error('کاربری با این آدرس ایمیل قبلاً ثبت نام نموده است.');
    }

    const passwordHash = await bcrypt.hash(passwordPlain, 10);
    const now = new Date().toISOString();
    const newUser: AuthUser = { id: userId, phoneNumber: normalizedPhone, email: normalizedEmail, passwordHash, name, createdAt: now, updatedAt: now };
    await db.collection<AuthUser>('users').insertOne(newUser);
    logger.info(`New user registered: ${email}`);
    return this.login(normalizedPhone, passwordPlain);
  }

  async createInvitedUser(phoneNumber: string, firstName: string, lastName: string): Promise<AuthUser> {
    const db = this.requireDb();
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const existing = await db.collection<AuthUser>('users').findOne({ phoneNumber: normalizedPhone });
    if (existing) return existing;
    const userId = `usr_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    const email = `invited_${normalizedPhone.replace(/[^0-9]/g, '')}@local.invalid`;
    const user: AuthUser = {
      id: userId,
      phoneNumber: normalizedPhone,
      email,
      passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12),
      name: `${normalizedFirstName} ${normalizedLastName}`.trim(),
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      accountStatus: 'active',
      mobileVerifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await db.collection<AuthUser>('users').insertOne(user);
      return user;
    } catch (error) {
      const raced = await db.collection<AuthUser>('users').findOne({ phoneNumber: normalizedPhone });
      if (raced) return raced;
      throw error;
    }
  }

  async ensureBootstrapOwner(email?: string, password?: string, name = 'Accord Owner', phoneNumber?: string): Promise<void> {
    if (!email || !password || !phoneNumber || process.env.NODE_ENV !== 'production') return;
    const db = getDb();
    if (!db) return;
    const normalizedEmail = email.trim().toLowerCase();
    const exists = await db.collection<AuthUser>('users').findOne({ email: normalizedEmail });
    if (exists) return;
    const user: AuthUser = {
      id: `usr_${crypto.randomUUID()}`,
      phoneNumber: normalizePhoneNumber(phoneNumber),
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(password, 12),
      name,
      platformRole: 'SuperAdmin',
      accountStatus: 'active',
      mobileVerifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.collection<AuthUser>('users').insertOne(user);
    logger.info('Bootstrap Super Admin account created.');
  }

  async verifySessionAsync(sessionToken: string): Promise<AuthSession | null> {
    const db = this.requireDb();
    const session = await db.collection<AuthSession & { token: string }>('sessions').findOne({ token: sessionToken });
    if (!session || session.expiresAt < Date.now()) {
      if (session) await db.collection('sessions').deleteOne({ token: sessionToken });
      return null;
    }

    const { token: _token, _id: _id, ...authSession } = session as AuthSession & { token: string; _id?: unknown };
    const foundUser = await db.collection<AuthUser>('users').findOne({ id: authSession.userId });
    if (!foundUser || foundUser.accountStatus === 'provisional') {
      await db.collection('sessions').deleteOne({ token: sessionToken });
      return null;
    }
    const user = await this.ensureIdentityFields(foundUser);

    // Sessions are rehydrated from current membership state on every request.
    // This makes role removal, organization removal, and project access changes
    // effective immediately instead of waiting for the seven-day session TTL.
    const context = authSession.organizationId
      ? await organizationService.getContext(user.id, authSession.organizationId)
      : null;
    const hasProjectAccess = Boolean(
      await db.collection('projects').findOne({ managerUserId: user.id, status: 'active' })
      || await db.collection('project_memberships').findOne({ userId: user.id, status: 'active' }),
    );
    const normalizedRole = normalizeOrganizationRole(context?.membership.role || 'User');
    const refreshedSession: AuthSession = {
      ...authSession,
      name: user.name,
      phoneNumber: user.phoneNumber,
      email: user.email,
      avatar: user.avatar,
      platformRole: user.platformRole,
      role: normalizedRole,
      organizationId: context?.organization.id || '',
      organizationName: context?.organization.name,
      permissions: effectiveOrganizationPermissions(context?.membership.role || 'User', context?.membership.permissions || RolePermissionsMap[normalizedRole], user.platformRole),
      signatureData: user.signatureData,
      hasProjectAccess,
    };
    await db.collection('sessions').updateOne(
      { token: sessionToken },
      { $set: { ...refreshedSession } },
    );
    return refreshedSession;
  }

  async createInternalSession(userId: string, organizationId: string): Promise<string> {
    const db = this.requireDb();
    const user = await db.collection<AuthUser>('users').findOne({ id: userId });
    const context = await organizationService.getContext(userId, organizationId);
    if (!user || !context) throw new Error('Unable to create an internal document session.');
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const session: AuthSession = {
      userId: user.id,
      phoneNumber: user.phoneNumber,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: context.membership.role,
      organizationId: context.organization.id,
      organizationName: context.organization.name,
      permissions: effectiveOrganizationPermissions(context.membership.role, context.membership.permissions, user.platformRole),
      signatureData: user.signatureData,
      telegramChatId: user.telegramChatId,
      telegramUsername: user.telegramUsername,
      expiresAt: Date.now() + 10 * 60 * 1000,
      platformRole: user.platformRole,
    };
    await db.collection('sessions').insertOne({ token: sessionToken, ...session, createdAt: new Date() });
    return sessionToken;
  }

  async revokeSession(sessionToken: string): Promise<void> {
    await this.requireDb().collection('sessions').deleteOne({ token: sessionToken });
  }

  async switchOrganization(sessionToken: string, userId: string, organizationId: string): Promise<AuthSession | null> {
    const context = await organizationService.getContext(userId, organizationId);
    if (!context) return null;
    const db = this.requireDb();
    const user = await db.collection<AuthUser>('users').findOne({ id: userId });
    if (!user) return null;
    const session: AuthSession = {
      userId,
      phoneNumber: user.phoneNumber,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: context.membership.role,
      organizationId: context.organization.id,
      organizationName: context.organization.name,
      permissions: effectiveOrganizationPermissions(context.membership.role, context.membership.permissions, user.platformRole),
      signatureData: user.signatureData,
      telegramChatId: user.telegramChatId,
      telegramUsername: user.telegramUsername,
      expiresAt: Date.now() + 7 * 24 * 3600 * 1000,
      platformRole: user.platformRole,
    };
    // Persist the choice on the user, not just in one browser session.
    await db.collection<AuthUser>('users').updateOne(
      { id: userId },
      { $set: { activeOrganizationId: context.organization.id, updatedAt: new Date().toISOString() } },
    );
    // Keep other active sessions consistent with the same account-level choice.
    await db.collection('sessions').updateMany(
      { userId, token: { $ne: sessionToken }, expiresAt: { $gt: Date.now() } },
      { $set: { organizationId: context.organization.id, organizationName: context.organization.name, role: context.membership.role, permissions: effectiveOrganizationPermissions(context.membership.role, context.membership.permissions, user.platformRole) } },
    );
    await db.collection('sessions').updateOne({ token: sessionToken, userId }, { $set: session });
    return session;
  }

  async resetPasswordAsync(email: string, newPasswordPlain: string): Promise<boolean> {
    const normalizedEmail = email.trim().toLowerCase();
    const db = this.requireDb();
    const user = (await db.collection<AuthUser>('users').findOne({ email: normalizedEmail })) as AuthUser | null;
    if (!user) return false;
    const passwordHash = await bcrypt.hash(newPasswordPlain, 10);
    await db.collection('users').updateOne(
      { id: user.id },
      { $set: { passwordHash, updatedAt: new Date().toISOString() } },
    );
    await this.logoutAll(user.id);
    return true;
  }

  /** @deprecated Use resetPasswordAsync; synchronous local password mutation was removed with the in-memory user store. */
  resetPassword(_email: string, _newPasswordPlain: string): boolean {
    return false;
  }

  async resetPasswordByPhoneAsync(phoneNumber: string, newPasswordPlain: string): Promise<boolean> {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const db = this.requireDb();
    const user = await db.collection<AuthUser>('users').findOne({ phoneNumber: normalizedPhone });
    if (!user) return false;
    const passwordHash = await bcrypt.hash(newPasswordPlain, 10);
    await db.collection('users').updateOne({ id: user.id }, { $set: { passwordHash, updatedAt: new Date().toISOString() } });
    await this.logoutAll(user.id);
    return true;
  }

  logout(sessionToken: string): void {
    const db = getDb();
    if (db) void db.collection('sessions').deleteOne({ token: sessionToken });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.requireDb().collection('sessions').deleteMany({ userId });
  }

  async getPreferences(userId: string): Promise<Record<string, unknown>> {
    const user = await this.requireDb().collection<AuthUser>('users').findOne({ id: userId }, { projection: { preferences: 1 } });
    return user?.preferences || {};
  }

  async updatePreferences(userId: string, preferences: Record<string, unknown>): Promise<void> {
    await this.requireDb().collection<AuthUser>('users').updateOne({ id: userId }, { $set: { preferences, updatedAt: new Date().toISOString() } });
  }

  async updateProfile(userId: string, firstName: string, lastName: string): Promise<boolean> {
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    if (normalizedFirstName.length < 1 || normalizedFirstName.length > 60 || normalizedLastName.length < 1 || normalizedLastName.length > 60) return false;
    const normalizedName = `${normalizedFirstName} ${normalizedLastName}`.trim();
    const db = this.requireDb();
    const result = await db.collection<AuthUser>('users').updateOne({ id: userId }, { $set: { name: normalizedName, firstName: normalizedFirstName, lastName: normalizedLastName, updatedAt: new Date().toISOString() } });
    if (!result.matchedCount) return false;
    await db.collection('sessions').updateMany({ userId }, { $set: { name: normalizedName } });
    await db.collection('access_audit_logs').insertOne({ id: `audit_${crypto.randomUUID()}`, action: 'profile_updated', actorId: userId, targetUserId: userId, createdAt: new Date().toISOString() });
    return true;
  }

  async updateAvatar(userId: string, avatar?: string): Promise<boolean> {
    if (avatar && (!avatar.startsWith('data:image/') || avatar.length > 3_500_000)) return false;
    const db = this.requireDb();
    const result = await db.collection<AuthUser>('users').updateOne(
      { id: userId },
      avatar ? { $set: { avatar, updatedAt: new Date().toISOString() } } : { $unset: { avatar: '' }, $set: { updatedAt: new Date().toISOString() } },
    );
    if (!result.matchedCount) return false;
    await db.collection('sessions').updateMany({ userId }, avatar ? { $set: { avatar } } : { $unset: { avatar: '' } });
    return true;
  }

  async saveSignature(userId: string, signatureData: string, allowReplace = false): Promise<boolean> {
    if (!signatureData || signatureData.length > 5_000_000) return false;
    const db = this.requireDb();
    const result = await db.collection<AuthUser>('users').updateOne(
      allowReplace ? { id: userId } : { id: userId, $or: [{ signatureData: { $exists: false } }, { signatureData: '' }] },
      { $set: { signatureData, updatedAt: new Date().toISOString() } },
    );
    if (result.modifiedCount > 0) {
      await db.collection('sessions').updateMany({ userId }, { $set: { signatureData } });
    }
    return result.modifiedCount > 0;
  }

  async listUsers(organizationId = 'org_main') {
    return organizationService.listMembers(organizationId);
  }

  async listUsersPage(organizationId: string, offset = 0, limit = 10, search = '', includeRevoked = false) {
    return organizationService.listMembersPage(organizationId, offset, limit, search, includeRevoked);
  }

  async removeUser(userId: string, organizationId = 'org_main', actorId?: string): Promise<boolean> {
    if (actorId) {
      const result = await organizationService.removeMember(actorId, organizationId, userId);
      if (!result.ok) return false;
      await this.logoutAll(userId);
      return true;
    }
    const result = await this.requireDb().collection('organization_memberships').updateOne({ userId, organizationId, status: 'active' }, { $set: { status: 'left' } });
    await this.logoutAll(userId);
    return result.modifiedCount > 0;
  }

  async updateUserRole(userId: string, organizationId: string, role: string, actorId?: string): Promise<boolean> {
    const updated = actorId
      ? await organizationService.updateMembershipAs(actorId, organizationId, userId, role as any)
      : await organizationService.updateMembership(organizationId, userId, role as any);
    return updated;
  }

  async linkTelegramChat(userId: string, organizationId: string, chatId: string, username?: string): Promise<boolean> {
    void organizationId;
    const db = this.requireDb();
    const result = await db.collection<AuthUser>('users').updateOne(
      { id: userId },
      { $set: { telegramChatId: chatId, ...(username ? { telegramUsername: username } : {}), updatedAt: new Date().toISOString() } },
    );
    if (result.matchedCount > 0) {
      await db.collection('sessions').updateMany({ userId }, { $set: { telegramChatId: chatId, ...(username ? { telegramUsername: username } : {}) } });
    }
    return result.matchedCount > 0;
  }

  async unlinkTelegramChat(userId: string, organizationId: string): Promise<boolean> {
    void organizationId;
    const db = this.requireDb();
    const result = await db.collection<AuthUser>('users').updateOne({ id: userId }, { $unset: { telegramChatId: '', telegramUsername: '' } });
    if (result.matchedCount > 0) await db.collection('sessions').updateMany({ userId }, { $unset: { telegramChatId: '', telegramUsername: '' } });
    return result.matchedCount > 0;
  }

  async findByTelegramChat(chatId: string): Promise<AuthUser | null> {
    return (await this.requireDb().collection<AuthUser>('users').findOne({ telegramChatId: chatId })) as AuthUser | null;
  }

  async findById(userId: string, organizationId?: string): Promise<AuthUser | null> {
    void organizationId;
    return await this.requireDb().collection<AuthUser>('users').findOne({ id: userId });
  }

  async createGuestSigningToken(meetingId: string, email: string): Promise<string> {
    const token = crypto.randomBytes(24).toString('hex');
    await this.requireDb().collection('guest_signing_tokens').insertOne({
      token,
      meetingId,
      email,
      expiresAt: Date.now() + 48 * 3600 * 1000, // 48 hours
    });
    return token;
  }

  async verifyGuestSigningToken(token: string) {
    const guest = await this.requireDb().collection('guest_signing_tokens').findOne({ token });
    if (!guest || guest.expiresAt < Date.now()) {
      if (guest) await this.requireDb().collection('guest_signing_tokens').deleteOne({ token });
      return null;
    }
    const { _id, ...safeGuest } = guest;
    return safeGuest;
  }
}

export const authService = new AuthService();
