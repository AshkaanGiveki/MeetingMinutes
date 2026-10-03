import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { redisService } from '../../src/server/services/redis.service';

describe('Digital Signature & Integrity Suite', () => {
  it('Should generate reproducible SHA-256 hash for document content', () => {
    const content = 'جلسه استراتژی محصول سامانه چهارم';
    const hash1 = crypto.createHash('sha256').update(content).digest('hex');
    const hash2 = crypto.createHash('sha256').update(content).digest('hex');

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });

  it('Any alteration to document content must change the integrity hash', () => {
    const original = 'جلسه استراتژی محصول سامانه چهارم';
    const altered = 'جلسه استراتژی محصول سامانه چهارم - اصلاح شده';

    const hashOriginal = crypto.createHash('sha256').update(original).digest('hex');
    const hashAltered = crypto.createHash('sha256').update(altered).digest('hex');

    expect(hashOriginal).not.toBe(hashAltered);
  });

  it('Rate Limiting should block requests when limit exceeded', async () => {
    const ip = 'test-client-ip';
    const action = 'test_sign';

    // 3 requests allowed within window
    const req1 = await redisService.checkRateLimit(ip, action, 3, 10);
    const req2 = await redisService.checkRateLimit(ip, action, 3, 10);
    const req3 = await redisService.checkRateLimit(ip, action, 3, 10);
    const req4 = await redisService.checkRateLimit(ip, action, 3, 10);

    expect(req1.allowed).toBe(true);
    expect(req2.allowed).toBe(true);
    expect(req3.allowed).toBe(true);
    expect(req4.allowed).toBe(false);
  });

  it('Idempotency keys should prevent duplicate processing', async () => {
    const idempotencyKey = `tx_${Date.now()}_abc`;

    const firstAttempt = await redisService.checkIdempotency(idempotencyKey);
    const secondAttempt = await redisService.checkIdempotency(idempotencyKey);

    expect(firstAttempt).toBe(true);
    expect(secondAttempt).toBe(false);
  });
});
