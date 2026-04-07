const express = require('express');
const { chromium } = require('playwright');

const router = express.Router();

router.post('/inspect', async (req, res) => {
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

    // Scroll uma vez para carregar lazy load
    await page.evaluate(() => window.scrollTo({ top: 1200, behavior: 'smooth' }));
    await page.waitForTimeout(2000);

    const info = await page.evaluate(() => {
      // Coleta todos os data-component-type únicos
      const componentTypes = [...new Set(
        [...document.querySelectorAll('[data-component-type]')]
          .map(el => el.getAttribute('data-component-type'))
      )].slice(0, 30);

      // Coleta classes de elementos com data-asin
      const asinClasses = [...new Set(
        [...document.querySelectorAll('[data-asin]:not([data-asin=""])')]
          .map(el => el.className.split(' ').filter(c => c.length > 0 && c.length < 40).slice(0, 3).join(' '))
      )].slice(0, 20);

      // Conta elementos com data-asin
      const asinCount = document.querySelectorAll('[data-asin]:not([data-asin=""])').length;

      // Pega sample de HTML do primeiro elemento com data-asin
      const firstAsin = document.querySelector('[data-asin]:not([data-asin=""])');
      const sampleHtml = firstAsin ? firstAsin.outerHTML.slice(0, 800) : 'nenhum encontrado';

      // Coleta data-testid únicos
      const testIds = [...new Set(
        [...document.querySelectorAll('[data-testid]')]
          .map(el => el.getAttribute('data-testid'))
      )].slice(0, 30);

      return { componentTypes, asinClasses, asinCount, testIds, sampleHtml, url: window.location.href };
    });

    res.json({ ok: true, info });
  } finally {
    await browser.close();
  }
});

module.exports = router;
