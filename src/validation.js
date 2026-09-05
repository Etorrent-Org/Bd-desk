import { canonicalIsbn } from './isbn.js';

const STRING_LIMITS = {
  series: 300,
  number: 80,
  numberAlt: 80,
  title: 500,
  publisher: 240,
  collectionName: 240,
  writer: 500,
  artist: 500,
  legalDeposit: 80,
  printDate: 40,
  condition: 120,
  purchaseDate: 40,
  note: 2000,
  format: 120,
  readDate: 40,
  signedDate: 40,
  comment: 5000,
  description: 20000,
  source: 80,
  coverUrl: 2000
};

const BOOLEAN_FIELDS = new Set(['read', 'wishlist', 'forSale', 'firstEdition', 'followed', 'signed']);
const NUMBER_FIELDS = new Set(['marketValue', 'purchasePrice', 'pageCount']);

function invalid(message) {
  return Object.assign(new Error(message), {status: 400});
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function text(value, field, {required = false} = {}) {
  if (value === null || value === undefined) {
    if (required) throw invalid(`${field} requis`);
    return null;
  }
  if (typeof value !== 'string' && typeof value !== 'number') throw invalid(`${field} invalide`);
  const result = String(value).trim();
  if (!result) {
    if (required) throw invalid(`${field} requis`);
    return null;
  }
  const max = STRING_LIMITS[field];
  if (max && result.length > max) throw invalid(`${field} trop long`);
  return result;
}

function nullableNumber(value, field) {
  if (value === null || value === undefined || value === '') return null;
  const result = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  if (!Number.isFinite(result) || result < 0) throw invalid(`${field} invalide`);
  if (field === 'pageCount' && !Number.isInteger(result)) throw invalid(`${field} invalide`);
  return result;
}

function boolean(value, field) {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value === 0 || value === 1 || value === '0' || value === '1') return Number(value);
  throw invalid(`${field} invalide`);
}

function eventList(value) {
  if (!Array.isArray(value)) throw invalid('events invalides');
  const events = value.map(event => {
    if (typeof event !== 'string') throw invalid('events invalides');
    const name = event.trim();
    if (!name || name.length > 80) throw invalid('events invalides');
    return name;
  });
  if (!events.length || events.length > 20) throw invalid('events invalides');
  return [...new Set(events)];
}

function cover(value) {
  if (value === null || value === undefined || value === '') return null;
  const result = text(value, 'coverUrl');
  try {
    const parsed = new URL(result);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('protocol');
  } catch {
    throw invalid('coverUrl invalide');
  }
  return result;
}

function isbn(value) {
  if (value === null || value === undefined || value === '') return null;
  const result = canonicalIsbn(value);
  if (!result) throw invalid('ISBN/EAN invalide');
  return result;
}

export function normalizeAlbumPayload(payload, {partial = false} = {}) {
  if (!isRecord(payload)) throw invalid('Objet album requis');
  const result = {};
  if (!partial || 'isbn' in payload) result.isbn = isbn(payload.isbn);
  for (const field of Object.keys(STRING_LIMITS)) {
    const hasAlias = field === 'collectionName' && 'collection' in payload && !('collectionName' in payload);
    if (!partial || field in payload || hasAlias) {
      const value = hasAlias ? payload.collection : payload[field];
      result[field] = text(value, field, {required: !partial && ['series', 'title'].includes(field)});
    }
  }
  if (partial && 'series' in result && !result.series) throw invalid('series requis');
  if (partial && 'title' in result && !result.title) throw invalid('title requis');
  if (!partial || 'coverUrl' in payload) result.coverUrl = cover(payload.coverUrl);
  for (const field of NUMBER_FIELDS) {
    if (!partial || field in payload) result[field] = nullableNumber(payload[field], field);
  }
  for (const field of BOOLEAN_FIELDS) {
    if (!partial || field in payload) result[field] = boolean(payload[field] ?? 0, field);
  }
  if (!partial || 'source' in payload) result.source = text(payload.source, 'source') || 'manual';
  return result;
}

export function normalizeLoanPayload(payload) {
  if (!isRecord(payload)) throw invalid('Objet prêt requis');
  const albumId = Number(payload.albumId);
  if (!Number.isInteger(albumId) || albumId < 1) throw invalid('Album invalide');
  const borrower = text(payload.borrower, 'borrower');
  if (!borrower || borrower.length > 200) throw invalid('Emprunteur requis');
  const dueAt = payload.dueAt == null || payload.dueAt === '' ? null : text(payload.dueAt, 'dueAt');
  return {albumId, borrower, dueAt};
}

export function normalizeWebhookPayload(payload, {partial = false} = {}) {
  if (!isRecord(payload)) throw invalid('Objet webhook requis');
  const result = {};
  if (!partial || 'name' in payload) {
    const name = text(payload.name ?? (partial ? null : 'Webhook'), 'name');
    if (!name || name.length > 200) throw invalid('Nom de webhook invalide');
    result.name = name;
  }
  if (!partial || 'url' in payload) {
    const urlValue = text(payload.url, 'url');
    if (!urlValue || urlValue.length > 2000) throw invalid('URL de webhook invalide');
    let parsed;
    try { parsed = new URL(urlValue); } catch { throw invalid('URL de webhook invalide'); }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw invalid('URL de webhook invalide');
    result.url = urlValue;
  }
  if (!partial || 'events' in payload) result.events = eventList(payload.events ?? (partial ? [] : ['*']));
  if ('enabled' in payload) result.enabled = boolean(payload.enabled, 'enabled');
  return result;
}

export function normalizeApiKeyPayload(payload) {
  if (!isRecord(payload)) throw invalid('Objet clé API requis');
  let name;
  try { name = text(payload.name ?? 'API', 'name'); } catch { throw invalid('Nom de clé API invalide'); }
  if (!name || name.length > 200) throw invalid('Nom de clé API invalide');
  return {name};
}

export { invalid };
