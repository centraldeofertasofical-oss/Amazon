async function clickLoadMoreIfVisible(page, selectors) {
  for (const selector of selectors.loadMoreButtons) {
    try {
      const locator = page.locator(selector).first();
      if (await locator.isVisible({ timeout: 800 })) {
        await locator.scrollIntoViewIfNeeded();
        await locator.click({ timeout: 2000 });
        return true;
      }
    } catch (_error) {}
  }
  return false;
}

module.exports = { clickLoadMoreIfVisible };
