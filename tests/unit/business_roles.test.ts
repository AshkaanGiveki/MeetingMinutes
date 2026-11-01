import { describe, expect, it } from 'vitest';
import { mockRoles } from '../../src/mockRoles';
import { normalizeOrganizationRole } from '../../src/server/services/organization.service';

describe('business roles', () => {
  it('offers only the six current mock identities', () => {
    expect(mockRoles.map((role) => role.id)).toEqual([
      'SuperAdmin', 'Owner', 'User', 'ProjectManager', 'Stakeholder', 'CustomerClerk',
    ]);
  });

  it('shows user management only to identities that can add people', () => {
    expect(mockRoles.filter((role) => role.scope).map((role) => role.id)).toEqual([
      'SuperAdmin', 'Owner', 'Stakeholder',
    ]);
  });

  it('treats former organization admins as ordinary organization users', () => {
    expect(normalizeOrganizationRole('Admin')).toBe('User');
    expect(normalizeOrganizationRole('Owner')).toBe('Owner');
  });
});
