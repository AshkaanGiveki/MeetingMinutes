import fs from 'fs/promises';
import { existsSync } from 'fs';
import { createWriteStream } from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { Meeting, Participant, PrintTemplate, SignatureRecord } from '../../types';

const documentDirectory = path.resolve(process.env.DOCUMENT_STORAGE_PATH || './storage/documents');
const configuredPersianFont = process.env.PERSIAN_FONT_PATH ? path.resolve(process.cwd(), process.env.PERSIAN_FONT_PATH) : '';
const windowsPersianFont = 'C:\\Windows\\Fonts\\tahoma.ttf';
const bundledPersianFont = path.resolve(process.cwd(), 'src/assets/fonts/IRANSansXFaNum-Regular.woff2');
const configuredPdfFont = configuredPersianFont && !configuredPersianFont.toLowerCase().endsWith('.woff2') ? configuredPersianFont : '';
const persianFont = configuredPdfFont || (process.platform === 'win32' && existsSync(windowsPersianFont) ? windowsPersianFont : bundledPersianFont);
const rtl = { align: 'right' as const, features: ['rtla', 'liga'] as any };
const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 42;
const contentWidth = pageWidth - margin * 2;

const textOrDash = (value?: string) => value?.trim() || 'ثبت نشده';
const roleNames: Record<string, string> = { Organizer: 'مالک جلسه', Editor: 'ویرایشگر', Reviewer: 'بازبین', Signer: 'امضاکننده', Viewer: 'مشاهده‌گر', Participant: 'مشاهده‌گر' };
const rolesOf = (person: Participant) => Array.from(new Set([...(person.roles || []), person.role].filter(Boolean))).map((role) => roleNames[role] || role);
const palette = (style: PrintTemplate['pdfStyle']) => style === 'modern'
  ? { accent: '#0f766e', accentSoft: '#ccfbf1', ink: '#12252a', muted: '#5f7375', line: '#d5e5e2', paper: '#f5fbfa' }
  : style === 'minimal'
    ? { accent: '#374151', accentSoft: '#e5e7eb', ink: '#1f2937', muted: '#6b7280', line: '#d1d5db', paper: '#f8fafc' }
    : { accent: '#4f46e5', accentSoft: '#e0e7ff', ink: '#18213d', muted: '#64748b', line: '#dbe3f0', paper: '#f7f8ff' };
const normalizeStatus = (status: Meeting['status']) => ({ DRAFT: 'پیش‌نویس', IN_REVIEW: 'در حال بررسی', READY_FOR_SIGNATURE: 'آماده امضا', SIGNING: 'در حال امضا', SEALED: 'مهر و موم شده', ARCHIVED: 'بایگانی شده' } as Record<Meeting['status'], string>)[status] || status;

function drawRoundedCard(document: PDFKit.PDFDocument, x: number, y: number, width: number, height: number, fill: string, stroke: string) {
  document.save().roundedRect(x, y, width, height, 12).fillAndStroke(fill, stroke).restore();
}

function addFooter(document: PDFKit.PDFDocument, pageNumber: number, totalPages: number, color: string) {
  document.save().strokeColor('#e5e7eb').lineWidth(0.6).moveTo(margin, pageHeight - 62).lineTo(pageWidth - margin, pageHeight - 62).stroke();
  document.fillColor(color).fontSize(8).text('Accord  |  صورت‌جلسه رسمی دیجیتال', margin, pageHeight - 53, { width: contentWidth / 2, align: 'left' });
  document.fillColor('#64748b').fontSize(8).text(`صفحه ${pageNumber} از ${totalPages}`, pageWidth / 2, pageHeight - 53, { width: contentWidth / 2, ...rtl });
  document.restore();
}

function addSectionHeader(document: PDFKit.PDFDocument, title: string, subtitle: string, color: string, cursor: number) {
  document.fillColor(color).roundedRect(margin, cursor, 5, 27, 2).fill();
  document.fillColor('#172033').fontSize(13).font(persianFont).text(title, margin + 16, cursor + 1, { width: contentWidth - 16, ...rtl });
  document.fillColor('#8290a5').fontSize(8.5).font(persianFont).text(subtitle, margin + 16, cursor + 17, { width: contentWidth - 16, ...rtl });
  return cursor + 39;
}

function wrapHeight(document: PDFKit.PDFDocument, value: string, width: number, fontSize: number) {
  document.fontSize(fontSize);
  return Math.max(18, document.heightOfString(value, { width, ...rtl }));
}

function drawSignature(document: PDFKit.PDFDocument, signature: SignatureRecord | undefined, x: number, y: number, width: number, height: number) {
  if (!signature?.signatureData) return;
  try {
    if (signature.signatureData.startsWith('data:image/')) document.image(signature.signatureData, x, y, { fit: [width, height], align: 'right', valign: 'center' });
    else if (signature.signatureData.startsWith('typed:')) document.font(persianFont).fontSize(17).fillColor('#283b77').text(signature.signatureData.slice(6), x, y + 9, { width, align: 'right' });
  } catch { /* A malformed signature image must not prevent PDF creation. */ }
}

export async function generateMeetingPdf(meeting: Meeting, template?: Pick<PrintTemplate, 'pdfStyle'>): Promise<string> {
  await fs.mkdir(documentDirectory, { recursive: true });
  const filePath = path.join(documentDirectory, `${meeting.id}.pdf`);
  const colors = palette(template?.pdfStyle || 'classic');
  const participants = [meeting.organizer, ...(meeting.participants || [])].filter((person, index, all) => person && all.findIndex((item) => item?.id === person.id) === index);
  const signatures = meeting.signatures || [];
  const signatureByPerson = new Map(signatures.map((signature) => [signature.signerId, signature]));

  await new Promise<void>((resolve, reject) => {
    const document = new PDFDocument({ size: 'A4', margin, bufferPages: true, info: { Title: meeting.title, Author: 'Accord', Subject: 'صورت‌جلسه رسمی' } });
    const output = createWriteStream(filePath); document.pipe(output);
    output.on('finish', resolve); output.on('error', reject);
    try { document.font(persianFont); } catch { /* PDFKit fallback */ }
    let cursor = margin;
    const ensure = (height: number) => { if (cursor + height > pageHeight - 62) { document.addPage(); cursor = margin; } };

    document.save().roundedRect(margin, cursor, contentWidth, 132, 18).fill(colors.paper).restore();
    document.save().roundedRect(margin, cursor, contentWidth, 8, 4).fill(colors.accent).restore();
    document.fillColor(colors.accent).fontSize(10).font(persianFont).text('ACCORD', margin + 20, cursor + 23, { width: 150, align: 'left' });
    document.fillColor(colors.muted).fontSize(8.5).font(persianFont).text('صورت‌جلسه رسمی دیجیتال', margin + 20, cursor + 38, { width: 180, align: 'left' });
    document.fillColor(colors.accent).fontSize(9).text(normalizeStatus(meeting.status), margin + 20, cursor + 94, { width: 180, align: 'left' });
    document.fillColor(colors.ink).fontSize(18).font(persianFont).text(textOrDash(meeting.title), margin + 210, cursor + 22, { width: contentWidth - 230, ...rtl });
    document.fillColor(colors.muted).fontSize(8.5).font(persianFont).text(`شماره صورت‌جلسه: ${meeting.organizationMinuteId || meeting.id}`, margin + 210, cursor + 108, { width: contentWidth - 230, ...rtl });
    cursor += 152;

    cursor = addSectionHeader(document, 'مشخصات جلسه', 'اطلاعات پایه و مرجع رسمی جلسه', colors.accent, cursor);
    const facts = [['تاریخ جلسه', textOrDash(meeting.persianDate)], ['ساعت جلسه', textOrDash(meeting.timeRange)], ['محل برگزاری', textOrDash(meeting.location)], ['مالک جلسه', textOrDash(meeting.organizer?.name)]];
    for (let index = 0; index < facts.length; index += 2) {
      ensure(61); const y = cursor; const gap = 10; const cardWidth = (contentWidth - gap) / 2;
      for (let column = 0; column < 2; column += 1) {
        const fact = facts[index + column]; if (!fact) continue; const x = margin + (1 - column) * (cardWidth + gap);
        drawRoundedCard(document, x, y, cardWidth, 52, '#ffffff', colors.line);
        document.fillColor(colors.muted).fontSize(8).font(persianFont).text(fact[0], x + 12, y + 10, { width: cardWidth - 24, ...rtl });
        document.fillColor(colors.ink).fontSize(10.5).font(persianFont).text(fact[1], x + 12, y + 27, { width: cardWidth - 24, ...rtl });
      }
      cursor += 64;
    }

    ensure(120); cursor = addSectionHeader(document, 'اعضای جلسه و وضعیت امضا', 'نقش هر عضو و وضعیت دریافت امضای رسمی', colors.accent, cursor);
    const rowHeight = 33; const tableY = cursor; const tableHeight = 44 + participants.length * rowHeight;
    drawRoundedCard(document, margin, tableY, contentWidth, tableHeight, '#ffffff', colors.line);
    document.fillColor(colors.muted).fontSize(8).font(persianFont).text('عضو و نقش', margin + 18, tableY + 10, { width: 220, ...rtl });
    document.text('وضعیت امضا', margin + 280, tableY + 10, { width: 100, ...rtl });
    document.text('مسئولیت', margin + 398, tableY + 10, { width: 110, ...rtl });
    const hasAuthoritativeSignatureRecords = Array.isArray(meeting.signatures);
    participants.forEach((person, index) => {
      const y = tableY + 34 + index * rowHeight;
      const signed = hasAuthoritativeSignatureRecords
        ? Boolean(signatureByPerson.get(person.id))
        : Boolean(signatureByPerson.get(person.id) || person.hasSigned);
      document.strokeColor('#edf1f5').lineWidth(0.6).moveTo(margin + 14, y - 5).lineTo(pageWidth - margin - 14, y - 5).stroke();
      document.fillColor(colors.ink).fontSize(9.5).font(persianFont).text(person.name, margin + 18, y + 1, { width: 220, ...rtl });
      document.fillColor(colors.muted).fontSize(7.8).font(persianFont).text(rolesOf(person).join('  |  '), margin + 18, y + 15, { width: 220, ...rtl });
      document.fillColor(signed ? '#047857' : '#b45309').fontSize(8.5).font(persianFont).text(signed ? 'امضا دریافت شد' : 'در انتظار امضا', margin + 280, y + 8, { width: 100, ...rtl });
      document.fillColor(colors.muted).fontSize(8).font(persianFont).text(person.id === meeting.organizer.id ? 'مالک جلسه' : 'عضو جلسه', margin + 398, y + 8, { width: 110, ...rtl });
    });
    cursor = tableY + tableHeight + 12;

    ensure(105); cursor = addSectionHeader(document, 'دستور جلسه و مذاکرات', 'موضوعات مطرح‌شده و جمع‌بندی رسمی گفتگوها', colors.accent, cursor);
    if (meeting.agenda?.length) meeting.agenda.forEach((item) => {
      const discussion = textOrDash(meeting.discussion); const height = Math.max(52, wrapHeight(document, discussion, contentWidth - 58, 9)); ensure(height + 23);
      document.save().roundedRect(margin, cursor, 28, 28, 9).fill(colors.accentSoft).restore();
      document.fillColor(colors.accent).fontSize(11).font(persianFont).text(String(item.order), margin, cursor + 8, { width: 28, align: 'center' });
      document.fillColor(colors.ink).fontSize(10.5).font(persianFont).text(textOrDash(item.text), margin + 40, cursor + 1, { width: contentWidth - 40, ...rtl });
      document.fillColor(colors.muted).fontSize(9).font(persianFont).text(discussion, margin + 40, cursor + 21, { width: contentWidth - 40, ...rtl }); cursor += height + 12;
    });
    else { ensure(35); document.fillColor(colors.muted).fontSize(9).text(textOrDash(meeting.discussion), margin, cursor, { width: contentWidth, ...rtl }); cursor += 35; }

    ensure(75); cursor = addSectionHeader(document, 'تصمیمات و مصوبات', 'خروجی‌های قطعی و قابل استناد جلسه', colors.accent, cursor);
    if (meeting.decisions?.length) meeting.decisions.forEach((decision, index) => {
      const height = Math.max(30, wrapHeight(document, decision.text, contentWidth - 88, 9)); ensure(height + 12);
      drawRoundedCard(document, margin, cursor, contentWidth, height + 10, decision.approved ? '#f0fdf4' : '#ffffff', decision.approved ? '#bbf7d0' : colors.line);
      document.fillColor(colors.accent).fontSize(10).font(persianFont).text(`${index + 1}`, margin + 14, cursor + 9, { width: 24, align: 'center' });
      document.fillColor(colors.ink).fontSize(9).font(persianFont).text(decision.text, margin + 50, cursor + 8, { width: contentWidth - 138, ...rtl });
      document.fillColor(decision.approved ? '#047857' : colors.muted).fontSize(8).font(persianFont).text(decision.approved ? 'مصوب' : 'ثبت شده', margin + contentWidth - 74, cursor + 9, { width: 58, ...rtl }); cursor += height + 19;
    });
    else { document.fillColor(colors.muted).fontSize(9).text('مصوبه‌ای برای این جلسه ثبت نشده است.', margin, cursor, { width: contentWidth, ...rtl }); cursor += 28; }

    ensure(75); cursor = addSectionHeader(document, 'اقدامات و پیگیری‌ها', 'مسئول، مهلت و وضعیت اجرای هر اقدام', colors.accent, cursor);
    if (meeting.actionItems?.length) meeting.actionItems.forEach((item, index) => {
      const height = Math.max(38, wrapHeight(document, item.task, contentWidth - 190, 9)); ensure(height + 12);
      drawRoundedCard(document, margin, cursor, contentWidth, height + 12, '#ffffff', colors.line);
      document.fillColor(colors.accent).fontSize(10).font(persianFont).text(`${index + 1}`, margin + 14, cursor + 11, { width: 24, align: 'center' });
      document.fillColor(colors.ink).fontSize(9).font(persianFont).text(item.task, margin + 50, cursor + 8, { width: contentWidth - 190, ...rtl });
      document.fillColor(colors.muted).fontSize(7.8).font(persianFont).text(`مسئول: ${textOrDash(item.assignee?.name)}  |  مهلت: ${textOrDash(item.dueDate)}`, margin + 50, cursor + height - 4, { width: contentWidth - 190, ...rtl });
      document.fillColor(item.completed ? '#047857' : '#b45309').fontSize(8).font(persianFont).text(item.completed ? 'تکمیل شده' : 'در حال پیگیری', margin + contentWidth - 105, cursor + 12, { width: 88, ...rtl }); cursor += height + 21;
    });
    else { document.fillColor(colors.muted).fontSize(9).text('اقدامی برای این جلسه ثبت نشده است.', margin, cursor, { width: contentWidth, ...rtl }); cursor += 28; }

    ensure(130); cursor = addSectionHeader(document, 'گواهی نهایی و امضاها', 'نسخه نهایی این سند با امضاهای ثبت‌شده صادر شده است', colors.accent, cursor);
    drawRoundedCard(document, margin, cursor, contentWidth, 86, colors.paper, colors.line);
    document.fillColor(colors.ink).fontSize(9.5).font(persianFont).text('وضعیت سند', margin + 16, cursor + 14, { width: 90, ...rtl });
    document.fillColor(colors.accent).fontSize(10).text(normalizeStatus(meeting.status), margin + 16, cursor + 34, { width: 90, ...rtl });
    document.fillColor(colors.ink).fontSize(9.5).font(persianFont).text('امضاهای دریافت‌شده', margin + 150, cursor + 14, { width: 110, ...rtl });
    document.fillColor(colors.accent).fontSize(15).font(persianFont).text(`${signatures.length} / ${meeting.totalSignaturesRequired || participants.length}`, margin + 150, cursor + 33, { width: 110, ...rtl });
    document.fillColor(colors.ink).fontSize(9.5).font(persianFont).text('هش سند', margin + 320, cursor + 14, { width: 180, ...rtl });
    document.fillColor(colors.muted).fontSize(7.2).font(persianFont).text(textOrDash(meeting.documentHash), margin + 320, cursor + 35, { width: 180, align: 'right' }); cursor += 101;
    signatures.forEach((signature) => {
      ensure(72); drawRoundedCard(document, margin, cursor, contentWidth, 60, '#ffffff', colors.line);
      document.fillColor(colors.ink).fontSize(9.5).font(persianFont).text(signature.signerName, margin + 16, cursor + 10, { width: 180, ...rtl });
      document.fillColor(colors.muted).fontSize(8).font(persianFont).text(`امضا در ${textOrDash(signature.signedAt)}`, margin + 16, cursor + 29, { width: 210, ...rtl });
      drawSignature(document, signature, margin + contentWidth - 158, cursor + 4, 140, 48); cursor += 70;
    });

    const pages = document.bufferedPageRange();
    for (let page = 0; page < pages.count; page += 1) { document.switchToPage(page); addFooter(document, page + 1, pages.count, colors.accent); }
    document.end();
  });
  return filePath;
}

export async function documentExists(meetingId: string): Promise<boolean> {
  try { await fs.access(path.join(documentDirectory, `${meetingId}.pdf`)); return true; } catch { return false; }
}

export function getMeetingPdfPath(meetingId: string): string { return path.join(documentDirectory, `${meetingId}.pdf`); }
