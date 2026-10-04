import { describe, expect, it } from 'vitest';
import { hasPermissionSet, RolePermissionsMap } from '../../src/server/policies/rbac';

describe('organization and meeting access boundaries', () => {
  it('keeps organization-wide visibility separate from a basic member assignment', () => {
    expect(RolePermissionsMap.Owner).toContain('meeting.view_all');
    expect(RolePermissionsMap.Participant).not.toContain('meeting.view_all');
    expect(hasPermissionSet(RolePermissionsMap.Participant, 'meeting.read')).toBe(true);
  });

  it('supports meeting-specific capabilities without changing the user identity model', () => {
    const reviewerAssignment = RolePermissionsMap.Reviewer;
    const viewerAssignment = RolePermissionsMap.Viewer;
    expect(hasPermissionSet(reviewerAssignment, 'meeting.review')).toBe(true);
    expect(hasPermissionSet(reviewerAssignment, 'meeting.edit')).toBe(false);
    expect(hasPermissionSet(viewerAssignment, 'meeting.review')).toBe(false);
  });
});
