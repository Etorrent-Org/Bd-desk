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

function csvObjects(text) {
  const clean = String(text).replace(/^\uFEFF/, '');
  const rows = parseDelimited(clean, ';');
  if (!rows.length) return { headers: [], records: [] };
  const headers = rows[0].map(h => h.trim());
  const records = rows.slice(1)
    .filter(r => r.length && r.some(v => String(v ?? '').trim() !== ''))
    .map(values => Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ''])));
  return { headers, records };
}

function countDuplicateGroups(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.values()].filter(count => count > 1).length;
}

export function parseBdgestCsv(text) {
  const { records } = csvObjects(text);
  return records
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

export function inspectBdgestCsv(text) {
  const { headers, records } = csvObjects(text);
  const requiredHeaders = ['Table', 'IdAlbum', 'Titre'];
  const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
  const errors = [];
  if (!headers.length) errors.push('Le fichier CSV est vide.');
  if (missingHeaders.length) errors.push(`Colonnes BDGest manquantes : ${missingHeaders.join(', ')}.`);

  const albumRecords = records.filter(record => String(record.Table || '').trim().toUpperCase() === 'ALBUM');
  const invalidAlbumRecords = albumRecords.filter(record => !/^\d+$/.test(String(record.IdAlbum || '').trim()));
  const validAlbumRecords = albumRecords.filter(record => /^\d+$/.test(String(record.IdAlbum || '').trim()));
  const ignoredRows = records.length - albumRecords.length;
  const duplicateIds = countDuplicateGroups(validAlbumRecords.map(record => String(record.IdAlbum).trim()));
  const parsedRows = parseBdgestCsv(text);
  const duplicateIsbnGroups = countDuplicateGroups(parsedRows.map(row => row.isbn).filter(Boolean));

  if (albumRecords.length === 0 && !missingHeaders.length) errors.push('Aucune ligne ALBUM BDGest valide n’a été trouvée.');
  if (invalidAlbumRecords.length) errors.push(`${invalidAlbumRecords.length} ligne(s) ALBUM ont un IdAlbum invalide.`);
  if (duplicateIds) errors.push(`${duplicateIds} groupe(s) d’IdAlbum dupliqué(s) détecté(s).`);

  return {
    valid: errors.length === 0 && parsedRows.length > 0,
    headers,
    missingHeaders,
    rows: parsedRows.length,
    sourceRows: parsedRows.length,
    ignoredRows,
    invalidRows: invalidAlbumRecords.length,
    duplicateIds,
    isbnPresent: parsedRows.filter(row => row.isbn).length,
    duplicateIsbnGroups,
    errors
  };
}

export function toIsoDate(fr) {
  const m = String(fr || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}` : null;
}
