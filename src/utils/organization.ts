export const organizationRoleLabel = (role?: string) => {
  switch (role) {
    case 'Owner':
      return 'مالک سازمان';
    case 'Admin':
      return 'مدیر';
    case 'User':
      return 'کاربر';
    case 'ProjectManager':
      return 'مدیر پروژه';
    case 'ExecutionMember':
      return 'عضو اجرایی';
    case 'ReceivingLead':
      return 'سرپرست دریافت';
    case 'ReceivingMember':
      return 'عضو دریافت';
    case 'OrganizationAdmin':
      return 'مدیر سازمان';
    default:
      return role || '';
  }
};
