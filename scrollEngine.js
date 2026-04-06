const { sleep } = require('../../utils/sleep');

/**
 * Executa um passo de scroll incremental e aguarda estabilização do DOM.
 *
 * Correções vs. versão anterior:
 * 1. Viewport de altura normal (900px) para disparar IntersectionObserver corretamente
 * 2. Captura scrollHeight antes e depois — aguarda +800ms se o DOM cresceu (lazy load ativo)
 * 3. Retorna { atBottom: boolean, grew: boolean } para uso no stopConditions
 * 4. Scroll de 80% da viewport — mais preciso que valor fixo
 */
async function scrollStep(page) {
  const before = await page.evaluate(() => document.body.scrollHeight);

  const atBottom = await page.evaluate(() => {
    const distance = Math.max(500, Math.floor(window.innerHeight * 0.8));
    const target = Math.min(document.body.scrollHeight, window.scrollY + distance);
    window.scrollTo({ top: target, behavior: 'smooth' });

    // Verifica se estava perto do fundo ANTES deste scroll
    return window.scrollY + window.innerHeight >= document.body.scrollHeight * 0.95;
  });

  // Aguarda scroll suave completar
  await sleep(600);

  // Verifica se o DOM cresceu após o scroll (lazy load disparou)
  const after = await page.evaluate(() => document.body.scrollHeight);
  const grew = after > before;

  if (grew) {
    // DOM cresceu — aguarda novos elementos renderizarem completamente
    await sleep(900);
  }

  return { atBottom, grew };
}

/**
 * Verifica se a página chegou ao fim de forma definitiva.
 * Considera fundo quando scrollY + viewport >= 97% do scrollHeight.
 */
async function isAtBottomOfPage(page) {
  return page.evaluate(() => {
    return window.scrollY + window.innerHeight >= document.body.scrollHeight * 0.97;
  });
}

/**
 * Scroll até o topo da página (útil para reset entre páginas de paginação).
 */
async function scrollToTop(page) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await sleep(300);
}

module.exports = { scrollStep, isAtBottomOfPage, scrollToTop };
