const { normalizeProduct } = require('./normalizeProduct');

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
    } catch (_err) {}

    products.push(...batch);
  }

  return products.map(normalizeProduct).filter(Boolean);
}

module.exports = { collectVisibleProducts };
