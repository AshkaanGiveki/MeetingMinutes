import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { logger } from './logger';
import { getDb } from '../db/mongodb';

export interface AuthSession {
  userId: string;
  phoneNumber: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
  expiresAt: number;
}

export interface AuthUser {
  id: string;
  phoneNumber: string;
  email: string;
  passwordHash: string;
  name: string;
  role: string;
  organizationId: string;
  telegramChatId?: string;
  preferences?: Record<string, unknown>;
}

export interface MemberInvitation {
  token: string;
  phoneNumber: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
  invitedBy: string;
  expiresAt: number;
}

export function normalizePhoneNumber(phone: string): string {
  const compact = phone.trim().replace(/[\s()-]/g, '');
  const normalized = compact.startsWith('00') ? `+${compact.slice(2)}` : compact;
  if (!/^\+?[1-9]\d{7,14}$/.test(normalized)) throw new Error('A valid international phone number is required.');
  return normalized;
}

export class AuthService {
  private requireDb() {
    const db = getDb();
    if (!db) throw new Error('Persistent MongoDB connection is required.');
    return db;
  }

  async login(identifier: string, passwordPlain: string): Promise<{ sessionToken: string; user: AuthSession } | null> {
    const normalizedIdentifier = identifier.includes('@') ? identifier.trim().toLowerCase() : normalizePhoneNumber(identifier);
    const db = this.requireDb();
    const user = ((await db.collection<AuthUser>('users').findOne(identifier.includes('@') ? { email: normalizedIdentifier } : { phoneNumber: normalizedIdentifier })) || undefined) as AuthUser | undefined;
    if (!user) {
      logger.warn(`Failed login attempt for identifier: ${identifier}`);
      return null;
    }

    const isValid = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (!isValid) {
      logger.warn(`Invalid password for user identifier: ${identifier}`);
      return null;
    }

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const session: AuthSession = {
      userId: user.id,
      phoneNumber: user.phoneNumber,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId || 'org_main',
      expiresAt: Date.now() + 7 * 24 * 3600 * 1000, // 7 days
    };

    await db.collection('sessions').insertOne({ token: sessionToken, ...session, createdAt: new Date() });
    logger.info(`User logged in: ${user.email}`);
    return { sessionToken, user: session };
  }

  async register(email: string, passwordPlain: string, name: string, role: string = 'Participant', organizationId = 'org_main', phoneNumber = '') {
    const userId = `usr_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const normalizedEmail = email.trim().toLowerCase() || `${userId}@local.invalid`;
    const normalizedPhone = normalizePhoneNumber(phoneNumber || email);
    const db = this.requireDb();
    const existing = await db.collection<AuthUser>('users').findOne({ $or: [{ email: normalizedEmail }, { phoneNumber: normalizedPhone }] });
    if (existing) {
      throw new Error('کاربری با این آدرس ایمیل قبلاً ثبت نام نموده است.');
    }

    const passwordHash = await bcrypt.hash(passwordPlain, 10);
    const newUser: AuthUser = { id: userId, phoneNumber: normalizedPhone, email: normalizedEmail, passwordHash, name, role, organizationId };
    await db.collection<AuthUser>('users').insertOne(newUser);

    logger.info(`New user registered: ${email}`);
    return this.login(normalizedPhone, passwordPlain);
  }

  async ensureBootstrapOwner(email?: string, password?: string, name = 'MetaMeet Owner', phoneNumber?: string): Promise<void> {
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
      role: 'Owner',
      organizationId: 'org_main',
    };
    await db.collection<AuthUser>('users').insertOne(user);
    logger.info('Bootstrap owner account created.');
  }

  async verifySessionAsync(sessionToken: string): Promise<AuthSession | null> {
    const db = this.requireDb();
    const session = await db.collection<AuthSession & { token: string }>('sessions').findOne({ token: sessionToken });
    if (!session || session.expiresAt < Date.now()) {
      if (session) await db.collection('sessions').deleteOne({ token: sessionToken });
      return null;
    }

    const { token: _token, _id: _id, ...authSession } = session as AuthSession & { token: string; _id?: unknown };
    return authSession;
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

  async updateProfile(userId: string, name: string, phoneNumber?: string): Promise<boolean> {
    const normalizedName = name.trim();
    if (normalizedName.length < 2 || normalizedName.length > 120) return false;
    const normalizedPhone = phoneNumber ? normalizePhoneNumber(phoneNumber) : undefined;
    const db = this.requireDb();
    if (normalizedPhone && await db.collection<AuthUser>('users').findOne({ phoneNumber: normalizedPhone, id: { $ne: userId } })) return false;
    const result = await db.collection<AuthUser>('users').updateOne({ id: userId }, { $set: { name: normalizedName, ...(normalizedPhone ? { phoneNumber: normalizedPhone } : {}), updatedAt: new Date().toISOString() } });
    if (!result.matchedCount) return false;
    await db.collection('sessions').updateMany({ userId }, { $set: { name: normalizedName, ...(normalizedPhone ? { phoneNumber: normalizedPhone } : {}) } });
    return true;
  }

  async listUsers(organizationId = 'org_main'): Promise<Array<Pick<AuthUser, 'id' | 'phoneNumber' | 'email' | 'name' | 'role' | 'organizationId'>>> {
    const db = this.requireDb();
    return db.collection<AuthUser>('users').find({ organizationId }, { projection: { passwordHash: 0 } }).map((user) => ({
        id: user.id,
        phoneNumber: user.phoneNumber,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
    })).toArray();
  }

  async removeUser(userId: string, organizationId = 'org_main'): Promise<boolean> {
    const result = await this.requireDb().collection<AuthUser>('users').deleteOne({ id: userId, organizationId });
    await this.logoutAll(userId);
    return result.deletedCount > 0;
  }

  async updateUserRole(userId: string, organizationId: string, role: string): Promise<boolean> {
    const db = this.requireDb();
    const result = await db.collection<AuthUser>('users').updateOne({ id: userId, organizationId }, { $set: { role, updatedAt: new Date().toISOString() } });
    if (!result.matchedCount) return false;
    await db.collection('sessions').updateMany({ userId }, { $set: { role } });
    return true;
  }

  async updateUserPhone(userId: string, organizationId: string, phoneNumber: string): Promise<boolean> {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const db = this.requireDb();
    const duplicate = await db.collection<AuthUser>('users').findOne({ phoneNumber: normalizedPhone, id: { $ne: userId } });
    if (duplicate) return false;
    const result = await db.collection<AuthUser>('users').updateOne({ id: userId, organizationId }, { $set: { phoneNumber: normalizedPhone, updatedAt: new Date().toISOString() } });
    return result.matchedCount > 0;
  }

  async linkTelegramChat(userId: string, organizationId: string, chatId: string): Promise<boolean> {
    const result = await this.requireDb().collection<AuthUser>('users').updateOne({ id: userId, organizationId }, { $set: { telegramChatId: chatId, updatedAt: new Date().toISOString() } });
    return result.matchedCount > 0;
  }

  async unlinkTelegramChat(userId: string, organizationId: string): Promise<boolean> {
    const result = await this.requireDb().collection<AuthUser>('users').updateOne({ id: userId, organizationId }, { $unset: { telegramChatId: '' } });
    return result.matchedCount > 0;
  }

  async findByTelegramChat(chatId: string): Promise<AuthUser | null> {
    return (await this.requireDb().collection<AuthUser>('users').findOne({ telegramChatId: chatId })) as AuthUser | null;
  }

  async findById(userId: string, organizationId?: string): Promise<AuthUser | null> {
    return await this.requireDb().collection<AuthUser>('users').findOne({ id: userId, ...(organizationId ? { organizationId } : {}) });
  }

  async createMemberInvitation(email: string, name: string, role: string, invitedBy: string, organizationId = 'org_main', phoneNumber = ''): Promise<MemberInvitation> {
    const invitation: MemberInvitation = {
      token: crypto.randomBytes(32).toString('hex'),
      phoneNumber: normalizePhoneNumber(phoneNumber),
      email: email.trim().toLowerCase(),
      name: name.trim(),
      role,
      organizationId,
      invitedBy,
      expiresAt: Date.now() + 7 * 24 * 3600 * 1000,
    };
    await this.requireDb().collection<MemberInvitation>('member_invitations').insertOne(invitation);
    return invitation;
  }

  async acceptMemberInvitation(token: string, password: string): Promise<{ sessionToken: string; user: AuthSession } | null> {
    const db = this.requireDb();
    const invitation = await db.collection<MemberInvitation>('member_invitations').findOne({ token });
    if (!invitation || invitation.expiresAt < Date.now()) return null;
    const result = await this.register(invitation.email, password, invitation.name, invitation.role, invitation.organizationId, invitation.phoneNumber);
    await db.collection('member_invitations').deleteOne({ token });
    return result;
  }

  async cancelMemberInvitation(token: string, organizationId: string): Promise<boolean> {
    const result = await this.requireDb().collection<MemberInvitation>('member_invitations').deleteOne({ token, organizationId });
    return result.deletedCount > 0;
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
