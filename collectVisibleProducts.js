const { normalizeProduct } = require('./normalizeProduct');

/**
 * Coleta todos os produtos visíveis na página usando os seletores fornecidos.
 *
 * Correções vs. versão anterior:
 * 1. Filtro interno: cards sem título E sem link são descartados no $$eval
 *    (elimina widgets, banners e carrosséis que passavam como produtos)
 * 2. Fallback de preço: lê priceWhole + priceFraction quando priceOffscreen é nulo
 *    (cobre layout split que a Amazon usa em algumas páginas de deals)
 * 3. try/catch por seletor: se um seletor falhar, continua com o próximo
 */
async function collectVisibleProducts(page, selectors) {
  const products = [];

  for (const productSelector of selectors.productCards) {
    let batch = [];
    try {
      batch = await page.$$eval(
        productSelector,
        (nodes, sel) => {
          // ── helpers ────────────────────────────────────────────────────────
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

          /**
           * Monta preço a partir de whole + fraction quando offscreen não existe.
           * Ex: whole="1.299" fraction="90" → "1299,90"
           */
          function buildPriceFromParts(root, wholeSelectors, fractionSelectors) {
            const whole = textBySelectors(root, wholeSelectors);
            if (!whole) return null;
            // Remove pontos de milhar do whole (Amazon usa "1.299" no whole)
            const cleanWhole = whole.replace(/[.,\s]/g, '');
            const fraction = textBySelectors(root, fractionSelectors);
            const cleanFraction = fraction
              ? fraction.replace(/\D/g, '').padEnd(2, '0').slice(0, 2)
              : '00';
            return `${cleanWhole},${cleanFraction}`;
          }

          // ── coleta ─────────────────────────────────────────────────────────
          return nodes
            .map((node) => {
              const asin = node.getAttribute('data-asin') || null;
              const title = textBySelectors(node, sel.title);
              const href = attrBySelectors(node, sel.link, 'href');

              // Descarta cards sem título E sem link — são placeholders/widgets
              if (!title && !href) return null;

              const image = attrBySelectors(node, sel.image, 'src');

              // Tenta priceOffscreen primeiro; fallback para whole+fraction
              const priceOffscreen = textBySelectors(node, sel.priceOffscreen);
              const priceResolved = priceOffscreen
                ? priceOffscreen
                : buildPriceFromParts(node, sel.priceWhole, sel.priceFraction);

              const oldPrice = textBySelectors(node, sel.oldPrice);
              const rating = textBySelectors(node, sel.rating);
              const reviews = textBySelectors(node, sel.reviews);

              return {
                asin,
                title,
                href,
                image,
                priceOffscreen: priceResolved,
                oldPrice,
                rating,
                reviews
              };
            })
            .filter(Boolean); // remove nulls do filtro acima
        },
        selectors
      );
    } catch (_err) {
      // Seletor não encontrou elementos — continua com o próximo seletor
    }

    products.push(...batch);
  }

  return products.map(normalizeProduct).filter(Boolean);
}

module.exports = { collectVisibleProducts };
