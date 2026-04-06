/**
 * Converte string de preço (qualquer formato BR ou US) para número float.
 * Trata: R$, espaço não-quebrável (\u00A0), separadores de milhar e decimal,
 * prefixos como "A partir de", ranges de preço (captura o menor).
 */
function moneyToNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? Number(value.toFixed(2)) : null;

  let raw = String(value);

  // Range de preço: "R$ 50 – R$ 100" → pega o menor (primeiro)
  raw = raw.split(/[–—]/)[0];

  // Remove prefixos textuais comuns
  raw = raw.replace(/a partir de/i, '').trim();

  // Remove símbolo de moeda, espaços, espaços não-quebráveis
  raw = raw.replace(/R\$|\$|€|£/g, '').replace(/[\s\u00A0]/g, '');

  if (!raw) return null;

  const brFormat = /^-?\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(raw);
  const usFormat = /^-?\d{1,3}(,\d{3})*(\.\d{1,2})?$/.test(raw);
  const onlyDigits = /^\d+$/.test(raw);

  let normalized;

  if (brFormat) {
    normalized = raw.replace(/\./g, '').replace(',', '.');
  } else if (usFormat) {
    normalized = raw.replace(/,/g, '');
  } else if (onlyDigits && raw.length > 4) {
    normalized = (parseInt(raw, 10) / 100).toFixed(2);
  } else {
    const fallback = raw.replace(/[^\d.,]/g, '');
    if (/\d\.\d{3},/.test(fallback) || /,\d{2}$/.test(fallback)) {
      normalized = fallback.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = fallback.replace(/,/g, '');
    }
  }

  const num = parseFloat(normalized);
  return Number.isFinite(num) && num > 0 ? Number(num.toFixed(2)) : null;
}

/**
 * Formata número para string de preço no padrão BR.
 * Ex: 1299.9 → "R$ 1.299,90"
 */
function formatPriceBR(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

module.exports = { moneyToNumber, formatPriceBR };
