const express = require('express');
const amazonRouter = require('./routes/amazon');
const { logger } = require('./utils/logger');
const { chromium } = require('playwright');

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'amazon-scraper-dynamic' });
});

app.use('/amazon', amazonRouter);

app.post('/inspect', async (req, res) => {
  const { url } = req.body;
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  try {
    const context = await browser.newContext({
      locale: 'pt-BR',
      viewport: { width: 1440, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    try { await page.waitForLoadState('networkidle', { timeout: 8000 }); } catch (_) {}
    await page.waitForTimeout(3000);
    await page.evaluate(() => window.scrollTo({ top: 1200, behavior: 'smooth' }));
    await page.waitForTimeout(2000);
    const info = await page.evaluate(() => {
      const componentTypes = [...new Set([...document.querySelectorAll('[data-component-type]')].map(el => el.getAttribute('data-component-type')))].slice(0, 30);
      const asinCount = document.querySelectorAll('[data-asin]:not([data-asin=""])').length;
      const firstAsin = document.querySelector('[data-asin]:not([data-asin=""])');
      const sampleHtml = firstAsin ? firstAsin.outerHTML.slice(0, 1000) : 'nenhum';
      const testIds = [...new Set([...document.querySelectorAll('[data-testid]')].map(el => el.getAttribute('data-testid')))].slice(0, 30);
      return { componentTypes, asinCount, testIds, sampleHtml, finalUrl: window.location.href };
    });
    res.json({ ok: true, info });
  } finally {
    await browser.close();
  }
});

app.use((err, _req, res, _next) => {
  logger.error('Unhandled error', { message: err.message, stack: err.stack });
  res.status(500).json({ ok: false, error: err.message || 'Internal server error' });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
});
