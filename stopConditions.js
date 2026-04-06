/**
 * Determina se o scraper deve encerrar o loop de coleta.
 *
 * Lógica corrigida vs. versão anterior:
 * - Versão anterior parava com apenas 4 ciclos sem crescimento, mesmo sem atBottom.
 *   Isso encerrava o scraping no meio de páginas com lazy load lento.
 *
 * Nova lógica:
 * 1. NUNCA para se houve clique em "Ver mais" no ciclo atual (conteúdo pode ainda estar carregando)
 * 2. NUNCA para se houve crescimento de produtos neste ciclo
 * 3. Para normalmente se: sem crescimento >= maxNoGrowthCycles E (chegou ao fundo OU DOM não cresceu)
 * 4. Hard stop incondicional se: sem crescimento >= maxNoGrowthCycles * 2
 *    (evita loop infinito em páginas que nunca chegam ao fundo)
 *
 * @param {object} params
 * @param {number} params.noGrowthCycles       - Ciclos consecutivos sem novos produtos únicos
 * @param {number} params.maxNoGrowthCycles    - Limite configurado pelo chamador
 * @param {boolean} params.clicked             - Se houve clique em "Ver mais" neste ciclo
 * @param {number} params.growth              - Quantos novos produtos únicos foram adicionados
 * @param {boolean} params.atBottom           - Se o scroll chegou ao fundo da página
 * @param {boolean} params.grew              - Se o DOM cresceu após o último scroll
 */
function shouldStop({ noGrowthCycles, maxNoGrowthCycles, clicked, growth, atBottom, grew }) {
  // Clicou em "Ver mais" — aguarda próximo ciclo para avaliar
  if (clicked) return false;

  // Houve crescimento de produtos — continua
  if (growth > 0) return false;

  // Hard stop: ciclos sem crescimento muito acima do limite — encerra independente do estado
  if (noGrowthCycles >= maxNoGrowthCycles * 2) return true;

  // Parada normal: sem crescimento suficiente E (está no fundo OU DOM não cresceu mais)
  if (noGrowthCycles >= maxNoGrowthCycles && (atBottom || !grew)) return true;

  return false;
}

module.exports = { shouldStop };
