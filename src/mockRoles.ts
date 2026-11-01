export const mockRoles = [
  { id: 'SuperAdmin', label: 'مدیر ارشد سامانه', organizationRole: 'Owner', scope: 'organization' },
  { id: 'Owner', label: 'مالک سازمان', organizationRole: 'Owner', scope: 'organization' },
  { id: 'Admin', label: 'مدیر سازمان', organizationRole: 'Admin', scope: 'organization' },
  { id: 'User', label: 'کاربر سازمان', organizationRole: 'User', scope: null },
  { id: 'ProjectManager', label: 'مدیر پروژه', organizationRole: 'User', scope: 'project' },
  { id: 'ExecutionMember', label: 'عضو اجرایی', organizationRole: 'User', scope: null },
  { id: 'ReceivingLead', label: 'سرپرست دریافت', organizationRole: 'User', scope: 'project' },
  { id: 'ReceivingMember', label: 'عضو دریافت', organizationRole: 'User', scope: null },
  { id: 'Organizer', label: 'برگزارکننده جلسه', organizationRole: 'User', scope: null },
  { id: 'Editor', label: 'ویرایشگر جلسه', organizationRole: 'User', scope: null },
  { id: 'Reviewer', label: 'بازبین جلسه', organizationRole: 'User', scope: null },
  { id: 'Signer', label: 'امضاکننده جلسه', organizationRole: 'User', scope: null },
  { id: 'Participant', label: 'شرکت‌کننده جلسه', organizationRole: 'User', scope: null },
  { id: 'Viewer', label: 'مشاهده‌گر جلسه', organizationRole: 'User', scope: null },
] as const;

export type MockRoleId = typeof mockRoles[number]['id'];
export type UserManagementScope = 'organization' | 'project';

export function getMockRole(id: string | null | undefined) {
  return mockRoles.find((role) => role.id === id);
}
