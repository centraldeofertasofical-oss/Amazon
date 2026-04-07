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
