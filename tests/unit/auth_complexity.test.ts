import { describe, it, expect } from 'vitest';
import { authService } from '../../src/server/services/auth.service';

function isPasswordStrong(pwd: string): boolean {
  if (pwd.length < 8) return false;
  if (!/[a-z]/.test(pwd)) return false;
  if (!/[A-Z]/.test(pwd)) return false;
  if (!/[0-9]/.test(pwd)) return false;
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) return false;
  return true;
}

describe('Enterprise Authentication & Password Security Suite', () => {
  it('Should reject weak passwords with less than 8 characters', () => {
    expect(isPasswordStrong('Pass1!_')).toBe(false);
  });

  it('Should reject passwords without uppercase characters', () => {
    expect(isPasswordStrong('metameet@2028')).toBe(false);
  });

  it('Should reject passwords without numbers', () => {
    expect(isPasswordStrong('MetaMeet@Password')).toBe(false);
  });

  it('Should reject passwords without special characters', () => {
    expect(isPasswordStrong('MetaMeet2028NoSymbol')).toBe(false);
  });

  it('Should accept compliant enterprise passwords meeting all 5 requirements', () => {
    expect(isPasswordStrong('MetaMeet@2028')).toBe(true);
    expect(isPasswordStrong('Str0ng#Persian99')).toBe(true);
  });

  it('AuthService: Should allow password reset for registered users', () => {
    const success = authService.resetPassword('arash.fathi@metameet.ir', 'NewSecure#Pass99');
    expect(success).toBe(true);
  });

  it('AuthService: Should reject password reset for non-existent emails', () => {
    const success = authService.resetPassword('unknown.user@metameet.ir', 'NewSecure#Pass99');
    expect(success).toBe(false);
  });
});
