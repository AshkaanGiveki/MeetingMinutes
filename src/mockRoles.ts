export const mockRoles = [
  { id: 'SuperAdmin', label: 'مدیر ارشد سامانه', organizationRole: 'User', scope: 'organization' },
  { id: 'Owner', label: 'مالک سازمان', organizationRole: 'Owner', scope: 'organization' },
  { id: 'User', label: 'کاربر سازمان', organizationRole: 'User', scope: null },
  { id: 'ProjectManager', label: 'مدیر پروژه', organizationRole: 'User', scope: null },
  { id: 'Stakeholder', label: 'نماینده مشتری', organizationRole: 'User', scope: 'project' },
  { id: 'CustomerClerk', label: 'کاربر مشتری', organizationRole: 'User', scope: null },
] as const;

export type MockRoleId = typeof mockRoles[number]['id'];
export type UserManagementScope = 'organization' | 'project';

export function getMockRole(id: string | null | undefined) {
  return mockRoles.find((role) => role.id === id);
}
