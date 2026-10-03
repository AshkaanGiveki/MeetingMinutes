import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { TelegramService } from '../../src/server/services/telegram.service';

describe('Telegram WebApp HMAC Cryptographic Verification', () => {
  const testBotToken = '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11';
  const telegramService = new TelegramService(testBotToken);

  it('Should successfully verify authentic Telegram initData payload', () => {
    const userPayload = JSON.stringify({
      id: 987654321,
      first_name: 'Arash',
      username: 'arash_fathi',
    });

    const authDate = '1727940000';
    const queryId = 'AAHdF6IQAAAAAN0XohDhrOrc';

    // Construct valid HMAC-SHA256 according to Telegram specification
    const dataCheckString = `auth_date=${authDate}\nquery_id=${queryId}\nuser=${userPayload}`;
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(testBotToken).digest();
    const validHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    const validInitData = `auth_date=${authDate}&query_id=${queryId}&user=${encodeURIComponent(
      userPayload
    )}&hash=${validHash}`;

    const result = telegramService.verifyInitData(validInitData);
    expect(result.valid).toBe(true);
    expect(result.user?.id).toBe(987654321);
    expect(result.user?.username).toBe('arash_fathi');
  });

  it('Should reject tampered Telegram initData payload with corrupted hash', () => {
    const tamperedInitData = 'auth_date=1727940000&query_id=fake&hash=corruptedhash1234567890';
    const result = telegramService.verifyInitData(tamperedInitData);
    expect(result.valid).toBe(false);
  });
});
