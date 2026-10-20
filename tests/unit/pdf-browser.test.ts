import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPdfBrowserOptions } from '../../src/server/services/pdf-browser';

vi.mock('@sparticuz/chromium', () => ({
  default: { args: ['--no-sandbox'], executablePath: vi.fn(async () => '/tmp/chromium') },
}));
vi.mock('fs', () => ({ existsSync: vi.fn(() => false) }));
afterEach(() => vi.unstubAllEnvs());

describe('PDF browser selection', () => {
  it('uses packaged Chromium on Vercel', async () => {
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('CHROME_PATH', '');
    expect(await getPdfBrowserOptions()).toEqual({
      headless: true, args: ['--no-sandbox'], executablePath: '/tmp/chromium',
    });
  });
  it('honors an explicit executable', async () => {
    vi.stubEnv('VERCEL', '');
    vi.stubEnv('CHROME_PATH', '/custom/chrome');
    expect(await getPdfBrowserOptions()).toEqual({ headless: true, executablePath: '/custom/chrome' });
  });
  it('uses Playwright defaults when system Chrome is unavailable', async () => {
    vi.stubEnv('VERCEL', '');
    vi.stubEnv('CHROME_PATH', '');
    expect(await getPdfBrowserOptions()).toEqual({ headless: true });
  });
});
