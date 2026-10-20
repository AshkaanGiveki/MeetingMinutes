import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'http';

// Exercise the real HTTP webhook and MeetingRepository against an isolated store.
// Telegram, PDF rendering, Mongo transport and Redis transport never leave the test.
const state = vi.hoisted(() => ({
  documents: {} as Record<string, any[]>,
  cache: new Map<string, string>(),
  failWrite: false,
  conflict: false,
}));
const dependencies = vi.hoisted(() => ({
  auth: {
    ensureBootstrapOwner: vi.fn(),
    findById: vi.fn(), findByTelegramChat: vi.fn(),
    createInternalSession: vi.fn(async () => 'internal'), revokeSession: vi.fn(),
  },
  telegram: {
    ensureWebhook: vi.fn(), sendNotification: vi.fn(), sendDocument: vi.fn(),
    sendEphemeralActionResult: vi.fn(async () => true),
    replaceSignRequestMessageV2: vi.fn(async () => true),
  },
  render: vi.fn(async () => { throw new Error('PDF unavailable'); }),
}));

vi.mock('dotenv/config', () => ({}));
vi.mock('../../src/server/services/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('../../src/server/worker', () => ({ initializeWorker: vi.fn() }));
vi.mock('../../src/server/services/auth.service', () => ({ authService: dependencies.auth, normalizePhoneNumber: vi.fn() }));
vi.mock('../../src/server/services/telegram.service', () => ({ telegramService: dependencies.telegram }));
vi.mock('../../src/server/services/html-pdf.service', () => ({ generateHtmlMeetingPdf: dependencies.render }));
vi.mock('../../src/server/services/notification.service', () => ({ notificationService: { create: vi.fn() } }));
vi.mock('../../src/server/queues/queue.service', () => ({
  QUEUE_NAMES: [], queueManager: { enqueue: vi.fn(), getDiagnostics: vi.fn(() => ({})) },
}));
vi.mock('../../src/server/services/redis.service', () => ({ redisService: {
  get: vi.fn(async (key: string) => state.cache.get(key) || null),
  set: vi.fn(async (key: string, value: string) => { state.cache.set(key, value); }),
  del: vi.fn(async (key: string) => { state.cache.delete(key); }),
  acquireLock: vi.fn(async () => true), releaseLock: vi.fn(),
} }));
vi.mock('../../src/server/db/mongodb', () => {
  const matches = (doc: any, filter: any): boolean => Object.entries(filter).every(([key, value]: [string, any]) => {
    if (key === '$or') return value.some((item: any) => matches(doc, item));
    if (value && typeof value === 'object') {
      if ('$exists' in value) return (doc[key] !== undefined) === value.$exists;
      if ('$in' in value) return value.$in.includes(doc[key]);
    }
    return doc[key] === value;
  });
  const db = { collection: (name: string) => ({
    findOne: async (filter: any) => structuredClone((state.documents[name] || []).find((doc) => matches(doc, filter)) || null),
    find: (filter: any) => {
      const cursor: any = { project: () => cursor, toArray: async () => structuredClone((state.documents[name] || []).filter((doc) => matches(doc, filter))) };
      return cursor;
    },
    updateOne: async (filter: any, update: any) => {
      if (state.failWrite) throw new Error('database write failed');
      if (state.conflict) return { matchedCount: 0 };
      const doc = (state.documents[name] || []).find((item) => matches(item, filter));
      if (!doc) return { matchedCount: 0 };
      Object.assign(doc, structuredClone(update.$set));
      return { matchedCount: 1 };
    },
    insertOne: async (doc: any) => { (state.documents[name] ||= []).push(structuredClone(doc)); },
  }) };
  return { getDb: () => db, connectMongoDB: async () => ({ db }), markMongoUnavailable: vi.fn() };
});

describe('Telegram sign button in production', () => {
  let server: Server;
  let origin: string;
  const user = { id: 'signer', name: 'Signer', telegramChatId: '42', signatureData: 'typed:Signer' };
  beforeAll(async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('APP_URL', 'https://example.test');
    vi.stubEnv('MONGODB_URI', 'mongodb://unused');
    vi.stubEnv('AUTH_SECRET', 'test-only');
    vi.stubEnv('TELEGRAM_WEBHOOK_SECRET', 'test-secret');
    const { app } = await import('../../server');
    server = await new Promise<Server>((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No test port');
    origin = `http://127.0.0.1:${address.port}`;
  }, 60000);
  afterAll(async () => {
    if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    vi.unstubAllEnvs();
  });
  beforeEach(() => {
    vi.clearAllMocks();
    state.failWrite = false;
    state.conflict = false;
    state.documents = {
      meetings: [{ id: 'minute', organizationId: 'org', title: 'Minute', status: 'READY_FOR_SIGNATURE',
        organizer: { id: 'editor', name: 'Editor', role: 'Editor' },
        participants: [
          { id: 'signer', name: 'Signer', role: 'Signer', requiresSignature: true },
          { id: 'other', name: 'Other', role: 'Signer', requiresSignature: true },
        ], signatures: [],
      }],
      meeting_members: [], users: [], audit_logs: [],
    };
    state.cache.clear();
    state.cache.set('telegram-sign:token', JSON.stringify({ meetingId: 'minute', userId: 'signer', organizationId: 'org', chatId: '42' }));
    dependencies.auth.findByTelegramChat.mockResolvedValue(user);
    dependencies.auth.findById.mockImplementation(async (id) => id === 'signer' ? user : null);
  });
  const click = async (from = 42, chat = 42, token = 'token', secret = 'test-secret') => {
    const response = await fetch(`${origin}/api/telegram/webhook`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-telegram-bot-api-secret-token': secret },
      body: JSON.stringify({ update_id: 1, callback_query: { id: 'callback', data: `mm:accept:${token}`, from: { id: from }, message: { message_id: 10, chat: { id: chat } } } }),
    });
    await response.json();
    return response.status;
  };

  it('persists the saved account signature, count, participant flag, hash, audit and accepted token', async () => {
    expect(await click()).toBe(200);
    const saved = state.documents.meetings[0];
    expect(saved.status).toBe('SIGNING');
    expect(saved.signatureCount).toBe(1);
    expect(saved.signatures).toHaveLength(1);
    expect(saved.signatures[0]).toMatchObject({ signerId: 'signer', signatureData: 'typed:Signer', signatureType: 'type' });
    expect(saved.documentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(saved.participants[0].hasSigned).toBe(true);
    expect(state.documents.audit_logs.map((record) => record.action)).toContain('SIGNATURE_COMPLETED');
    expect(JSON.parse(state.cache.get('telegram-sign:token')!).state).toBe('accepted');
    expect(dependencies.telegram.replaceSignRequestMessageV2).toHaveBeenCalledWith('42', 10, expect.any(String), expect.any(String), 'success');
  });

  it('does not create another signature on a duplicate delivery', async () => {
    await click();
    await click();
    expect(state.documents.meetings[0].signatures).toHaveLength(1);
    expect(state.documents.audit_logs.filter((record) => record.action === 'SIGNATURE_COMPLETED')).toHaveLength(1);
  });

  it('acknowledges an already persisted signature if the token state was not saved', async () => {
    await click();
    const token = JSON.parse(state.cache.get('telegram-sign:token')!);
    delete token.state;
    state.cache.set('telegram-sign:token', JSON.stringify(token));
    dependencies.telegram.replaceSignRequestMessageV2.mockClear();
    expect(await click()).toBe(200);
    expect(state.documents.meetings[0].signatures).toHaveLength(1);
    expect(JSON.parse(state.cache.get('telegram-sign:token')!).state).toBe('accepted');
    expect(dependencies.telegram.replaceSignRequestMessageV2).toHaveBeenCalledWith('42', 10, expect.any(String), expect.any(String), 'success');
  });

  it('accepts uploaded account signatures and existing versioned minutes', async () => {
    state.documents.meetings[0].version = 4;
    dependencies.auth.findById.mockResolvedValue({ ...user, signatureData: 'data:image/png;base64,test' });
    expect(await click()).toBe(200);
    expect(state.documents.meetings[0].version).toBe(5);
    expect(state.documents.meetings[0].signatures[0]).toMatchObject({ signatureType: 'upload', signatureData: 'data:image/png;base64,test' });
  });

  it('archives the minute when the last required signer signs, even if PDF delivery fails', async () => {
    state.documents.meetings[0].participants.pop();
    expect(await click()).toBe(200);
    const saved = state.documents.meetings[0];
    expect(saved.signatures).toHaveLength(1);
    expect(saved.status).toBe('ARCHIVED');
    expect(state.documents.audit_logs.map((record) => record.action)).toEqual(['SIGNATURE_COMPLETED', 'DOCUMENT_SEALED', 'DOCUMENT_ARCHIVED']);
  });

  it.each(['expired', 'wrong-chat', 'wrong-user', 'missing-signature', 'not-ready', 'wrong-org', 'not-signer'])(
    'rejects %s without saving or removing the sign button', async (scenario) => {
      if (scenario === 'missing-signature') dependencies.auth.findById.mockResolvedValue({ ...user, signatureData: undefined });
      if (scenario === 'wrong-user') dependencies.auth.findByTelegramChat.mockResolvedValue({ ...user, id: 'intruder' });
      if (scenario === 'not-ready') state.documents.meetings[0].status = 'DRAFT';
      if (scenario === 'wrong-org') state.documents.meetings[0].organizationId = 'different';
      if (scenario === 'not-signer') state.documents.meetings[0].participants[0].role = 'Viewer';
      expect(await click(42, scenario === 'wrong-chat' ? 43 : 42, scenario === 'expired' ? 'expired' : 'token')).toBe(200);
      expect(state.documents.meetings[0].signatures).toHaveLength(0);
      expect(dependencies.telegram.replaceSignRequestMessageV2).not.toHaveBeenCalled();
      expect(dependencies.telegram.sendEphemeralActionResult).toHaveBeenCalledWith(expect.anything(), 42, 'callback', expect.any(String), expect.any(String), 'danger');
    },
  );

  it('keeps the token and button retryable on a version conflict', async () => {
    state.conflict = true;
    expect(await click()).toBe(200);
    expect(state.documents.meetings[0].signatures).toHaveLength(0);
    expect(state.documents.audit_logs).toHaveLength(0);
    expect(JSON.parse(state.cache.get('telegram-sign:token')!).state).toBeUndefined();
    expect(dependencies.telegram.replaceSignRequestMessageV2).not.toHaveBeenCalled();
  });

  it('returns an error rather than success when the database write fails', async () => {
    state.failWrite = true;
    expect(await click()).toBe(500);
    expect(state.documents.meetings[0].signatures).toHaveLength(0);
    expect(dependencies.telegram.replaceSignRequestMessageV2).not.toHaveBeenCalled();
  });

  it('requires the webhook secret', async () => {
    expect(await click(42, 42, 'token', 'wrong')).toBe(401);
    expect(state.documents.meetings[0].signatures).toHaveLength(0);
  });
});
