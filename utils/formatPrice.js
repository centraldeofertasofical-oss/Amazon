function moneyToNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? Number(value.toFixed(2)) : null;

  let raw = String(value);

  raw = raw.split(/[–—]/)[0];
  raw = raw.replace(/a partir de/i, '').trim();
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
