import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (job: any) => Promise<void>>(),
  getMeeting: vi.fn(), getCache: vi.fn(),
  send: vi.fn(async () => true), render: vi.fn(async () => '/tmp/test.pdf'),
  session: vi.fn(async () => 'session'), revoke: vi.fn(),
}));
vi.mock('../../src/server/queues/queue.service', () => ({ queueManager: {
  registerHandler: (name: string, handler: (job: any) => Promise<void>) => mocks.handlers.set(name, handler),
} }));
vi.mock('../../src/server/repositories/meeting.repository', () => ({ meetingRepository: { getById: mocks.getMeeting } }));
vi.mock('../../src/server/services/redis.service', () => ({ redisService: { get: mocks.getCache } }));
vi.mock('../../src/server/services/telegram.service', () => ({ telegramService: { sendSignRequestPM: mocks.send } }));
vi.mock('../../src/server/services/html-pdf.service', () => ({ generateHtmlMeetingPdf: mocks.render }));
vi.mock('../../src/server/services/auth.service', () => ({ authService: { createInternalSession: mocks.session, revokeSession: mocks.revoke } }));
vi.mock('../../src/server/services/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { initializeWorker } from '../../src/server/worker';

describe('Telegram delivery uses active signatures', () => {
  const job = { id: 'job', payload: { meetingId: 'minute', participantId: 'A', chatId: '42', organizationId: 'org', actionToken: 'token', meetingTitle: 'Minute', organizerName: 'Editor' } };
  const run = (value = job) => mocks.handlers.get('metameet.telegram.sign_request')!(value);
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.handlers.clear();
    initializeWorker();
    mocks.getMeeting.mockResolvedValue({ id: 'minute', organizer: { id: 'editor' }, signatures: [] });
    // Simulate stale completion flags left by the old implementation.
    mocks.getCache.mockImplementation(async (key: string) => key.startsWith('telegram-signature-completed:') ? '1' : null);
  });

  it('notifies A again after cancellation despite an old completion marker', async () => {
    await run();
    expect(mocks.send).toHaveBeenCalledWith('42', 'minute', 'Minute', 'Editor', 'token', '/tmp/test.pdf');
    expect(mocks.getCache).not.toHaveBeenCalledWith('telegram-signature-completed:minute:A');
  });

  it('skips A only when A has a current signature, even without a cache marker', async () => {
    mocks.getCache.mockResolvedValue(null);
    mocks.getMeeting.mockResolvedValue({ id: 'minute', signatures: [{ signerId: 'A' }] });
    await run();
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.render).not.toHaveBeenCalled();
  });

  it('does not skip A because B has signed', async () => {
    mocks.getMeeting.mockResolvedValue({ id: 'minute', organizer: { id: 'editor' }, signatures: [{ signerId: 'B' }] });
    await run();
    expect(mocks.send).toHaveBeenCalledOnce();
  });

  it('delivers again when a previously active signature is cancelled', async () => {
    mocks.getMeeting.mockResolvedValueOnce({ id: 'minute', signatures: [{ signerId: 'A' }] });
    await run();
    expect(mocks.send).not.toHaveBeenCalled();
    await run();
    expect(mocks.send).toHaveBeenCalledOnce();
  });

  it('resolves the signer from the token for legacy jobs', async () => {
    mocks.getCache.mockResolvedValue(JSON.stringify({ userId: 'A' }));
    mocks.getMeeting.mockResolvedValue({ id: 'minute', signatures: [{ signerId: 'A' }] });
    await run({ ...job, payload: { ...job.payload, participantId: '' } });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('requires a current meeting even when a queued PDF exists', async () => {
    mocks.getMeeting.mockResolvedValue(null);
    await expect(run({ ...job, payload: { ...job.payload, pdfBase64: 'cGRm' } } as typeof job)).rejects.toThrow('not found');
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
