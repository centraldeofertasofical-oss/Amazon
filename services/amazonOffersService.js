const { chromium } = require('playwright');
const { selectors } = require('../scraper/amazon/selectors');
const { buildAmazonUrl } = require('../scraper/amazon/openPage');
const { clickLoadMoreIfVisible } = require('../scraper/amazon/loadMoreEngine');
const { collectVisibleProducts } = require('../scraper/amazon/collectVisibleProducts');
const { dedupeProducts } = require('../scraper/amazon/dedupeProducts');
const { shouldStop } = require('../scraper/amazon/stopConditions');
const { detectPageGuards } = require('../scraper/amazon/guards');
const { scrollStep } = require('../scraper/amazon/scrollEngine');
const { validateProduct } = require('../scraper/amazon/validateProduct');
const { logger } = require('../utils/logger');
const { sleep } = require('../utils/sleep');

async function scrapeAmazonOffers(input) {
  const {
    url,
    query,
    maxCycles = 40,
    maxNoGrowthCycles = 8,
    headless = true,
    navigationTimeoutMs = 60000,
    waitAfterLoadMs = 3000,
    minDelayMs = 1000,
    maxDelayMs = 2200,
    proxyServer,
    cookies = [],
    locale = 'pt-BR'
  } = input;

  const targetUrl = url || buildAmazonUrl(query);
  if (!targetUrl) throw new Error('Informe url ou query.');

  const launchOptions = {
    headless,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1440,900'
    ]
  };

  if (proxyServer) launchOptions.proxy = { server: proxyServer };

  const browser = await chromium.launch(launchOptions);
  const startedAt = Date.now();
  const warnings = [];

  const metrics = {
    cycles: 0,
    noGrowthCycles: 0,
    loadMoreClicks: 0,
    rawCollected: 0,
    uniqueCollected: 0,
    validCollected: 0,
    invalidCount: 0,
    reachedBottom: false,
    blocked: false,
    guards: { captcha: false, signIn: false, robots: false },
    growthHistory: []
  };

  try {
    const context = await browser.newContext({
      locale,
      viewport: { width: 1440, height: 900 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
    });

    if (Array.isArray(cookies) && cookies.length) {
      await context.addCookies(cookies);
    }

    const page = await context.newPage();
    page.setDefaultNavigationTimeout(navigationTimeoutMs);

    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

    try {
      await page.waitForLoadState('networkidle', { timeout: 8000 });
    } catch (_) {
      warnings.push('Timeout em networkidle no carregamento inicial — continuando.');
    }
    const currentUrl = page.url();
    if (currentUrl.includes('/ap/signin') || currentUrl.includes('/signin')) {
      warnings.push(`Redirecionado para login: ${currentUrl}`);
      return buildResult({ ok: false, targetUrl, query, warnings, metrics, startedAt, products: [] });
    }

    await sleep(waitAfterLoadMs);

    const allProducts = [];
    let previousUniqueCount = 0;

    for (let cycle = 1; cycle <= maxCycles; cycle += 1) {
      metrics.cycles = cycle;

      const guardState = await detectPageGuards(page, selectors);
      metrics.guards = guardState;
      metrics.blocked = guardState.captcha || guardState.signIn || guardState.robots;

      if (metrics.blocked) {
        logger.warn('Bloqueio detectado', { cycle, guardState });
        warnings.push(`Bloqueio detectado no ciclo ${cycle}: ${JSON.stringify(guardState)}`);
        break;
      }

      const clicked = await clickLoadMoreIfVisible(page, selectors);
      if (clicked) {
        metrics.loadMoreClicks += 1;
        await sleep(2200);
      }

      const { atBottom, grew } = await scrollStep(page);
      metrics.reachedBottom = atBottom;

      await sleep(randomBetween(minDelayMs, maxDelayMs));

      const visibleProducts = await collectVisibleProducts(page, selectors);
      allProducts.push(...visibleProducts);

      const uniqueProducts = dedupeProducts(allProducts);
      metrics.rawCollected = allProducts.length;
      metrics.uniqueCollected = uniqueProducts.length;

      const growth = uniqueProducts.length - previousUniqueCount;
      metrics.growthHistory.push({ cycle, growth, unique: uniqueProducts.length, clicked, atBottom, grew });

      logger.info('Ciclo completo', { cycle, growth, unique: uniqueProducts.length, atBottom, grew, clicked });

      if (growth <= 0) {
        metrics.noGrowthCycles += 1;
      } else {
        metrics.noGrowthCycles = 0;
      }

      previousUniqueCount = uniqueProducts.length;

      if (shouldStop({ noGrowthCycles: metrics.noGrowthCycles, maxNoGrowthCycles, clicked, growth, atBottom, grew })) {
        logger.info('Condição de parada atingida', { cycle, atBottom, grew, noGrowthCycles: metrics.noGrowthCycles });
        break;
      }
    }

    const allUnique = dedupeProducts(allProducts);
    const validProducts = allUnique.filter(validateProduct);
    const invalidProducts = allUnique.filter((p) => !validateProduct(p));

    metrics.validCollected = validProducts.length;
    metrics.invalidCount = invalidProducts.length;

    if (invalidProducts.length > 0) {
      warnings.push(
        `${invalidProducts.length} produto(s) descartado(s) por dados incompletos (sem título, preço ou link válido).`
      );
      logger.warn('Produtos inválidos descartados', {
        count: invalidProducts.length,
        sample: invalidProducts.slice(0, 3).map((p) => ({
          ASIN: p.ASIN,
          PRODUTO: p.PRODUTO?.slice(0, 60),
          PRECO_POR: p.PRECO_POR,
          LINK_ORIGINAL: p.LINK_ORIGINAL?.slice(0, 80)
        }))
      });
    }

    return buildResult({ ok: true, targetUrl, query, warnings, metrics, startedAt, products: validProducts });
  } finally {
    await browser.close();
  }
}

function buildResult({ ok, targetUrl, query, warnings, metrics, startedAt, products }) {
  return {
    ok,
    source: targetUrl,
    query: query || null,
    warnings,
    metrics: { ...metrics, elapsedMs: Date.now() - startedAt },
    products
  };
}

function randomBetween(min, max) {
  const a = Number(min || 0);
  const b = Number(max || 0);
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

module.exports = { scrapeAmazonOffers };
