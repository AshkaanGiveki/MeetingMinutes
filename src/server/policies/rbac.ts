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

export type OrganizationRole = 'Owner' | 'User';
/** Meeting permission presets stored for compatibility; these are not account roles. */
export type MeetingRole = 'Organizer' | 'Editor' | 'Reviewer' | 'Signer' | 'Participant' | 'Viewer';

export const ASSIGNABLE_MEETING_ROLES = ['Editor', 'Reviewer', 'Signer', 'Viewer'] as const;
export type AssignableMeetingRole = typeof ASSIGNABLE_MEETING_ROLES[number];

export function getMeetingParticipantRoles(participant: { role?: string; roles?: string[] } | undefined): string[] {
  if (!participant) return [];
  return Array.from(new Set([...(participant.roles || []), ...(participant.role ? [participant.role] : [])]));
}

export function hasMeetingRole(participant: { role?: string; roles?: string[] } | undefined, role: string): boolean {
  return getMeetingParticipantRoles(participant).includes(role);
}

export const REQUIRED_MEETING_ROLES = ['Editor', 'Reviewer', 'Signer'] as const;
export type RequiredMeetingRole = typeof REQUIRED_MEETING_ROLES[number];

const workflowRoleByPermission: Partial<Record<Permission, RequiredMeetingRole | 'Organizer'>> = {
  'meeting.edit': 'Editor',
  'meeting.review': 'Reviewer',
  'signature.sign': 'Signer',
  'meeting.finalize': 'Organizer',
  'meeting.archive': 'Organizer',
};

export function requiredMeetingRoleForPermission(permission: string): RequiredMeetingRole | 'Organizer' | undefined {
  return workflowRoleByPermission[permission as Permission];
}

export function getMissingRequiredMeetingRoles(participants: Array<{ role?: string; roles?: string[] }> | undefined): RequiredMeetingRole[] {
  return REQUIRED_MEETING_ROLES.filter((role) => !(participants || []).some((participant) => hasMeetingRole(participant, role)));
}

export const RolePermissionsMap: Record<OrganizationRole | MeetingRole, Permission[]> = {
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
  User: [
    'meeting.create',
    'meeting.read',
    'comment.create',
    'signature.sign',
  ],
  Organizer: [
    'meeting.read',
    'meeting.edit',
    'meeting.finalize',
    'meeting.review',
    'participant.invite',
    'participant.remove',
    'comment.create',
    'comment.resolve',
    'signature.request',
  ],
  Editor: [
    'meeting.read',
    'meeting.edit',
    'comment.create',
    'comment.resolve',
  ],
  Reviewer: [
    'meeting.read',
    'meeting.review',
    'comment.create',
    'comment.resolve',
  ],
  Signer: [
    'meeting.read',
    'comment.create',
    'signature.sign',
  ],
  Participant: [
    'meeting.read',
    'comment.create',
  ],
  Viewer: [
    'meeting.read',
  ],
};

export function hasPermission(
  role: OrganizationRole | MeetingRole,
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
  role: OrganizationRole | MeetingRole
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
