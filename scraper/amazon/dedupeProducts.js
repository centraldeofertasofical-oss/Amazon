function dedupeProducts(products) {
  const out = [];
  const seen = new Set();

  for (const product of products || []) {
    if (!product) continue;
    const key = product.ASIN || product.LINK_ORIGINAL || product.PRODUTO;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(product);
  }

  return out;
}

module.exports = { dedupeProducts };
