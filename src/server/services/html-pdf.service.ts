import fs from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';
import type { Meeting } from '../../types';

import { getDocumentDirectory } from './document-storage';
import { getPdfBrowserOptions } from './pdf-browser';

const documentDirectory = getDocumentDirectory();

const pdfOverrides = `
  *, *::before, *::after { box-sizing: border-box !important; }
  html, body, .archived-minute-overlay { background: #fff !important; }
  .archived-minute-overlay { position: static !important; inset: auto !important; overflow: visible !important; }
  .archived-minute-toolbar { display: none !important; }
  @page { size: 210mm 297mm; margin: 0; }
  .archived-minute-document { width: 210mm !important; margin: 0 auto !important; }
  .archived-minute-sheet { width: 210mm !important; min-height: 297mm !important; margin: 0 !important; padding: 15mm 16mm 16mm !important; box-shadow: none !important; overflow: visible !important; page-break-after: always !important; break-after: page !important; }
  .archived-minute-official-head { grid-template-columns: 1fr 1.6fr 1fr !important; }
  .archived-minute-title { grid-column: auto !important; grid-row: auto !important; }
  .archived-minute-facts { grid-template-columns: repeat(4, 1fr) !important; }
  .archived-minute-attendees { grid-template-columns: 1fr 1fr !important; }
  .archived-minute-signatures { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)) !important; }
  .archived-minute-sheet:last-child { page-break-after: auto !important; }
`;

export async function generateHtmlMeetingPdf(meeting: Meeting, sessionToken: string, origin?: string): Promise<string> {
  await fs.mkdir(documentDirectory, { recursive: true });
  const filePath = path.join(documentDirectory, `${meeting.id}.pdf`);
  const developmentOrigin = `http://127.0.0.1:${process.env.PORT || 3000}`;
  const configuredOrigin = process.env.PDF_RENDER_ORIGIN
    || (process.env.NODE_ENV === 'production' ? process.env.APP_URL : developmentOrigin);
  const appOrigin = (origin || configuredOrigin || developmentOrigin).replace(/\/$/, '');
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;

  try {
    browser = await chromium.launch(await getPdfBrowserOptions());
    const context = await browser.newContext();
    await context.addCookies([{ name: process.env.SESSION_COOKIE_NAME || 'metameet_session', value: sessionToken, url: appOrigin }]);
    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 1800 });
    await page.goto(`${appOrigin}/archive/print/${encodeURIComponent(meeting.id)}`, { waitUntil: 'networkidle' });
    await page.locator('.archived-minute-sheet').first().waitFor({ state: 'visible', timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMedia({ media: 'screen' });
    await page.addStyleTag({ content: pdfOverrides });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
    await fs.writeFile(filePath, pdf);
    return filePath;
  } finally {
    if (browser) await browser.close();
  }
}
