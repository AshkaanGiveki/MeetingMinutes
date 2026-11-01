import { describe, expect, it } from 'vitest';
import { otpService } from '../../src/server/services/otp.service';

describe('authentication PRD OTP invariants', () => {
  it('binds an OTP to its purpose and invitation reference and consumes it once', async () => {
    const destination = `0912${Date.now().toString().slice(-7)}`;
    const issued = await otpService.issue('invitation_acceptance', destination, 'invitation-a');

    expect(issued.ok).toBe(true);
    expect(issued.code).toMatch(/^\d{6}$/);
    await expect(otpService.verify('invitation_acceptance', destination, issued.code!, 'invitation-b')).resolves.toEqual({ ok: false, reason: 'OTP is invalid or expired.' });
    await expect(otpService.verify('invitation_acceptance', destination, issued.code!, 'invitation-a')).resolves.toEqual({ ok: true });
    await expect(otpService.verify('invitation_acceptance', destination, issued.code!, 'invitation-a')).resolves.toEqual({ ok: false, reason: 'OTP is invalid or expired.' });
  });

  it('rejects incorrect codes and removes the challenge after the fifth failed attempt', async () => {
    const destination = `0913${Date.now().toString().slice(-7)}`;
    const issued = await otpService.issue('login', destination);
    expect(issued.ok).toBe(true);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(otpService.verify('login', destination, '000000')).resolves.toEqual({ ok: false, reason: 'OTP is invalid or expired.' });
    }
    await expect(otpService.verify('login', destination, issued.code!, '')).resolves.toEqual({ ok: false, reason: 'OTP is invalid or expired.' });
  });
});
