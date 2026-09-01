export function normalizeIsbn(value = '') {
  return String(value).toUpperCase().replace(/[^0-9X]/g, '');
}

export function isbn10To13(isbn10) {
  const n = normalizeIsbn(isbn10);
  if (n.length !== 10) return null;
  const core = `978${n.slice(0, 9)}`;
  return core + isbn13CheckDigit(core);
}

export function isbn13CheckDigit(first12) {
  const digits = normalizeIsbn(first12);
  if (digits.length !== 12 || /X/.test(digits)) return null;
  const sum = [...digits].reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return String((10 - (sum % 10)) % 10);
}

export function isValidIsbn13(value) {
  const n = normalizeIsbn(value);
  if (n.length !== 13 || /X/.test(n)) return false;
  return isbn13CheckDigit(n.slice(0, 12)) === n[12];
}

export function isValidIsbn10(value) {
  const n = normalizeIsbn(value);
  if (n.length !== 10) return false;
  const sum = [...n].reduce((acc, d, i) => {
    const v = d === 'X' ? 10 : Number(d);
    if (!Number.isFinite(v) || (d === 'X' && i !== 9)) return NaN;
    return acc + v * (10 - i);
  }, 0);
  return Number.isFinite(sum) && sum % 11 === 0;
}

export function canonicalIsbn(value) {
  const n = normalizeIsbn(value);
  if (n.length === 13 && isValidIsbn13(n)) return n;
  if (n.length === 10 && isValidIsbn10(n)) return isbn10To13(n);
  return n || null;
}
