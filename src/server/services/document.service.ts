import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { Meeting } from '../../types';

const documentDirectory = path.resolve(process.env.DOCUMENT_STORAGE_PATH || './storage/documents');

export async function generateMeetingPdf(meeting: Meeting): Promise<string> {
  await fs.mkdir(documentDirectory, { recursive: true });
  const filePath = path.join(documentDirectory, `${meeting.id}.pdf`);

  await new Promise<void>((resolve, reject) => {
    const document = new PDFDocument({ margin: 48, size: 'A4' });
    const output = createWriteStream(filePath);
    document.pipe(output);
    output.on('finish', resolve);
    output.on('error', reject);

    document.fontSize(20).text(meeting.title, { align: 'right' });
    document.moveDown();
    document.fontSize(11).text(`Date: ${meeting.persianDate}`, { align: 'right' });
    document.text(`Time: ${meeting.timeRange}`, { align: 'right' });
    document.text(`Location: ${meeting.location}`, { align: 'right' });
    document.moveDown();
    document.fontSize(14).text('Agenda', { underline: true });
    meeting.agenda.forEach((item) => document.fontSize(11).text(`${item.order}. ${item.text}`));
    document.moveDown();
    document.fontSize(14).text('Discussion', { underline: true });
    document.fontSize(11).text(meeting.discussion || '');
    document.moveDown();
    document.fontSize(14).text('Decisions', { underline: true });
    meeting.decisions.forEach((item) => document.fontSize(11).text(`- ${item.text}`));
    document.moveDown();
    document.fontSize(14).text('Action Items', { underline: true });
    meeting.actionItems.forEach((item) => document.fontSize(11).text(`- ${item.task} — ${item.assignee.name}`));
    document.moveDown();
    document.fontSize(10).text(`Document hash: ${meeting.documentHash || 'unsealed'}`);
    document.text(`Signatures: ${meeting.signatureCount}/${meeting.totalSignaturesRequired}`);
    const signatures = (meeting as Meeting & { signatures?: Array<{ signerName: string; signerRole: string; signedAt: string; documentHash?: string }> }).signatures || [];
    signatures.forEach((signature) => {
      document.text(`Signed by: ${signature.signerName} (${signature.signerRole}) at ${signature.signedAt}`);
      if (signature.documentHash) document.text(`Signature hash: ${signature.documentHash}`);
    });
    document.text(`Sealed at: ${meeting.sealedAt || 'not sealed'}`);
    document.end();
  });

  return filePath;
}

export async function documentExists(meetingId: string): Promise<boolean> {
  try {
    await fs.access(path.join(documentDirectory, `${meetingId}.pdf`));
    return true;
  } catch {
    return false;
  }
}

export function getMeetingPdfPath(meetingId: string): string {
  return path.join(documentDirectory, `${meetingId}.pdf`);
}
