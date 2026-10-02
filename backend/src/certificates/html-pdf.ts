import { existsSync } from 'fs';

export interface HtmlPdfEngine {
  render(html: string): Promise<Buffer>;
}

export const HTML_PDF_ENGINE = Symbol('HTML_PDF_ENGINE');

export class PuppeteerPdfEngine implements HtmlPdfEngine {
  async render(html: string): Promise<Buffer> {
    const puppeteer = await import('puppeteer');
    const executablePath = await resolveChromePath(puppeteer);
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
      ...(executablePath ? { executablePath } : {}),
    });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1754, height: 1240, deviceScaleFactor: 2 });
      await page.setContent(html, { waitUntil: 'load' });
      const pdf = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        preferCSSPageSize: true,
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}

async function resolveChromePath(puppeteer: typeof import('puppeteer')): Promise<string | undefined> {
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (fromEnv && existsSync(fromEnv)) {
    return fromEnv;
  }
  try {
    const bundled = await puppeteer.executablePath();
    if (bundled && existsSync(bundled)) {
      return bundled;
    }
  } catch {
    // The Puppeteer browser cache is empty until its install script runs.
  }
  const installed = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  return installed.find((path) => existsSync(path));
}
