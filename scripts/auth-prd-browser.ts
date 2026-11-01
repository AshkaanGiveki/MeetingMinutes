import { chromium } from 'playwright';

const baseUrl = (process.env.AUTH_BROWSER_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');

async function main() {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${baseUrl}/auth`, { waitUntil: 'networkidle' });
  if (!(await page.locator('input').count())) throw new Error('Auth page did not render a mobile input.');
  const authText = await page.locator('body').innerText();
  if (!authText.includes('ورود')) throw new Error('Auth page did not render the login actions.');
  if (authText.includes('ثبت‌نام عمومی')) throw new Error('Public registration is still visible.');

  const protectedResponse = await page.request.get(`${baseUrl}/api/projects`);
  if (protectedResponse.status() !== 401) throw new Error(`Protected project API returned ${protectedResponse.status()} instead of 401.`);

  const registrationResponse = await page.request.post(`${baseUrl}/api/auth/register`, { data: {} });
  if (registrationResponse.status() !== 410) throw new Error(`Public registration returned ${registrationResponse.status()} instead of 410.`);

  await page.goto(`${baseUrl}/invite/not-a-token`, { waitUntil: 'networkidle' });
  const invitationText = await page.locator('body').innerText();
  if (!/invalid|expired|نامعتبر|منقضی/i.test(invitationText)) throw new Error('Invalid invitation did not show a safe invalid/expired state.');

  await browser.close();
  console.log(`Auth PRD browser checks passed against ${baseUrl}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
