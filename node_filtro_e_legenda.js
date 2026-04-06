// ============================================================
// NÓ 1 — FILTRO E VALIDAÇÃO DE PRODUTOS
// Cole este bloco no nó Code do n8n que recebe o response do scraper.
// ============================================================

const response = $input.first().json;

// Verifica bloqueio por captcha, login ou robô
if (response.metrics?.blocked) {
  throw new Error(`Scraper bloqueado: ${JSON.stringify(response.metrics.guards)}`);
}

// Verifica resposta inválida
if (!response.ok || !Array.isArray(response.products)) {
  throw new Error('Resposta inválida do scraper: ' + JSON.stringify(response));
}

// Loga warnings para diagnóstico (visível nos logs de execução do n8n)
if (Array.isArray(response.warnings) && response.warnings.length > 0) {
  console.warn('[SCRAPER WARNINGS]', response.warnings.join(' | '));
}

// Loga métricas resumidas para monitoramento
console.log('[SCRAPER METRICS]', JSON.stringify({
  cycles: response.metrics?.cycles,
  validCollected: response.metrics?.validCollected,
  invalidCount: response.metrics?.invalidCount,
  reachedBottom: response.metrics?.reachedBottom,
  blocked: response.metrics?.blocked,
  elapsedMs: response.metrics?.elapsedMs
}));

// Filtragem final (redundante com a validação do scraper, mas protege o workflow)
const valid = response.products.filter(p => {
  const hasTitle = typeof p.PRODUTO === 'string' && p.PRODUTO.trim().length >= 5;
  const hasPrice = typeof p.PRECO_POR === 'number' && p.PRECO_POR > 0;
  const hasLink  = typeof p.LINK_ORIGINAL === 'string' && p.LINK_ORIGINAL.startsWith('https://');
  return hasTitle && hasPrice && hasLink;
});

// Threshold mínimo de produtos válidos antes de continuar o workflow
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
