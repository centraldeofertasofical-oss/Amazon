/**
 * Valida se um produto normalizado tem os campos mínimos obrigatórios
 * para ser aceito como item válido na saída final.
 *
 * Campos obrigatórios:
 * - PRODUTO: string com >= 5 caracteres
 * - LINK_ORIGINAL: string começando com https://
 * - PRECO_POR: número > 0
 *
 * Produtos que falham nesta validação são contabilizados em metrics.invalidCount
 * e registrados no log, mas NÃO retornados ao n8n.
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
