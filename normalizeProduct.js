const { moneyToNumber } = require('../../utils/formatPrice');

/**
 * Normaliza um produto bruto coletado do DOM para o formato padrão de saída.
 *
 * Correções vs. versão anterior:
 * 1. Usa moneyToNumber robusto de utils/formatPrice (trata R$, espaço não-quebrável,
 *    ranges de preço, prefixos textuais, formatos BR e US)
 * 2. normalizeLink filtra domínios que não são amazon.com.br (elimina links de banner)
 * 3. normalizeImageUrl remove parâmetros de resize para obter imagem em resolução maior
 * 4. Campo `valid` indica se o produto tem os três campos obrigatórios para postagem
 * 5. Produto só é retornado se tiver título OU link (não apenas asin)
 */
function normalizeProduct(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!raw.title && !raw.href) return null;

  const link = normalizeLink(raw.href);
  const title = cleanText(raw.title);

  // Descarta se não tiver nem título nem link válido
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

  // Flag para filtragem rápida no serviço e no n8n
  product.valid =
    typeof product.PRODUTO === 'string' &&
    product.PRODUTO.trim().length >= 5 &&
    typeof product.LINK_ORIGINAL === 'string' &&
    product.LINK_ORIGINAL.startsWith('https://') &&
    typeof product.PRECO_POR === 'number' &&
    product.PRECO_POR > 0;

  return product;
}

// ── helpers ──────────────────────────────────────────────────────────────────

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
    // Remove query string (parâmetros de rastreamento, sessão etc.)
    url.search = '';
    // Rejeita links que não são da Amazon (banners externos, afiliados externos)
    if (!url.hostname.includes('amazon')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Remove parâmetros de resize da URL da imagem.
 * Ex: "._AC_SX679_." → "." para obter imagem maior
 */
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
