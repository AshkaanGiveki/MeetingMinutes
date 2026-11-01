import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { connectMongoDB } from '../src/server/db/mongodb';
import type { AuthUser } from '../src/server/services/auth.service';
import type { Meeting, Participant, Template } from '../src/types';
import { RolePermissionsMap, type OrganizationRole } from '../src/server/policies/rbac';
import type { OrganizationMembership, OrganizationRecord } from '../src/server/services/organization.service';

dotenv.config();

const avatarUrls = {
  maryam: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=160&auto=format&fit=crop&q=80',
  sina: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&auto=format&fit=crop&q=80',
  niloofar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=160&auto=format&fit=crop&q=80',
  pouya: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80',
};

const configuredSeedPassword = process.env.SEED_DEFAULT_PASSWORD || process.env.BOOTSTRAP_ADMIN_PASSWORD;
if (!configuredSeedPassword) throw new Error('Set SEED_DEFAULT_PASSWORD or BOOTSTRAP_ADMIN_PASSWORD before running the seed command.');
const seedPassword: string = configuredSeedPassword;

const participants: Record<string, Participant> = {
  maryam: { id: 'usr_maryam_rezaei', name: 'مریم رضایی', role: 'Owner', email: 'maryam.rezaei@metameet.ir', avatar: avatarUrls.maryam, initials: 'م‌ر', hasSigned: false },
  sina: { id: 'usr_sina_ahmadi', name: 'سینا احمدی', role: 'Organizer', email: 'sina.ahmadi@metameet.ir', avatar: avatarUrls.sina, initials: 'س‌ا', hasSigned: false },
  niloofar: { id: 'usr_niloofar_karimi', name: 'نیلوفر کریمی', role: 'Reviewer', email: 'niloofar.karimi@metameet.ir', avatar: avatarUrls.niloofar, initials: 'ن‌ک', hasSigned: false },
  pouya: { id: 'usr_pouya_mohammadi', name: 'پویا محمدی', role: 'Editor', email: 'pouya.mohammadi@metameet.ir', avatar: avatarUrls.pouya, initials: 'پ‌م', hasSigned: false },
};

const templates: Template[] = [
  { id: 'tpl_weekly_product_review', title: 'جلسه هفتگی بررسی محصول', description: 'قالب استاندارد برای بررسی پیشرفت، ریسک‌ها و برنامه هفته آینده تیم محصول.', category: 'محصول و فناوری', agendaDefaults: ['مرور اقدامات جلسه قبل', 'بررسی شاخص‌های کلیدی محصول', 'مرور ریسک‌ها و موانع', 'تعیین اولویت‌های هفته آینده'] },
  { id: 'tpl_project_kickoff', title: 'جلسه آغاز پروژه', description: 'قالب شروع رسمی پروژه با تمرکز بر دامنه، نقش‌ها، زمان‌بندی و معیارهای موفقیت.', category: 'مدیریت پروژه', agendaDefaults: ['هدف و دامنه پروژه', 'معرفی نقش‌ها و مسئولیت‌ها', 'مرور زمان‌بندی و نقاط تحویل', 'ریسک‌های اولیه و اقدامات بعدی'] },
  { id: 'tpl_quarterly_governance', title: 'جلسه کمیته راهبری فصلی', description: 'قالب مناسب گزارش‌دهی مدیریتی و تصمیم‌گیری درباره اولویت‌های فصل بعد.', category: 'مدیریت ارشد', agendaDefaults: ['گزارش عملکرد فصل جاری', 'وضعیت بودجه و منابع', 'تصمیم‌های موردنیاز کمیته', 'مصوبات و برنامه فصل آینده'] },
  { id: 'tpl_retro', title: 'جلسه بازنگری تیمی', description: 'قالب گفت‌وگوی ساختاریافته برای یادگیری از تجربه‌های تیم و بهبود فرایندها.', category: 'توسعه تیم', agendaDefaults: ['چه چیزهایی خوب پیش رفت؟', 'چه چیزهایی نیاز به بهبود دارد؟', 'موانع تکرارشونده', 'اقدامات بهبود و مسئول هر اقدام'] },
];

const meetings: Meeting[] = [
  {
    id: 'meet_product_release_1404_07', title: 'برنامه‌ریزی انتشار نسخه پاییز محصول', persianDate: '۱۸ مهر ۱۴۰۴', timeRange: '۱۰:۰۰ - ۱۱:۳۰', location: 'اتاق جلسات شماره ۲ · ساختمان مرکزی', status: 'READY_FOR_SIGNATURE', statusLabel: 'آماده امضا', organizer: participants.maryam, participants: [participants.maryam, participants.sina, participants.niloofar, participants.pouya],
    agenda: [{ id: 'ag_1', order: 1, text: 'مرور وضعیت توسعه نسخه پاییز' }, { id: 'ag_2', order: 2, text: 'تصمیم‌گیری درباره زمان انتشار عمومی' }, { id: 'ag_3', order: 3, text: 'بررسی ریسک‌های پشتیبانی و مهاجرت' }],
    discussion: 'تیم محصول و فناوری وضعیت قابلیت‌های اصلی نسخه پاییز را مرور کرد. قابلیت گزارش‌گیری تکمیل شده و در آزمون پذیرش موفق بوده است. انتشار عمومی برای هفته سوم مهر پیشنهاد شد؛ با این شرط که راهنمای مهاجرت و برنامه پاسخ‌گویی پشتیبانی تا پیش از انتشار آماده باشد.',
    aiSuggestion: { summary: 'نسخه پاییز از نظر فنی آماده انتشار است، اما تکمیل مستندات مهاجرت و آموزش پشتیبانی باید به عنوان پیش‌شرط انتشار پیگیری شود.', applied: true },
    decisions: [{ id: 'dec_1', text: 'انتشار مرحله‌ای نسخه پاییز از ۲۲ مهر آغاز شود.', approved: true }, { id: 'dec_2', text: 'گزارش خطاهای بحرانی در ۲۴ ساعت نخست توسط تیم شیفت بررسی شود.', approved: true }],
    actionItems: [{ id: 'act_1', task: 'تکمیل راهنمای مهاجرت نسخه پاییز', assignee: participants.pouya, dueDate: '۲۰ مهر ۱۴۰۴', completed: false }, { id: 'act_2', task: 'تهیه برنامه پشتیبانی هفته انتشار', assignee: participants.sina, dueDate: '۲۱ مهر ۱۴۰۴', completed: true }],
    comments: [{ id: 'c_1', author: participants.niloofar, text: 'سناریوهای اصلی پذیرش تأیید شد؛ لطفاً چک‌لیست بازگشت را هم به مستند انتشار اضافه کنید.', timestamp: '۱۸ مهر ۱۴۰۴، ۱۲:۰۵' }], signatureCount: 2, totalSignaturesRequired: 3,
  },
  {
    id: 'meet_customer_portal_kickoff_1404_06', title: 'جلسه آغاز پروژه پرتال مشتریان سازمانی', persianDate: '۲۹ شهریور ۱۴۰۴', timeRange: '۱۴:۰۰ - ۱۵:۳۰', location: 'جلسه آنلاین · لینک داخلی سازمان', status: 'SEALED', statusLabel: 'مهر و موم شده', organizer: participants.sina, participants: [participants.sina, participants.maryam, participants.pouya],
    agenda: [{ id: 'ag_1', order: 1, text: 'هدف‌ها و دامنه نسخه اول پرتال' }, { id: 'ag_2', order: 2, text: 'تقسیم مسئولیت‌ها و نقاط تحویل' }, { id: 'ag_3', order: 3, text: 'وابستگی‌های فنی و امنیتی' }],
    discussion: 'در این جلسه دامنه نسخه اول پرتال مشتریان سازمانی نهایی شد. احراز هویت، مشاهده صورت‌حساب و ثبت درخواست پشتیبانی در نسخه اول قرار گرفت و گزارش‌های تحلیلی به فاز دوم منتقل شد.',
    aiSuggestion: { summary: 'دامنه نسخه اول مشخص است و با تقسیم پروژه به سه جریان احراز هویت، حساب کاربری و پشتیبانی می‌توان ریسک زمان‌بندی را کاهش داد.', applied: true },
    decisions: [{ id: 'dec_1', text: 'قابلیت گزارش‌گیری پیشرفته به فاز دوم منتقل شود.', approved: true }, { id: 'dec_2', text: 'بازبینی امنیتی پیش از شروع آزمون پذیرش انجام شود.', approved: true }], actionItems: [{ id: 'act_1', task: 'تهیه نقشه جریان احراز هویت', assignee: participants.pouya, dueDate: '۵ مهر ۱۴۰۴', completed: true }], comments: [], signatureCount: 3, totalSignaturesRequired: 3,
  },
  {
    id: 'meet_q4_governance_1404', title: 'جلسه کمیته راهبری فصل چهارم', persianDate: '۷ مهر ۱۴۰۴', timeRange: '۹:۳۰ - ۱۱:۰۰', location: 'اتاق هیئت‌مدیره', status: 'IN_REVIEW', statusLabel: 'در حال بررسی', organizer: participants.maryam, participants: [participants.maryam, participants.sina, participants.niloofar],
    agenda: [{ id: 'ag_1', order: 1, text: 'گزارش عملکرد فصل سوم' }, { id: 'ag_2', order: 2, text: 'اولویت‌های سرمایه‌گذاری فصل چهارم' }, { id: 'ag_3', order: 3, text: 'تصمیم‌های موردنیاز مدیریت' }],
    discussion: 'گزارش عملکرد فصل سوم ارائه شد و تمرکز فصل چهارم بر پایداری زیرساخت، بهبود تجربه مدیران و کاهش زمان آماده‌سازی گزارش‌ها مورد توافق اولیه قرار گرفت.',
    aiSuggestion: { summary: 'سه محور اصلی فصل چهارم مشخص شده است؛ بهتر است برای هر محور شاخص قابل‌اندازه‌گیری و مالک اجرایی تعیین شود.', applied: false }, decisions: [{ id: 'dec_1', text: 'پیشنهاد اولویت‌بندی برای بررسی نهایی در جلسه بعد آماده شود.', approved: true }], actionItems: [{ id: 'act_1', task: 'تهیه شاخص‌های سنجش پایداری زیرساخت', assignee: participants.sina, dueDate: '۱۲ مهر ۱۴۰۴', completed: false }], comments: [], signatureCount: 0, totalSignaturesRequired: 3,
  },
];

async function main() {
  const { db, client } = await connectMongoDB();
  if (!db || !client) throw new Error('MongoDB connection failed; no seed data was written.');
  try {
    const passwordHash = bcrypt.hashSync(seedPassword, 12);
    const users: AuthUser[] = Object.values(participants).map((participant, index) => ({ id: participant.id, phoneNumber: `+9891212345${String(index + 1).padStart(2, '0')}`, email: participant.email, passwordHash, name: participant.name, preferences: {}, ...(participant.id === participants.maryam.id ? { platformRole: 'SuperAdmin' as const, accountStatus: 'active' as const, mobileVerifiedAt: new Date().toISOString() } : {}) }));
    const organization: OrganizationRecord = { id: 'org_main', name: 'سازمان اکورد', createdBy: participants.maryam.id, visibility: 'private', createdAt: new Date().toISOString() };
    await db.collection<OrganizationRecord>('organizations').updateOne({ id: organization.id }, { $setOnInsert: organization }, { upsert: true });
    for (const user of users) await db.collection('users').updateOne({ id: user.id }, { $setOnInsert: user }, { upsert: true });
    for (const participant of Object.values(participants)) {
      const role = (participant.id === participants.maryam.id ? 'Owner' : participant.role) as OrganizationRole;
      const membership: OrganizationMembership = { id: `membership_${participant.id}`, organizationId: organization.id, userId: participant.id, role, permissions: RolePermissionsMap[role], status: 'active', joinedAt: organization.createdAt };
      await db.collection<OrganizationMembership>('organization_memberships').updateOne({ organizationId: organization.id, userId: participant.id }, { $setOnInsert: membership }, { upsert: true });
    }
    const legacyUsers = await db.collection<AuthUser & { role?: string; organizationId?: string }>('users').find({ $or: [{ role: { $exists: true } }, { organizationId: { $exists: true } }] }).toArray();
    for (const legacyUser of legacyUsers) {
      const organizationId = legacyUser.organizationId || 'org_main';
      const role = (legacyUser.role || 'Participant') as OrganizationRole;
      await db.collection<OrganizationMembership>('organization_memberships').updateOne(
        { organizationId, userId: legacyUser.id },
        { $setOnInsert: { id: `membership_${organizationId}_${legacyUser.id}`, organizationId, userId: legacyUser.id, role, permissions: RolePermissionsMap[role] || RolePermissionsMap.Participant, status: 'active', joinedAt: new Date().toISOString() } },
        { upsert: true },
      );
    }
    await db.collection('users').updateMany({}, { $unset: { role: '', organizationId: '' } });
    await db.collection('meetings').updateMany({ organizationId: { $exists: false } }, { $set: { organizationId: 'org_main' } });
    await db.collection('templates').updateMany({ organizationId: { $exists: false } }, { $set: { organizationId: 'org_main' } });
    for (const template of templates) await db.collection('templates').updateOne({ id: template.id }, { $setOnInsert: { ...template, organizationId: 'org_main' } }, { upsert: true });
    for (const meeting of meetings) await db.collection('meetings').updateOne({ id: meeting.id }, { $setOnInsert: { ...meeting, organizationId: 'org_main', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }, { upsert: true });
    for (const meeting of meetings) {
      for (const participant of [meeting.organizer, ...meeting.participants]) {
        const assignment = participant.id === meeting.organizer.id ? 'Organizer' : (participant.role as OrganizationRole);
        await db.collection('meeting_members').updateOne({ meetingId: meeting.id, userId: participant.id }, { $setOnInsert: { id: `meeting_member_${meeting.id}_${participant.id}`, meetingId: meeting.id, organizationId: 'org_main', userId: participant.id, assignments: [assignment], permissions: RolePermissionsMap[assignment] || RolePermissionsMap.Participant } }, { upsert: true });
      }
    }
    console.log(`Seed complete: ${users.length} users, ${templates.length} templates, ${meetings.length} meetings.`);
  } finally { await client.close(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
