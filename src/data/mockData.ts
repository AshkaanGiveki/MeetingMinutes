import { Meeting, Participant, Template, AuditRecord } from '../types';

export const currentUser: Participant = {
  id: 'usr_arash',
  name: 'آرش فتحی',
  role: 'مدیر محصول',
  avatar: '/src/assets/images/avatar_arash_1791013448265.jpg',
  email: 'arash.fathi@metameet.ir',
  hasSigned: true
};

export const sampleParticipants: Participant[] = [
  {
    id: 'usr_sara',
    name: 'سارا احمدی',
    role: 'مدیر محصول',
    avatar: '/src/assets/images/avatar_sara_1791013479230.jpg',
    email: 'sara.ahmadi@metameet.ir',
    hasSigned: true,
    statusText: 'امضا شده'
  },
  {
    id: 'usr_ali',
    name: 'علی رضایی',
    role: 'توسعه‌دهنده ارشد',
    avatar: '/src/assets/images/avatar_ali_1791013492640.jpg',
    email: 'ali.rezaei@metameet.ir',
    hasSigned: true,
    statusText: 'امضا شده'
  },
  {
    id: 'usr_mehdi',
    name: 'مهدی کریمی',
    role: 'طراح محصول',
    avatar: '/src/assets/images/avatar_mehdi_1791013505052.jpg',
    email: 'mehdi.karimi@metameet.ir',
    hasSigned: true,
    statusText: 'امضا شده'
  },
  {
    id: 'usr_reza',
    name: 'رضا خاوری',
    role: 'توسعه‌دهنده بک‌اند',
    avatar: '/src/assets/images/avatar_reza_1791013515213.jpg',
    email: 'reza.khavari@metameet.ir',
    hasSigned: false,
    statusText: 'در انتظار امضا'
  },
  {
    id: 'usr_mohammad',
    name: 'محمد کاظمی',
    role: 'مدیر فنی',
    initials: 'م‌ک',
    email: 'mohammad.kazemi@metameet.ir',
    hasSigned: false,
    statusText: 'در انتظار امضا'
  }
];

export const initialMeeting: Meeting = {
  id: 'meet-1',
  title: 'جلسه استراتژی محصول سامانه چهارم',
  persianDate: '۳ مهر ۱۴۰۴',
  timeRange: '۱۰:۰۰ - ۱۱:۳۰',
  location: 'اتاق جلسات اصلی',
  status: 'IN_REVIEW',
  statusLabel: 'در حال بررسی',
  organizer: currentUser,
  participants: sampleParticipants,
  agenda: [
    { id: 'ag_1', order: 1, text: 'بررسی پیشرفت پروژه‌های جاری' },
    { id: 'ag_2', order: 2, text: 'تعیین اولویت‌های سامانه چهارم' },
    { id: 'ag_3', order: 3, text: 'تخصیص منابع و بودجه' },
    { id: 'ag_4', order: 4, text: 'جمع‌بندی و تصمیم‌گیری نهایی' }
  ],
  discussion:
    'در این جلسه تیم محصول درباره پیشرفت پروژه‌های جاری و چالش‌های موجود در فرآیند توسعه بحث کرد. همچنین نیاز به تمرکز بیشتر روی اولویت‌های سامانه چهارم و افزایش سرعت توسعه مورد تأکید قرار گرفت. در ادامه، اولویت‌های سامانه چهارم مورد بررسی قرار گرفت و اعضا بر لزوم تخصیص منابع لازم تأکید کردند.',
  aiSuggestion: {
    summary:
      'خلاصه جلسه: در این جلسه بر پیشرفت پروژه‌های جاری، تمرکز بر اولویت‌های سامانه چهارم و تخصیص منابع تأکید شد. همچنین تصمیم گرفتند که منابع مطابق با نیازهای فعلی پروژه‌ها تخصیص یابد.',
    applied: false
  },
  decisions: [
    { id: 'dec_1', text: 'تأیید تخصیص منابع به پروژه‌های اولویت‌دار', approved: true },
    { id: 'dec_2', text: 'تأیید بودجه تیم محصول', approved: true }
  ],
  actionItems: [
    {
      id: 'act_1',
      task: 'آماده‌سازی برنامه راهبردی',
      assignee: sampleParticipants[0],
      dueDate: '۱۰ آبان ۱۴۰۴',
      completed: true
    },
    {
      id: 'act_2',
      task: 'بررسی معماری API',
      assignee: sampleParticipants[1],
      dueDate: '۷ آبان ۱۴۰۴',
      completed: true
    },
    {
      id: 'act_3',
      task: 'طراحی کمپین بازاریابی',
      assignee: sampleParticipants[2],
      dueDate: '۱۲ آبان ۱۴۰۴',
      completed: false
    }
  ],
  comments: [
    {
      id: 'com_1',
      author: sampleParticipants[0],
      text: 'این تصمیم مثل مرحله ۴ اصلاح شود.',
      timestamp: '۱۰:۴۲'
    },
    {
      id: 'com_2',
      author: sampleParticipants[1],
      text: 'موافقم، تغییرات اعمال شد.',
      timestamp: '۱۱:۰۶'
    }
  ],
  documentHash: '8d23419992f96129486c76e274c4e09f871317d6c6e7a68502f66abef57d727a',
  signatureCount: 3,
  totalSignaturesRequired: 4
};

export const sampleTemplates: Template[] = [
  {
    id: 'tpl_1',
    title: 'جلسه استراتژی و اهداف فصلی (OKR)',
    description: 'قالب جامع برای مرور دستاوردهای فصلی و تعیین اهداف کلیدی تیم‌ها',
    category: 'راهبردی',
    agendaDefaults: ['بررسی شاخص‌های کلیدی فصل گذشته', 'ارزیابی گلوگاه‌ها', 'تعیین OKR فصل پیش‌رو', 'تخصیص بودجه و سرپرست']
  },
  {
    id: 'tpl_2',
    title: 'جلسه هفتگی اسپرینت تیم فنی',
    description: 'قالب هماهنگی تسک‌ها، مرور باگ‌ها و تعیین اولویت‌های کدنویسی هفته',
    category: 'فنی و محصول',
    agendaDefaults: ['مرور ریلیز هفته گذشته', 'بررسی موارد مسدودکننده (Blockers)', 'برنامه‌ریزی تسک‌های جاری', 'تأیید کد ریویو']
  },
  {
    id: 'tpl_3',
    title: 'جلسه هیئت مدیره و سهامداران',
    description: 'قالب رسمی و حقوقی صورت‌جلسات هیئت‌مدیره همراه با بندهای مصوبات قانونی',
    category: 'مدیریتی',
    agendaDefaults: ['استماع گزارش مالی و حسابرسی', 'تصویب ترازنامه و بودجه سالانه', 'انتخاب اعضای هیئت‌مدیره', 'تفویض اختیارات مدیرعامل']
  },
  {
    id: 'tpl_4',
    title: 'جلسه بازنگری طراحی محصول (Design Critique)',
    description: 'قالب بررسی رابط کاربری، نتایج تست کاربردپذیری و هویت بصری',
    category: 'طراحی',
    agendaDefaults: ['نمایش وایرفریم‌ها و پروتوتایپ', 'بررسی فیدبک کاربران', 'انطباق با دیزاین سیستم', 'تأیید نهایی برای توسعه']
  }
];

export const sampleMeetingsList: Meeting[] = [
  initialMeeting,
  {
    id: 'meet-2',
    title: 'جلسه هماهنگی بازاریابی و لانچ نسخه جدید',
    persianDate: '۲۸ شهریور ۱۴۰۴',
    timeRange: '۱۴:۰۰ - ۱۵:۰۰',
    location: 'جلسه آنلاین (گوگل میت)',
    status: 'SEALED',
    statusLabel: 'مهر و موم شده',
    organizer: currentUser,
    participants: [sampleParticipants[0], sampleParticipants[2]],
    agenda: [
      { id: 'ag_21', order: 1, text: 'تعیین زمان لانچ' },
      { id: 'ag_22', order: 2, text: 'بودجه تبلیغات آنلاین' }
    ],
    discussion: 'تمام اقدامات تبلیغاتی آماده است و کمپین از ابتدای ماه آینده آغاز خواهد شد.',
    aiSuggestion: { summary: 'تصویب نهایی برنامه لانچ و کمپین تبلیغاتی', applied: true },
    decisions: [{ id: 'd2', text: 'شروع کمپین از اول آبان ماه', approved: true }],
    actionItems: [],
    comments: [],
    documentHash: '4a6b291fe8c1a93e3d29a56cb10041289cf29188e0b23023199e82931a7bc89d',
    sealedAt: '۱۴۰۴/۰۶/۲۸ ۱۶:۰۰',
    signatureCount: 2,
    totalSignaturesRequired: 2
  },
  {
    id: 'meet-3',
    title: 'جلسه همگام‌سازی معماری میکروسرویس‌ها',
    persianDate: '۱۵ شهریور ۱۴۰۴',
    timeRange: '۰۹:۰۰ - ۱۰:۳۰',
    location: 'اتاق کنفرانس ب',
    status: 'ARCHIVED',
    statusLabel: 'بایگانی شده',
    organizer: sampleParticipants[1],
    participants: [currentUser, sampleParticipants[1], sampleParticipants[3]],
    agenda: [
      { id: 'ag_31', order: 1, text: 'ارزیابی پرفورمنس کوئری‌ها' },
      { id: 'ag_32', order: 2, text: 'مهاجرت به کشینگ ردیس' }
    ],
    discussion: 'کانفیگ اولیه ردیس و بهینه‌سازی تایم‌اوت‌ها با موفقیت انجام شد.',
    aiSuggestion: { summary: 'تأیید معماری جدید سرویس احراز هویت', applied: true },
    decisions: [{ id: 'd3', text: 'مهاجرت کامل پایگاه داده تا پایان فصل', approved: true }],
    actionItems: [],
    comments: [],
    documentHash: '1904aef72183cba61099238e83b102941fa902183cf9a2039129480192841029',
    sealedAt: '۱۴۰۴/۰۶/۱۵ ۱۱:۰۰',
    signatureCount: 3,
    totalSignaturesRequired: 3
  }
];

export const sampleAuditLogs: AuditRecord[] = [
  {
    id: 'aud_01',
    meetingId: 'meet-1',
    action: 'MEETING_CREATED',
    actor: 'آرش فتحی (مدیر محصول)',
    timestamp: '۱۴۰۴/۰۷/۰۳ ۱۰:۰۰:۰۰',
    documentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  },
  {
    id: 'aud_02',
    meetingId: 'meet-1',
    action: 'REVIEW_REQUESTED',
    actor: 'آرش فتحی',
    timestamp: '۱۴۰۴/۰۷/۰۳ ۱۱:۳۰:۰۰',
    documentHash: '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069'
  },
  {
    id: 'aud_03',
    meetingId: 'meet-1',
    action: 'SIGNATURE_COMPLETED',
    actor: 'سارا احمدی (مدیر محصول)',
    timestamp: '۱۴۰۴/۰۷/۰۳ ۱۲:۱۵:۲۲',
    documentHash: '8d23419992f96129486c76e274c4e09f871317d6c6e7a68502f66abef57d727a'
  },
  {
    id: 'aud_04',
    meetingId: 'meet-1',
    action: 'SIGNATURE_COMPLETED',
    actor: 'علی رضایی (توسعه‌دهنده ارشد)',
    timestamp: '۱۴۰۴/۰۷/۰۳ ۱۲:۴۵:۰۵',
    documentHash: '8d23419992f96129486c76e274c4e09f871317d6c6e7a68502f66abef57d727a'
  },
  {
    id: 'aud_05',
    meetingId: 'meet-1',
    action: 'SIGNATURE_COMPLETED',
    actor: 'مهدی کریمی (طراح محصول)',
    timestamp: '۱۴۰۴/۰۷/۰۳ ۱۳:۱۰:۱۸',
    documentHash: '8d23419992f96129486c76e274c4e09f871317d6c6e7a68502f66abef57d727a'
  }
];
