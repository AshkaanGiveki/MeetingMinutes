import React from 'react';
import { Printer, X } from 'lucide-react';
import { Meeting, MeetingRole, Participant, SignatureRecord } from '../types';
import './ArchivedMinuteDocument.css';

interface ArchivedMinuteDocumentProps {
  meeting: Meeting;
  onClose: () => void;
  onPrintPdf: () => void;
}

const roleLabels: Record<string, string> = {
  Organizer: 'رئیس جلسه',
  Editor: 'دبیر جلسه',
  Reviewer: 'بازبین',
  Signer: 'امضاکننده',
  Viewer: 'ناظر',
  Participant: 'عضو جلسه',
};

const formatRole = (role: string) => roleLabels[role] || role;

const rolesFor = (person: Participant) => {
  const roles = person.roles?.length ? person.roles : person.role ? [person.role as MeetingRole] : [];
  return Array.from(new Set(roles.map(formatRole)));
};

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
};

const jalaliDateParts = (value?: string) => {
  if (!value) return null;
  const normalized = value.replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
  const parts = normalized.split(/[\/-]/).map(Number);
  return parts.length === 3 && parts.every((part) => !Number.isNaN(part)) ? parts : null;
};

const findGregorianForJalali = (year: number, month: number, day: number) => {
  const formatter = new Intl.DateTimeFormat('en-US-u-ca-persian', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' });
  const start = Date.UTC(year + 621, 0, 1);
  for (let offset = -100; offset <= 500; offset += 1) {
    const date = new Date(start + offset * 86400000);
    const parts = formatter.formatToParts(date);
    const current = { year: Number(parts.find((part) => part.type === 'year')?.value), month: Number(parts.find((part) => part.type === 'month')?.value), day: Number(parts.find((part) => part.type === 'day')?.value) };
    if (current.year === year && current.month === month && current.day === day) return date;
  }
  return null;
};

const formatJalaliLongDate = (value?: string, baseValue?: string) => {
  if (!value) return '—';
  const absolute = jalaliDateParts(value);
  let parts = absolute;
  if (!parts) {
    const relativeDigits = value.replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).match(/\d+/)?.[0];
    const base = jalaliDateParts(baseValue);
    if (relativeDigits && base && /روز|day/i.test(value)) {
      const baseDate = findGregorianForJalali(base[0], base[1], base[2]);
      if (baseDate) {
        baseDate.setUTCDate(baseDate.getUTCDate() + Number(relativeDigits));
        const formatter = new Intl.DateTimeFormat('en-US-u-ca-persian', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' });
        const formatted = formatter.formatToParts(baseDate);
        parts = [Number(formatted.find((part) => part.type === 'year')?.value), Number(formatted.find((part) => part.type === 'month')?.value), Number(formatted.find((part) => part.type === 'day')?.value)];
      }
    }
  }
  if (!parts) return value;
  const [year, month, day] = parts;
  const months = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  if (month < 1 || month > 12) return value;
  return `${day} ${months[month - 1]} ${year}`.replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
};

// Keep deadlines absolute in the official document, even when the editor stored
// a convenience value such as "7 days from now" or its Persian equivalent.
const jalaliMonthNames = [
  '\u0641\u0631\u0648\u0631\u062f\u06cc\u0646', '\u0627\u0631\u062f\u06cc\u0628\u0647\u0634\u062a', '\u062e\u0631\u062f\u0627\u062f', '\u062a\u06cc\u0631',
  '\u0645\u0631\u062f\u0627\u062f', '\u0634\u0647\u0631\u06cc\u0648\u0631', '\u0645\u0647\u0631', '\u0622\u0628\u0627\u0646',
  '\u0622\u0630\u0631', '\u062f\u06cc', '\u0628\u0647\u0645\u0646', '\u0627\u0633\u0641\u0646\u062f',
];

const parseJalaliDate = (value?: string): [number, number, number] | null => {
  if (!value) return null;
  const normalized = value
    .replace(/[\u06F0-\u06F9]/g, (digit) => String('\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9'.indexOf(digit)))
    .trim();
  const match = normalized.match(/(\d{4})\s*[\/-]\s*(\d{1,2})\s*[\/-]\s*(\d{1,2})/);
  if (match) return [Number(match[1]), Number(match[2]), Number(match[3])];
  const longMatch = normalized.match(/(\d{1,2})\s+(.+?)\s+(\d{4})/);
  const month = longMatch ? jalaliMonthNames.indexOf(longMatch[2].trim()) + 1 : 0;
  return longMatch && month ? [Number(longMatch[3]), month, Number(longMatch[1])] : null;
};

const toJalaliParts = (date: Date): [number, number, number] => {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', {
    year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC',
  }).formatToParts(date);
  return [
    Number(parts.find((part) => part.type === 'year')?.value),
    Number(parts.find((part) => part.type === 'month')?.value),
    Number(parts.find((part) => part.type === 'day')?.value),
  ];
};

const formatAbsoluteJalaliDate = (value?: string, baseValue?: string) => {
  const base = parseJalaliDate(baseValue);
  let parts = parseJalaliDate(value);
  const normalizedValue = value
    ?.replace(/[\u06F0-\u06F9]/g, (digit) => String('\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9'.indexOf(digit)))
    .toLowerCase();
  const relativeDays = normalizedValue?.match(/(\d+)/)?.[1];

  if (!parts && base && relativeDays && /\u0631\u0648\u0632|day/.test(normalizedValue || '')) {
    const baseDate = findGregorianForJalali(...base);
    if (baseDate) {
      baseDate.setUTCDate(baseDate.getUTCDate() + Number(relativeDays));
      parts = toJalaliParts(baseDate);
    }
  }

  if (!parts) return '\u062a\u0627\u0631\u06cc\u062e \u0645\u0634\u062e\u0635 \u0646\u0634\u062f\u0647';
  const digits = '\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9';
  return `${parts[2]} ${jalaliMonthNames[parts[1] - 1]} ${parts[0]}`.replace(/\d/g, (digit) => digits[Number(digit)]);
};

const signatureFor = (meeting: Meeting, participant: Participant): SignatureRecord | undefined =>
  meeting.signatures?.find((signature) => signature.signerId === participant.id);

export const ArchivedMinuteDocument: React.FC<ArchivedMinuteDocumentProps> = ({ meeting, onClose, onPrintPdf }) => {
  const participants = meeting.participants || [];
  // Invitation state is not attendance state: pending members are not automatically absent.
  // Until an explicit attendance field exists, registered participants are shown as present.
  const absent = participants.filter((person) => /غایب|absent/i.test(person.statusText || ''));
  const present = participants.filter((person) => !absent.includes(person));
  const signatories = participants.filter((person) => person.requiresSignature || rolesFor(person).includes('امضاکننده'));
  const signatureRows = signatories.length ? signatories : (meeting.signatures || []).map((signature) => ({
    id: signature.signerId,
    name: signature.signerName,
    role: signature.signerRole,
    roles: [signature.signerRole as MeetingRole],
    email: '',
  } as Participant));
  const secretary = participants.find((person) => rolesFor(person).includes('دبیر جلسه')) || participants.find((person) => rolesFor(person).includes('بازبین'));

  return (
    <div className="archived-minute-overlay" role="dialog" aria-modal="true" aria-label="صورت‌جلسه رسمی">
      <div className="archived-minute-toolbar no-print">
        <div>
          <strong>صورت‌جلسه رسمی</strong>
          <span>نسخه نهایی و مناسب چاپ</span>
        </div>
        <div className="archived-minute-toolbar-actions">
          <button type="button" onClick={onPrintPdf} className="archived-minute-print-button"><Printer size={15} /> چاپ / ذخیره PDF</button>
          <button type="button" onClick={onClose} className="archived-minute-close-button" aria-label="بستن"><X size={18} /></button>
        </div>
      </div>

      <main className="archived-minute-document">
        <div className="archived-minute-sheet">
        <header className="archived-minute-official-head">
          <div className="archived-minute-institution">
            <strong>سازمان نمونه</strong>
            <span>سامانه مدیریت و بایگانی صورت‌جلسه‌ها</span>
          </div>
          <div className="archived-minute-title">
            <h1>صورت‌جلسه رسمی</h1>
            <p>{meeting.title}</p>
          </div>
          <div className="archived-minute-reference">
            <div>شماره: <b>{meeting.id}</b></div>
            <div>وضعیت: <b>{meeting.statusLabel || 'بایگانی شده'}</b></div>
          </div>
        </header>

        <section className="archived-minute-section">
          <h2><span>۰۱</span> مشخصات جلسه</h2>
          <div className="archived-minute-facts">
            <div><label>تاریخ برگزاری</label><strong>{meeting.persianDate || '—'}</strong></div>
            <div><label>ساعت</label><strong>{meeting.timeRange || '—'}</strong></div>
            <div><label>محل برگزاری</label><strong>{meeting.location || '—'}</strong></div>
            <div><label>دبیر جلسه</label><strong>{secretary?.name || '—'}</strong></div>
          </div>
        </section>

        <section className="archived-minute-section">
          <h2><span>۰۲</span> موضوع جلسه</h2>
          <p className="archived-minute-intro">{meeting.title || 'موضوع جلسه ثبت نشده است.'}</p>
        </section>

        <section className="archived-minute-section">
          <h2><span>۰۳</span> حاضران و غایبان</h2>
          <div className="archived-minute-attendees">
            <div><h3>حاضران</h3><table><thead><tr><th className="index">ردیف</th><th>نام و نام خانوادگی</th><th>سمت / نقش</th></tr></thead><tbody>
              {present.length ? present.map((person, index) => <tr key={person.id}><td className="index">{index + 1}</td><td>{person.name}</td><td>{rolesFor(person).join('، ') || 'عضو جلسه'}</td></tr>) : <tr><td colSpan={3}>موردی ثبت نشده است</td></tr>}
            </tbody></table></div>
            <div><h3>غایبان</h3><table><thead><tr><th className="index">ردیف</th><th>نام و نام خانوادگی</th><th>توضیحات</th></tr></thead><tbody>
              {absent.length ? absent.map((person, index) => <tr key={person.id}><td className="index">{index + 1}</td><td>{person.name}</td><td>حضور ثبت نشده است</td></tr>) : <tr><td className="index">—</td><td>—</td><td>موردی ثبت نشده است</td></tr>}
            </tbody></table></div>
          </div>
        </section>

        <section className="archived-minute-section"><h2><span>۰۴</span> دستور جلسه</h2><ol className="archived-minute-agenda">
          {meeting.agenda?.length ? meeting.agenda.map((item) => <li key={item.id}>{item.text}</li>) : <li>دستور جلسه‌ای ثبت نشده است.</li>}
        </ol></section>

        <section className="archived-minute-section"><h2><span>۰۵</span> شرح مذاکرات</h2><p className="archived-minute-proceedings">{meeting.discussion || 'شرح مذاکراتی برای این جلسه ثبت نشده است.'}</p></section>

        </div>
        <div className="archived-minute-sheet">
        <section className="archived-minute-section"><h2><span>۰۶</span> تصمیم‌ها و مصوبات</h2><table><thead><tr><th className="index">ردیف</th><th>عنوان مصوبه</th></tr></thead><tbody>
          {meeting.decisions?.length ? meeting.decisions.map((decision, index) => <tr key={decision.id}><td className="index">{index + 1}</td><td className="decision-title">{decision.text}</td></tr>) : <tr><td colSpan={2}>مصوبه‌ای برای این جلسه ثبت نشده است.</td></tr>}
        </tbody></table></section>
        
        <section className="archived-minute-section"><h2><span>۰۷</span> اقدامات و وظایف محوله</h2><table><thead><tr><th>اقدام / وظیفه</th><th>مسئول انجام</th><th className="archived-minute-due-date">موعد انجام</th></tr></thead><tbody>
          {meeting.actionItems?.length ? meeting.actionItems.map((item) => <tr key={item.id}><td>{item.task}</td><td>{item.assignee?.name || '—'}</td><td className="archived-minute-due-date">{formatAbsoluteJalaliDate(item.dueDate, meeting.persianDate)}</td></tr>) : <tr><td colSpan={3}>اقدامی برای این جلسه ثبت نشده است.</td></tr>}
        </tbody></table></section>

        <section className="archived-minute-closing"><p>این صورت‌جلسه پس از بررسی و تأیید حاضران، در تاریخ {meeting.persianDate || '—'} تنظیم و برای بایگانی رسمی ثبت شد.</p>
          <div className="archived-minute-signatures">
            {signatureRows.length ? signatureRows.map((person) => { const signature = signatureFor(meeting, person); return <div key={person.id}>
              <strong>{person.name}</strong>
              <span>{person.title || 'عنوان در جلسه ثبت نشده است'}</span>
              {signature?.signatureData?.startsWith('data:image/') ? <img src={signature.signatureData} alt={`امضای ${person.name}`} /> : <span className="archived-minute-signature-value">{signature?.signatureData?.startsWith('typed:') ? signature.signatureData.slice(6) : signature ? 'امضای دیجیتال ثبت شد' : 'در انتظار امضا'}</span>}
              <span>{signature ? formatDateTime(signature.signedAt) : '—'}</span>
              <div />
            </div>; }) : <div><strong>امضاکننده‌ای ثبت نشده است</strong><span>—</span><div /></div>}
          </div>
        </section>

        <footer className="archived-minute-footer"><span>صورت‌جلسه رسمی · نسخه بایگانی</span><span>{meeting.id}</span></footer>
        </div>
      </main>
    </div>
  );
};
