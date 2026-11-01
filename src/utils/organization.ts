export const organizationRoleLabel = (role?: string) => {
  switch (role) {
    case 'Owner':
      return 'مالک سازمان';
    case 'Admin':
      return 'کاربر سازمان';
    case 'User':
      return 'کاربر';
    case 'ProjectManager':
      return 'مدیر پروژه';
    case 'OrganizationUser':
      return 'کاربر سازمان';
    case 'Stakeholder':
      return 'نماینده مشتری';
    case 'CustomerClerk':
      return 'کاربر مشتری';
    default:
      return role || '';
  }
};
