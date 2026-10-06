import fs from 'fs/promises';
import { existsSync } from 'fs';
import { createWriteStream } from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { Meeting, PrintTemplate } from '../../types';

const documentDirectory = path.resolve(process.env.DOCUMENT_STORAGE_PATH || './storage/documents');
const bundledPersianFont = path.resolve(process.cwd(), 'src/assets/fonts/IRANSansXFaNum-Regular.woff2');
const configuredPersianFont = process.env.PERSIAN_FONT_PATH ? path.resolve(process.cwd(), process.env.PERSIAN_FONT_PATH) : '';
const persianFont = configuredPersianFont || (existsSync(bundledPersianFont) ? bundledPersianFont : (process.platform === 'win32' ? 'C:\\Windows\\Fonts\\tahoma.ttf' : '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'));
const rtl = { align: 'right' as const, features: ['rtla', 'liga'] as any };
const textOrDash = (value?: string) => value?.trim() || '—';

function section(document: PDFKit.PDFDocument, title: string, color: string) {
  document.moveDown(0.7).fillColor(color).fontSize(13).text(title, { ...rtl, underline: true });
  document.moveDown(0.2).fillColor('#1f2937');
}

export async function generateMeetingPdf(meeting: Meeting, template?: Pick<PrintTemplate, 'pdfStyle'>): Promise<string> {
  await fs.mkdir(documentDirectory, { recursive: true });
  const filePath = path.join(documentDirectory, `${meeting.id}.pdf`);
  const style = template?.pdfStyle || 'classic';
  const color = style === 'modern' ? '#0f766e' : style === 'minimal' ? '#374151' : '#4338ca';
  await new Promise<void>((resolve, reject) => {
    const document = new PDFDocument({ margin: 48, size: 'A4', bufferPages: true });
    const output = createWriteStream(filePath); document.pipe(output);
    output.on('finish', resolve); output.on('error', reject);
    try { document.font(persianFont); } catch { /* use PDFKit fallback if a system font is unavailable */ }
    document.fillColor(color).fontSize(style === 'minimal' ? 19 : 22).text('صورت‌جلسه جلسه', { ...rtl, align: 'center' });
    document.moveDown(0.3).fillColor('#111827').fontSize(16).text(textOrDash(meeting.title), { ...rtl, align: 'center' });
    document.moveDown(0.8).fontSize(10.5);
    [`تاریخ: ${textOrDash(meeting.persianDate)}`, `زمان: ${textOrDash(meeting.timeRange)}`, `مکان: ${textOrDash(meeting.location)}`, `دبیر جلسه: ${textOrDash(meeting.organizer?.name)}`].forEach((line) => document.text(line, { ...rtl }));
    const participants = [meeting.organizer, ...(meeting.participants || [])].filter((person, index, all) => person && all.findIndex((item) => item?.id === person.id) === index);
    section(document, 'حاضرین و غایبین', color);
    if (participants.length) participants.forEach((person) => document.fontSize(10.5).text(`• ${person.name} — ${textOrDash(person.role)}`, { ...rtl }));
    else document.fontSize(10.5).text('اطلاعاتی ثبت نشده است.', { ...rtl });
    section(document, 'دستور جلسه و خلاصه مباحث', color);
    meeting.agenda?.forEach((item) => { document.fontSize(10.5).text(`${item.order}. ${item.text}`, { ...rtl }); document.fontSize(10).text(meeting.discussion || 'خلاصه‌ای برای این بند ثبت نشده است.', { ...rtl, indent: 18 }); });
    if (!meeting.agenda?.length) document.fontSize(10.5).text(textOrDash(meeting.discussion), { ...rtl });
    section(document, 'تصمیمات و مصوبات', color);
    if (meeting.decisions?.length) meeting.decisions.forEach((item, index) => document.fontSize(10.5).text(`${index + 1}. ${item.text}${item.approved ? ' (تصویب شد)' : ''}`, { ...rtl }));
    else document.fontSize(10.5).text('مصوبه‌ای ثبت نشده است.', { ...rtl });
    section(document, 'اقدامات محول‌شده', color);
    if (meeting.actionItems?.length) meeting.actionItems.forEach((item, index) => document.fontSize(10.5).text(`${index + 1}. ${item.task} — مسئول: ${item.assignee?.name || 'تعیین نشده'} — مهلت: ${textOrDash(item.dueDate)}`, { ...rtl }));
    else document.fontSize(10.5).text('اقدامی ثبت نشده است.', { ...rtl });
    section(document, 'پیوست‌ها و منابع ارجاعی', color); document.fontSize(10.5).text('پیوست یا منبع ارجاعی برای این صورت‌جلسه ثبت نشده است.', { ...rtl });
    section(document, 'تأیید و امضای اعضا', color); document.fontSize(10.5).text(`تعداد امضاها: ${meeting.signatureCount || 0} از ${meeting.totalSignaturesRequired || participants.length}`, { ...rtl });
    document.moveDown(1); participants.slice(0, 4).forEach((person) => { document.fontSize(10).text(`نام و سمت: ${person.name} — ${textOrDash(person.role)}          امضاء: ........................`, { ...rtl }); document.moveDown(0.35); });
    document.moveDown(0.5).fillColor('#6b7280').fontSize(8.5).text(`شناسه سند: ${meeting.documentHash || 'پیش‌نویس'} | وضعیت: ${meeting.statusLabel || 'پیش‌نویس'}`, { ...rtl });
    document.end();
  });
  return filePath;
}

export async function documentExists(meetingId: string): Promise<boolean> {
  try { await fs.access(path.join(documentDirectory, `${meetingId}.pdf`)); return true; } catch { return false; }
}

export function getMeetingPdfPath(meetingId: string): string { return path.join(documentDirectory, `${meetingId}.pdf`); }
