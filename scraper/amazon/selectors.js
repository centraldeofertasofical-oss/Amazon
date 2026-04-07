const selectors = {
  productCards: [
    'div[data-component-type="s-search-result"]',
    'div[data-component-type="s-impression-logger"][data-asin]:not([data-asin=""])',
    'div[data-testid="deal-card"]',
    'div[data-component-type="dealContent"]',
    'div.DealCard-module__card',
    'div[class*="DealCard"]',
    'div[data-asin]:not([data-asin=""])[class*="deal"]',
    'li[data-asin]:not([data-asin=""])'
  ],

  title: [
    '[data-cy="title-recipe"] span',
    'h2 a span',
    'h2 span.a-size-medium',
    'h2 span.a-size-base-plus',
    'h2 span',
    'span[data-testid="deal-title"]',
    'a[data-testid="product-title"]',
    'span.DealCard-module__title',
    'span[class*="dealTitle"]',
    'span[class*="DealTitle"]'
  ],

  link: [
    '[data-cy="title-recipe"] a[href]',
    'h2 a[href]',
    'a.a-link-normal.s-no-outline[href]',
    'a[data-testid="product-link"][href]',
    'a[href*="/dp/"]',
    'a[href*="/gp/product/"]'
  ],

  image: [
    'img.s-image[src]',
    '.s-product-image-container img[src]',
    'img[data-image-index][src]',
    'img[data-testid="product-image"][src]',
    'div[class*="DealCard"] img[src]',
    'img[class*="dealImage"][src]'
  ],

  priceOffscreen: [
    '[data-cy="price-recipe"] .a-price .a-offscreen',
    '.a-price:not(.a-text-price) .a-offscreen',
    'span[data-testid="deal-price"] .a-offscreen',
    'div[class*="DealCard"] .a-price .a-offscreen'
  ],

  priceWhole: [
    '[data-cy="price-recipe"] .a-price-whole',
    '.a-price:not(.a-text-price) .a-price-whole',
    'span[data-testid="deal-price"] .a-price-whole'
  ],

  priceFraction: [
    '[data-cy="price-recipe"] .a-price-fraction',
    '.a-price:not(.a-text-price) .a-price-fraction',
    'span[data-testid="deal-price"] .a-price-fraction'
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
