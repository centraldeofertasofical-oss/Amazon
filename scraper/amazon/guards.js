async function detectPageGuards(page, selectors) {
  const captcha = await hasAnyVisible(page, selectors.captcha);
  const signIn = await hasAnyVisible(page, selectors.signIn);
  const robots = await hasAnyVisible(page, selectors.robots);
  return { captcha, signIn, robots };
}

async function hasAnyVisible(page, selectorList) {
  for (const selector of selectorList) {
    try {
      const visible = await page.locator(selector).first().isVisible({ timeout: 500 });
      if (visible) return true;
    } catch (_error) {}
  }
  return false;
}

module.exports = { detectPageGuards };
