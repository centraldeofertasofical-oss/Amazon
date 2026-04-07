const { sleep } = require('../../utils/sleep');

async function scrollStep(page) {
  const before = await page.evaluate(() => document.body.scrollHeight);

  const atBottom = await page.evaluate(() => {
    const distance = Math.max(500, Math.floor(window.innerHeight * 0.8));
    const target = Math.min(document.body.scrollHeight, window.scrollY + distance);
    window.scrollTo({ top: target, behavior: 'smooth' });
    return window.scrollY + window.innerHeight >= document.body.scrollHeight * 0.95;
  });

  await sleep(600);

  const after = await page.evaluate(() => document.body.scrollHeight);
  const grew = after > before;

  if (grew) {
    await sleep(900);
  }

  return { atBottom, grew };
}

async function isAtBottomOfPage(page) {
  return page.evaluate(() => {
    return window.scrollY + window.innerHeight >= document.body.scrollHeight * 0.97;
  });
}

async function scrollToTop(page) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await sleep(300);
}

module.exports = { scrollStep, isAtBottomOfPage, scrollToTop };
