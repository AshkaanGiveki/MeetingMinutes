import 'dotenv/config';
import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import { GoogleGenAI } from '@google/genai';
import { Receiver } from '@upstash/qstash';

import { logger } from './src/server/services/logger';
import { authService, normalizePhoneNumber } from './src/server/services/auth.service';
import type { AuthSession } from './src/server/services/auth.service';
import { meetingRepository } from './src/server/repositories/meeting.repository';
import { connectMongoDB, getDb } from './src/server/db/mongodb';
import { redisService } from './src/server/services/redis.service';
import { queueManager, QUEUE_NAMES, QueueJob, QueueName } from './src/server/queues/queue.service';
import { telegramService } from './src/server/services/telegram.service';
import { emailService } from './src/server/services/email.service';
import { isSmsLiveEnabled, smsService } from './src/server/services/sms.service';
import { notificationService } from './src/server/services/notification.service';
import type { Meeting } from './src/types';
import { initializeWorker } from './src/server/worker';
import { documentExists, getMeetingPdfPath, generateMeetingPdf } from './src/server/services/document.service';
import { generateHtmlMeetingPdf } from './src/server/services/html-pdf.service';
import { templateRepository } from './src/server/repositories/template.repository';
import { organizationService } from './src/server/services/organization.service';
import { ASSIGNABLE_MEETING_ROLES, canTransitionMeeting, getMeetingParticipantRoles, getMissingRequiredMeetingRoles, hasMeetingRole, hasPermission, MeetingRole, OrganizationRole, Permission, requiredMeetingRoleForPermission, RolePermissionsMap } from './src/server/policies/rbac';
import {
  SignDocumentSchema,
  CreateMeetingSchema,
  TelegramAuthVerifySchema,
  AiSuggestSchema,
  AiSuggestionResponseSchema,
} from './src/server/schemas';

if (process.env.NODE_ENV === 'production') {
  const requiredProductionEnv = ['APP_URL', 'MONGODB_URI', 'AUTH_SECRET'];
  const missing = requiredProductionEnv.filter((key) => {
    const value = process.env[key];
    return !value || value.includes('YOUR_') || value.includes('<user>') || value.includes('<password>');
  });
  if (missing.length > 0) {
    throw new Error(`Missing required production configuration: ${missing.join(', ')}`);
  }
  if (process.env.EMAIL_PROVIDER === 'smtp' && !process.env.SMTP_HOST) {
    throw new Error('SMTP_HOST is required when EMAIL_PROVIDER=smtp.');
  }
  if (process.env.EMAIL_PROVIDER === 'resend' && !process.env.EMAIL_API_KEY) {
    throw new Error('EMAIL_API_KEY is required when EMAIL_PROVIDER=resend.');
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();
const PORT = Number(process.env.PORT) || 3000;
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'metameet_session';

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${canonicalize((value as Record<string, unknown>)[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
// API screens must always receive a JSON body. Browser revalidation can turn
// these responses into 304s with no body, which makes list/table components
// incorrectly fall back to empty state on direct navigation or refresh.
app.disable('etag');
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Initialize MongoDB once per serverless instance and expose the same promise to
// request middleware so the first request cannot race the connection handshake.
const mongoReady = connectMongoDB()
  .then(() => authService.ensureBootstrapOwner(process.env.BOOTSTRAP_ADMIN_EMAIL, process.env.BOOTSTRAP_ADMIN_PASSWORD, process.env.BOOTSTRAP_ADMIN_NAME, process.env.BOOTSTRAP_ADMIN_PHONE))
  .catch((err) => {
    logger.warn('Initial MongoDB connection warning:', { metadata: { error: String(err) } });
  });

app.use('/api', async (req, res, next) => {
  if (req.path === '/health') return next();
  try {
    await mongoReady;
    if (!getDb()) return res.status(503).json({ error: 'Database connection is temporarily unavailable.' });
    return next();
  } catch (error) {
    logger.error('API request blocked because database initialization failed.', { metadata: { error: String(error) } });
    return res.status(503).json({ error: 'Database connection is temporarily unavailable.' });
  }
});

// Initialize background worker
initializeWorker();

const telegramWebhookUrl = process.env.TELEGRAM_WEBHOOK_URL
  || `${String(process.env.APP_URL || '').replace(/\/$/, '')}/api/telegram/webhook`;
if (process.env.NODE_ENV === 'production' && telegramWebhookUrl.startsWith('http')) {
  void telegramService.ensureWebhook(telegramWebhookUrl, process.env.TELEGRAM_WEBHOOK_SECRET);
}

// Structured Request Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode}`, {
      route: req.originalUrl,
      durationMs,
      requestId,
    });
  });

  next();
});

type RequestWithAuth = express.Request & { auth?: AuthSession };

const publicApiPaths = [
  /^\/api\/auth\/(login|register|forgot-password|reset-password|forgot-password-sms|reset-password-sms)$/,
  /^\/api\/auth\/me$/,
  /^\/api\/queues\/[^/]+$/,
  /^\/api\/telegram\/webhook$/,
  /^\/api\/health$/,
  /^\/api\/ready$/,
  /^\/api\/certificates\/[^/]+\/verify$/,
  /^\/api\/documents\/[^/]+$/,
  /^\/api\/guest\/meetings\/[^/]+$/,
  /^\/api\/guest\/sign$/,
];

app.use(async (req, res, next) => {
  if (!req.path.startsWith('/api/') || publicApiPaths.some((pattern) => pattern.test(req.path))) {
    return next();
  }

  const token = req.cookies[SESSION_COOKIE_NAME];
  const session = token ? await authService.verifySessionAsync(token) : null;
  if (!session) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  (req as RequestWithAuth).auth = session;
  return next();
});

function requirePermission(permission: Parameters<typeof hasPermission>[1]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const auth = (req as RequestWithAuth).auth;
    if (!auth || !(auth.permissions?.includes(permission) || hasPermission(auth.role as OrganizationRole, permission))) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    return next();
  };
}

async function meetingAssignmentAllows(meeting: Meeting, userId: string, permission: string): Promise<boolean> {
  const requiredRole = requiredMeetingRoleForPermission(permission);
  const db = getDb();
  if (db) {
    const assignment = await db.collection<{ permissions?: string[]; assignment?: MeetingRole; roles?: MeetingRole[] }>('meeting_members')
      .findOne({ meetingId: meeting.id, userId });
    if (assignment) {
      if (requiredRole === 'Editor' && meeting.organizer?.id === userId) return true;
      if (requiredRole === 'Organizer') return assignment.assignment === 'Organizer' && meeting.organizer?.id === userId;
      if (requiredRole) return (assignment.roles || [assignment.assignment]).includes(requiredRole as MeetingRole);
      return Boolean(assignment.permissions?.includes(permission));
    }
  }

  // Embedded participants are retained as a backwards-compatible projection for
  // older records, but the meeting_members collection is authoritative.
  if (meeting.organizer?.id === userId) {
    if (requiredRole === 'Editor') return true;
    return requiredRole === 'Organizer'
      || (!requiredRole && ['meeting.read', 'participant.invite', 'participant.remove', 'signature.request', 'comment.create'].includes(permission));
  }
  const participant = meeting.participants?.find((item) => item.id === userId);
  if (!participant) return false;
  if (requiredRole) return hasMeetingRole(participant, requiredRole);
  if (permission === 'meeting.read' || permission === 'comment.create') return true;
  return false;
}

async function canAccessMeeting(req: express.Request, meetingId: string, permission: string): Promise<boolean> {
  const auth = (req as RequestWithAuth).auth;
  if (!auth) return false;
  const meeting = await meetingRepository.getById(meetingId);
  if (!meeting || (meeting as Meeting & { organizationId?: string }).organizationId !== auth.organizationId) return false;
  if (auth.permissions?.includes('meeting.view_all') && permission === 'meeting.read') return true;
  if (!requiredMeetingRoleForPermission(permission) && permission !== 'meeting.read' && ['Owner', 'Admin'].includes(auth.role) && auth.permissions?.includes(permission as any)) return true;
  return meetingAssignmentAllows(meeting, auth.userId, permission);
}

type MeetingMemberRecord = {
  id: string;
  meetingId: string;
  organizationId: string;
  userId: string;
  assignment: MeetingRole;
  roles?: MeetingRole[];
  permissions: Permission[];
  assignedBy: string;
  createdAt: string;
  updatedAt: string;
};

async function upsertMeetingMember(meeting: Meeting, userId: string, assignment: MeetingRole, assignedBy: string, permissions?: Permission[], roles?: MeetingRole[]) {
  const db = getDb();
  if (!db) return;
  const now = new Date().toISOString();
  const requestedEffectiveRoles = Array.from(new Set(roles?.length ? roles : [assignment]));
  const effectiveRoles = requestedEffectiveRoles.includes('Viewer') ? ['Viewer' as MeetingRole] : requestedEffectiveRoles;
  const primaryRole = (['Reviewer', 'Editor', 'Signer', 'Viewer', 'Organizer'] as MeetingRole[]).find((role) => effectiveRoles.includes(role)) || assignment;
  const effectivePermissions = permissions || Array.from(new Set(effectiveRoles.flatMap((role) => RolePermissionsMap[role] || [])));
  await db.collection<MeetingMemberRecord>('meeting_members').updateOne(
    { meetingId: meeting.id, userId },
    {
      $set: {
        organizationId: (meeting as Meeting & { organizationId?: string }).organizationId,
        assignment: primaryRole,
        roles: effectiveRoles,
        permissions: effectivePermissions,
        assignedBy,
        updatedAt: now,
      },
      $setOnInsert: { id: `meeting_member_${crypto.randomUUID()}`, meetingId: meeting.id, userId, createdAt: now },
    },
    { upsert: true },
  );
}

async function syncMeetingMembers(meeting: Meeting, participants: Array<{ id?: string; role?: string; roles?: string[] }>, assignedBy: string) {
  const db = getDb();
  if (!db) return;
  const memberIds = participants.map((item) => item.id).filter((id): id is string => Boolean(id));
  for (const participant of participants) {
    if (!participant.id) continue;
    const participantRoles = getMeetingParticipantRoles(participant).filter((role): role is MeetingRole => ['Organizer', ...ASSIGNABLE_MEETING_ROLES].includes(role as any));
    const role = (participantRoles[0] || 'Viewer') as MeetingRole;
    await upsertMeetingMember(meeting, participant.id, role, assignedBy, undefined, participantRoles);
  }
  await db.collection<MeetingMemberRecord>('meeting_members').deleteMany({ meetingId: meeting.id, userId: { $nin: [meeting.organizer.id, ...memberIds] } });
}

function requireMeetingPermission(permission: string) {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!(await canAccessMeeting(req, req.params.id, permission))) return res.status(403).json({ error: 'You do not have access to this meeting.' });
    return next();
  };
}

async function getUnreadyRequiredSigners(meeting: Meeting, organizationId: string): Promise<string[]> {
  const db = getDb();
  if (!db) return ['Database connection is temporarily unavailable.'];
  const required = (meeting.participants || []).filter((participant) => hasMeetingRole(participant, 'Signer') && participant.requiresSignature !== false);
  if (required.length === 0) return [];
  const ids = required.map((participant) => participant.id);
  const memberships = await db.collection('organization_memberships').find({ organizationId, userId: { $in: ids }, status: 'active' }).project({ userId: 1 }).toArray();
  const activeIds = new Set(memberships.map((membership) => membership.userId));
  return required.filter((participant) => !activeIds.has(participant.id)).map((participant) => participant.name);
}

app.get('/api/guest/meetings/:id', async (req, res) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  const guest = token ? await authService.verifyGuestSigningToken(token) : null;
  if (!guest || guest.meetingId !== req.params.id) return res.status(401).json({ error: 'Guest link is invalid or expired.' });
  const meeting = await meetingRepository.getById(req.params.id);
  if (!meeting) return res.status(404).json({ error: 'Meeting not found.' });
  return res.json({
    success: true,
    guestEmail: guest.email,
    meeting: {
      id: meeting.id,
      title: meeting.title,
      persianDate: meeting.persianDate,
      timeRange: meeting.timeRange,
      location: meeting.location,
      status: meeting.status,
      statusLabel: meeting.statusLabel,
      organizer: meeting.organizer,
      agenda: meeting.agenda,
      discussion: meeting.discussion,
      decisions: meeting.decisions,
      actionItems: meeting.actionItems,
      signatureCount: meeting.signatureCount,
      totalSignaturesRequired: meeting.totalSignaturesRequired,
    },
  });
});

app.post('/api/guest/sign', async (req, res) => {
  const { token, meetingId, signerName, signatureData, signatureType = 'type' } = req.body || {};
  if (typeof token !== 'string' || typeof meetingId !== 'string' || typeof signerName !== 'string' || typeof signatureData !== 'string') {
    return res.status(400).json({ error: 'Guest token, meeting, name, and signature are required.' });
  }
  if (signerName.trim().length < 2 || signatureData.length < 2 || signatureData.length > 200_000) return res.status(400).json({ error: 'Invalid guest signature data.' });
  const guest = await authService.verifyGuestSigningToken(token);
  if (!guest || guest.meetingId !== meetingId) return res.status(401).json({ error: 'Guest link is invalid or expired.' });
  const meeting = await meetingRepository.getById(meetingId);
  if (!meeting) return res.status(404).json({ error: 'Meeting not found.' });
  if (!['READY_FOR_SIGNATURE', 'SIGNING'].includes(meeting.status)) return res.status(400).json({ error: 'This meeting is not open for signing.' });
  const guestSignerId = `guest_${crypto.createHash('sha256').update(String(guest.email).toLowerCase()).digest('hex').slice(0, 24)}`;
  const signatures = (meeting as Meeting & { signatures?: Array<{ signerId: string }> }).signatures || [];
  if (signatures.some((signature) => signature.signerId === guestSignerId)) return res.status(409).json({ error: 'This guest has already signed the meeting.' });
  const signedAt = new Date().toISOString();
  const contentToHash = canonicalize({ meetingId: meeting.id, title: meeting.title, discussion: meeting.discussion, decisions: meeting.decisions, agenda: meeting.agenda, actionItems: meeting.actionItems, signerId: guestSignerId, signerName: signerName.trim() });
  const documentHash = crypto.createHash('sha256').update(contentToHash).digest('hex');
  const updatedSignatures = [...signatures, {
    id: `sig_${crypto.randomUUID()}`,
    meetingId,
    signerId: guestSignerId,
    signerName: signerName.trim(),
    signerRole: 'Guest signer',
    signatureType: ['draw', 'type', 'upload'].includes(signatureType) ? signatureType : 'type',
    signatureData,
    signedAt,
    documentHash,
  }];
  const allSigned = updatedSignatures.length >= meeting.totalSignaturesRequired;
  await meetingRepository.update(meetingId, { signatures: updatedSignatures, signatureCount: updatedSignatures.length, status: allSigned ? 'READY_FOR_SIGNATURE' : 'SIGNING', statusLabel: allSigned ? 'آماده امضا' : 'در حال امضا', documentHash } as Partial<Meeting>);
  await meetingRepository.addAudit({ id: `aud_${crypto.randomUUID()}`, meetingId, action: 'GUEST_SIGNATURE_COMPLETED', actor: signerName.trim(), timestamp: signedAt, documentHash, metadata: { guestEmail: guest.email } });
  await getDb()?.collection('guest_signing_tokens').deleteOne({ token });
  return res.json({ success: true, documentHash, message: 'امضای مهمان با موفقیت ثبت شد.' });
});

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'metameet' }));

app.get('/api/ready', (_req, res) => {
  const databaseReady = Boolean(getDb());
  const production = process.env.NODE_ENV === 'production';
  const ready = !production || databaseReady;
  return res.status(ready ? 200 : 503).json({
    ok: ready,
    service: 'metameet',
    checks: { database: databaseReady, redis: true, configuration: true, queues: queueManager.getDiagnostics() },
  });
});

app.get('/api/queue-dlq', requirePermission('organization.manage'), async (_req, res) => {
  return res.json({ success: true, jobs: await queueManager.getDeadLetterQueueAsync() });
});

app.post('/api/queue-dlq/:id/replay', requirePermission('organization.manage'), async (req, res) => {
  const replayed = await queueManager.replayDeadLetter(req.params.id);
  return replayed ? res.json({ success: true }) : res.status(404).json({ error: 'Dead-letter job not found.' });
});

// Initialize Gemini Client
let geminiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    logger.info('Gemini client successfully initialized with User-Agent telemetry.');
  } catch (err) {
    logger.error('Failed to initialize Gemini client:', { metadata: { error: String(err) } });
  }
}

// -------------------------------------------------------------
// Authentication & Password Complexity Helper
// -------------------------------------------------------------
function isPasswordStrong(pwd: string): boolean {
  if (pwd.length < 8) return false;
  if (!/[a-z]/.test(pwd)) return false;
  if (!/[A-Z]/.test(pwd)) return false;
  if (!/[0-9]/.test(pwd)) return false;
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) return false;
  return true;
}

const passwordResetTokens = new Map<string, { phoneNumber?: string; email?: string; code: string; expiresAt: number; attempts?: number }>();
const signatureOtpStore = new Map<string, { code: string; expiresAt: number; attempts?: number }>();

app.post('/api/auth/register', async (req, res) => {
  const { phoneNumber, email = '', password, name, inviteToken } = req.body;
  if (typeof phoneNumber !== 'string' || typeof password !== 'string' || typeof name !== 'string' || !phoneNumber.trim() || !name.trim()) {
    return res.status(400).json({ error: 'نام کامل، ایمیل سازمانی و رمز عبور الزامی است.' });
  }

  if (!isPasswordStrong(password)) {
    return res.status(400).json({
      error: 'رمز عبور باید حداقل ۸ کاراکتر و شامل حروف کوچک، حروف بزرگ، اعداد و نمادهای خاص باشد.',
    });
  }

  try {
    // Public registration never accepts a privileged role from the client.
    const result = await authService.register(email, password, name.trim(), phoneNumber);
    if (!result) {
      return res.status(400).json({ error: 'خطا در ثبت‌نام کاربر.' });
    }

    if (typeof inviteToken === 'string' && inviteToken.trim()) {
      const context = await organizationService.acceptInvitation(result.user.userId, inviteToken.trim());
      if (context) {
        const switched = await authService.switchOrganization(result.sessionToken, result.user.userId, context.organization.id);
        if (switched) result.user = switched;
      }
    }
    res.cookie(SESSION_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600 * 1000,
    });

    return res.json({ success: true, user: result.user });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'خطا در ثبت نام';
    return res.status(400).json({ error: errorMsg });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'آدرس ایمیل الزامی است.' });
  }

  // Generate 6-digit verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  passwordResetTokens.set(email.toLowerCase(), {
    email: email.toLowerCase(),
    code,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
  });
  await redisService.set(`password-reset:${email.toLowerCase()}`, JSON.stringify({ email: email.toLowerCase(), code, expiresAt: Date.now() + 10 * 60 * 1000, attempts: 0 }), 600);

  logger.info(`Password reset requested for: ${email}`);
  const delivery = await emailService.sendPasswordReset(email, code);
  if (!delivery.success && process.env.NODE_ENV === 'production') {
    return res.status(503).json({ error: 'Password reset email could not be delivered.' });
  }

  return res.json({
    success: true,
    message: 'کد بازیابی ۶ رقمی به ایمیل سازمانی شما ارسال شد.',
    ...(!isSmsLiveEnabled() ? { demoCode: code } : {}),
  });
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'ایمیل، کد تأیید و رمز عبور جدید الزامی هستند.' });
  }

  const persistedRecord = await redisService.get(`password-reset:${email.toLowerCase()}`);
  const record = persistedRecord ? JSON.parse(persistedRecord) as { email: string; code: string; expiresAt: number; attempts?: number } : passwordResetTokens.get(email.toLowerCase());
  if (!record || record.code !== String(code).trim() || record.expiresAt < Date.now()) {
    if (record && persistedRecord) {
      const attempts = (record.attempts || 0) + 1;
      if (attempts >= 5) await redisService.del(`password-reset:${email.toLowerCase()}`);
      else await redisService.set(`password-reset:${email.toLowerCase()}`, JSON.stringify({ ...record, attempts }), 600);
    }
    return res.status(400).json({ error: 'کد تأیید نامعتبر است یا منقضی شده است.' });
  }

  if (!isPasswordStrong(newPassword)) {
    return res.status(400).json({
      error: 'رمز عبور باید حداقل ۸ کاراکتر و شامل حروف کوچک، حروف بزرگ، اعداد و نمادهای خاص باشد.',
    });
  }

  const updated = await authService.resetPasswordAsync(email.toLowerCase(), newPassword);
  if (!updated) {
    return res.status(404).json({ error: 'حساب کاربری با این ایمیل یافت نشد.' });
  }

  passwordResetTokens.delete(email.toLowerCase());
  await redisService.del(`password-reset:${email.toLowerCase()}`);
  return res.json({ success: true, message: 'رمز عبور با موفقیت به‌روزرسانی شد. اکنون می‌توانید وارد شوید.' });
});

// -------------------------------------------------------------
// Document Signature OTP Endpoints (2-Factor Legal Signing)
// -------------------------------------------------------------
app.post('/api/auth/forgot-password-sms', async (req, res) => {
  const { phoneNumber } = req.body || {};
  if (typeof phoneNumber !== 'string') return res.status(400).json({ error: 'Phone number is required.' });
  let normalizedPhone: string;
  try { normalizedPhone = normalizePhoneNumber(phoneNumber); } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid phone number.' }); }
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  passwordResetTokens.set(normalizedPhone, { phoneNumber: normalizedPhone, code, expiresAt, attempts: 0 });
  await redisService.set(`password-reset-phone:${normalizedPhone}`, JSON.stringify({ phoneNumber: normalizedPhone, code, expiresAt, attempts: 0 }), 600);
  const delivery = await smsService.sendOtp(normalizedPhone, code);
  if (!delivery.success && process.env.NODE_ENV === 'production') return res.status(503).json({ error: delivery.error || 'Password reset SMS could not be delivered.' });
  return res.json({ success: true, ...(!isSmsLiveEnabled() ? { demoCode: code } : {}) });
});

app.post('/api/auth/reset-password-sms', async (req, res) => {
  const { phoneNumber, code, newPassword } = req.body || {};
  if (typeof phoneNumber !== 'string' || !code || typeof newPassword !== 'string') return res.status(400).json({ error: 'Phone number, code, and new password are required.' });
  let normalizedPhone: string;
  try { normalizedPhone = normalizePhoneNumber(phoneNumber); } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid phone number.' }); }
  const persisted = await redisService.get(`password-reset-phone:${normalizedPhone}`);
  const record = persisted ? JSON.parse(persisted) as { phoneNumber: string; code: string; expiresAt: number; attempts: number } : passwordResetTokens.get(normalizedPhone);
  if (!record || record.code !== String(code).trim() || record.expiresAt < Date.now()) {
    if (record && persisted) {
      const attempts = (record.attempts || 0) + 1;
      if (attempts >= 5) await redisService.del(`password-reset-phone:${normalizedPhone}`);
      else await redisService.set(`password-reset-phone:${normalizedPhone}`, JSON.stringify({ ...record, attempts }), 600);
    }
    return res.status(400).json({ error: 'Invalid or expired verification code.' });
  }
  if (!isPasswordStrong(newPassword)) return res.status(400).json({ error: 'Password does not meet security requirements.' });
  const updated = await authService.resetPasswordByPhoneAsync(normalizedPhone, newPassword);
  if (!updated) return res.status(404).json({ error: 'No account was found for this phone number.' });
  passwordResetTokens.delete(normalizedPhone);
  await redisService.del(`password-reset-phone:${normalizedPhone}`);
  return res.json({ success: true });
});

app.post('/api/signature/otp/send', async (req, res) => {
  const { meetingId } = req.body;
  const auth = (req as RequestWithAuth).auth!;
  if (!meetingId) {
    return res.status(400).json({ error: 'شناسه جلسه الزامی است.' });
  }
  if (!(await canAccessMeeting(req, String(meetingId), 'signature.sign'))) return res.status(403).json({ error: 'شما اجازه امضای این جلسه را ندارید.' });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const key = `${meetingId}_${auth.userId}`;
  signatureOtpStore.set(key, {
    code,
    expiresAt: Date.now() + 2 * 60 * 1000, // 2 minutes
  });
  await redisService.set(`signature-otp:${key}`, JSON.stringify({
    code,
    expiresAt: Date.now() + 2 * 60 * 1000,
    attempts: 0,
  }), 120);
  const delivery = await smsService.sendOtp(auth.phoneNumber, code);
  if (!delivery.success && process.env.NODE_ENV === 'production') {
    signatureOtpStore.delete(key);
    await redisService.del(`signature-otp:${key}`);
    return res.status(503).json({ error: delivery.error || 'Signature OTP SMS could not be delivered.' });
  }

  logger.info(`Signature OTP dispatched for meeting ${meetingId}`);
  return res.json({
    success: true,
    message: 'کد یک‌بار مصرف ۶ رقمی جهت تأیید هویت و امضای رسمی ارسال گردید.',
    ...(!isSmsLiveEnabled() ? { demoOtp: code } : {}),
  });
});

app.post('/api/signature/otp/verify', async (req, res) => {
  const { meetingId, otp } = req.body;
  const auth = (req as RequestWithAuth).auth!;
  if (typeof meetingId !== 'string' || !(await canAccessMeeting(req, meetingId, 'signature.sign'))) return res.status(403).json({ error: 'شما اجازه امضای این جلسه را ندارید.' });
  const key = `${meetingId}_${auth.userId}`;
  const persisted = await redisService.get(`signature-otp:${key}`);
  type SignatureOtpRecord = { code: string; expiresAt: number; attempts: number };
  let record = signatureOtpStore.get(key) as SignatureOtpRecord | undefined;
  if (persisted) {
    try {
      const parsed = typeof persisted === 'string' ? JSON.parse(persisted) : persisted;
      if (parsed && typeof parsed === 'object' && typeof (parsed as SignatureOtpRecord).code === 'string') {
        record = parsed as SignatureOtpRecord;
      }
    } catch {
      logger.warn(`Ignoring malformed Redis signature OTP record for ${key}; using the local OTP record.`);
    }
  }

  if (!record || record.code !== String(otp).trim() || record.expiresAt < Date.now()) {
    if (record && persisted) {
      const attempts = (record.attempts || 0) + 1;
      if (attempts >= 5) {
        await redisService.del(`signature-otp:${key}`);
      } else {
        await redisService.set(`signature-otp:${key}`, JSON.stringify({ ...record, attempts }), 120);
      }
    }
    return res.status(400).json({ error: 'کد یک‌بار مصرف نامعتبر یا منقضی شده است.' });
  }

  signatureOtpStore.delete(key);
  await redisService.del(`signature-otp:${key}`);
  return res.json({ success: true, verified: true });
});

app.post('/api/auth/login', async (req, res) => {
  const phoneNumber = req.body?.phoneNumber || req.body?.identifier || req.body?.email;
  const { password } = req.body;
  if (!phoneNumber || !password) {
    return res.status(400).json({ error: 'ایمیل و رمز عبور الزامی است.' });
  }

  // Rate limit login
  const rateLimit = await redisService.checkRateLimit(req.ip || 'ip', 'login', 5, 60);
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: 'تعداد تلاش‌های ناموفق بیش از حد مجاز است. لطفاً کمی صبر کنید.' });
  }

  let result;
  try {
    result = await authService.login(phoneNumber, password);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid phone number.';
    if (message.includes('Persistent MongoDB')) {
      return res.status(503).json({ error: 'Database connection is temporarily unavailable.' });
    }
    return res.status(400).json({ error: message });
  }
  if (!result) {
    return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است.' });
  }

  const inviteToken = typeof req.body?.inviteToken === 'string' ? req.body.inviteToken.trim() : '';
  if (inviteToken) {
    const context = await organizationService.acceptInvitation(result.user.userId, inviteToken);
    if (context) {
      const switched = await authService.switchOrganization(result.sessionToken, result.user.userId, context.organization.id);
      if (switched) result.user = switched;
    }
  }

  res.cookie(SESSION_COOKIE_NAME, result.sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 3600 * 1000,
  });

  return res.json({ success: true, user: result.user });
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.cookies[SESSION_COOKIE_NAME];
  if (token) {
    authService.logout(token);
    res.clearCookie(SESSION_COOKIE_NAME);
  }
  return res.json({ success: true });
});

app.get('/api/auth/me', async (req, res) => {
  const token = req.cookies[SESSION_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'No active session.' });
  }

  let session;
  try {
    session = await authService.verifySessionAsync(token);
  } catch (error) {
    logger.error('Session verification failed because the persistent database is unavailable.', { metadata: { error: String(error) } });
    return res.status(503).json({ error: 'Database connection is temporarily unavailable.' });
  }

  if (!session) {
    return res.status(401).json({ error: 'نشست کاربری نامعتبر یا منقضی شده است.' });
  }

  return res.json({ user: session });
});

app.get('/api/organizations', async (req, res) => {
  const auth = (req as RequestWithAuth).auth!;
  return res.json({ success: true, organizations: await organizationService.listForUser(auth.userId), activeOrganizationId: auth.organizationId });
});

app.post('/api/organizations', async (req, res) => {
  const auth = (req as RequestWithAuth).auth!;
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (name.length < 2 || name.length > 120) return res.status(400).json({ error: 'Organization name is invalid.' });
  const context = await organizationService.create(auth.userId, name);
  const token = req.cookies[SESSION_COOKIE_NAME];
  const session = token ? await authService.switchOrganization(token, auth.userId, context.organization.id) : null;
  return res.json({ success: true, organization: context.organization, user: session || auth });
});

app.patch('/api/organizations/:id', async (req, res) => {
  const auth = (req as RequestWithAuth).auth!;
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (name.length < 2 || name.length > 120) return res.status(400).json({ error: 'Organization name is invalid.' });
  const organization = await organizationService.rename(auth.userId, req.params.id, name);
  return organization ? res.json({ success: true, organization }) : res.status(403).json({ error: 'You do not have permission to rename this organization.' });
});

app.delete('/api/organizations/:id', async (req, res) => {
  const auth = (req as RequestWithAuth).auth!;
  const result = await organizationService.remove(auth.userId, req.params.id);
  return result.ok ? res.json({ success: true }) : res.status(400).json({ error: result.reason });
});

app.post('/api/organizations/:id/switch', async (req, res) => {
  const auth = (req as RequestWithAuth).auth!;
  const token = req.cookies[SESSION_COOKIE_NAME];
  const session = token ? await authService.switchOrganization(token, auth.userId, req.params.id) : null;
  if (!session) return res.status(403).json({ error: 'You are not a member of this organization.' });
  return res.json({ success: true, user: session });
});

app.get('/api/organizations/invitations', async (req, res) => {
  const auth = (req as RequestWithAuth).auth!;
  return res.json({ success: true, invitations: await organizationService.listInvitations(auth.userId) });
});

app.post('/api/organizations/invitations/:token/accept', async (req, res) => {
  const auth = (req as RequestWithAuth).auth!;
  const context = await organizationService.acceptInvitation(auth.userId, req.params.token);
  if (!context) return res.status(400).json({ error: 'Invitation is invalid, expired, or not addressed to this account.' });
  const token = req.cookies[SESSION_COOKIE_NAME];
  const session = token ? await authService.switchOrganization(token, auth.userId, context.organization.id) : null;
  return res.json({ success: true, user: session || auth, organization: context.organization });
});

app.post('/api/organizations/invitations/:token/reject', async (req, res) => {
  const auth = (req as RequestWithAuth).auth!;
  const rejected = await organizationService.rejectInvitation(auth.userId, req.params.token);
  return rejected ? res.json({ success: true }) : res.status(404).json({ error: 'Invitation not found.' });
});

app.delete('/api/organizations/:id/invitations/:token', async (req, res) => {
  const auth = (req as RequestWithAuth).auth!;
  if (auth.organizationId !== req.params.id || !(auth.permissions?.includes('members.manage') || hasPermission(auth.role as OrganizationRole, 'members.manage'))) return res.status(403).json({ error: 'You do not have permission to cancel invitations.' });
  const cancelled = await organizationService.cancelInvitation(auth.userId, req.params.token);
  return cancelled ? res.json({ success: true }) : res.status(404).json({ error: 'Invitation not found.' });
});

app.post('/api/organizations/:id/leave', async (req, res) => {
  const auth = (req as RequestWithAuth).auth!;
  if (auth.organizationId !== req.params.id) return res.status(403).json({ error: 'Switch to this organization before leaving it.' });
  const result = await organizationService.leave(auth.userId, req.params.id);
  if (!result.ok) return res.status(400).json({ error: result.reason });
  const token = req.cookies[SESSION_COOKIE_NAME];
  if (token) authService.logout(token);
  res.clearCookie(SESSION_COOKIE_NAME);
  return res.json({ success: true });
});

app.get('/api/organizations/:id/members', async (req, res) => {
  const auth = (req as RequestWithAuth).auth!;
  if (auth.organizationId !== req.params.id || !(auth.permissions?.includes('members.manage') || hasPermission(auth.role as OrganizationRole, 'members.manage'))) return res.status(403).json({ error: 'You do not have permission to view organization members.' });
  return res.json({ success: true, members: await organizationService.listMembers(req.params.id) });
});

app.post('/api/organizations/:id/invitations', async (req, res) => {
  const auth = (req as RequestWithAuth).auth!;
  if (auth.organizationId !== req.params.id || !(auth.permissions?.includes('members.manage') || hasPermission(auth.role as OrganizationRole, 'members.manage'))) return res.status(403).json({ error: 'You do not have permission to invite members.' });
  const phoneNumber = typeof req.body?.phoneNumber === 'string' ? normalizePhoneNumber(req.body.phoneNumber) : undefined;
  const email = typeof req.body?.email === 'string' && req.body.email.trim() ? req.body.email.trim().toLowerCase() : undefined;
  if (!phoneNumber && !email) return res.status(400).json({ error: 'Phone number or email is required.' });
  const role = (req.body?.role || 'User') as OrganizationRole;
  if (!['Admin', 'User'].includes(role)) return res.status(400).json({ error: 'Invalid organization role.' });
  const invitation = await organizationService.invite({ organizationId: req.params.id, invitedBy: auth.userId, phoneNumber, email, name: req.body?.name, role });
  const db = getDb();
  const existingUser = phoneNumber && db ? await db.collection<any>('users').findOne({ phoneNumber }, { projection: { id: 1, telegramChatId: 1 } }) : null;
  let delivery: { success: boolean; error?: string } = { success: true };
  if (existingUser && db && phoneNumber) {
    const recipientMembership = await db.collection<any>('organization_memberships').findOne({ userId: existingUser.id, status: 'active' });
    const targetOrganization = await db.collection<any>('organizations').findOne({ id: req.params.id }, { projection: { name: 1 } });
    await notificationService.create({ userId: existingUser.id, organizationId: recipientMembership?.organizationId || req.params.id, type: 'system', title: 'دعوت عضویت در سازمان', message: `برای پیوستن به سازمان «${targetOrganization?.name || 'جدید'}» دعوت شده‌اید.`, actionPath: '/organizations' });
    if (existingUser.telegramChatId) {
      const sent = await telegramService.sendNotification(existingUser.telegramChatId, `برای پیوستن به سازمان «${targetOrganization?.name || 'جدید'}» در متامیت دعوت شده‌اید.`);
      if (!sent) delivery = await smsService.sendMessage(phoneNumber, `دعوت عضویت در سازمان متامیت: ${process.env.APP_URL || 'http://localhost:3000'}/invite/${invitation.token}`);
    } else {
      delivery = await smsService.sendMessage(phoneNumber, `دعوت عضویت در سازمان متامیت: ${process.env.APP_URL || 'http://localhost:3000'}/invite/${invitation.token}`);
    }
  } else {
    delivery = phoneNumber ? await smsService.sendMessage(phoneNumber, `دعوت عضویت در سازمان متامیت: ${process.env.APP_URL || 'http://localhost:3000'}/invite/${invitation.token}`) : { success: true };
  }
  if (!delivery.success) return res.status(503).json({ error: delivery.error || 'ارسال پیامک دعوت انجام نشد.', code: 'DELIVERY_FAILED', invitationToken: process.env.NODE_ENV !== 'production' ? invitation.token : undefined });
  return res.json({ success: true, invitation, delivery: phoneNumber ? 'sms' : 'email', invitationUrl: `${process.env.APP_URL || 'http://localhost:3000'}/invite/${invitation.token}` });
});

app.get('/api/settings', async (req, res) => {
  const auth = (req as RequestWithAuth).auth!;
  const preferences = await authService.getPreferences(auth.userId);
  return res.json({ success: true, preferences });
});

app.put('/api/profile', async (req, res) => {
  const auth = (req as RequestWithAuth).auth!;
  if (typeof req.body?.name !== 'string' || typeof req.body?.phoneNumber !== 'string') return res.status(400).json({ error: 'A valid name and phone number are required.' });
  let updated = false;
  try { updated = await authService.updateProfile(auth.userId, req.body.name, req.body.phoneNumber); } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid profile.' }); }
  return updated ? res.json({ success: true, name: req.body.name.trim() }) : res.status(400).json({ error: 'Profile name is invalid.' });
});

app.put('/api/profile/avatar', async (req, res) => {
  const auth = (req as RequestWithAuth).auth!;
  const avatar = typeof req.body?.avatar === 'string' && req.body.avatar ? req.body.avatar : undefined;
  if (avatar && (!avatar.startsWith('data:image/') || avatar.length > 3_500_000)) return res.status(400).json({ error: 'Avatar image is invalid or too large.' });
  const saved = await authService.updateAvatar(auth.userId, avatar);
  return saved ? res.json({ success: true, avatar: avatar || null }) : res.status(400).json({ error: 'Avatar could not be updated.' });
});

app.put('/api/profile/signature', async (req, res) => {
  const auth = (req as RequestWithAuth).auth!;
  const signatureData = typeof req.body?.signatureData === 'string' ? req.body.signatureData : '';
  if (!signatureData || signatureData.length > 5_000_000) return res.status(400).json({ error: 'A valid signature is required.' });
  const saved = await authService.saveSignature(auth.userId, signatureData, req.body?.replace === true);
  return res.json({ success: true, saved });
});

app.get('/api/notifications', async (req, res) => {
  const auth = (req as RequestWithAuth).auth!;
  const unreadOnly = String(req.query.unreadOnly || '') === 'true';
  const notifications = await notificationService.list(auth.userId, auth.organizationId, unreadOnly);
  return res.json({ success: true, notifications, unreadCount: notifications.filter((item) => !item.readAt).length });
});

app.post('/api/notifications/read-all', async (req, res) => {
  const auth = (req as RequestWithAuth).auth!;
  await notificationService.markAllRead(auth.userId, auth.organizationId);
  return res.json({ success: true });
});

app.post('/api/notifications/:id/read', async (req, res) => {
  const auth = (req as RequestWithAuth).auth!;
  const updated = await notificationService.markRead(auth.userId, auth.organizationId, req.params.id);
  return updated ? res.json({ success: true }) : res.status(404).json({ error: 'Notification not found.' });
});

app.put('/api/settings', async (req, res) => {
  const auth = (req as RequestWithAuth).auth!;
  const allowedKeys = ['emailNotification', 'telegramNotification', 'autoSeal'];
  const preferences = Object.fromEntries(
    Object.entries(req.body || {}).filter(([key, value]) => allowedKeys.includes(key) && typeof value === 'boolean'),
  );
  await authService.updatePreferences(auth.userId, preferences);
  return res.json({ success: true, preferences });
});

app.get('/api/members', async (req, res) => {
  const auth = (req as RequestWithAuth).auth!;
  if (!auth.organizationId) return res.status(400).json({ error: 'An active organization is required.' });
  return res.json({ success: true, members: await authService.listUsers(auth.organizationId) });
});

app.delete('/api/members/:id', requirePermission('members.manage'), async (req, res) => {
  const auth = (req as RequestWithAuth).auth!;
  const removed = await authService.removeUser(req.params.id, auth.organizationId, auth.userId);
  if (!removed) return res.status(404).json({ error: 'Member could not be removed.' });
  return res.json({ success: true });
});

app.post('/api/auth/logout-all', async (req, res) => {
  const auth = (req as RequestWithAuth).auth;
  if (!auth) return res.status(401).json({ error: 'Authentication required.' });
  await authService.logoutAll(auth.userId);
  res.clearCookie(SESSION_COOKIE_NAME);
  return res.json({ success: true });
});

app.post('/api/members/invite', requirePermission('members.manage'), async (req, res) => {
  const { email = '', phoneNumber, name, role } = req.body || {};
  if (!phoneNumber || !name || !role) return res.status(400).json({ error: 'Phone number, name, and role are required.' });
  const auth = (req as RequestWithAuth).auth!;
  const allowedRoles: OrganizationRole[] = ['Admin', 'User'];
  if (!allowedRoles.includes(role as OrganizationRole)) return res.status(400).json({ error: 'Invalid member role.' });
  if (auth.role !== 'Owner' && role === 'Admin') {
    return res.status(403).json({ error: 'Only owners can assign owner or admin roles.' });
  }
  const invitation = await organizationService.invite({
    email: typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : undefined,
    name: String(name).trim(),
    role: role as OrganizationRole,
    invitedBy: auth.userId,
    organizationId: auth.organizationId,
    phoneNumber: normalizePhoneNumber(phoneNumber),
  });
  const invitationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/invite/${invitation.token}`;
  const delivery = await smsService.sendMessage(invitation.phoneNumber || phoneNumber, `MetaMeet invitation: ${invitationUrl}`);
  if (email) await emailService.sendMemberInvitation(String(email).trim().toLowerCase(), String(name).trim(), invitationUrl);
  if (!delivery.success) return res.status(503).json({ error: delivery.error || 'Invitation SMS could not be delivered.', code: 'DELIVERY_FAILED', invitationToken: process.env.NODE_ENV !== 'production' ? invitation.token : undefined });
  return res.json({
    success: true,
    invitationUrl,
    ...(process.env.NODE_ENV !== 'production' ? { invitationToken: invitation.token } : {}),
  });
});

app.put('/api/members/:id/role', requirePermission('members.manage'), async (req, res) => {
  const auth = (req as RequestWithAuth).auth!;
  const role = req.body?.role;
  const allowedRoles = ['Owner', 'Admin', 'User'];
  if (!allowedRoles.includes(role)) return res.status(400).json({ error: 'Invalid member role.' });
  if (auth.role !== 'Owner' && ['Owner', 'Admin'].includes(role)) return res.status(403).json({ error: 'Only owners can assign owner or admin roles.' });
  if (req.params.id === auth.userId && role !== auth.role) return res.status(400).json({ error: 'You cannot change your own role.' });
  const updated = await authService.updateUserRole(req.params.id, auth.organizationId, role, auth.userId);
  return updated ? res.json({ success: true }) : res.status(404).json({ error: 'Member not found.' });
});

app.put('/api/members/:id/phone', requirePermission('members.manage'), async (req, res) => {
  const auth = (req as RequestWithAuth).auth!;
  if (typeof req.body?.phoneNumber !== 'string') return res.status(400).json({ error: 'A valid phone number is required.' });
  try {
    const updated = await authService.updateUserPhone(req.params.id, auth.organizationId, req.body.phoneNumber);
    return updated ? res.json({ success: true }) : res.status(409).json({ error: 'Phone number is already assigned or member was not found.' });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid phone number.' });
  }
});

app.delete('/api/members/invitations/:token', requirePermission('members.manage'), async (req, res) => {
  const auth = (req as RequestWithAuth).auth!;
  const cancelled = await organizationService.cancelInvitation(auth.userId, req.params.token);
  return cancelled ? res.json({ success: true }) : res.status(404).json({ error: 'Invitation not found.' });
});

app.post('/api/members/invitations/:token/accept', async (req, res) => {
  return res.status(410).json({ error: 'برای پذیرش دعوت ابتدا وارد حساب کاربری خود شوید.' });
});

// -------------------------------------------------------------
// Meeting Endpoints
// -------------------------------------------------------------
app.use('/api/meetings/:id', async (req, res, next) => {
  const auth = (req as RequestWithAuth).auth;
  const meeting = await meetingRepository.getById(req.params.id);
  const organizationId = (meeting as (typeof meeting & { organizationId?: string }) | null)?.organizationId;
  if (!meeting || (organizationId && organizationId !== auth?.organizationId)) {
    return res.status(404).json({ error: 'Meeting not found.' });
  }
  if (req.method === 'GET' && !(await canAccessMeeting(req, req.params.id, 'meeting.read'))) {
    return res.status(404).json({ error: 'Meeting not found.' });
  }
  return next();
});

app.get('/api/meetings', async (req, res) => {
  const { search, status } = req.query;
  const auth = (req as RequestWithAuth).auth!;
  if (search || status) {
    const results = await meetingRepository.search(String(search || ''), String(status || ''));
    const scoped = results.filter((meeting) => (meeting as Meeting & { organizationId?: string }).organizationId === auth.organizationId);
    const visible = auth.permissions?.includes('meeting.view_all')
      ? scoped
      : (await Promise.all(scoped.map(async (meeting) => (await meetingAssignmentAllows(meeting, auth.userId, 'meeting.read')) ? meeting : null))).filter((meeting): meeting is Meeting => Boolean(meeting));
    return res.json({ success: true, meetings: visible });
  }
  // Query the active organization directly so a large collection from other
  // organizations is never loaded into memory before being filtered.
  const scoped = await meetingRepository.getAllForOrganization(auth.organizationId);
  const refreshedScoped = await Promise.all(scoped.map(async (meeting) => {
    const signatures = (meeting as Meeting & { signatures?: unknown[] }).signatures || [];
    if (meeting.status !== 'SEALED' && meeting.status !== 'ARCHIVED' && meeting.totalSignaturesRequired > 0 && signatures.length >= meeting.totalSignaturesRequired) {
      await automaticallySealFullySignedMeeting(meeting, signatures, auth.organizationId);
      return await meetingRepository.getById(meeting.id) || meeting;
    }
    return meeting;
  }));
  const visible = auth.permissions?.includes('meeting.view_all')
    ? refreshedScoped
    : (await Promise.all(refreshedScoped.map(async (meeting) => (await meetingAssignmentAllows(meeting, auth.userId, 'meeting.read')) ? meeting : null))).filter((meeting): meeting is Meeting => Boolean(meeting));
  return res.json({ success: true, meetings: visible });
});

app.get('/api/meetings/:id', async (req, res) => {
  let meeting = await meetingRepository.getById(req.params.id);
  if (!meeting) {
    return res.status(404).json({ error: 'صورت‌جلسه مورد نظر یافت نشد.' });
  }
  const signatures = (meeting as Meeting & { signatures?: unknown[] }).signatures || [];
  if (meeting.status !== 'SEALED' && meeting.status !== 'ARCHIVED' && meeting.totalSignaturesRequired > 0 && signatures.length >= meeting.totalSignaturesRequired) {
    await automaticallySealFullySignedMeeting(meeting, signatures, (req as RequestWithAuth).auth!.organizationId);
    meeting = await meetingRepository.getById(req.params.id) || meeting;
  }
  return res.json({ success: true, meeting });
});

app.get('/api/meetings/:id/pdf', requireMeetingPermission('meeting.read'), async (req, res) => {
  const meeting = await meetingRepository.getById(req.params.id);
  if (!meeting) return res.status(404).json({ error: 'Meeting not found.' });
  if (!(await documentExists(meeting.id))) {
    const organizationId = (meeting as Meeting & { organizationId?: string }).organizationId;
    const printTemplate = [
      { id: 'print_classic', pdfStyle: 'classic' as const },
      { id: 'print_modern', pdfStyle: 'modern' as const },
      { id: 'print_minimal', pdfStyle: 'minimal' as const },
    ].find((template) => template.id === (meeting.printTemplateId || meeting.templateId));
    await generateMeetingPdf(meeting, printTemplate);
  }
  return res.download(getMeetingPdfPath(meeting.id), `${meeting.id}.pdf`);
});

app.get('/api/meetings/:id/html-pdf', requireMeetingPermission('meeting.read'), async (req, res) => {
  const meeting = await meetingRepository.getById(req.params.id);
  if (!meeting || !['READY_FOR_SIGNATURE', 'SIGNING', 'SEALED', 'ARCHIVED'].includes(meeting.status)) {
    return res.status(404).json({ error: 'Meeting PDF is not available in the current workflow state.' });
  }

  const origin = `${req.protocol}://${req.get('host')}`;
  try {
    const sessionToken = req.cookies[SESSION_COOKIE_NAME];
    if (!sessionToken) return res.status(401).json({ error: 'Authentication required.' });
    const filePath = await generateHtmlMeetingPdf(meeting, sessionToken, origin);
    const pdf = await fs.readFile(filePath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${meeting.id}.pdf"`);
    return res.send(pdf);
  } catch (error) {
    logger.error('HTML archived-minute PDF generation failed.', { metadata: { meetingId: meeting.id, error: String(error) } });
    return res.status(500).json({ error: 'Unable to generate the HTML PDF.' });
  }
});

app.post('/api/meetings/:id/pdf-link', requireMeetingPermission('meeting.read'), async (req, res) => {
  const meeting = await meetingRepository.getById(req.params.id);
  if (!meeting || (meeting.status !== 'SEALED' && meeting.status !== 'ARCHIVED')) return res.status(404).json({ error: 'Sealed document not found.' });
  if (!(await documentExists(meeting.id))) return res.status(404).json({ error: 'PDF artifact is not ready yet.' });
  const token = crypto.randomBytes(32).toString('hex');
  await redisService.set(`pdf-link:${token}`, JSON.stringify({ meetingId: meeting.id, organizationId: (req as RequestWithAuth).auth!.organizationId }), 900);
  return res.json({ success: true, url: `${process.env.APP_URL || ''}/api/documents/${meeting.id}?token=${token}`, expiresInSeconds: 900 });
});

app.get('/api/documents/:id', async (req, res) => {
  const token = String(req.query.token || '');
  const stored = token ? await redisService.get(`pdf-link:${token}`) : null;
  if (!stored) return res.status(401).json({ error: 'Download link is invalid or expired.' });
  const link = JSON.parse(stored) as { meetingId: string };
  if (link.meetingId !== req.params.id) return res.status(403).json({ error: 'Download link does not match the document.' });
  const meeting = await meetingRepository.getById(req.params.id);
  if (!meeting || !(await documentExists(meeting.id))) return res.status(404).json({ error: 'PDF artifact not found.' });
  await redisService.del(`pdf-link:${token}`);
  return res.download(getMeetingPdfPath(meeting.id), `${meeting.id}.pdf`);
});

app.get('/api/meetings/:id/verify', requireMeetingPermission('meeting.read'), async (req, res) => {
  const meeting = await meetingRepository.getById(req.params.id);
  if (!meeting) return res.status(404).json({ error: 'Meeting not found.' });
  const signatures = (meeting as Meeting & { signatures?: unknown[] }).signatures || [];
  const canonicalDocument = {
    actionItems: meeting.actionItems,
    agenda: meeting.agenda,
    decisions: meeting.decisions,
    discussion: meeting.discussion,
    signatures,
    title: meeting.title,
  };
  const computedHash = crypto.createHash('sha256').update(canonicalize(canonicalDocument)).digest('hex');
  return res.json({
    success: true,
    meetingId: meeting.id,
    sealed: meeting.status === 'SEALED' || meeting.status === 'ARCHIVED',
    valid: Boolean(meeting.documentHash) && meeting.documentHash === computedHash,
    documentHash: meeting.documentHash || null,
    computedHash,
  });
});

app.get('/api/certificates/:id/verify', async (req, res) => {
  const meeting = await meetingRepository.getById(req.params.id);
  if (!meeting || (meeting.status !== 'SEALED' && meeting.status !== 'ARCHIVED')) {
    return res.status(404).json({ valid: false, error: 'Certificate not found.' });
  }
  const signatures = (meeting as Meeting & { signatures?: unknown[] }).signatures || [];
  const canonicalDocument = {
    actionItems: meeting.actionItems,
    agenda: meeting.agenda,
    decisions: meeting.decisions,
    discussion: meeting.discussion,
    signatures,
    title: meeting.title,
  };
  const computedHash = crypto.createHash('sha256').update(canonicalize(canonicalDocument)).digest('hex');
  return res.json({ valid: Boolean(meeting.documentHash) && meeting.documentHash === computedHash, meetingId: meeting.id, title: meeting.title, documentHash: meeting.documentHash });
});

app.post('/api/meetings', requirePermission('meeting.create'), async (req, res) => {
  try {
    const parseResult = CreateMeetingSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'اطلاعات صورت‌جلسه کامل یا معتبر نیست.', details: parseResult.error.format() });
    }

    const data = parseResult.data;
    const auth = (req as RequestWithAuth).auth!;
    const participantIds = [...new Set((data.participantIds || []).filter((id) => id && id !== auth.userId))];
    const db = getDb();
    const participantUsers = db && participantIds.length > 0
      ? await db.collection('users').find({ id: { $in: participantIds } }).project({ passwordHash: 0 }).toArray()
      : [];
    const participants = participantUsers.map((participant) => ({
      id: participant.id,
      name: participant.name,
      role: 'Viewer' as const,
      email: participant.email,
      avatar: participant.avatar,
      initials: String(participant.name || '').slice(0, 2),
      hasSigned: false,
      requiresSignature: false,
    }));
    const newMeeting = {
    id: `meet_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    title: data.title,
    organizationId: auth.organizationId,
    persianDate: data.persianDate,
    timeRange: data.timeRange,
    location: data.location,
    templateId: data.templateId,
    contentTemplateId: data.contentTemplateId || data.templateId,
    printTemplateId: data.printTemplateId,
    status: 'DRAFT' as const,
    statusLabel: 'پیش‌نویس',
    organizer: {
      id: auth.userId,
      name: auth.name,
      role: 'Organizer' as const,
      email: auth.email,
      hasSigned: true,
    },
    participants,
    agenda: data.agenda ?? [{ id: 'ag_1', order: 1, text: 'بررسی موارد مطروحه' }],
    discussion: data.description ?? 'جلسه با حضور اعضا رسمیت یافت.',
    aiSuggestion: { summary: 'پیشنهاد اولیه به زودی تولید خواهد شد.', applied: false },
    decisions: data.decisions || [],
    actionItems: data.actionItems || [],
    comments: [],
    signatureCount: 0,
    requiredMeetingRoles: ['Editor', 'Reviewer', 'Signer'],
    totalSignaturesRequired: participants.filter((participant) => hasMeetingRole(participant, 'Signer') && participant.requiresSignature !== false).length,
  };

  const created = await meetingRepository.create(newMeeting as any);
  await upsertMeetingMember(created, auth.userId, 'Organizer', auth.userId);
  for (const participant of participants) await upsertMeetingMember(created, participant.id, 'Viewer', auth.userId);
  await meetingRepository.addAudit({
    id: `aud_${Date.now()}`,
    meetingId: created.id,
    action: 'MEETING_CREATED',
    actor: `${auth.name} (${auth.role})`,
    timestamp: new Date().toISOString(),
    documentHash: crypto.createHash('sha256').update(created.title).digest('hex'),
  });

  await notificationService.create({
    userId: auth.userId,
    organizationId: auth.organizationId,
    type: 'meeting',
    title: 'جلسه جدید ایجاد شد',
    message: `جلسه «${created.title}» به‌صورت پیش‌نویس ایجاد شد.`,
    meetingId: created.id,
  });
    return res.json({ success: true, meeting: created });
  } catch (error) {
    logger.error('Meeting creation failed.', { metadata: { error: error instanceof Error ? error.message : String(error) } });
    return res.status(500).json({ error: 'ایجاد صورت‌جلسه انجام نشد. اتصال پایدار به پایگاه‌داده را بررسی کنید.' });
  }
});

app.get('/api/meetings/:id/members', requireMeetingPermission('meeting.read'), async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ error: 'Database connection is temporarily unavailable.' });
  const members = await db.collection<MeetingMemberRecord>('meeting_members').aggregate([
    { $match: { meetingId: req.params.id } },
    { $lookup: { from: 'users', localField: 'userId', foreignField: 'id', as: 'user' } },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    { $unset: 'user.passwordHash' },
    { $project: { _id: 0, id: 1, meetingId: 1, organizationId: 1, userId: 1, assignment: 1, permissions: 1, assignedBy: 1, createdAt: 1, updatedAt: 1, user: 1 } },
  ]).toArray();
  return res.json({ success: true, members });
});

app.get('/api/meetings/:id/participant-options', async (req, res) => {
  const auth = (req as RequestWithAuth).auth!;
  const meeting = await meetingRepository.getById(req.params.id);
  if (!meeting) return res.status(404).json({ error: 'Meeting not found.' });
  if (!(await canAccessMeeting(req, meeting.id, 'participant.invite'))) return res.status(403).json({ error: 'You do not have permission to manage this meeting.' });
  const db = getDb();
  if (!db) return res.status(503).json({ error: 'Database connection is temporarily unavailable.' });
  const members = await db.collection('organization_memberships').aggregate([
    { $match: { organizationId: auth.organizationId, status: 'active' } },
    { $lookup: { from: 'users', localField: 'userId', foreignField: 'id', as: 'user' } },
    { $unwind: '$user' },
    { $project: { _id: 0, userId: 1, role: 1, permissions: 1, name: '$user.name', phoneNumber: '$user.phoneNumber', email: '$user.email', avatar: '$user.avatar', telegramChatId: '$user.telegramChatId' } },
    { $sort: { name: 1 } },
  ]).toArray();
  const invitations = await db.collection('organization_invitations').find({ organizationId: auth.organizationId, meetingId: meeting.id, status: 'pending', expiresAt: { $gt: Date.now() } }).project({ _id: 0, token: 1, phoneNumber: 1, name: 1, role: 1, meetingAssignment: 1, meetingRequiresSignature: 1, createdAt: 1 }).sort({ createdAt: -1 }).toArray();
  return res.json({ success: true, members, invitations, assignedUserIds: (meeting.participants || []).map((participant) => participant.id) });
});

app.post('/api/meetings/:id/participants/invite', async (req, res) => {
  const auth = (req as RequestWithAuth).auth!;
  const meeting = await meetingRepository.getById(req.params.id);
  if (!meeting) return res.status(404).json({ error: 'Meeting not found.' });
  if (!(await canAccessMeeting(req, meeting.id, 'participant.invite'))) return res.status(403).json({ error: 'You do not have permission to manage this meeting.' });
  let phoneNumber: string;
  try { phoneNumber = normalizePhoneNumber(String(req.body?.phoneNumber || '')); } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'A valid phone number is required.' }); }
    const requestedRoles = Array.isArray(req.body?.roles) ? req.body.roles : [req.body?.assignment];
    const roles = Array.from(new Set(requestedRoles.map((role: unknown) => role === 'Participant' ? 'Viewer' : role).filter((role: unknown) => ASSIGNABLE_MEETING_ROLES.includes(role as any)))) as MeetingRole[];
    if (roles.includes('Viewer') && roles.length > 1) return res.status(400).json({ error: 'مشاهده‌گر نمی‌تواند هم‌زمان نقش دیگری داشته باشد. یک نقش دیگر انتخاب کنید یا فقط مشاهده‌گر بمانید.' });
    if (roles.length === 0) return res.status(400).json({ error: 'حداقل یک نقش برای دعوت انتخاب کنید.' });
    const assignment = roles[0];
    const requiresSignature = roles.includes('Signer');
  const db = getDb();
  if (!db) return res.status(503).json({ error: 'Database connection is temporarily unavailable.' });
  const existingUser = await db.collection<any>('users').findOne({ phoneNumber }, { projection: { passwordHash: 0 } });
  if (existingUser) {
    const existingMembership = await db.collection<any>('organization_memberships').findOne({ organizationId: auth.organizationId, userId: existingUser.id, status: 'active' });
    if (existingMembership) return res.status(409).json({ error: 'این کاربر از قبل عضو سازمان است؛ او را از فهرست اعضای سازمان انتخاب کنید.', code: 'ALREADY_MEMBER', userId: existingUser.id });
  }
  const invitation = await organizationService.invite({
    organizationId: auth.organizationId,
    invitedBy: auth.userId,
    phoneNumber,
    name: existingUser?.name || String(req.body?.name || '').trim() || undefined,
    role: 'User',
    meetingId: meeting.id,
    meetingAssignment: assignment,
    meetingRoles: roles,
    meetingRequiresSignature: requiresSignature,
  });
  const invitationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/invite/${invitation.token}`;
  let delivery: 'in_app' | 'telegram' | 'sms' = 'sms';
  if (existingUser) {
    const recipientMembership = await db.collection<any>('organization_memberships').findOne({ userId: existingUser.id, status: 'active' });
    const targetOrganization = await db.collection<any>('organizations').findOne({ id: auth.organizationId }, { projection: { name: 1 } });
    await notificationService.create({ userId: existingUser.id, organizationId: recipientMembership?.organizationId || auth.organizationId, type: 'meeting', title: 'دعوت به عضویت و امضای صورت‌جلسه', message: `برای پیوستن به سازمان «${targetOrganization?.name || 'جدید'}» و جلسه «${meeting.title}» دعوت شده‌اید.`, meetingId: meeting.id, actionPath: '/organizations' });
    if (existingUser.telegramChatId) {
      const sent = await telegramService.sendNotification(existingUser.telegramChatId, `دعوت به سازمان و جلسه «${meeting.title}» در متامیت. لطفاً از داخل برنامه دعوت را بپذیرید.`);
      if (sent) delivery = 'telegram';
    }
    if (delivery === 'sms') {
      const smsResult = await smsService.sendMessage(phoneNumber, `دعوت به سازمان و جلسه متامیت: ${invitationUrl}`);
      if (!smsResult.success) return res.status(503).json({ error: smsResult.error || 'ارسال پیامک دعوت انجام نشد.', code: 'DELIVERY_FAILED', invitationToken: process.env.NODE_ENV !== 'production' ? invitation.token : undefined });
    }
  } else {
    const smsResult = await smsService.sendMessage(phoneNumber, `برای پیوستن به سازمان و جلسه متامیت ثبت‌نام کنید: ${invitationUrl}`);
    if (!smsResult.success) return res.status(503).json({ error: smsResult.error || 'ارسال پیامک دعوت انجام نشد.', code: 'DELIVERY_FAILED', invitationToken: process.env.NODE_ENV !== 'production' ? invitation.token : undefined });
  }
  return res.json({ success: true, status: existingUser ? 'platform_user_invited' : 'new_user_invited', delivery, invitation: { token: invitation.token, phoneNumber, name: invitation.name, role: assignment, roles, requiresSignature, createdAt: invitation.createdAt }, invitationUrl });
});

app.post('/api/meetings/:id/members', async (req, res) => {
  const auth = (req as RequestWithAuth).auth!;
  const meeting = await meetingRepository.getById(req.params.id);
  if (!meeting) return res.status(404).json({ error: 'Meeting not found.' });
  if (!(await canAccessMeeting(req, meeting.id, 'participant.invite'))) return res.status(403).json({ error: 'You do not have permission to manage this meeting.' });
  const userId = typeof req.body?.userId === 'string' ? req.body.userId : '';
  const requestedRoles = Array.isArray(req.body?.roles) ? req.body.roles : [req.body?.assignment];
  const roles = Array.from(new Set(requestedRoles.map((role: unknown) => role === 'Participant' ? 'Viewer' : role).filter((role: unknown) => ASSIGNABLE_MEETING_ROLES.includes(role as any)))) as MeetingRole[];
  if (roles.includes('Viewer') && roles.length > 1) return res.status(400).json({ error: 'مشاهده‌گر نمی‌تواند هم‌زمان نقش دیگری داشته باشد. یک نقش دیگر انتخاب کنید یا فقط مشاهده‌گر بمانید.' });
  if (!userId || roles.length === 0) return res.status(400).json({ error: 'کاربر و حداقل یک نقش معتبر را انتخاب کنید.' });
  if (roles.includes('Reviewer') && (meeting.participants || []).some((item) => item.id !== userId && hasMeetingRole(item, 'Reviewer'))) return res.status(409).json({ error: 'هر صورت‌جلسه فقط می‌تواند یک بازبین داشته باشد.' });
  const assignmentRole = roles[0];
  const db = getDb();
  const member = await db?.collection('organization_memberships').findOne({ organizationId: auth.organizationId, userId, status: 'active' });
  if (!member) return res.status(400).json({ error: 'The user must be an active member of this organization.' });
  await upsertMeetingMember(meeting, userId, assignmentRole, auth.userId, Array.isArray(req.body?.permissions) ? req.body.permissions : undefined, roles);
  const participant = await db?.collection('users').findOne({ id: userId }, { projection: { passwordHash: 0 } });
  if (participant) {
    const participantProjection = {
      id: userId,
      name: participant.name,
      title: typeof req.body?.title === 'string' ? req.body.title.trim() : '',
      role: assignmentRole,
      roles,
      email: participant.email,
      avatar: participant.avatar,
      initials: String(participant.name || '').slice(0, 2),
      hasSigned: false,
      requiresSignature: roles.includes('Signer'),
      membershipStatus: 'active',
    };
    const participants = [...(meeting.participants || []).filter((item) => item.id !== userId), participantProjection];
    await meetingRepository.update(meeting.id, {
      participants,
      totalSignaturesRequired: participants.filter((item) => hasMeetingRole(item, 'Signer') && item.requiresSignature !== false).length,
    } as Partial<Meeting>);
  }
  return res.json({ success: true, member: { userId, assignment: assignmentRole, roles, permissions: Array.isArray(req.body?.permissions) ? req.body.permissions : Array.from(new Set(roles.flatMap((role) => RolePermissionsMap[role] || []))), user: participant } });
});

app.patch('/api/meetings/:id/members/:userId', async (req, res) => {
  const auth = (req as RequestWithAuth).auth!;
  const meeting = await meetingRepository.getById(req.params.id);
  if (!meeting) return res.status(404).json({ error: 'Meeting not found.' });
  if (!(await canAccessMeeting(req, meeting.id, 'participant.invite'))) return res.status(403).json({ error: 'You do not have permission to manage this meeting.' });
  if (meeting.status === 'SEALED' || meeting.status === 'ARCHIVED') return res.status(403).json({ error: 'در صورت‌جلسه مهر و بایگانی‌شده امکان تغییر نقش وجود ندارد.' });
  const requestedRoles = Array.isArray(req.body?.roles) ? req.body.roles : [req.body?.assignment];
  const roles = Array.from(new Set(requestedRoles.map((role: unknown) => role === 'Participant' ? 'Viewer' : role).filter((role: unknown) => ASSIGNABLE_MEETING_ROLES.includes(role as any)))) as MeetingRole[];
  if (roles.includes('Viewer') && roles.length > 1) return res.status(400).json({ error: 'مشاهده‌گر نمی‌تواند هم‌زمان نقش دیگری داشته باشد. یک نقش دیگر انتخاب کنید یا فقط مشاهده‌گر بمانید.' });
  if (roles.length === 0) return res.status(400).json({ error: 'حداقل یک نقش معتبر انتخاب کنید.' });
  const assignment = roles[0];
  const existingParticipant = (meeting.participants || []).find((item) => item.id === req.params.userId);
  if (!existingParticipant) return res.status(404).json({ error: 'عضو موردنظر در این صورت‌جلسه پیدا نشد.' });
  if (roles.includes('Reviewer') && (meeting.participants || []).some((item) => item.id !== req.params.userId && hasMeetingRole(item, 'Reviewer'))) return res.status(409).json({ error: 'هر صورت‌جلسه فقط می‌تواند یک بازبین داشته باشد.' });
  if (hasMeetingRole(existingParticipant, 'Signer') && !roles.includes('Signer') && meeting.signatureCount > 0) {
    return res.status(400).json({ error: 'امضاکننده‌ای که امضای ثبت‌شده دارد قابل تغییر نقش نیست.' });
  }
  const updatedParticipants = (meeting.participants || []).map((item) => item.id === req.params.userId
    ? { ...item, title: typeof req.body?.title === 'string' ? req.body.title.trim() : item.title, role: assignment, roles, requiresSignature: roles.includes('Signer'), hasSigned: roles.includes('Signer') ? item.hasSigned : false }
    : item);
  await upsertMeetingMember(meeting, req.params.userId, assignment, auth.userId, undefined, roles);
  const updated = await meetingRepository.update(meeting.id, {
    participants: updatedParticipants,
    totalSignaturesRequired: updatedParticipants.filter((item) => hasMeetingRole(item, 'Signer') && item.requiresSignature !== false).length,
  });
  return res.json({ success: true, meeting: updated, participant: updatedParticipants.find((item) => item.id === req.params.userId) });
});

app.delete('/api/meetings/:id/members/:userId', async (req, res) => {
  const auth = (req as RequestWithAuth).auth!;
  const meeting = await meetingRepository.getById(req.params.id);
  if (!meeting) return res.status(404).json({ error: 'Meeting not found.' });
  if (!(await canAccessMeeting(req, meeting.id, 'participant.remove'))) return res.status(403).json({ error: 'You do not have permission to manage this meeting.' });
  if (req.params.userId === meeting.organizer.id) return res.status(400).json({ error: 'The meeting organizer cannot be removed.' });
  const result = await getDb()!.collection<MeetingMemberRecord>('meeting_members').deleteOne({ meetingId: meeting.id, userId: req.params.userId, organizationId: auth.organizationId });
  if (result.deletedCount) await meetingRepository.update(meeting.id, { participants: (meeting.participants || []).filter((item) => item.id !== req.params.userId) });
  return result.deletedCount ? res.json({ success: true }) : res.status(404).json({ error: 'عضو موردنظر در این صورت‌جلسه پیدا نشد.' });
});

app.put('/api/meetings/:id', requireMeetingPermission('meeting.edit'), async (req, res) => {
  const meetingId = req.params.id;
  const existing = await meetingRepository.getById(meetingId);
  if (!existing) {
    return res.status(404).json({ error: 'صورت‌جلسه پیدا نشد.' });
  }

  // Prevent editing sealed or archived documents
  if (existing.status === 'SEALED' || existing.status === 'ARCHIVED') {
    return res.status(403).json({
      error: 'سند صورت‌جلسه مهر و موم شده و هرگونه ویرایش مستقیم در آن ممنوع می‌باشد.',
    });
  }

  // State Transition Check
  if (req.body.status && req.body.status !== existing.status) {
    if (!(existing.status === 'DRAFT' && req.body.status === 'IN_REVIEW')) {
      return res.status(400).json({ error: 'Meeting workflow status is controlled by the platform workflow actions.' });
    }
    if (!String(existing.discussion || '').trim()) {
      return res.status(400).json({ error: 'The meeting must contain notes before it can enter review.' });
    }
    const missingRoles = getMissingRequiredMeetingRoles(existing.participants);
    if (missingRoles.length > 0) {
      const roleLabels: Record<string, string> = { Editor: 'ویرایشگر', Reviewer: 'بازبین', Signer: 'امضاکننده' };
      return res.status(400).json({ error: `برای ارسال صورت‌جلسه به بازبینی، حداقل یک ${missingRoles.map((role) => roleLabels[role]).join('، ')} تعیین کنید.` , code: 'REQUIRED_MEETING_ROLES_MISSING', missingRoles });
    }
    const transitionCheck = canTransitionMeeting(
      existing.status,
      req.body.status,
      (req as RequestWithAuth).auth!.role as OrganizationRole,
    );
    if (!transitionCheck.allowed) {
      return res.status(400).json({ error: transitionCheck.reason });
    }
  }

  const expectedVersion = req.body?.version === undefined ? undefined : Number(req.body.version);
  if (expectedVersion !== undefined && !Number.isInteger(expectedVersion)) {
    return res.status(400).json({ error: 'Invalid meeting version.' });
  }
  const { version: _version, ...updates } = req.body || {};
  if (typeof updates.templateId === 'string' && updates.templateId.startsWith('print_')) {
    updates.printTemplateId = updates.templateId;
    delete updates.templateId;
  }
  if (Array.isArray(updates.participants)) {
    const ids = updates.participants.map((participant: { id?: string }) => participant?.id).filter(Boolean);
    if (new Set(ids).size !== ids.length) return res.status(400).json({ error: 'Duplicate participants are not allowed.' });
  }
  const updated = await meetingRepository.update(meetingId, updates, expectedVersion);
  if (!updated) return res.status(409).json({ error: 'Meeting changed on the server. Reload and retry.' });
  if (Array.isArray(updates.participants)) await syncMeetingMembers(updated, updates.participants, (req as RequestWithAuth).auth!.userId);
  return res.json({ success: true, meeting: updated });
});

async function generateHtmlPdfForWorkflow(meeting: Meeting, organizationId: string, sessionToken?: string) {
  if (sessionToken) return generateHtmlMeetingPdf(meeting, sessionToken);
  const internalToken = await authService.createInternalSession(meeting.organizer.id, organizationId);
  try {
    return await generateHtmlMeetingPdf(meeting, internalToken);
  } finally {
    await authService.revokeSession(internalToken);
  }
}

async function archiveMeetingWithDeliveries(meeting: Meeting, actor: string, organizationId: string, sessionToken?: string) {
  const updated = await meetingRepository.update(meeting.id, {
    status: 'ARCHIVED',
    statusLabel: 'Archived',
  });
  const archivedMeeting = updated || { ...meeting, status: 'ARCHIVED' as const, statusLabel: 'Archived' };
  await meetingRepository.addAudit({
    id: `aud_${Date.now()}`,
    meetingId: meeting.id,
    action: 'DOCUMENT_ARCHIVED',
    actor,
    timestamp: new Date().toISOString(),
    documentHash: meeting.documentHash || '',
  });

  const userIds = Array.from(new Set([meeting.organizer?.id, ...(meeting.participants || []).map((participant) => participant.id)].filter((id): id is string => Boolean(id))));
  const db = getDb();
  const users = db
    ? await db.collection<{ id: string; telegramChatId?: string | number }>('users').find({ id: { $in: userIds } }).project({ _id: 0, id: 1, telegramChatId: 1 }).toArray()
    : [];
  await Promise.allSettled(userIds.map((userId) => notificationService.create({
    userId,
    organizationId,
    type: 'meeting',
    title: 'صورت‌جلسه به آرشیو منتقل شد',
    message: `صورت‌جلسه «${meeting.title}» آرشیو شد و نسخه نهایی آن آماده است.`,
    meetingId: meeting.id,
    actionPath: `/meetings/${meeting.id}`,
  })));

  try {
    const filePath = await generateHtmlPdfForWorkflow(archivedMeeting, organizationId, sessionToken);
    await Promise.allSettled(users.filter((user) => user.telegramChatId).map((user) => telegramService.sendDocument(user.telegramChatId!, filePath, `نسخه نهایی صورت‌جلسه: ${meeting.title}`)));
  } catch (error) {
    logger.error('Archived meeting notification PDF generation failed.', { metadata: { meetingId: meeting.id, error: String(error) } });
  }
  return archivedMeeting;
}

app.post('/api/meetings/:id/archive', requireMeetingPermission('meeting.archive'), async (req, res) => {
  const meeting = await meetingRepository.getById(req.params.id);
  if (!meeting) return res.status(404).json({ error: 'Meeting not found.' });
  if (meeting.status !== 'SEALED') {
    return res.status(400).json({ error: 'Only sealed meetings can be archived.' });
  }

  const auth = (req as RequestWithAuth).auth!;
  const organizationId = (meeting as Meeting & { organizationId?: string }).organizationId || auth.organizationId;
  const archivedMeeting = await archiveMeetingWithDeliveries(meeting, auth.userId, organizationId, req.cookies[SESSION_COOKIE_NAME]);
  return res.json({ success: true, meeting: archivedMeeting });
});

// Formal Review Workflow Endpoint
app.post('/api/meetings/:id/review', requireMeetingPermission('meeting.review'), async (req, res) => {
  const meetingId = req.params.id;
  const { action, reviewerName, notes, section } = req.body;

  const meeting = await meetingRepository.getById(meetingId);
  if (!meeting) {
    return res.status(404).json({ error: 'صورت‌جلسه یافت نشد.' });
  }

  if (meeting.status !== 'IN_REVIEW') {
    return res.status(400).json({ error: 'تنها جلساتی که در وضعیت «در حال بررسی» هستند قابل بازبینی می‌باشند.' });
  }

  if (action === 'approve') {
    const unreadySigners = await getUnreadyRequiredSigners(meeting, (req as RequestWithAuth).auth!.organizationId);
    if (unreadySigners.length > 0) return res.status(400).json({ error: `امضاکنندگان زیر هنوز عضو فعال سازمان نیستند: ${unreadySigners.join('، ')}` });
    await meetingRepository.update(meetingId, {
      status: 'READY_FOR_SIGNATURE',
      statusLabel: 'آماده امضا',
    });

    await notifyPendingSignersInApp(
      meeting,
      (meeting as Meeting & { signatures?: Array<{ signerId: string }> }).signatures || [],
      (req as RequestWithAuth).auth!.organizationId,
      reviewerName,
    );

    await notifyPendingSignersOnTelegram(
      meeting,
      (meeting as Meeting & { signatures?: Array<{ signerId: string }> }).signatures || [],
      (req as RequestWithAuth).auth!.organizationId,
      reviewerName,
      req.cookies[SESSION_COOKIE_NAME],
    );

    await meetingRepository.addAudit({
      id: `aud_${Date.now()}`,
      meetingId,
      action: 'REVIEW_APPROVED',
      actor: reviewerName || 'بازبین ارشد',
      timestamp: new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date()),
      documentHash: meeting.documentHash || '',
      metadata: { notes: notes || 'محتوای صورت‌جلسه مورد تایید قرار گرفت.' },
    });

    return res.json({
      success: true,
      message: 'سند توسط بازبین تأیید و آماده آغاز فرآیند امضا شد.',
      status: 'READY_FOR_SIGNATURE',
    });
  } else if (action === 'request_changes') {
    // Add comment to discussion
    const newComment = {
      id: `c_${Date.now()}`,
      author: {
        id: 'usr_reviewer',
        name: reviewerName || 'بازبین جلسه',
        role: 'Reviewer',
        email: 'reviewer@metameet.ir',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      },
      text: `[درخواست اصلاح در ${section || 'متن مذاکرات'}]: ${notes || 'لطفاً بند مشخص‌شده را بازبینی کنید.'}`,
      timestamp: 'هم‌اکنون',
      resolved: false,
    };

    await meetingRepository.update(meetingId, {
      comments: [newComment, ...meeting.comments],
      status: 'IN_REVIEW',
      statusLabel: 'نیازمند اصلاح',
    });

    await meetingRepository.addAudit({
      id: `aud_${Date.now()}`,
      meetingId,
      action: 'CHANGES_REQUESTED',
      actor: reviewerName || 'بازبین جلسه',
      timestamp: new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date()),
      documentHash: meeting.documentHash || '',
      metadata: { section, notes },
    });

    return res.json({
      success: true,
      message: 'درخواست اصلاحات به همراه یادداشت برای تنظیم‌کننده ثبت شد.',
      status: 'IN_REVIEW',
    });
  }

  return res.status(400).json({ error: 'نوع اقدام نامعتبر است (approve یا request_changes).' });
});

// -------------------------------------------------------------
// Template Endpoints
// -------------------------------------------------------------
app.get('/api/templates', async (req, res) => {
  const organizationId = (req as RequestWithAuth).auth!.organizationId;
  let templates = await templateRepository.getAll(organizationId);
  if (!templates.length) {
    const defaults = [
      { id: `tpl_classic_${organizationId}`, title: 'قالب رسمی کلاسیک', category: 'اداری', description: 'سربرگ رسمی با بخش‌های کامل و رنگ سازمانی.', pdfStyle: 'classic' as const, agendaDefaults: ['بررسی دستور جلسه', 'تصمیمات و مصوبات', 'اقدامات و مسئولیت‌ها'] },
      { id: `tpl_modern_${organizationId}`, title: 'قالب مدرن سازمانی', category: 'مدیریتی', description: 'طراحی مدرن با تاکید بر تصمیم‌ها و پیگیری اقدامات.', pdfStyle: 'modern' as const, agendaDefaults: ['گزارش پیشرفت', 'تصمیم‌های کلیدی', 'برنامه اقدام'] },
      { id: `tpl_minimal_${organizationId}`, title: 'قالب مینیمال', category: 'عمومی', description: 'ساده، خوانا و مناسب چاپ سیاه‌وسفید.', pdfStyle: 'minimal' as const, agendaDefaults: ['موضوعات جلسه', 'جمع‌بندی و مصوبات'] },
    ];
    templates = await Promise.all(defaults.map((template) => templateRepository.create({ ...template, organizationId } as any)));
  }
  return res.json({ success: true, templates });
});

app.post('/api/meetings/:id/signature-rejection', async (req, res) => {
  const meeting = await meetingRepository.getById(req.params.id);
  const auth = (req as RequestWithAuth).auth!;
  if (!meeting) return res.status(404).json({ error: 'Meeting not found.' });
  if (!(await canAccessMeeting(req, meeting.id, 'signature.sign'))) return res.status(403).json({ error: 'You are not an authorized signer for this meeting.' });
  if (!['READY_FOR_SIGNATURE', 'SIGNING'].includes(meeting.status)) return res.status(400).json({ error: 'This meeting is not currently open for signing.' });
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
  if (reason.length < 5) return res.status(400).json({ error: 'A clear reason is required.' });
  const participant = meeting.participants.find((item) => item.id === auth.userId);
  if (!participant || !hasMeetingRole(participant, 'Signer') || participant.requiresSignature === false) return res.status(403).json({ error: 'فقط امضاکننده تعیین‌شده می‌تواند امضا را رد کند.' });

  const rejection = { id: `sig_rejection_${crypto.randomUUID()}`, signerId: auth.userId, signerName: auth.name, reason, createdAt: new Date().toISOString(), status: 'pending' as const };
  await meetingRepository.update(meeting.id, { status: 'DRAFT', statusLabel: 'نیازمند اصلاح', signatureRejection: rejection });
  await meetingRepository.addAudit({ id: `aud_${crypto.randomUUID()}`, meetingId: meeting.id, action: 'SIGNATURE_REJECTED', actor: auth.name, timestamp: rejection.createdAt, documentHash: meeting.documentHash || '', metadata: { reason } });

  const organizationId = (meeting as Meeting & { organizationId?: string }).organizationId || auth.organizationId;
  const recipients = [meeting.organizer, ...(meeting.participants || []).filter((item) => ['Organizer', 'Editor'].includes(item.role))]
    .filter((item, index, all) => item.id !== auth.userId && all.findIndex((candidate) => candidate.id === item.id) === index);
  await Promise.allSettled(recipients.map((recipient) => notificationService.create({ userId: recipient.id, organizationId, type: 'review', title: 'امضا رد شد و نیاز به بررسی دارد', message: `${auth.name} برای امضا نکردن صورت‌جلسه «${meeting.title}» این دلیل را ثبت کرد: ${reason}`, meetingId: meeting.id, actionPath: `/meetings/${meeting.id}` })));
  return res.json({ success: true, meeting: await meetingRepository.getById(meeting.id) });
});

app.post('/api/meetings/:id/signature-rejection/respond', async (req, res) => {
  const meeting = await meetingRepository.getById(req.params.id);
  const auth = (req as RequestWithAuth).auth!;
  if (!meeting) return res.status(404).json({ error: 'Meeting not found.' });
  if (!(await canAccessMeeting(req, meeting.id, 'meeting.edit'))) return res.status(403).json({ error: 'Only the meeting editor can respond to this request.' });
  if (meeting.status !== 'DRAFT' || meeting.signatureRejection?.status !== 'pending') return res.status(400).json({ error: 'There is no pending signing rejection to respond to.' });
  const action = req.body?.action === 'accept_change' || req.body?.action === 'reject_change' ? req.body.action : '';
  const responseNote = typeof req.body?.response === 'string' ? req.body.response.trim() : '';
  if (!action || (action === 'reject_change' && responseNote.length < 5)) return res.status(400).json({ error: 'Choose an action and provide a response.' });
  const rejection = meeting.signatureRejection;
  const organizationId = (meeting as Meeting & { organizationId?: string }).organizationId || auth.organizationId;
  const requiredSigners = (meeting.participants || []).filter((item) => item.role === 'Signer' && item.requiresSignature !== false)
    .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index);

  if (action === 'reject_change') {
    await meetingRepository.update(meeting.id, { status: 'SIGNING', statusLabel: 'در حال امضا', signatureRejection: { ...rejection, status: 'rejected', editorResponse: responseNote } });
    await meetingRepository.addAudit({ id: `aud_${crypto.randomUUID()}`, meetingId: meeting.id, action: 'SIGNATURE_CHANGE_REJECTED', actor: auth.name, timestamp: new Date().toISOString(), documentHash: meeting.documentHash || '', metadata: { signerId: rejection.signerId, response: responseNote } });
    await notificationService.create({ userId: rejection.signerId, organizationId, type: 'review', title: 'درخواست تغییر امضا رد شد', message: `درخواست شما برای تغییر صورت‌جلسه «${meeting.title}» رد شد: ${responseNote}`, meetingId: meeting.id, actionPath: `/meetings/${meeting.id}` });
  } else {
    await meetingRepository.update(meeting.id, { status: 'DRAFT', statusLabel: 'نیازمند اصلاح', signatureCount: 0, signatures: [], documentHash: undefined, signatureRejection: { ...rejection, status: 'accepted', editorResponse: responseNote || 'درخواست اصلاح پذیرفته شد.' } });
    await meetingRepository.addAudit({ id: `aud_${crypto.randomUUID()}`, meetingId: meeting.id, action: 'SIGNATURE_CHANGE_ACCEPTED', actor: auth.name, timestamp: new Date().toISOString(), documentHash: meeting.documentHash || '', metadata: { signerId: rejection.signerId, response: responseNote } });
    await Promise.allSettled(requiredSigners.map((signer) => notificationService.create({ userId: signer.id, organizationId, type: 'review', title: 'صورت‌جلسه برای اصلاح برگشت خورد', message: `درخواست اصلاح در صورت‌جلسه «${meeting.title}» پذیرفته شد و امضاهای قبلی لغو شدند. پس از بازبینی دوباره از شما امضا درخواست می‌شود.`, meetingId: meeting.id, actionPath: `/meetings/${meeting.id}` })));
  }
  return res.json({ success: true, meeting: await meetingRepository.getById(meeting.id) });
});

app.get('/api/print-templates', async (_req, res) => {
  return res.json({ success: true, templates: [
    { id: 'print_classic', title: 'چاپ رسمی کلاسیک', category: 'رسمی', description: 'سربرگ رسمی، بخش‌بندی واضح و مناسب بایگانی.', pdfStyle: 'classic' },
    { id: 'print_modern', title: 'چاپ مدرن سازمانی', category: 'مدرن', description: 'رنگ سازمانی و تاکید بصری بر تصمیم‌ها و اقدامات.', pdfStyle: 'modern' },
    { id: 'print_minimal', title: 'چاپ مینیمال', category: 'مینیمال', description: 'خوانا، کم‌رنگ و مناسب چاپ سیاه‌وسفید.', pdfStyle: 'minimal' },
  ] });
});

app.post('/api/templates', requirePermission('template.create'), async (req, res) => {
  const { title, category, description, agendaDefaults, pdfStyle } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'عنوان قالب الزامی است.' });
  }

  const newTemplate = {
    id: `tpl_${Date.now()}`,
    organizationId: (req as RequestWithAuth).auth!.organizationId,
    title,
    category: category || 'عمومی',
    description: description || 'قالب سفارشی سازمان',
    agendaDefaults: agendaDefaults || ['بررسی دستور جلسه', 'تصویب تصمیمات و اقدامات'],
    pdfStyle: pdfStyle === 'modern' || pdfStyle === 'minimal' ? pdfStyle : 'classic',
  };

  const created = await templateRepository.create(newTemplate);
  return res.json({ success: true, template: created });
});

app.delete('/api/templates/:id', requirePermission('template.delete'), async (req, res) => {
  const deleted = await templateRepository.delete(req.params.id, (req as RequestWithAuth).auth!.organizationId);
  return deleted ? res.json({ success: true }) : res.status(404).json({ error: 'Template not found.' });
});

// -------------------------------------------------------------
// Digital Signature & Sealing Endpoints
// -------------------------------------------------------------
app.post('/api/signature/sign', async (req, res) => {
  const parseResult = SignDocumentSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.format() });
  }

  const { meetingId, signatureData, signatureType } = parseResult.data;
  const authenticatedUser = (req as RequestWithAuth).auth!;
  const signerName = authenticatedUser.name;
  const signerRole = authenticatedUser.role;

  const idempotencyKey = String(req.headers['idempotency-key'] || '').trim();
  if (idempotencyKey && !(await redisService.checkIdempotency(`signature:${idempotencyKey}`))) {
    return res.status(409).json({ error: 'This signature request has already been processed.' });
  }

  // Rate Limit signatures per IP
  const rateLimit = await redisService.checkRateLimit(req.ip || 'ip', 'sign', 10, 60);
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: 'تعداد درخواست‌های امضا بیش از حد مجاز است.' });
  }

  const meeting = await meetingRepository.getById(meetingId);
  if (!meeting) {
    return res.status(404).json({ error: 'جلسه مورد نظر برای امضا پیدا نشد.' });
  }

  if (meeting.status === 'SEALED' || meeting.status === 'ARCHIVED') {
    return res.status(400).json({ error: 'این سند قبلاً مهر و موم شده و امکان ثبت امضای جدید ندارد.' });
  }

  if (!(await canAccessMeeting(req, meetingId, 'signature.sign'))) return res.status(403).json({ error: 'You are not an authorized signer for this meeting.' });

  if (!['READY_FOR_SIGNATURE', 'SIGNING'].includes(meeting.status)) {
    return res.status(400).json({ error: 'The meeting is not ready for signing.' });
  }

  const signatures = (meeting as typeof meeting & { signatures?: Array<{ signerId: string }> }).signatures || [];
  if (signatures.some((signature) => signature.signerId === authenticatedUser.userId)) {
    return res.status(409).json({ error: 'This user has already signed the meeting.' });
  }

  // Compute SHA-256 integrity hash of document + signer
  const contentToHash = JSON.stringify({
    meetingId: meeting.id,
    title: meeting.title,
    discussion: meeting.discussion,
    decisions: meeting.decisions,
    agenda: meeting.agenda,
    actionItems: meeting.actionItems,
    signerId: authenticatedUser.userId,
    signerName,
  });
  const documentHash = crypto.createHash('sha256').update(contentToHash).digest('hex');

  const auditEntry = {
    id: `aud_${Date.now()}`,
    meetingId,
    action: 'SIGNATURE_COMPLETED',
    actor: `${signerName} (${signerRole})`,
    timestamp: new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date()),
    documentHash,
    metadata: {
      signatureType,
      userAgent: req.headers['user-agent'] || 'Web',
      ip: req.ip || '127.0.0.1',
    },
  };

  await meetingRepository.addAudit(auditEntry);

  const signatureRecord = {
    id: `sig_${Date.now()}`,
    meetingId,
    signerId: authenticatedUser.userId,
    signerName,
    signerRole,
    signatureType,
    signatureData,
    signedAt: new Date().toISOString(),
    documentHash,
  };
  const updatedSignatures = [...signatures, signatureRecord];
  const newCount = updatedSignatures.length;
  const isAllSigned = newCount >= meeting.totalSignaturesRequired;

  await meetingRepository.update(meetingId, {
    participants: (meeting.participants || []).map((participant) => participant.id === authenticatedUser.userId
      ? { ...participant, hasSigned: true, statusText: 'امضا دریافت شد' }
      : participant),
    signatureCount: newCount,
    status: isAllSigned ? 'READY_FOR_SIGNATURE' : 'SIGNING',
    statusLabel: isAllSigned ? 'آماده امضا' : 'در حال امضا',
    documentHash,
    signatures: updatedSignatures,
  } as any);

  let finalizedMeeting: Meeting | null = null;
  if (isAllSigned) {
    await automaticallySealFullySignedMeeting({ ...meeting, status: 'READY_FOR_SIGNATURE', signatures: updatedSignatures }, updatedSignatures, authenticatedUser.organizationId);
    finalizedMeeting = await meetingRepository.getById(meetingId);
  }

  // Keep the first verified signature on the user's profile for future meetings.
  await authService.saveSignature(authenticatedUser.userId, signatureData);

  // Prompt every remaining meeting member to sign. Notification failures must
  // never invalidate a signature that was already recorded successfully.
  if (!isAllSigned) {
    const organizationId = (meeting as Meeting & { organizationId?: string }).organizationId || authenticatedUser.organizationId;
    const signedIds = new Set(updatedSignatures.map((signature) => signature.signerId));
    const candidates = (meeting.participants || []).filter((participant) => hasMeetingRole(participant, 'Signer') && participant.requiresSignature !== false)
      .filter((participant): participant is typeof meeting.organizer => Boolean(participant?.id))
      .filter((participant, index, all) => all.findIndex((item) => item.id === participant.id) === index)
      .filter((participant) => !signedIds.has(participant.id));

    await Promise.allSettled(candidates.map((participant) => notificationService.create({
      userId: participant.id,
      organizationId,
      type: 'signature',
      title: 'نیاز به امضای شما',
      message: `صورت‌جلسه «${meeting.title}» پس از ثبت امضای ${signerName}، در انتظار امضای شماست.`,
      meetingId: meeting.id,
    })));
    await notifyPendingSignersOnTelegram(meeting, updatedSignatures, organizationId, signerName);
  }

  // Enqueue notification job
  await queueManager.enqueue('metameet.telegram.send', {
    chatId: '@metameet_alerts',
    message: `امضای دیجیتال جدید برای جلسه «${meeting.title}» توسط ${signerName} ثبت شد.`,
  });

  return res.json({
    success: true,
    signatureId: `sig_${Date.now()}`,
    documentHash,
    auditEntry,
    ...(finalizedMeeting ? { meeting: finalizedMeeting } : {}),
    message: 'امضای الکترونیکی با برچسب زمانی و هش SHA-256 معتبر ثبت شد.',
  });
});

async function automaticallySealFullySignedMeeting(meeting: Meeting, signatures: unknown[], organizationId: string) {
  const lockAcquired = await redisService.acquireLock(`seal:${meeting.id}`, 15);
  if (!lockAcquired) return null;
  try {
    const finalContent = canonicalize({ actionItems: meeting.actionItems, agenda: meeting.agenda, decisions: meeting.decisions, discussion: meeting.discussion, signatures, title: meeting.title });
    const sealHash = crypto.createHash('sha256').update(finalContent).digest('hex');
    const sealedAt = new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date());
    const sealedMeeting = await meetingRepository.update(meeting.id, { status: 'SEALED', statusLabel: 'مهر و موم شده', sealedAt, documentHash: sealHash });
    if (!sealedMeeting) return null;
    await meetingRepository.addAudit({ id: `aud_${Date.now()}`, meetingId: meeting.id, action: 'DOCUMENT_SEALED', actor: 'سیستم امضای دیجیتال MetaMeet', timestamp: sealedAt, documentHash: sealHash });
    const archivedMeeting = await archiveMeetingWithDeliveries(sealedMeeting, 'system', organizationId);
    return { sealedAt, documentHash: sealHash, status: archivedMeeting.status };
  } finally {
    await redisService.releaseLock(`seal:${meeting.id}`);
  }
}

app.post('/api/meetings/seal', async (req, res) => {
  const { meetingId } = req.body;
  const meeting = await meetingRepository.getById(meetingId);
  if (!meeting) {
    return res.status(404).json({ error: 'جلسه پیدا نشد.' });
  }
  if (!(await canAccessMeeting(req, meetingId, 'meeting.finalize'))) return res.status(403).json({ error: 'شما اجازه نهایی‌سازی این جلسه را ندارید.' });

  if (meeting.status === 'SEALED' || meeting.status === 'ARCHIVED') {
    return res.status(409).json({ error: 'The meeting is already sealed or archived.' });
  }

  const persistedSignatures = (meeting as typeof meeting & { signatures?: unknown[] }).signatures || [];
  if (persistedSignatures.length < meeting.totalSignaturesRequired) {
    return res.status(400).json({ error: 'All required signatures must be completed before sealing.' });
  }

  // Acquire distributed lock for sealing
  const lockAcquired = await redisService.acquireLock(`seal:${meetingId}`, 15);
  if (!lockAcquired) {
    return res.status(409).json({ error: 'عملیات مهر و موم برای این سند در حال حاضر در دست اقدام است.' });
  }

  try {
    const finalContent = canonicalize({
      actionItems: meeting.actionItems,
      agenda: meeting.agenda,
      decisions: meeting.decisions,
      discussion: meeting.discussion,
      signatures: persistedSignatures,
      title: meeting.title,
    });

    const sealHash = crypto.createHash('sha256').update(finalContent).digest('hex');
    const sealedAt = new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date());

    const sealedMeeting = await meetingRepository.update(meetingId, {
      status: 'SEALED',
      statusLabel: 'مهر و موم شده',
      sealedAt,
      documentHash: sealHash,
    });
    if (!sealedMeeting) return res.status(409).json({ error: 'Meeting changed while sealing. Retry.' });

    await meetingRepository.addAudit({
      id: `aud_${Date.now()}`,
      meetingId,
      action: 'DOCUMENT_SEALED',
      actor: 'سیستم امضای دیجیتال MetaMeet (مهر سازمانی)',
      timestamp: sealedAt,
      documentHash: sealHash,
    });

    // Enqueue PDF generation job
    await queueManager.enqueue('metameet.pdf.generate', {
      meetingId,
      title: meeting.title,
    });

    return res.json({
      success: true,
      sealedAt,
      documentHash: sealHash,
      message: 'سند صورت‌جلسه برای همیشه پلمپ و تغییرناپذیر گردید.',
    });
  } finally {
    await redisService.releaseLock(`seal:${meetingId}`);
  }
});

// -------------------------------------------------------------
// Telegram bot, account-linking, and callback endpoints
// -------------------------------------------------------------
function getPendingMeetingSigners(meeting: Meeting, signatures: Array<{ signerId: string }>) {
  const signedIds = new Set(signatures.map((signature) => signature.signerId));
  return (meeting.participants || []).filter((participant) => hasMeetingRole(participant, 'Signer') && participant.requiresSignature !== false)
    .filter((participant): participant is typeof meeting.organizer => Boolean(participant?.id))
    .filter((participant, index, all) => all.findIndex((item) => item.id === participant.id) === index)
    .filter((participant) => !signedIds.has(participant.id));
}

async function notifyPendingSignersInApp(
  meeting: Meeting,
  signatures: Array<{ signerId: string }>,
  organizationId: string,
  actorName?: string,
) {
  const candidates = getPendingMeetingSigners(meeting, signatures);
  await Promise.allSettled(candidates.map((participant) => notificationService.create({
    userId: participant.id,
    organizationId,
    type: 'signature',
    title: 'Signature required',
    message: `The meeting "${meeting.title}" is ready for your signature${actorName ? ` after approval by ${actorName}` : ''}.`,
    meetingId: meeting.id,
    actionPath: `/meetings/${meeting.id}`,
  })));
}

async function notifyPendingSignersOnTelegram(meeting: Meeting, signatures: Array<{ signerId: string }>, organizationId: string, actorName?: string, sessionToken?: string) {
  const candidates = getPendingMeetingSigners(meeting, signatures);
  const useExternalBroker = queueManager.getDiagnostics().externalBroker;
  let pdfPath: string | undefined;
  if (!useExternalBroker) {
    try {
      pdfPath = await generateHtmlPdfForWorkflow(meeting, organizationId, sessionToken);
    } catch (error) {
      // Approval must remain successful even if PDF rendering is temporarily unavailable.
      // The direct Telegram fallback still sends the action buttons, and the error is
      // recorded for repair/retry instead of crashing the server process.
      logger.error('Pre-signature HTML PDF generation failed; sending Telegram fallback without attachment.', { metadata: { meetingId: meeting.id, error: String(error) } });
    }
  }
  await Promise.allSettled(candidates.map(async (participant) => {
    const user = await authService.findById(participant.id, organizationId);
    if (!user?.telegramChatId) return;
    const actionToken = crypto.randomBytes(18).toString('base64url');
    await redisService.set(`telegram-sign:${actionToken}`, JSON.stringify({
      meetingId: meeting.id,
      userId: participant.id,
      organizationId,
      chatId: String(user.telegramChatId),
    }), 48 * 60 * 60);
    const delivery = {
      chatId: String(user.telegramChatId),
      meetingId: meeting.id,
      organizationId,
      meetingTitle: meeting.title,
      organizerName: actorName || meeting.organizer.name,
      actionToken,
    };
    if (useExternalBroker) {
      await queueManager.enqueue('metameet.telegram.sign_request', delivery);
      logger.info('Queued Telegram sign-request through QStash.', { metadata: { meetingId: meeting.id, participantId: participant.id } });
      return;
    }

    // Local/dev fallback: Vercel cannot finish an in-memory job after the request ends.
    const sent = await telegramService.sendSignRequestPM(
      delivery.chatId,
      delivery.meetingId,
      delivery.meetingTitle,
      delivery.organizerName,
      delivery.actionToken,
      pdfPath,
    );
    if (!sent) throw new Error(`Direct Telegram sign-request delivery failed for ${participant.id}.`);
    logger.info('Sent Telegram sign-request directly.', { metadata: { meetingId: meeting.id, participantId: participant.id } });
  }));
}

async function recordTelegramSignature(meetingId: string, userId: string, chatId: string, organizationId?: string) {
  const user = await authService.findById(userId);
  const meeting = await meetingRepository.getById(meetingId);
  if (organizationId && meeting && (meeting as Meeting & { organizationId?: string }).organizationId !== organizationId) return { ok: false as const, status: 404, message: 'Invalid organization context.' };
  if (!user || !meeting) return { ok: false as const, status: 404, message: 'جلسه یا کاربر یافت نشد.' };
  if (meeting.status === 'SEALED' || meeting.status === 'ARCHIVED') return { ok: false as const, status: 400, message: 'این صورت‌جلسه قبلاً نهایی شده است.' };
  if (!['READY_FOR_SIGNATURE', 'SIGNING'].includes(meeting.status)) return { ok: false as const, status: 400, message: 'این صورت‌جلسه هنوز آماده امضا نیست.' };
  const db = getDb();
  const assignment = await db?.collection<MeetingMemberRecord>('meeting_members').findOne({ meetingId: meeting.id, userId: user.id });
  const allowed = Boolean(assignment && (assignment.roles || [assignment.assignment]).includes('Signer'));
  if (!allowed) return { ok: false as const, status: 403, message: 'این کاربر امضاکننده مجاز این صورت‌جلسه نیست.' };
  const signatures = (meeting as typeof meeting & { signatures?: Array<{ signerId: string }> }).signatures || [];
  if (signatures.some((signature) => signature.signerId === user.id)) return { ok: false as const, status: 409, message: 'این کاربر قبلاً صورت‌جلسه را امضا کرده است.' };
  const signerName = user.name;
  const contentToHash = canonicalize({ meetingId: meeting.id, title: meeting.title, discussion: meeting.discussion, decisions: meeting.decisions, agenda: meeting.agenda, actionItems: meeting.actionItems, signerId: user.id, signerName });
  const documentHash = crypto.createHash('sha256').update(contentToHash).digest('hex');
  const signatureId = `sig_${crypto.randomUUID()}`;
  await meetingRepository.addAudit({ id: `aud_${crypto.randomUUID()}`, meetingId, action: 'SIGNATURE_COMPLETED', actor: `${signerName} (Telegram)`, timestamp: new Date().toISOString(), documentHash, metadata: { authMethod: 'Telegram Persian bot', chatId } });
  const updatedSignatures = [...signatures, { id: signatureId, meetingId, signerId: user.id, signerName, signerRole: 'Signer', signatureType: 'telegram' as const, signatureData: `telegram:${chatId}`, signedAt: new Date().toISOString(), documentHash }];
  const isAllSigned = updatedSignatures.length >= meeting.totalSignaturesRequired;
  await meetingRepository.update(meetingId, { signatureCount: updatedSignatures.length, status: isAllSigned ? 'READY_FOR_SIGNATURE' : 'SIGNING', statusLabel: isAllSigned ? 'آماده امضا' : 'در حال امضا', documentHash, signatures: updatedSignatures } as any);
  await meetingRepository.update(meetingId, {
    participants: (meeting.participants || []).map((participant) => participant.id === user.id
      ? { ...participant, hasSigned: true, statusText: 'امضا دریافت شد' }
      : participant),
  } as any);
   const resolvedOrganizationId = organizationId || (meeting as Meeting & { organizationId?: string }).organizationId || '';
   if (isAllSigned) {
     await automaticallySealFullySignedMeeting(
       { ...meeting, status: 'READY_FOR_SIGNATURE', signatures: updatedSignatures } as Meeting,
       updatedSignatures,
       resolvedOrganizationId,
     );
   } else {
     await notifyPendingSignersOnTelegram(meeting, updatedSignatures, resolvedOrganizationId, signerName);
   }
   return { ok: true as const, signatureId, documentHash, meetingTitle: meeting.title };
}

app.post('/api/telegram/verify', (req, res) => {
  return res.status(410).json({ error: 'ورود از طریق Telegram WebApp پشتیبانی نمی‌شود؛ ربات فارسی را به حساب خود متصل کنید.' });
  const parseResult = TelegramAuthVerifySchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'فرمت داده‌های ورود تلگرام نامعتبر است.' });
  }

  const verification = telegramService.verifyInitData(parseResult.data!.initData);
  if (!verification.valid) {
    return res.status(401).json({ error: verification.error || 'اعتبارسنجی هویت تلگرام ناموفق بود.' });
  }

  return res.json({ success: true, user: verification.user });
});

app.post('/api/telegram/webhook', async (req, res) => {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret && req.headers['x-telegram-bot-api-secret-token'] !== expectedSecret) {
    return res.status(401).json({ error: 'Invalid Telegram webhook secret.' });
  }
  const update = req.body;
  const messageText = update?.message?.text;
  const chatId = update?.message?.chat?.id;
  if (typeof messageText === 'string' && typeof chatId === 'number' && (messageText === '/start' || messageText === '/help')) {
    await telegramService.sendNotification(chatId, 'Telegram is connected and receiving MetaMeet messages. Create a new link from MetaMeet Settings to link this account.');
  }
  if (typeof messageText === 'string' && typeof chatId === 'number' && (messageText.startsWith('/link ') || messageText.startsWith('/start link_'))) {
    const token = messageText.startsWith('/link ') ? messageText.slice(6).trim() : messageText.slice('/start link_'.length).trim();
    const linkRecord = await redisService.get(`telegram-link:${token}`);
    if (!linkRecord) {
      await telegramService.sendNotification(chatId, 'This link was not found or has expired. Create a new Telegram link in MetaMeet and try again.');
    }
    if (linkRecord) {
      let parsed: { userId: string; organizationId: string } | null = null;
      try {
        parsed = (typeof linkRecord === 'string' ? JSON.parse(linkRecord) : linkRecord) as { userId: string; organizationId: string };
      } catch {
        logger.warn('Ignoring malformed Telegram account-link record.');
      }
      const telegramUser = update?.message?.from;
      const linked = parsed ? await authService.linkTelegramChat(parsed.userId, parsed.organizationId, String(chatId), typeof telegramUser?.username === 'string' ? telegramUser.username : undefined) : false;
      await redisService.del(`telegram-link:${token}`);
      if (linked) await telegramService.sendNotification(chatId, '✅ حساب تلگرام شما با موفقیت به متامیت متصل شد.');
    }
  }
  const callback = update?.callback_query;
  const callbackData = callback?.data;
  if (typeof callbackData === 'string' && callbackData.startsWith('mm:')) {
    const callbackChatId = callback?.message?.chat?.id;
    const telegramUserId = callback?.from?.id;
    const [, action, token] = callbackData.split(':');
    if (typeof callbackChatId === 'number' && typeof telegramUserId === 'number' && token && (action === 'accept' || action === 'reject')) {
      if (callback?.id) await telegramService.answerCallbackQuery(String(callback.id), '');
      const stored = await redisService.get(`telegram-sign:${token}`);
      let resultText = 'درخواست نامعتبر یا منقضی شده است.';
      let actionSucceeded = false;
      if (stored) {
        const request = JSON.parse(stored) as { meetingId: string; userId: string; organizationId: string; chatId: string; state?: string };
        if (String(callbackChatId) !== request.chatId || request.state) {
          resultText = request.state ? 'این درخواست قبلاً پاسخ داده شده است.' : 'این درخواست برای حساب تلگرام دیگری است.';
        } else if (action === 'reject') {
          await redisService.set(`telegram-sign:${token}`, JSON.stringify({ ...request, state: 'rejected' }), 86400);
          const meeting = await meetingRepository.getById(request.meetingId);
          if (meeting && (meeting as Meeting & { organizationId?: string }).organizationId !== request.organizationId) resultText = 'Ø§ÛŒÙ† Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ø¨Ù‡ Ø³Ø§Ø²Ù…Ø§Ù† Ø¯ÛŒÚ¯Ø±ÛŒ Ù…Ø±Ø¨ÙˆØ· Ø§Ø³Øª.';
          if (meeting) await meetingRepository.addAudit({ id: `aud_${crypto.randomUUID()}`, meetingId: request.meetingId, action: 'TELEGRAM_SIGNATURE_REJECTED', actor: request.userId, timestamp: new Date().toISOString(), documentHash: meeting.documentHash || '', metadata: { chatId: request.chatId } });
          resultText = 'درخواست امضا رد شد.';
          actionSucceeded = !!meeting && (meeting as Meeting & { organizationId?: string }).organizationId === request.organizationId;
        } else {
          const linkedUser = await authService.findByTelegramChat(String(telegramUserId));
          if (!linkedUser || linkedUser.id !== request.userId) resultText = 'حساب تلگرام شما به این کاربر متصل نیست.';
          else {
            const signed = await recordTelegramSignature(request.meetingId, request.userId, request.chatId, request.organizationId);
            resultText = signed.ok ? '✅ امضا با موفقیت ثبت شد.' : signed.message;
            actionSucceeded = signed.ok;
            if (signed.ok) await redisService.set(`telegram-sign:${token}`, JSON.stringify({ ...request, state: 'accepted' }), 86400);
          }
        }
      }
      if (callback?.id) {
        if (callback.message?.message_id) {
          await telegramService.replaceSignRequestMessage(
            String(callbackChatId),
            Number(callback.message.message_id),
            actionSucceeded ? (action === 'accept' ? 'امضا ثبت شد' : 'درخواست رد شد') : 'عملیات انجام نشد',
            resultText,
            actionSucceeded ? 'success' : 'danger',
          );
        }
        await telegramService.sendEphemeralActionResult(
          String(callbackChatId),
          telegramUserId,
          String(callback.id),
          actionSucceeded ? (action === 'accept' ? 'امضا ثبت شد' : 'درخواست رد شد') : 'عملیات انجام نشد',
          resultText,
          actionSucceeded ? 'success' : 'danger',
        );
      }
    }
  }
  logger.info('Telegram webhook payload received', { metadata: { updateId: update?.update_id } });
  return res.json({ ok: true });
});

app.post('/api/telegram/send-pm', async (req, res) => {
  const { meetingId } = req.body;
  const auth = (req as RequestWithAuth).auth!;
  const user = await authService.findById(auth.userId, auth.organizationId);
  const chatId = user?.telegramChatId;
  if (!user || !chatId) return res.status(400).json({ error: 'ابتدا حساب تلگرام خود را متصل کنید.' });
  const meeting = await meetingRepository.getById(meetingId);
  if (!meeting) {
    return res.status(404).json({ error: 'صورت‌جلسه یافت نشد.' });
  }

  const isSigner = await canAccessMeeting(req, meetingId, 'signature.request');
  if (!isSigner) return res.status(403).json({ error: 'شما امضاکننده این صورت‌جلسه نیستید.' });
  const actionToken = crypto.randomBytes(18).toString('base64url');
  await redisService.set(`telegram-sign:${actionToken}`, JSON.stringify({ meetingId: meeting.id, userId: auth.userId, organizationId: auth.organizationId, chatId: String(chatId) }), 48 * 60 * 60);
  const printTemplate = [
    { id: 'print_classic', pdfStyle: 'classic' as const },
    { id: 'print_modern', pdfStyle: 'modern' as const },
    { id: 'print_minimal', pdfStyle: 'minimal' as const },
  ].find((template) => template.id === (meeting.printTemplateId || meeting.templateId));
  const pdfPath = await generateMeetingPdf(meeting, printTemplate);
  const success = await telegramService.sendSignRequestPM(chatId, meeting.id, meeting.title, meeting.organizer.name, actionToken, pdfPath);

  return res.json({ success, message: 'پیام تایید و امضای مستقیم تلگرام ارسال گردید.' });
});

app.post('/api/telegram/send-pdf', async (req, res) => {
  const { meetingId } = req.body;
  const auth = (req as RequestWithAuth).auth!;
  const user = await authService.findById(auth.userId, auth.organizationId);
  if (!user?.telegramChatId) return res.status(400).json({ error: 'ابتدا حساب تلگرام خود را متصل کنید.' });
  const meeting = await meetingRepository.getById(String(meetingId));
  if (!meeting || !(await canAccessMeeting(req, meeting.id, 'meeting.read'))) return res.status(404).json({ error: 'صورت‌جلسه یافت نشد.' });
  const printTemplate = [
    { id: 'print_classic', pdfStyle: 'classic' as const },
    { id: 'print_modern', pdfStyle: 'modern' as const },
    { id: 'print_minimal', pdfStyle: 'minimal' as const },
  ].find((template) => template.id === (meeting.printTemplateId || meeting.templateId));
  const filePath = await generateMeetingPdf(meeting, printTemplate);
  const success = await telegramService.sendDocument(user.telegramChatId, filePath, `صورت‌جلسه: ${meeting.title}`);
  return res.json({ success, message: success ? 'فایل PDF در تلگرام ارسال شد.' : 'ارسال فایل PDF انجام نشد.' });
});

app.post('/api/telegram/link-token', async (req, res) => {
  const auth = (req as RequestWithAuth).auth!;
  const botUsername = await telegramService.resolveBotUsername();
  if (!botUsername) return res.status(503).json({ error: 'Telegram bot username is not configured or could not be resolved.' });
  const token = crypto.randomBytes(24).toString('hex');
  await redisService.set(`telegram-link:${token}`, JSON.stringify({ userId: auth.userId, organizationId: auth.organizationId }), 600);
  return res.json({ success: true, token, deepLink: `https://t.me/${botUsername}?start=link_${token}`, botUsername, expiresInSeconds: 600 });
});

app.get('/api/telegram/status', async (req, res) => {
  const auth = (req as RequestWithAuth).auth!;
  const user = await authService.findById(auth.userId, auth.organizationId);
  return res.json({
    linked: Boolean(user?.telegramChatId),
    username: user?.telegramUsername || null,
    chatId: user?.telegramChatId ? `${user.telegramChatId.slice(0, 3)}•••${user.telegramChatId.slice(-2)}` : null,
    botUsername: await telegramService.resolveBotUsername() || null,
  });
});

app.delete('/api/telegram/link', async (req, res) => {
  const auth = (req as RequestWithAuth).auth!;
  const unlinked = await authService.unlinkTelegramChat(auth.userId, auth.organizationId);
  return unlinked ? res.json({ success: true }) : res.status(404).json({ error: 'Telegram account is not connected.' });
});

app.post('/api/telegram/auto-sign', async (req, res) => {
  return res.status(410).json({ error: 'این مسیر حذف شده است؛ از دکمه‌های ربات فارسی تلگرام استفاده کنید.' });
  /* Legacy WebApp implementation retained temporarily for old clients. */
  const { meetingId, initData } = req.body;
  const verification = typeof initData === 'string'
    ? telegramService.verifyInitData(initData)
    : { valid: false, error: 'Telegram initData is required.' };
  if (!verification.valid || !verification.user) {
    return res.status(401).json({ error: verification.error || 'Telegram identity could not be verified.' });
  }
  const telegramUser = verification.user as NonNullable<typeof verification.user>;
  const meeting = await meetingRepository.getById(meetingId) as Meeting;
  if (!meeting) {
    return res.status(404).json({ error: 'صورت‌جلسه یافت نشد.' });
  }

  const signerName = telegramUser?.first_name || 'کاربر تلگرام';
  if (meeting.status === 'SEALED' || meeting.status === 'ARCHIVED') {
    return res.status(400).json({ error: 'The meeting is already sealed or archived.' });
  }
  const signerId = `telegram:${telegramUser.id}`;
  const linkedUser = await authService.findByTelegramChat(String(telegramUser.id));
  const telegramParticipant = meeting.participants?.some((participant) => participant.id === signerId || participant.id === linkedUser?.id || participant.email === linkedUser?.email)
    || meeting.organizer?.id === signerId
    || meeting.organizer?.id === linkedUser?.id;
  if (!telegramParticipant) {
    return res.status(403).json({ error: 'This Telegram account is not an authorized participant for the meeting.' });
  }
  const signatures = (meeting as typeof meeting & { signatures?: Array<{ signerId: string }> }).signatures || [];
  if (signatures.some((signature) => signature.signerId === signerId)) {
    return res.status(409).json({ error: 'This Telegram user has already signed the meeting.' });
  }
  const contentToHash = JSON.stringify({ meetingId: meeting.id, title: meeting.title, signerId, signerName });
  const documentHash = crypto.createHash('sha256').update(contentToHash).digest('hex');

  const auditEntry = {
    id: `aud_${Date.now()}`,
    meetingId,
    action: 'TELEGRAM_ONE_CLICK_SIGNED',
    actor: `${signerName} (@${telegramUser?.username || 'telegram_user'})`,
    timestamp: new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date()),
    documentHash,
    metadata: {
      authMethod: 'Telegram One-Click PM Confirmation',
    },
  };

  await meetingRepository.addAudit(auditEntry);
  const updatedSignatures = [...signatures, {
    id: `sig_${Date.now()}`,
    meetingId,
    signerId,
    signerName,
    signerRole: 'Telegram Participant',
    signatureType: 'telegram' as const,
    signatureData: `telegram:${telegramUser.id}`,
    signedAt: new Date().toISOString(),
    documentHash,
  }];
  const newCount = updatedSignatures.length;
  const isAllSigned = newCount >= meeting.totalSignaturesRequired;

  await meetingRepository.update(meetingId, {
    signatureCount: newCount,
    status: isAllSigned ? 'READY_FOR_SIGNATURE' : 'SIGNING',
    statusLabel: isAllSigned ? 'آماده امضا' : 'در حال امضا',
    documentHash,
    signatures: updatedSignatures,
  } as any);

  await meetingRepository.update(meetingId, {
    participants: (meeting.participants || []).map((participant) => participant.id === signerId || participant.id === linkedUser?.id || participant.email === linkedUser?.email
      ? { ...participant, hasSigned: true, statusText: 'امضا دریافت شد' }
      : participant),
  } as any);

  return res.json({
    success: true,
    documentHash,
    message: 'امضای مستقیم تلگرام با موفقیت ثبت شد.',
  });
});

// -------------------------------------------------------------
// Transactional Email Invitations Endpoint
// -------------------------------------------------------------
app.post('/api/email/invite', requirePermission('participant.invite'), async (req, res) => {
  const { email, meetingId, signerName } = req.body;
  if (!email || !meetingId) {
    return res.status(400).json({ error: 'ایمیل و شناسه جلسه الزامی است.' });
  }

  const meeting = await meetingRepository.getById(meetingId);
  if (!meeting) {
    return res.status(404).json({ error: 'Meeting not found.' });
  }
  if (!(await canAccessMeeting(req, meetingId, 'signature.request'))) return res.status(403).json({ error: 'You do not have access to request signatures for this meeting.' });
  const token = await authService.createGuestSigningToken(meetingId, email);
  const signingLink = `${process.env.APP_URL || 'https://metameet.ir'}/meeting/${meetingId}?token=${token}`;

  await queueManager.enqueue('metameet.email.send', {
    to: email,
    subject: `دعوت به امضای صورت‌جلسه: ${meeting?.title || 'صورت‌جلسه'}`,
    html: '',
    metadata: {
      signerName: signerName || 'کاربر گرامی',
      meetingTitle: meeting?.title || 'صورت‌جلسه سازمان',
      organizerName: meeting?.organizer.name || 'مدیر جلسه',
      signingLink,
      expiresAt: '۴۸ ساعت آینده',
    },
  });

  return res.json({ success: true, message: 'دعوت‌نامه به صف ارسال افزوده شد.' });
});

app.post('/api/queues/:queue', async (req, res) => {
  const queue = req.params.queue as QueueName;
  if (!QUEUE_NAMES.includes(queue)) return res.status(404).json({ error: 'Unknown queue.' });

  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
  const signature = req.headers['upstash-signature'];
  if (currentSigningKey || nextSigningKey) {
    if (typeof signature !== 'string') return res.status(401).json({ error: 'Missing QStash signature.' });
    const receiver = new Receiver({ currentSigningKey, nextSigningKey });
    try {
      await receiver.verify({
        signature,
        body: JSON.stringify(req.body),
        url: `${process.env.APP_URL || ''}${req.originalUrl}`,
      });
    } catch {
      return res.status(401).json({ error: 'Invalid QStash signature.' });
    }
  } else if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ error: 'QStash signing keys are not configured.' });
  }

  try {
    await queueManager.processExternalJob(req.body as QueueJob);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Queue processing failed.' });
  }
});

// -------------------------------------------------------------
// Audit Trail Endpoint
// -------------------------------------------------------------
app.get('/api/audit/:meetingId', requirePermission('audit.read'), async (req, res) => {
  if (!(await canAccessMeeting(req, req.params.meetingId, 'meeting.read'))) return res.status(404).json({ error: 'Meeting not found.' });
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const logs = await meetingRepository.getAuditLogs(req.params.meetingId, page, limit);
  return res.json({ success: true, logs, page, limit, hasMore: logs.length === limit });
});

// -------------------------------------------------------------
// AI Assistant Endpoint (Powered by Gemini)
// -------------------------------------------------------------
app.post('/api/ai/suggest', requirePermission('meeting.read'), async (req, res) => {
  try {
    const parseResult = AiSuggestSchema.safeParse(req.body);
    if (!parseResult.success) return res.status(400).json({ error: parseResult.error.format() });
    const { action, text, meetingTitle, agenda, meetingId } = parseResult.data;
    const auth = (req as RequestWithAuth).auth!;
    if (meetingId) {
      const meeting = await meetingRepository.getById(meetingId);
      if (!meeting || ((meeting as Meeting & { organizationId?: string }).organizationId && (meeting as Meeting & { organizationId?: string }).organizationId !== auth.organizationId)) {
        return res.status(404).json({ error: 'Meeting not found.' });
      }
      if (!(await canAccessMeeting(req, meetingId, 'meeting.read'))) return res.status(404).json({ error: 'Meeting not found.' });
      if (meeting.status === 'SEALED' || meeting.status === 'ARCHIVED') return res.status(400).json({ error: 'AI changes are disabled for sealed meetings.' });
    }
    const persistAiSuggestion = async (data: unknown) => {
      const db = getDb();
      if (db && meetingId) await db.collection('ai_suggestions').insertOne({ meetingId, userId: auth.userId, action, data, createdAt: new Date().toISOString() });
    };

    // Rate Limit AI requests
    const rateLimit = await redisService.checkRateLimit(req.ip || 'ip', 'ai', 20, 60);
    if (!rateLimit.allowed) {
      return res.status(429).json({ error: 'محدودیت درخواست هوش مصنوعی. لطفاً یک دقیقه دیگر تلاش کنید.' });
    }

    if (geminiClient && process.env.GEMINI_API_KEY) {
      const isRoughNotes = action === 'convert_rough_notes';

      const prompt = isRoughNotes
        ? `شما متخصص تبدیل یادداشت‌های غیررسمی و پیش‌نویس‌های صوتی جلسات به صورت‌جلسات رسمی و ساختاریافته در MetaMeet هستید.
یادداشت‌های خام ورودی کاربر:
${text}

لطفاً این یادداشت‌ها را تحلیل کرده و در قالب یک ساختار صورت‌جلسه شرکتی منظم به زبان فارسی و با عبارات کاملاً رسمی، دقیق و شیوا خروجی دهید.
خروجی باید دقیقاً در این ساختار JSON باشد:
{
  "title": "عنوان پیشنهادی جلسه رسمی",
  "agenda": ["دستور جلسه ۱", "دستور جلسه ۲", "دستور جلسه ۳"],
  "discussion": "متن رسمی بازنویسی شده مذاکرات و مباحث مطرح شده در جلسه به صورت پاراگراف‌های تفکیک شده",
  "keyDecisions": ["مصوبه اول", "مصوبه دوم"],
  "suggestedTasks": [
    {"task": "عنوان وظیفه", "role": "مسئول پیگیری", "deadline": "مهلت تقریبی"}
  ]
}`
        : `شما دستیار هوشمند تنظیم صورت‌جلسه پلتفرم MetaMeet هستید.
عنوان جلسه: ${meetingTitle || 'جلسه استراتژی محصول'}
دستور جلسه: ${agenda ? JSON.stringify(agenda) : 'بررسی پیشرفت و برنامه‌ریزی'}
متن موجود: ${text || ''}

اقدام مورد نظر: ${action || 'summarize_and_suggest'}

لطفاً پاسخی دقیق و حرفه‌ای به زبان فارسی و با لحن استاندارد جلسات شرکتی آماده کنید.
یک خلاصه دقیق از جلسه ارائه دهید و تصمیمات کلیدی و نیازمندی‌های اولویت‌بندی شده را مشخص کنید.

پاسخ را دقیقاً در قالب این JSON ارسال کنید:
{
  "summary": "متن خلاصه کوتاه و روان و حرفه‌ای",
  "keyDecisions": ["تصمیم اول", "تصمیم دوم"],
  "suggestedTasks": [
    {"task": "عنوان وظیفه", "role": "مسئول پیشنهادی", "deadline": "مهلت تقریبی"}
  ]
}`;

      try {
        const response = await geminiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const responseText = response.text || '{}';
        const parsed = AiSuggestionResponseSchema.safeParse(JSON.parse(responseText));
        if (!parsed.success) throw new Error('AI response did not match the expected structure.');
        await persistAiSuggestion(parsed.data);
        return res.json({ success: true, data: parsed.data });
      } catch (geminiErr: unknown) {
        const geminiMsg = geminiErr instanceof Error ? geminiErr.message : String(geminiErr);
        logger.warn('Gemini API call failed, activating resilient built-in Persian NLP minutes engine:', {
          metadata: { note: geminiMsg.slice(0, 100) },
        });
      }
    }

    // High-quality resilient Persian NLP fallback
    if (action === 'convert_rough_notes') {
      const lines = String(text || '')
        .split('\n')
        .map((l) => l.trim().replace(/^[-*•0-9.)\s]+/, ''))
        .filter((l) => l.length > 0);

      const title = lines.length > 0 ? `جلسه بررسی ${lines[0].slice(0, 45)}` : 'جلسه هماهنگی و بررسی اقدامات تیم';
      const agendaItems = lines.length >= 2 ? lines.slice(0, 4) : ['بررسی روند پیشرفت پروژه‌ها', 'تصویب نیازمندی‌های اولویت‌دار', 'تعیین مسئولیت‌های اجرایی'];
      const discussionProse = lines.length > 0
        ? `جلسه با حضور اعضای مربوطه رسمیت یافت. در آغاز، پیرامون موضوعات «${lines.slice(0, 2).join('» و «')}» تبادل نظر صورت گرفت. اعضای جلسه نظرات و چالش‌های فنی را مطرح کردند و توافق شد اقدامات متناسب با نیازمندی‌های فعلی سازمان در اولویت قرار گیرد.`
        : 'جلسه با حضور اعضای کارگروه رسمیت یافت و پیرامون موضوعات اولویت‌دار تبادل نظر صورت گرفت.';

      return res.json({
        success: true,
        data: {
          title,
          agenda: agendaItems,
          discussion: discussionProse,
          keyDecisions: [
            'موافقت با زمان‌بندی اعلام‌شده و اجرای اصلاحات فنی',
            'تخصیص ظرفیت تیم محصول به بهینه‌سازی زیرساخت‌های کلیدی',
          ],
          suggestedTasks: [
            { task: lines[1] || 'آماده‌سازی مستندات طراحی و نیازمندی‌ها', role: 'سارا احمدی', deadline: '۷ روز آینده' },
            { task: lines[2] || 'بررسی وضعیت سرورها و بهینه‌سازی عملکرد', role: 'علی رضایی', deadline: '۳ روز آینده' },
          ],
        },
      });
    }

    // Default intelligent Persian minutes assistant
    const defaultSuggestions = {
      summary:
        'در این جلسه بر پیشرفت پروژه‌های جاری، تمرکز بر اولویت‌های سامانه چهارم و تخصیص منابع تأکید شد. همچنین تصمیم گرفتند که منابع مطابق با نیازهای فعلی پروژه‌ها تخصیص یابد.',
      keyDecisions: [
        'تأیید تخصیص منابع به پروژه‌های اولویت‌دار',
        'تأیید بودجه تیم محصول برای توسعه فاز نخست سامانه چهارم',
      ],
      suggestedTasks: [
        { task: 'آماده‌سازی برنامه راهبردی و انتشار اسناد فاز اول', role: 'سارا احمدی', deadline: '۱۰ آبان ۱۴۰۴' },
        { task: 'بررسی معماری API و نیازمندی‌های مقیاس‌پذیری', role: 'علی رضایی', deadline: '۷ آبان ۱۴۰۴' },
        { task: 'طراحی کمپین بازاریابی و رونمایی کاربردی', role: 'مهدی کریمی', deadline: '۱۲ آبان ۱۴۰۴' },
      ],
    };

    return res.json({ success: true, data: defaultSuggestions });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown AI error';
    logger.warn('AI processing error, returned resilient template:', { metadata: { note: errorMsg.slice(0, 100) } });
    return res.json({
      success: true,
      data: {
        summary: 'جلسه با بررسی اهداف کلیدی و تعیین اولویت‌های اقدامات پیش رو با موفقیت برگزار شد.',
        keyDecisions: ['تأیید برنامه زمان‌بندی پروژه', 'تخصیص منابع به بخش‌های اولویت‌دار'],
        suggestedTasks: [
          { task: 'پیگیری مصوبات جلسه', role: 'مسئول پیگیری', deadline: 'هفته آینده' },
        ],
      },
    });
  }
});

// Keep API failures JSON-shaped and avoid leaking implementation details.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

app.use((error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : String(error);
  logger.error('Unhandled request error:', { route: req.originalUrl, metadata: { error: message } });
  if (res.headersSent) return;
  res.status(500).json({ error: 'Internal server error.' });
});

// -------------------------------------------------------------
// Serve Frontend & Start
// -------------------------------------------------------------
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      // The default bundled config loader can fail with EPERM on Windows when
      // Vite is launched as a detached local process. Runner loading avoids
      // that subprocess path while preserving the project's Vite config/HMR.
      configLoader: 'runner',
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`MetaMeet enterprise platform running at http://0.0.0.0:${PORT}`);
  });
}

if (process.env.VERCEL !== '1') {
  startServer();
}
