import { describe, it, expect } from 'vitest';
import { hasPermission, canTransitionMeeting } from '../../src/server/policies/rbac';

describe('RBAC & Permission Policy Suite', () => {
  it('Owner should have full organizational and meeting permissions', () => {
    expect(hasPermission('Owner', 'meeting.create')).toBe(true);
    expect(hasPermission('Owner', 'meeting.finalize')).toBe(true);
    expect(hasPermission('Owner', 'signature.sign')).toBe(true);
    expect(hasPermission('Owner', 'organization.manage')).toBe(true);
  });

  it('Viewer should only have read permissions', () => {
    expect(hasPermission('Viewer', 'meeting.read')).toBe(true);
    expect(hasPermission('Viewer', 'meeting.edit')).toBe(false);
    expect(hasPermission('Viewer', 'signature.sign')).toBe(false);
    expect(hasPermission('Viewer', 'meeting.finalize')).toBe(false);
  });

  it('Participant can comment, while signing needs a separate meeting assignment', () => {
    expect(hasPermission('Participant', 'meeting.read')).toBe(true);
    expect(hasPermission('Participant', 'signature.sign')).toBe(false);
    expect(hasPermission('Participant', 'comment.create')).toBe(true);
    expect(hasPermission('Participant', 'meeting.finalize')).toBe(false);
  });

  it('review and sign are independent meeting permissions', () => {
    expect(hasPermission('Reviewer', 'meeting.review')).toBe(true);
    expect(hasPermission('Reviewer', 'signature.sign')).toBe(false);
    expect(hasPermission('Signer', 'signature.sign')).toBe(true);
    expect(hasPermission('Signer', 'meeting.review')).toBe(false);
    expect(hasPermission('Editor', 'signature.sign')).toBe(false);
    expect(hasPermission('Organizer', 'signature.sign')).toBe(false);
  });

  it('State Machine: Should allow valid transition from DRAFT to IN_REVIEW', () => {
    const result = canTransitionMeeting('DRAFT', 'IN_REVIEW', 'Organizer');
    expect(result.allowed).toBe(true);
  });

  it('State Machine: Should reject illegal transition from DRAFT directly to SEALED', () => {
    const result = canTransitionMeeting('DRAFT', 'SEALED', 'Owner');
    expect(result.allowed).toBe(false);
  });

  it('State Machine: Should permanently block transitions once document is SEALED', () => {
    const result = canTransitionMeeting('SEALED', 'DRAFT', 'Owner');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('تغییرناپذیر');
  });
});
