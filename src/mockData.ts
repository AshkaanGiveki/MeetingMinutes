import type { Meeting, MeetingRole, Participant } from './types';
import type { MockRoleId } from './mockRoles';

export function createMockMeeting(roleId: MockRoleId): Meeting {
  const activeId = `mock-${roleId}`;
  const activeMeetingRole: MeetingRole = 'Viewer';
  const organizer: Participant = {
    id: 'mock-organizer',
    name: 'سارا احمدی',
    role: 'Organizer', roles: ['Organizer'], email: 'organizer@example.test',
  };
  const assignedRoles: MeetingRole[] = ['Editor', 'Reviewer', 'Signer'];
  const participants: Participant[] = assignedRoles.map((role, index) => ({
    id: `mock-member-${index}`,
    name: ['علی رضایی', 'مریم کریمی', 'رضا محمدی'][index],
    role, roles: [role], email: `member${index}@example.test`,
    requiresSignature: role === 'Signer',
  }));
  participants.push({ id: activeId, name: 'کاربر آزمایشی', role: activeMeetingRole, roles: [activeMeetingRole], email: 'preview@example.test' });
  const status = 'DRAFT';
  return {
    id: 'mock-meeting-1', projectId: 'mock-project-1', organizationMinuteId: 101, title: 'جلسه نمونه بررسی پروژه',
    persianDate: '۱۴۰۵/۰۸/۱۰', timeRange: '۱۰:۰۰ - ۱۱:۳۰', location: 'اتاق جلسات',
    status, statusLabel: status === 'DRAFT' ? 'در حال ثبت' : status === 'IN_REVIEW' ? 'در حال بازبینی' : 'آماده امضا',
    organizer, participants,
    agenda: [{ id: 'mock-agenda-1', order: 1, text: 'بررسی پیشرفت پروژه' }],
    discussion: 'این صورت‌جلسه فقط برای پیش‌نمایش نقش‌ها است.',
    aiSuggestion: { summary: '', applied: false },
    decisions: [{ id: 'mock-decision-1', text: 'برنامه مرحله بعد بررسی شود.', approved: true }],
    actionItems: [], comments: [], signatureCount: 0, totalSignaturesRequired: 1,
    requiredMeetingRoles: ['Editor', 'Reviewer', 'Signer'],
  };
}
