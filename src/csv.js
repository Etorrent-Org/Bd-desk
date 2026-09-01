import { canonicalIsbn } from './isbn.js';

export function parseDelimited(text, delimiter = ';') {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (c === delimiter && !quoted) {
      row.push(field); field = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(v => v !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function num(v) {
  if (v == null || String(v).trim() === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
function bool(v) { return String(v).trim() === '1' ? 1 : 0; }

export function parseBdgestCsv(text) {
  const clean = String(text).replace(/^\uFEFF/, '');
  const rows = parseDelimited(clean, ';');
  if (!rows.length) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1)
    .filter(r => r.length)
    .map(values => Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ''])))
    // A BDGest export can append headers for REVUE / ParaBD tables after the ALBUM rows.
    // Only the ALBUM records belong in BD Desk's album collection.
    .filter(o => String(o.Table || '').trim().toUpperCase() === 'ALBUM' && /^\d+$/.test(String(o.IdAlbum || '').trim()))
    .map((o, index) => ({
      bdgestId: o.IdAlbum || null,
      isbn: canonicalIsbn(o.ISBN),
      series: o.Serie || 'Sans série',
      number: o.Num || null,
      numberAlt: o.NumA || null,
      title: o.Titre || `Album ${index + 1}`,
      publisher: o.Editeur || null,
      collection: o.Collection || null,
      firstEdition: bool(o.EO),
      legalDeposit: o.DL || null,
      printDate: o.AI || null,
      marketValue: num(o.Cote),
      condition: o.Etat || null,
      purchaseDate: o.DateAchat || null,
      purchasePrice: num(o.PrixAchat),
      note: o.Note || null,
      writer: o.Scenariste || null,
      artist: o.Dessinateur || null,
      wishlist: bool(o.Wishlist),
      forSale: bool(o.AVendre),
      format: o.Format || null,
      followed: bool(o.Suivi),
      read: bool(o.Lu),
      readDate: o.DateLu || null,
      signed: bool(o.Dedicace),
      signedDate: o.DateDedicace || null,
      comment: o.Commentaire || null,
      tableName: o.Table || null,
      source: 'bdgest'
    }));
}

export function toIsoDate(fr) {
  const m = String(fr || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}` : null;
}
