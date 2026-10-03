import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { logger } from './logger';

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
  expiresAt: number;
}

export class AuthService {
  private sessions = new Map<string, AuthSession>();
  private guestTokens = new Map<string, { meetingId: string; email: string; expiresAt: number }>();
  private users = new Map<string, { id: string; email: string; passwordHash: string; name: string; role: string }>();

  constructor() {
    // Seed default executive user
    const defaultHash = bcrypt.hashSync('MetaMeet@2028', 10);
    this.users.set('usr_arash', {
      id: 'usr_arash',
      email: 'arash.fathi@metameet.ir',
      name: 'آرش فتحی',
      role: 'Owner',
      passwordHash: defaultHash,
    });
  }

  async login(email: string, passwordPlain: string): Promise<{ sessionToken: string; user: AuthSession } | null> {
    const user = Array.from(this.users.values()).find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      logger.warn(`Failed login attempt for unknown email: ${email}`);
      return null;
    }

    const isValid = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (!isValid) {
      logger.warn(`Invalid password for user: ${email}`);
      return null;
    }

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const session: AuthSession = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: 'org_main',
      expiresAt: Date.now() + 7 * 24 * 3600 * 1000, // 7 days
    };

    this.sessions.set(sessionToken, session);
    logger.info(`User logged in: ${user.email}`);
    return { sessionToken, user: session };
  }

  async register(email: string, passwordPlain: string, name: string, role: string = 'Participant') {
    const existing = Array.from(this.users.values()).find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new Error('کاربری با این آدرس ایمیل قبلاً ثبت نام نموده است.');
    }

    const passwordHash = await bcrypt.hash(passwordPlain, 10);
    const userId = `usr_${Date.now()}`;
    const newUser = { id: userId, email, passwordHash, name, role };
    this.users.set(userId, newUser);

    logger.info(`New user registered: ${email}`);
    return this.login(email, passwordPlain);
  }

  verifySession(sessionToken: string): AuthSession | null {
    const session = this.sessions.get(sessionToken);
    if (!session) return null;
    if (session.expiresAt < Date.now()) {
      this.sessions.delete(sessionToken);
      return null;
    }
    return session;
  }

  resetPassword(email: string, newPasswordPlain: string): boolean {
    const user = Array.from(this.users.values()).find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return false;
    const newHash = bcrypt.hashSync(newPasswordPlain, 10);
    user.passwordHash = newHash;
    this.users.set(user.id, user);
    logger.info(`Password reset successfully for user: ${email}`);
    return true;
  }

  logout(sessionToken: string): void {
    this.sessions.delete(sessionToken);
  }

  createGuestSigningToken(meetingId: string, email: string): string {
    const token = crypto.randomBytes(24).toString('hex');
    this.guestTokens.set(token, {
      meetingId,
      email,
      expiresAt: Date.now() + 48 * 3600 * 1000, // 48 hours
    });
    return token;
  }

  verifyGuestSigningToken(token: string) {
    const guest = this.guestTokens.get(token);
    if (!guest || guest.expiresAt < Date.now()) {
      return null;
    }
    return guest;
  }
}

export const authService = new AuthService();
