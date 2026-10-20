import { afterEach, describe, expect, it, vi } from 'vitest';
import { TelegramService } from '../../src/server/services/telegram.service';

afterEach(() => vi.unstubAllGlobals());

describe('Telegram action confirmation', () => {
  const service = new TelegramService('test-token');

  it('sends an ephemeral result without replacing the edited original', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);
    expect(await service.sendEphemeralActionResult(42, 42, 'callback', 'Done', 'Signed')).toBe(true);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.ephemeral_message_parameters).toEqual({
      receiver_user_id: 42, callback_query_id: 'callback', replace_callback_query_message: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to a bounded callback notification for MESSAGE_ID_INVALID', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ status: 400, json: async () => ({ ok: false, error_code: 400, description: 'Bad Request: MESSAGE_ID_INVALID' }) })
      .mockResolvedValueOnce({ json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);
    expect(await service.sendEphemeralActionResult(42, 42, 'callback', 'Done', 'x'.repeat(300))).toBe(true);
    expect(fetchMock.mock.calls[1][0]).toContain('/answerCallbackQuery');
    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body.callback_query_id).toBe('callback');
    expect(body.text).toHaveLength(200);
  });

  it('falls back on network failure and reports callback failure', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ json: async () => ({ ok: false }) });
    vi.stubGlobal('fetch', fetchMock);
    expect(await service.sendEphemeralActionResult(42, 42, 'callback', 'Done', 'Signed')).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
