function buildAmazonUrl(query) {
  if (!query) return null;
  const encoded = encodeURIComponent(String(query).trim());
  return `https://www.amazon.com.br/s?k=${encoded}`;
}

module.exports = { buildAmazonUrl };
