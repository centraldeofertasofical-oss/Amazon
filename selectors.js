/**
 * Seletores da Amazon Brasil — revisados para páginas de ofertas dinâmicas.
 *
 * REGRA: O seletor genérico [data-asin]:not([data-asin=""]) foi REMOVIDO.
 * Ele capturava banners, carrosséis e widgets que não são cards de produto real,
 * gerando um volume alto de itens brutos com título/preço nulo.
 *
 * Primário: div[data-component-type="s-search-result"] — único seletor que
 * identifica exclusivamente cards de resultado de produto na Amazon.
 */
const selectors = {
  productCards: [
    // Página de busca e páginas de deals com layout de grid
    'div[data-component-type="s-search-result"]',
    // Fallback para layout de ofertas relâmpago / eventos especiais
    'div[data-component-type="s-impression-logger"][data-asin]:not([data-asin=""])'
  ],

  title: [
    // Seletor oficial de receita de título (mais estável)
    '[data-cy="title-recipe"] span',
    // Título dentro do h2 — layout padrão de busca
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

  // Preço em elemento oculto (mais confiável quando presente)
  priceOffscreen: [
    '[data-cy="price-recipe"] .a-price .a-offscreen',
    '.a-price:not(.a-text-price) .a-offscreen'
  ],

  // Fallback: preço split em whole + fraction
  priceWhole: [
    '[data-cy="price-recipe"] .a-price-whole',
    '.a-price:not(.a-text-price) .a-price-whole'
  ],

  priceFraction: [
    '[data-cy="price-recipe"] .a-price-fraction',
    '.a-price:not(.a-text-price) .a-price-fraction'
  ],

  // Preço original (De:) — para calcular desconto
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

  // Botões de carregar mais — ordem de prioridade
  loadMoreButtons: [
    'button:has-text("Ver mais ofertas")',
    'a:has-text("Ver mais ofertas")',
    'button:has-text("Ver mais")',
    'span:has-text("Ver mais ofertas")',
    '[data-action="a-expander-toggle"]',
    // Paginação clássica (páginas de busca /s?k=...)
    'a.s-pagination-next',
    '.s-pagination-item.s-pagination-next'
  ],

  // Indicadores de bloqueio
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
