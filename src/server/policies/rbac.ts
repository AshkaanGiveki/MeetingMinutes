export type Permission =
  | 'meeting.create'
  | 'meeting.read'
  | 'meeting.view_all'
  | 'meeting.edit'
  | 'meeting.delete'
  | 'meeting.finalize'
  | 'meeting.review'
  | 'meeting.archive'
  | 'participant.invite'
  | 'participant.remove'
  | 'comment.create'
  | 'comment.resolve'
  | 'signature.request'
  | 'signature.sign'
  | 'template.create'
  | 'template.edit'
  | 'template.delete'
  | 'organization.manage'
  | 'members.manage'
  | 'permissions.manage'
  | 'audit.read'
  | 'settings.manage';

export const OrganizationPermissions = [
  'organization.manage',
  'members.manage',
  'permissions.manage',
  'meeting.view_all',
] as const;
export type OrganizationPermission = typeof OrganizationPermissions[number];

export type OrganizationRole =
  | 'Owner'
  | 'Admin'
  | 'Organizer'
  | 'Editor'
  | 'Reviewer'
  | 'Participant'
  | 'Viewer';

export const RolePermissionsMap: Record<OrganizationRole, Permission[]> = {
  Owner: [
    'meeting.view_all',
    'meeting.create',
    'meeting.read',
    'meeting.edit',
    'meeting.delete',
    'meeting.finalize',
    'meeting.review',
    'meeting.archive',
    'participant.invite',
    'participant.remove',
    'comment.create',
    'comment.resolve',
    'signature.request',
    'signature.sign',
    'template.create',
    'template.edit',
    'template.delete',
    'organization.manage',
    'members.manage',
    'permissions.manage',
    'audit.read',
    'settings.manage',
  ],
  Admin: [
    'meeting.view_all',
    'meeting.create',
    'meeting.read',
    'meeting.edit',
    'meeting.delete',
    'meeting.finalize',
    'meeting.review',
    'meeting.archive',
    'participant.invite',
    'participant.remove',
    'comment.create',
    'comment.resolve',
    'signature.request',
    'signature.sign',
    'template.create',
    'template.edit',
    'template.delete',
    'members.manage',
    'audit.read',
    'settings.manage',
  ],
  Organizer: [
    'meeting.create',
    'meeting.read',
    'meeting.edit',
    'meeting.finalize',
    'meeting.review',
    'participant.invite',
    'participant.remove',
    'comment.create',
    'comment.resolve',
    'signature.request',
    'signature.sign',
    'template.create',
    'template.edit',
    'audit.read',
  ],
  Editor: [
    'meeting.read',
    'meeting.edit',
    'comment.create',
    'comment.resolve',
    'signature.sign',
  ],
  Reviewer: [
    'meeting.read',
    'meeting.review',
    'comment.create',
    'comment.resolve',
    'signature.sign',
  ],
  Participant: [
    'meeting.read',
    'comment.create',
    'signature.sign',
  ],
  Viewer: [
    'meeting.read',
  ],
};

export function hasPermission(
  role: OrganizationRole,
  permission: Permission,
  customOverrides?: Permission[]
): boolean {
  if (customOverrides && customOverrides.includes(permission)) {
    return true;
  }
  const rolePermissions = RolePermissionsMap[role] || [];
  return rolePermissions.includes(permission);
}

export function hasPermissionSet(permissions: readonly string[] | undefined, permission: string): boolean {
  return Boolean(permissions?.includes(permission));
}

export function canTransitionMeeting(
  currentStatus: string,
  targetStatus: string,
  role: OrganizationRole
): { allowed: boolean; reason?: string } {
  // Sealed or Archived documents are immutable
  if (currentStatus === 'SEALED' || currentStatus === 'ARCHIVED') {
    return {
      allowed: false,
      reason: 'سند مهر و موم شده یا بایگانی شده تغییرناپذیر است و قابل تغییر وضعیت نیست.',
    };
  }

  // State Transition Machine
  const validTransitions: Record<string, string[]> = {
    DRAFT: ['IN_REVIEW', 'ARCHIVED'],
    IN_REVIEW: ['READY_FOR_SIGNATURE', 'DRAFT', 'ARCHIVED'],
    READY_FOR_SIGNATURE: ['SIGNING', 'IN_REVIEW'],
    SIGNING: ['SEALED', 'READY_FOR_SIGNATURE'],
  };

  const allowedTargets = validTransitions[currentStatus] || [];
  if (!allowedTargets.includes(targetStatus)) {
    return {
      allowed: false,
      reason: `انتقال وضعیت از ${currentStatus} به ${targetStatus} در ماشین وضعیت سند مجاز نمی‌باشد.`,
    };
  }

  // Authorization check
  if (targetStatus === 'READY_FOR_SIGNATURE' || targetStatus === 'SEALED') {
    if (!hasPermission(role, 'meeting.finalize')) {
      return {
        allowed: false,
        reason: 'شما دسترسی نهایی‌سازی یا مهر و موم این جلسه را ندارید.',
      };
    }
  }

  return { allowed: true };
}
