#!/bin/bash
# =============================================================
# aplicar.sh — Aplica todas as correções do scraper Amazon v2
# Execute na RAIZ do projeto: bash aplicar.sh
# =============================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}=======================================================${NC}"
echo -e "${YELLOW}  Amazon Scraper Dynamic — Aplicando correções v2.0    ${NC}"
echo -e "${YELLOW}=======================================================${NC}"
echo ""

# -------------------------------------------------------------
# 1. utils/formatPrice.js (NOVO)
# -------------------------------------------------------------
mkdir -p utils
cat > utils/formatPrice.js << 'ENDOFFILE'
/**
 * Converte string de preço (qualquer formato BR ou US) para número float.
 * Trata: R$, espaço não-quebrável (\u00A0), separadores de milhar e decimal,
 * prefixos como "A partir de", ranges de preço (captura o menor).
 */
function moneyToNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? Number(value.toFixed(2)) : null;

  let raw = String(value);

  // Range de preço: "R$ 50 – R$ 100" → pega o menor (primeiro)
  raw = raw.split(/[–—]/)[0];

  // Remove prefixos textuais comuns
  raw = raw.replace(/a partir de/i, '').trim();

  // Remove símbolo de moeda, espaços, espaços não-quebráveis
  raw = raw.replace(/R\$|\$|€|£/g, '').replace(/[\s\u00A0]/g, '');

  if (!raw) return null;

  const brFormat = /^-?\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(raw);
  const usFormat = /^-?\d{1,3}(,\d{3})*(\.\d{1,2})?$/.test(raw);
  const onlyDigits = /^\d+$/.test(raw);

  let normalized;

  if (brFormat) {
    normalized = raw.replace(/\./g, '').replace(',', '.');
  } else if (usFormat) {
    normalized = raw.replace(/,/g, '');
  } else if (onlyDigits && raw.length > 4) {
    normalized = (parseInt(raw, 10) / 100).toFixed(2);
  } else {
    const fallback = raw.replace(/[^\d.,]/g, '');
    if (/\d\.\d{3},/.test(fallback) || /,\d{2}$/.test(fallback)) {
      normalized = fallback.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = fallback.replace(/,/g, '');
    }
  }

  const num = parseFloat(normalized);
  return Number.isFinite(num) && num > 0 ? Number(num.toFixed(2)) : null;
}

/**
 * Formata número para string de preço no padrão BR.
 * Ex: 1299.9 → "R$ 1.299,90"
 */
function formatPriceBR(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

module.exports = { moneyToNumber, formatPriceBR };
ENDOFFILE
echo -e "${GREEN}✔ utils/formatPrice.js${NC}"

# -------------------------------------------------------------
# 2. scraper/amazon/validateProduct.js (NOVO)
# -------------------------------------------------------------
mkdir -p scraper/amazon
cat > scraper/amazon/validateProduct.js << 'ENDOFFILE'
/**
 * Valida se um produto normalizado tem os campos mínimos obrigatórios
 * para ser aceito como item válido na saída final.
 *
 * Campos obrigatórios:
 * - PRODUTO: string com >= 5 caracteres
 * - LINK_ORIGINAL: string começando com https://
 * - PRECO_POR: número > 0
 */
function validateProduct(product) {
  if (!product || typeof product !== 'object') return false;

  const hasTitle =
    typeof product.PRODUTO === 'string' && product.PRODUTO.trim().length >= 5;

  const hasLink =
    typeof product.LINK_ORIGINAL === 'string' &&
    product.LINK_ORIGINAL.startsWith('https://');

  const hasPrice =
    typeof product.PRECO_POR === 'number' &&
    Number.isFinite(product.PRECO_POR) &&
    product.PRECO_POR > 0;

  return hasTitle && hasLink && hasPrice;
}

module.exports = { validateProduct };
ENDOFFILE
echo -e "${GREEN}✔ scraper/amazon/validateProduct.js${NC}"

# -------------------------------------------------------------
# 3. scraper/amazon/selectors.js (MODIFICADO)
# -------------------------------------------------------------
cat > scraper/amazon/selectors.js << 'ENDOFFILE'
/**
 * Seletores da Amazon Brasil — revisados para páginas de ofertas dinâmicas.
 *
 * REGRA: O seletor genérico [data-asin]:not([data-asin=""]) foi REMOVIDO.
 * Ele capturava banners, carrosséis e widgets que não são cards de produto real,
 * gerando um volume alto de itens brutos com título/preço nulo.
 */
const selectors = {
  productCards: [
    'div[data-component-type="s-search-result"]',
    'div[data-component-type="s-impression-logger"][data-asin]:not([data-asin=""])'
  ],

  title: [
    '[data-cy="title-recipe"] span',
    'h2 a span',
    'h2 span.a-size-medium',
    'h2 span.a-size-base-plus',
    'h2 span'
  ],

  link: [
    '[data-cy="title-recipe"] a[href]',
    'h2 a[href]',
    'a.a-link-normal.s-no-outline[href]'
  ],

  image: [
    'img.s-image[src]',
    '.s-product-image-container img[src]',
    'img[data-image-index][src]'
  ],

  priceOffscreen: [
    '[data-cy="price-recipe"] .a-price .a-offscreen',
    '.a-price:not(.a-text-price) .a-offscreen'
  ],

  priceWhole: [
    '[data-cy="price-recipe"] .a-price-whole',
    '.a-price:not(.a-text-price) .a-price-whole'
  ],

  priceFraction: [
    '[data-cy="price-recipe"] .a-price-fraction',
    '.a-price:not(.a-text-price) .a-price-fraction'
  ],

  oldPrice: [
    '[data-cy="price-recipe"] .a-text-price .a-offscreen',
    '.a-price.a-text-price .a-offscreen',
    '.a-text-price .a-offscreen'
  ],

  rating: [
    '[aria-label*="de 5 estrelas"]',
    'span.a-icon-alt'
  ],

  reviews: [
    'span[aria-label$="avaliações"]',
    'a[href*="#customerReviews"] span',
    '.a-size-base.s-underline-text'
  ],

  loadMoreButtons: [
    'button:has-text("Ver mais ofertas")',
    'a:has-text("Ver mais ofertas")',
    'button:has-text("Ver mais")',
    'span:has-text("Ver mais ofertas")',
    '[data-action="a-expander-toggle"]',
    'a.s-pagination-next',
    '.s-pagination-item.s-pagination-next'
  ],

  captcha: [
    'form[action*="validateCaptcha"]',
    'input#captchacharacters',
    'text=Digite os caracteres'
  ],

  signIn: [
    'form[name="signIn"]',
    'input[name="email"]'
  ],

  robots: [
    'text=Sorry, we just need to make sure you\'re not a robot',
    'text=Desculpe, precisamos apenas confirmar que você não é um robô'
  ]
};

module.exports = { selectors };
ENDOFFILE
echo -e "${GREEN}✔ scraper/amazon/selectors.js${NC}"

# -------------------------------------------------------------
# 4. scraper/amazon/scrollEngine.js (MODIFICADO)
# -------------------------------------------------------------
cat > scraper/amazon/scrollEngine.js << 'ENDOFFILE'
const { sleep } = require('../../utils/sleep');

/**
 * Executa um passo de scroll incremental e aguarda estabilização do DOM.
 *
 * Correções vs. versão anterior:
 * 1. Captura scrollHeight antes e depois — aguarda +900ms se DOM cresceu (lazy load ativo)
 * 2. Retorna { atBottom: boolean, grew: boolean } para uso em shouldStop
 * 3. Scroll de 80% da viewport — mais preciso que valor fixo de 800px
 */
async function scrollStep(page) {
  const before = await page.evaluate(() => document.body.scrollHeight);

  const atBottom = await page.evaluate(() => {
    const distance = Math.max(500, Math.floor(window.innerHeight * 0.8));
    const target = Math.min(document.body.scrollHeight, window.scrollY + distance);
    window.scrollTo({ top: target, behavior: 'smooth' });
    return window.scrollY + window.innerHeight >= document.body.scrollHeight * 0.95;
  });

  await sleep(600);

  const after = await page.evaluate(() => document.body.scrollHeight);
  const grew = after > before;

  if (grew) {
    await sleep(900);
  }

  return { atBottom, grew };
}

async function isAtBottomOfPage(page) {
  return page.evaluate(() => {
    return window.scrollY + window.innerHeight >= document.body.scrollHeight * 0.97;
  });
}

async function scrollToTop(page) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await sleep(300);
}

module.exports = { scrollStep, isAtBottomOfPage, scrollToTop };
ENDOFFILE
echo -e "${GREEN}✔ scraper/amazon/scrollEngine.js${NC}"

# -------------------------------------------------------------
# 5. scraper/amazon/stopConditions.js (MODIFICADO)
# -------------------------------------------------------------
cat > scraper/amazon/stopConditions.js << 'ENDOFFILE'
/**
 * Determina se o scraper deve encerrar o loop de coleta.
 *
 * Lógica corrigida vs. versão anterior:
 * - Antes: parava com 4 ciclos sem crescimento, sem verificar atBottom.
 *   Encerrava no meio de páginas com lazy load lento.
 *
 * Nova lógica:
 * 1. Nunca para após clique em "Ver mais" (conteúdo ainda pode estar carregando)
 * 2. Nunca para se houve crescimento de produtos neste ciclo
 * 3. Para normalmente: sem crescimento >= maxNoGrowthCycles E (atBottom OU DOM parou de crescer)
 * 4. Hard stop: sem crescimento >= maxNoGrowthCycles * 2 (evita loop infinito)
 */
function shouldStop({ noGrowthCycles, maxNoGrowthCycles, clicked, growth, atBottom, grew }) {
  if (clicked) return false;
  if (growth > 0) return false;
  if (noGrowthCycles >= maxNoGrowthCycles * 2) return true;
  if (noGrowthCycles >= maxNoGrowthCycles && (atBottom || !grew)) return true;
  return false;
}

module.exports = { shouldStop };
ENDOFFILE
echo -e "${GREEN}✔ scraper/amazon/stopConditions.js${NC}"

# -------------------------------------------------------------
# 6. scraper/amazon/collectVisibleProducts.js (MODIFICADO)
# -------------------------------------------------------------
cat > scraper/amazon/collectVisibleProducts.js << 'ENDOFFILE'
const { normalizeProduct } = require('./normalizeProduct');

/**
 * Coleta todos os produtos visíveis na página.
 *
 * Correções vs. versão anterior:
 * 1. Descarta cards sem título E sem link ainda no $$eval (elimina widgets/banners)
 * 2. Fallback de preço: whole + fraction quando priceOffscreen é nulo
 * 3. try/catch por seletor — se um falhar, continua com o próximo
 */
async function collectVisibleProducts(page, selectors) {
  const products = [];

  for (const productSelector of selectors.productCards) {
    let batch = [];
    try {
      batch = await page.$$eval(
        productSelector,
        (nodes, sel) => {
          function textBySelectors(root, list) {
            if (!list || !list.length) return null;
            for (const s of list) {
              try {
                const el = root.querySelector(s);
                const text = el?.textContent?.trim();
                if (text && text.length > 0) return text;
              } catch (_) {}
            }
            return null;
          }

          function attrBySelectors(root, list, attr) {
            if (!list || !list.length) return null;
            for (const s of list) {
              try {
                const el = root.querySelector(s);
                const value = el?.getAttribute?.(attr)?.trim();
                if (value && value.length > 0) return value;
              } catch (_) {}
            }
            return null;
          }

          function buildPriceFromParts(root, wholeSelectors, fractionSelectors) {
            const whole = textBySelectors(root, wholeSelectors);
            if (!whole) return null;
            const cleanWhole = whole.replace(/[.,\s]/g, '');
            const fraction = textBySelectors(root, fractionSelectors);
            const cleanFraction = fraction
              ? fraction.replace(/\D/g, '').padEnd(2, '0').slice(0, 2)
              : '00';
            return `${cleanWhole},${cleanFraction}`;
          }

          return nodes
            .map((node) => {
              const asin = node.getAttribute('data-asin') || null;
              const title = textBySelectors(node, sel.title);
              const href = attrBySelectors(node, sel.link, 'href');

              // Descarta placeholders/widgets sem título e sem link
              if (!title && !href) return null;

              const image = attrBySelectors(node, sel.image, 'src');
              const priceOffscreen = textBySelectors(node, sel.priceOffscreen);
              const priceResolved = priceOffscreen
                ? priceOffscreen
                : buildPriceFromParts(node, sel.priceWhole, sel.priceFraction);

              const oldPrice = textBySelectors(node, sel.oldPrice);
              const rating = textBySelectors(node, sel.rating);
              const reviews = textBySelectors(node, sel.reviews);

              return { asin, title, href, image, priceOffscreen: priceResolved, oldPrice, rating, reviews };
            })
            .filter(Boolean);
        },
        selectors
      );
    } catch (_err) {
      // Seletor não encontrou elementos — continua
    }

    products.push(...batch);
  }

  return products.map(normalizeProduct).filter(Boolean);
}

module.exports = { collectVisibleProducts };
ENDOFFILE
echo -e "${GREEN}✔ scraper/amazon/collectVisibleProducts.js${NC}"

# -------------------------------------------------------------
# 7. scraper/amazon/normalizeProduct.js (MODIFICADO)
# -------------------------------------------------------------
cat > scraper/amazon/normalizeProduct.js << 'ENDOFFILE'
const { moneyToNumber } = require('../../utils/formatPrice');

/**
 * Normaliza um produto bruto coletado do DOM para o formato padrão de saída.
 *
 * Correções vs. versão anterior:
 * 1. Usa moneyToNumber robusto (trata R$, espaço não-quebrável, ranges, prefixos)
 * 2. normalizeLink filtra domínios fora da Amazon (elimina links de banner)
 * 3. normalizeImageUrl remove parâmetros de resize para imagem em melhor resolução
 * 4. Campo `valid` como flag rápida para filtragem no serviço e no n8n
 */
function normalizeProduct(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!raw.title && !raw.href) return null;

  const link = normalizeLink(raw.href);
  const title = cleanText(raw.title);

  if (!title && !link) return null;

  const asin = raw.asin || extractAsinFromLink(link);
  const pricePor = moneyToNumber(raw.priceOffscreen);
  const priceDe = moneyToNumber(raw.oldPrice);
  const descontoPct = calcDiscount(priceDe, pricePor);

  const product = {
    ID: asin || link || title,
    ASIN: asin || null,
    PRODUTO: title || null,
    LINK_ORIGINAL: link || null,
    LINK_IMAGEM: normalizeImageUrl(raw.image),
    PRECO_DE: priceDe,
    PRECO_POR: pricePor,
    DESCONTO_PCT: descontoPct,
    AVALIACAO: normalizeRating(raw.rating),
    QTD_AVALIACOES: extractReviewCount(raw.reviews),
    FONTE: 'AMAZON'
  };

  product.valid =
    typeof product.PRODUTO === 'string' &&
    product.PRODUTO.trim().length >= 5 &&
    typeof product.LINK_ORIGINAL === 'string' &&
    product.LINK_ORIGINAL.startsWith('https://') &&
    typeof product.PRECO_POR === 'number' &&
    product.PRECO_POR > 0;

  return product;
}

function cleanText(value) {
  if (!value) return null;
  const cleaned = String(value).replace(/\s+/g, ' ').trim();
  return cleaned.length >= 3 ? cleaned : null;
}

function normalizeLink(href) {
  if (!href) return null;
  try {
    const base = 'https://www.amazon.com.br';
    const url = href.startsWith('http') ? new URL(href) : new URL(href, base);
    url.search = '';
    if (!url.hostname.includes('amazon')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeImageUrl(src) {
  if (!src) return null;
  if (!src.startsWith('http')) return null;
  return src.replace(/\._[A-Z0-9_,]+_\./i, '.');
}

function extractAsinFromLink(link) {
  if (!link) return null;
  const match =
    link.match(/\/dp\/([A-Z0-9]{10})/i) ||
    link.match(/\/gp\/product\/([A-Z0-9]{10})/i);
  return match ? match[1].toUpperCase() : null;
}

function normalizeRating(value) {
  if (!value) return null;
  const match = String(value).replace(',', '.').match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const num = Number(match[1]);
  return num >= 0 && num <= 5 ? num : null;
}

function extractReviewCount(value) {
  if (!value) return null;
  const digits = String(value).replace(/[.,\s]/g, '').replace(/\D/g, '');
  return digits.length > 0 ? Number(digits) : null;
}

function calcDiscount(priceDe, pricePor) {
  if (!priceDe || !pricePor || priceDe <= pricePor) return null;
  return Number((((priceDe - pricePor) / priceDe) * 100).toFixed(2));
}

module.exports = { normalizeProduct };
ENDOFFILE
echo -e "${GREEN}✔ scraper/amazon/normalizeProduct.js${NC}"

# -------------------------------------------------------------
# 8. services/amazonOffersService.js (MODIFICADO)
# -------------------------------------------------------------
mkdir -p services
cat > services/amazonOffersService.js << 'ENDOFFILE'
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
ENDOFFILE
echo -e "${GREEN}✔ services/amazonOffersService.js${NC}"

# -------------------------------------------------------------
# 9. n8n/node_filtro_e_legenda.js (ATUALIZADO)
# -------------------------------------------------------------
mkdir -p n8n
cat > n8n/node_filtro_e_legenda.js << 'ENDOFFILE'
// ============================================================
// NÓ 1 — FILTRO E VALIDAÇÃO DE PRODUTOS
// Cole este bloco no nó Code do n8n que recebe o response do scraper.
// ============================================================

const response = $input.first().json;

if (response.metrics?.blocked) {
  throw new Error(`Scraper bloqueado: ${JSON.stringify(response.metrics.guards)}`);
}

if (!response.ok || !Array.isArray(response.products)) {
  throw new Error('Resposta inválida do scraper: ' + JSON.stringify(response));
}

if (Array.isArray(response.warnings) && response.warnings.length > 0) {
  console.warn('[SCRAPER WARNINGS]', response.warnings.join(' | '));
}

console.log('[SCRAPER METRICS]', JSON.stringify({
  cycles: response.metrics?.cycles,
  validCollected: response.metrics?.validCollected,
  invalidCount: response.metrics?.invalidCount,
  reachedBottom: response.metrics?.reachedBottom,
  blocked: response.metrics?.blocked,
  elapsedMs: response.metrics?.elapsedMs
}));

const valid = response.products.filter(p => {
  const hasTitle = typeof p.PRODUTO === 'string' && p.PRODUTO.trim().length >= 5;
  const hasPrice = typeof p.PRECO_POR === 'number' && p.PRECO_POR > 0;
  const hasLink  = typeof p.LINK_ORIGINAL === 'string' && p.LINK_ORIGINAL.startsWith('https://');
  return hasTitle && hasPrice && hasLink;
});

const MIN_PRODUCTS = 3;
if (valid.length < MIN_PRODUCTS) {
  throw new Error(
    `Produtos insuficientes: ${valid.length} válidos de ${response.products.length} coletados. ` +
    `Warnings: ${JSON.stringify(response.warnings)}`
  );
}

return valid.map(p => ({ json: p }));


// ============================================================
// NÓ 2 — MONTAGEM DE LEGENDA
// Cole este bloco no nó Code seguinte (processa cada produto individualmente).
// ============================================================

/*
const p = $input.first().json;

function formatBRL(value) {
  if (typeof value !== 'number' || !isFinite(value)) return 'Consulte o site';
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  });
}

const precoPor  = formatBRL(p.PRECO_POR);
const precoDe   = p.PRECO_DE ? formatBRL(p.PRECO_DE) : null;
const desconto  = p.DESCONTO_PCT ? `🔻 ${Math.round(p.DESCONTO_PCT)}% OFF` : '';
const avaliacao = p.AVALIACAO ? `⭐ ${p.AVALIACAO.toFixed(1)}` : '';
const reviews   = p.QTD_AVALIACOES
  ? ` (${p.QTD_AVALIACOES.toLocaleString('pt-BR')} avaliações)` : '';

let linhaPreco = `💰 *${precoPor}*`;
if (precoDe) linhaPreco += `  ~${precoDe}~`;
if (desconto) linhaPreco += `  ${desconto}`;

const linhas = [
  `🛍 *${p.PRODUTO}*`,
  '',
  linhaPreco,
  avaliacao ? `${avaliacao}${reviews}` : null,
  '',
  `🔗 ${p.LINK_ORIGINAL}`
].filter(l => l !== null && l !== undefined);

const legenda = linhas.join('\n').trim();

return [{ json: { ...p, LEGENDA: legenda } }];
*/
ENDOFFILE
echo -e "${GREEN}✔ n8n/node_filtro_e_legenda.js${NC}"

# -------------------------------------------------------------
echo ""
echo -e "${GREEN}=======================================================${NC}"
echo -e "${GREEN}  ✅  Todos os arquivos aplicados com sucesso! (v2.0)   ${NC}"
echo -e "${GREEN}=======================================================${NC}"
echo ""
echo -e "${YELLOW}Checklist de implantação:${NC}"
echo "  1. git add -A && git commit -m 'fix: scraper v2 — scroll, seletores, validação'"
echo "  2. git push  (Railway faz deploy automático)"
echo "  3. Aguarde o deploy completar (~2-3 min)"
echo "  4. Teste com 10 ciclos primeiro:"
echo ""
echo '     curl -X POST https://SEU-SERVICO.railway.app/amazon/search \'
echo '       -H "Content-Type: application/json" \'
echo '       -d '"'"'{"url":"https://www.amazon.com.br/deals","maxCycles":10,"maxNoGrowthCycles":5}'"'"''
echo ""
echo -e "${YELLOW}Critérios de sucesso no teste:${NC}"
echo "  ✔ metrics.validCollected >= 20"
echo "  ✔ metrics.reachedBottom: true OU metrics.cycles == maxCycles"
echo "  ✔ warnings[] sem mensagem de bloqueio"
echo "  ✔ 0 produtos com PRECO_POR null na lista final"
echo ""
