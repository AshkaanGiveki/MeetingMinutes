import { existsSync } from 'fs';
import type { LaunchOptions } from 'playwright';

export async function getPdfBrowserOptions(): Promise<LaunchOptions> {
  if (process.env.VERCEL === '1') {
    const { default: chromium } = await import('@sparticuz/chromium');
    return {
      headless: true,
      args: chromium.args,
      executablePath: process.env.CHROME_PATH || await chromium.executablePath(),
    };
  }
  if (process.env.CHROME_PATH) {
    return { headless: true, executablePath: process.env.CHROME_PATH };
  }
  const windowsChrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  if (process.platform === 'win32' && existsSync(windowsChrome)) {
    return { headless: true, executablePath: windowsChrome };
  }
  // Other hosts use the browser installed with `npx playwright install chromium`.
  return { headless: true };
}
