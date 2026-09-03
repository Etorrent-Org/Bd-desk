import { canonicalIsbn } from './isbn.js';

const USER_AGENT = 'BD-Desk/1.0 (+https://github.com/Etorrent-Org/Bd-desk)';
const SOURCE_PRIORITY = {
  hachette: 60,
  bnf: 55,
  'bnf-intermarc': 54,
  'google-books': 35,
  'open-library': 20
};

export function openLibraryCover(isbn, size='L') {
  const n = canonicalIsbn(isbn);
  return n ? 'https://covers.openlibrary.org/b/isbn/' + encodeURIComponent(n) + '-' + size + '.jpg?default=false' : null;
}

export function isMechanicalOpenLibraryCover(value, isbn=null) {
  const url = String(value || '');
  const match = url.match(/^https?:\/\/covers\.openlibrary\.org\/b\/isbn\/([^/?#]+)-[A-Za-z0-9]+\.jpg(?:[?#].*)?$/i);
  if (!match) return false;
  let encodedIsbn;
  try {
    encodedIsbn = decodeURIComponent(match[1]);
  } catch {
    return false;
  }
  const coverIsbn = canonicalIsbn(encodedIsbn);
  const requested = isbn ? canonicalIsbn(isbn) : null;
  return !requested || !coverIsbn || coverIsbn === requested;
}

export function googleBooksUrl(isbn, apiKey='') {
  const n = canonicalIsbn(isbn);
  const u = new URL('https://www.googleapis.com/books/v1/volumes');
  u.searchParams.set('q', 'isbn:' + n);
  u.searchParams.set('maxResults', '5');
  if (apiKey) u.searchParams.set('key', apiKey);
  return u.toString();
}

export function openLibraryUrl(isbn) {
  const n = canonicalIsbn(isbn);
  const u = new URL('https://openlibrary.org/search.json');
  u.searchParams.set('isbn', n);
  u.searchParams.set('fields', 'key,title,author_name,publisher,first_publish_year,isbn,cover_i,edition_key,series');
  u.searchParams.set('limit', '5');
  return u.toString();
}

function bnfBaseUrl(isbn, recordSchema) {
  const n = canonicalIsbn(isbn);
  const u = new URL('https://catalogue.bnf.fr/api/SRU');
  u.searchParams.set('version', '1.2');
  u.searchParams.set('operation', 'searchRetrieve');
  u.searchParams.set('query', 'bib.isbn adj "' + n + '"');
  u.searchParams.set('recordSchema', recordSchema);
  u.searchParams.set('maximumRecords', '5');
  return u.toString();
}

export function bnfSruUrl(isbn) {
  return bnfBaseUrl(isbn, 'dublincore');
}

export function bnfIntermarcUrl(isbn) {
  return bnfBaseUrl(isbn, 'intermarcXchange');
}

export function bnfCoverUrl(isbn) {
  const n = canonicalIsbn(isbn);
  return n
    ? 'https://openapi.bnf.fr/couverture/image/image/recupererImage?EAN=' + encodeURIComponent(n) + '&couverture=1&taille=originale&largeur=900&hauteur=1400'
    : null;
}

export function hachetteSearchUrl() {
  return 'https://api.hachette.fr/search';
}

export function hachetteSearchBody(isbn) {
  return {
    index: 'elasticsearch_index_hlrwf_prd_index_17',
    source: {
      size: 5,
      query: {
        multi_match: {
          query: canonicalIsbn(isbn),
          fields: [
            'product__ean',
            'product__ean_numerique_lie__search',
            'product__code_hachette'
          ]
        }
      }
    }
  };
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim() || null;
}

function firstValue(value) {
  if (Array.isArray(value)) return value.find(Boolean) || null;
  return value || null;
}

function valuesOf(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function parseJson(value) {
  if (value && typeof value === 'object') return value;
  try {
    return JSON.parse(String(value || ''));
  } catch {
    return null;
  }
}

function normalizePublisher(value) {
  let s = cleanText(value);
  if (!s) return null;
  s = s.replace(/\s*\([^()]*\)\s*$/, '').trim();
  if (/^comix\s+buro$/i.test(s)) return 'Glénat';
  if (/^gl[eé]nat(?:\s+bd)?$/i.test(s)) return 'Glénat';
  const keepLower = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'et', 'the', 'of', 'and']);
  return s.split(/\s+/).map((word, i) => {
    const low = word.toLocaleLowerCase('fr');
    if (i === 0 || keepLower.has(low) || !/^[a-zà-ÿ][a-zà-ÿ'’-]+$/u.test(word)) return word;
    return word.charAt(0).toLocaleUpperCase('fr') + word.slice(1);
  }).join(' ');
}

function collectionFromPublisher(value) {
  const s = cleanText(value)?.replace(/\s*\([^()]*\)\s*$/, '').trim();
  return /^comix\s+buro$/i.test(s || '') ? 'Comix Buro' : null;
}

function normalizeDate(value) {
  const s = cleanText(value);
  if (!s) return null;
  const iso = s.match(/\b((?:19|20)\d{2})[-/.](\d{2})[-/.](\d{2})\b/);
  if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];
  const fr = s.match(/\b(\d{2})[-/.](\d{2})[-/.]((?:19|20)\d{2})\b/);
  if (fr) return fr[3] + '-' + fr[2] + '-' + fr[1];
  const year = s.match(/\b((?:19|20)\d{2})\b/);
  return year ? year[1] : s;
}

function numeric(value) {
  const match = String(value || '').replace(',', '.').match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function normalizeFormat(value) {
  const s = cleanText(value);
  if (!s) return null;
  const dimensions = s.match(/(\d+(?:[.,]\d+)?)\s*(?:x|×|by)\s*(\d+(?:[.,]\d+)?)\s*(mm|cm)?/i);
  if (!dimensions) return s;
  let width = Number(dimensions[1].replace(',', '.'));
  let height = Number(dimensions[2].replace(',', '.'));
  const unit = (dimensions[3] || '').toLowerCase();
  if (unit === 'mm') {
    width /= 10;
    height /= 10;
  }
  return width + ' × ' + height + ' cm';
}

function extractSeriesInfo(value, allowBareNumber=false) {
  const s = cleanText(value);
  if (!s || /^https?:/i.test(s)) return {series: null, seriesNumber: null};
  const explicit = s.match(/^(.+?)\s*(?:[-–—,:;]\s*)?(?:t(?:ome)?|vol(?:ume)?|n(?:um(?:éro)?)?)[°ºo.]?\s*0*(\d+(?:[.,]\d+)?)\s*$/i)
    || s.match(/^(.+?)\s*#\s*0*(\d+(?:[.,]\d+)?)\s*$/i);
  if (explicit) return {series: cleanText(explicit[1]), seriesNumber: explicit[2].replace(',', '.')};
  if (allowBareNumber) {
    const bare = s.match(/^(.+?)[\s.;,:-]+0*(\d+(?:[.,]\d+)?)\s*$/);
    if (bare && bare[1].trim().length > 2) return {series: cleanText(bare[1]), seriesNumber: bare[2].replace(',', '.')};
  }
  return {series: s, seriesNumber: null};
}

function cleanSeriesNumber(value) {
  const s = cleanText(value);
  if (!s) return null;
  const explicit = s.match(/(?:t(?:ome)?|vol(?:ume)?|n(?:um(?:éro)?)?)[°ºo.]?\s*0*(\d+(?:[.,]\d+)?)/i);
  if (explicit) return explicit[1].replace(',', '.');
  const bare = s.match(/^0*(\d+(?:[.,]\d+)?)$/);
  return bare ? bare[1].replace(',', '.') : s;
}

function extractStructuredTitle(value) {
  const s = cleanText(value);
  if (!s) return {title: null, series: null, seriesNumber: null};
  const m = s.match(/^(.+?)\s*[-–—,:]\s*(?:t(?:ome)?|vol(?:ume))[°ºo.]?\s*0*(\d+(?:[.,]\d+)?)\s*[-–—:]\s*(.+)$/i);
  return m
    ? {title: cleanText(m[3]), series: cleanText(m[1]), seriesNumber: m[2].replace(',', '.')}
    : {title: s, series: null, seriesNumber: null};
}

function canonicalIdentifiers(values) {
  const identifiers = [];
  for (const raw of valuesOf(values)) {
    const value = typeof raw === 'object' ? (raw.identifier || raw.value || raw.isbn || raw.ean) : raw;
    const isbn = canonicalIsbn(value);
    if (isbn && !identifiers.includes(isbn)) identifiers.push(isbn);
  }
  return identifiers;
}

function coverEvidence(source, identifiers, extra={}) {
  return {
    source,
    official: source === 'hachette' || source === 'bnf' || source === 'bnf-intermarc',
    identifierMatch: identifiers.length > 0,
    ...extra
  };
}

export function parseGoogleBooks(data) {
  return (data?.items || []).map(item => {
    const v = item.volumeInfo || {};
    const structured = extractStructuredTitle(v.title);
    const rawSeries = item.seriesInfo?.shortSeriesBookTitle || null;
    const parsedSeries = extractSeriesInfo(rawSeries, true);
    const identifiers = canonicalIdentifiers(v.industryIdentifiers);
    return {
      source: 'google-books',
      sourceId: item.id,
      title: structured.title,
      subtitle: cleanText(v.subtitle),
      authors: Array.isArray(v.authors) ? v.authors : [],
      publisher: normalizePublisher(v.publisher),
      publishedDate: normalizeDate(v.publishedDate),
      description: cleanText(v.description),
      categories: v.categories || [],
      pageCount: numeric(v.pageCount),
      series: parsedSeries.series || structured.series || null,
      seriesNumber: item.seriesInfo?.bookDisplayNumber || parsedSeries.seriesNumber || structured.seriesNumber || null,
      coverUrl: v.imageLinks?.thumbnail?.replace(/^http:/, 'https:') || null,
      identifiers,
      coverIdentifiers: identifiers,
      coverEvidence: coverEvidence('google-books', identifiers, {apiRecord: true})
    };
  });
}

export function parseOpenLibrary(data) {
  if (!data || data.error) return [];
  if (Array.isArray(data.docs)) {
    return data.docs.map(doc => {
      const structured = extractStructuredTitle(doc.title);
      const rawSeries = Array.isArray(doc.series) ? doc.series[0] : (doc.series || null);
      const parsedSeries = extractSeriesInfo(rawSeries, true);
      const identifiers = canonicalIdentifiers(doc.isbn);
      return {
        source: 'open-library',
        sourceId: doc.edition_key?.[0] || doc.key || null,
        title: structured.title,
        publisher: normalizePublisher(Array.isArray(doc.publisher) ? doc.publisher[0] : null),
        publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : null,
        pageCount: null,
        authors: Array.isArray(doc.author_name) ? doc.author_name : [],
        identifiers,
        coverIdentifiers: identifiers,
        series: parsedSeries.series || structured.series || null,
        seriesNumber: parsedSeries.seriesNumber || structured.seriesNumber || null,
        coverUrl: doc.cover_i ? 'https://covers.openlibrary.org/b/id/' + encodeURIComponent(doc.cover_i) + '-L.jpg' : null,
        coverEvidence: coverEvidence('open-library', identifiers, {apiRecord: true})
      };
    });
  }
  const structured = extractStructuredTitle(data.title);
  const rawSeries = Array.isArray(data.series) ? data.series[0] : (data.series || null);
  const parsedSeries = extractSeriesInfo(rawSeries, true);
  const identifiers = canonicalIdentifiers(data.isbn_13 || data.isbn_10);
  return [{
    source: 'open-library',
    sourceId: data.key || null,
    title: structured.title,
    publisher: normalizePublisher(Array.isArray(data.publishers) ? data.publishers[0] : null),
    publishedDate: normalizeDate(data.publish_date),
    pageCount: numeric(data.number_of_pages),
    authors: (data.authors || []).map(a => a.name || a.key).filter(Boolean),
    identifiers,
    coverIdentifiers: identifiers,
    series: parsedSeries.series || structured.series || null,
    seriesNumber: parsedSeries.seriesNumber || structured.seriesNumber || null,
    coverUrl: data.covers?.[0] ? 'https://covers.openlibrary.org/b/id/' + encodeURIComponent(data.covers[0]) + '-L.jpg' : null,
    coverEvidence: coverEvidence('open-library', identifiers, {apiRecord: true})
  }];
}

function xmlDecode(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .trim();
}

function xmlTexts(xml, tag) {
  const re = new RegExp('<(?:[\\w.-]+:)?' + tag + '\\b[^>]*>([\\s\\S]*?)</(?:[\\w.-]+:)?' + tag + '>', 'gi');
  const out = [];
  let match;
  while ((match = re.exec(String(xml)))) {
    const value = cleanText(xmlDecode(match[1]));
    if (value) out.push(value);
  }
  return out;
}

function xmlText(xml, tag) {
  return xmlTexts(xml, tag)[0] || null;
}

function recordCount(xml) {
  return Number(xmlText(xml, 'numberOfRecords') || 0);
}

function marcFields(xml, tag) {
  const quoteClass = '["' + "'" + ']';
  const re = new RegExp('<(?:[\\w.-]+:)?datafield\\b[^>]*\\btag=' + quoteClass + tag + quoteClass + '[^>]*>([\\s\\S]*?)</(?:[\\w.-]+:)?datafield>', 'gi');
  const out = [];
  let match;
  while ((match = re.exec(String(xml)))) out.push(match[1]);
  return out;
}

function marcControlFields(xml, tag) {
  const quoteClass = '["' + "'" + ']';
  const re = new RegExp('<(?:[\\w.-]+:)?controlfield\\b[^>]*\\btag=' + quoteClass + tag + quoteClass + '[^>]*>([\\s\\S]*?)</(?:[\\w.-]+:)?controlfield>', 'gi');
  const out = [];
  let match;
  while ((match = re.exec(String(xml)))) out.push(cleanText(xmlDecode(match[1])));
  return out.filter(Boolean);
}

function marcSubfields(field, code) {
  const quoteClass = '["' + "'" + ']';
  const re = new RegExp('<(?:[\\w.-]+:)?subfield\\b[^>]*\\bcode=' + quoteClass + code + quoteClass + '[^>]*>([\\s\\S]*?)</(?:[\\w.-]+:)?subfield>', 'gi');
  const out = [];
  let match;
  while ((match = re.exec(String(field)))) {
    const value = cleanText(xmlDecode(match[1]));
    if (value) out.push(value);
  }
  return out;
}

function firstMarcSubfield(xml, tag, code) {
  for (const field of marcFields(xml, tag)) {
    const value = marcSubfields(field, code)[0];
    if (value) return value;
  }
  return null;
}

function allMarcSubfields(xml, tag, code) {
  return marcFields(xml, tag).flatMap(field => marcSubfields(field, code));
}

export function parseBnfDublinCore(xml) {
  if (!xml || !recordCount(xml)) return [];
  const identifiers = canonicalIdentifiers(xmlTexts(xml, 'identifier'));
  const rawTitle = xmlText(xml, 'title');
  const title = cleanText(rawTitle?.split(/\s+\/\s+/)[0]);
  const rawPublisher = xmlText(xml, 'publisher');
  const relations = xmlTexts(xml, 'relation');
  let relationSeries = {series: null, seriesNumber: null};
  for (const relation of relations) {
    const parsed = extractSeriesInfo(relation, true);
    if (parsed.seriesNumber || !relationSeries.series) relationSeries = parsed;
  }
  const authors = xmlTexts(xml, 'creator');
  const coverUrl = identifiers[0] ? bnfCoverUrl(identifiers[0]) : null;
  return [{
    source: 'bnf',
    sourceId: xmlText(xml, 'identifier') || null,
    title,
    publisher: normalizePublisher(rawPublisher),
    collection: collectionFromPublisher(rawPublisher),
    publishedDate: normalizeDate(xmlText(xml, 'date')),
    description: xmlText(xml, 'description'),
    authors,
    series: relationSeries.series,
    seriesNumber: relationSeries.seriesNumber,
    identifiers,
    coverIdentifiers: identifiers,
    coverUrl,
    coverEvidence: coverUrl ? coverEvidence('bnf', identifiers, {catalogRecord: true}) : null
  }];
}

export function parseBnfIntermarc(xml) {
  if (!xml || !recordCount(xml)) return [];

  const title = firstMarcSubfield(xml, '245', 'a');
  let series = null;
  let seriesNumber = null;
  const linkedSeries = marcFields(xml, '460')[0] || null;
  if (linkedSeries) {
    series = marcSubfields(linkedSeries, 't')[0] || null;
    seriesNumber = cleanSeriesNumber(marcSubfields(linkedSeries, 'v')[0]);
  }
  if (!series) {
    const ensemble = marcFields(xml, '290')[0] || null;
    if (ensemble) {
      series = marcSubfields(ensemble, 'a')[0] || null;
      seriesNumber = seriesNumber || cleanSeriesNumber(marcSubfields(ensemble, 'v')[0] || marcSubfields(ensemble, 'h')[0]);
    }
  }

  let collection = firstMarcSubfield(xml, '295', 'a') || firstMarcSubfield(xml, '410', 't') || null;
  const publisherRaw = firstMarcSubfield(xml, '264', 'b') || firstMarcSubfield(xml, '260', 'b') || firstMarcSubfield(xml, '260', 'c');
  collection = collection || collectionFromPublisher(publisherRaw);
  const dateRaw = firstMarcSubfield(xml, '264', 'c') || firstMarcSubfield(xml, '260', 'd') || firstMarcSubfield(xml, '260', 'c');
  const pageRaw = firstMarcSubfield(xml, '280', 'a');
  const formatRaw = firstMarcSubfield(xml, '280', 'd');
  const pageCountMatch = pageRaw?.match(/(\d+)\s*p\b/i);
  const pageCount = pageCountMatch ? Number(pageCountMatch[1]) : null;
  const authors = [];
  for (const code of ['f', 'g']) {
    for (const value of marcSubfields(marcFields(xml, '245')[0] || '', code)) {
      if (!authors.includes(value)) authors.push(value);
    }
  }
  const identifiers = canonicalIdentifiers([
    ...allMarcSubfields(xml, '020', 'a'),
    ...allMarcSubfields(xml, '038', 'a'),
    ...allMarcSubfields(xml, '073', 'a')
  ]);
  const sourceId = xmlText(xml, 'recordIdentifier') || firstMarcSubfield(xml, '003', 'a') || marcControlFields(xml, '003')[0] || null;
  const coverUrl = identifiers[0] ? bnfCoverUrl(identifiers[0]) : null;
  if (!title && !series && !collection && !authors.length) return [];
  return [{
    source: 'bnf-intermarc',
    sourceId,
    title,
    series,
    seriesNumber,
    collection,
    publisher: normalizePublisher(publisherRaw),
    publishedDate: normalizeDate(dateRaw),
    pageCount,
    format: normalizeFormat(formatRaw),
    authors,
    identifiers,
    coverIdentifiers: identifiers,
    coverUrl,
    description: firstMarcSubfield(xml, '830', 'a'),
    coverEvidence: coverUrl ? coverEvidence('bnf-intermarc', identifiers, {catalogRecord: true}) : null
  }];
}

function hachetteHitSource(hit) {
  return hit?._source || hit?.source || {};
}

function hachetteRender(source) {
  const raw = firstValue(source.product__decoupled_render || source.decoupled_render);
  const parsed = parseJson(raw);
  if (Array.isArray(parsed)) return parsed.find(value => value && typeof value === 'object') || {};
  return parsed && typeof parsed === 'object' ? parsed : {};
}

function hachetteValue(source, render, key) {
  return firstValue(source[key]) || firstValue(source['product__' + key]) || firstValue(render[key]) || firstValue(render['product__' + key]) || null;
}

function hachettePublisher(value) {
  const parsed = parseJson(value);
  if (parsed && typeof parsed === 'object') return parsed.label || parsed.name || parsed.value || null;
  return value;
}

function hachetteUrl(source) {
  const pathValue = firstValue(source.path);
  if (!pathValue) return null;
  const site = String(firstValue(source.site_system_name) || 'glenat').toLowerCase();
  const host = site === 'glenat' ? 'https://www.glenat.com' : 'https://www.hachette.com';
  return host + pathValue;
}

export function parseHachetteSearch(data) {
  const hits = Array.isArray(data?.hits?.hits) ? data.hits.hits : Array.isArray(data?.hits) ? data.hits : [];
  return hits.map(hit => {
    const source = hachetteHitSource(hit);
    const render = hachetteRender(source);
    const rawTitle = hachetteValue(source, render, 'titre_de_couverture');
    const structured = extractStructuredTitle(rawTitle);
    const subtitle = cleanText(hachetteValue(source, render, 'sous_titre_de_couverture'));
    const identifiers = canonicalIdentifiers(hachetteValue(source, render, 'ean'));
    const rawNumber = hachetteValue(source, render, 'numero_de_tome') || hachetteValue(source, render, 'number');
    const width = numeric(hachetteValue(source, render, 'largeur'));
    const height = numeric(hachetteValue(source, render, 'hauteur'));
    const format = width && height ? normalizeFormat(width + ' x ' + height + ' mm') : normalizeFormat(hachetteValue(source, render, 'format'));
    const image = firstValue(source.product__image_de_couverture) || firstValue(source.image_de_couverture) || firstValue(render.image_de_couverture);
    const authors = valuesOf(
      hachetteValue(source, render, 'intervenant__principal_full_name')
      || hachetteValue(source, render, 'auteur')
      || hachetteValue(source, render, 'author')
    ).map(cleanText).filter(Boolean);
    const publisherRaw = hachettePublisher(hachetteValue(source, render, 'publisher'));
    const collection = cleanText(hachetteValue(source, render, 'collection_label') || hachetteValue(source, render, 'collection'));
    const title = subtitle || structured.title || cleanText(rawTitle);
    return {
      source: 'hachette',
      sourceId: hit?._id || firstValue(source.product__code_hachette) || firstValue(source.path) || null,
      sourceUrl: hachetteUrl(source),
      title,
      subtitle,
      series: cleanText(hachetteValue(source, render, 'series') || hachetteValue(source, render, 'serie_label')) || structured.series || null,
      seriesNumber: cleanSeriesNumber(rawNumber) || structured.seriesNumber || null,
      publisher: normalizePublisher(publisherRaw),
      collection: collection || collectionFromPublisher(publisherRaw),
      publishedDate: normalizeDate(firstValue(source.product__date_parution__date) || firstValue(source.product__date_parution) || hachetteValue(source, render, 'date_parution')),
      pageCount: numeric(firstValue(source.product__page) || hachetteValue(source, render, 'page')),
      format,
      authors,
      description: cleanText(firstValue(source.product__presentation_editoriale) || hachetteValue(source, render, 'presentation_editoriale')),
      identifiers,
      coverIdentifiers: identifiers,
      coverUrl: cleanText(image),
      coverEvidence: image ? coverEvidence('hachette', identifiers, {officialCatalog: true, imageField: 'product__image_de_couverture'}) : null
    };
  }).filter(candidate => candidate.title || candidate.coverUrl || candidate.identifiers.length);
}

function normalized(value) {
  return cleanText(value)?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr') || '';
}

function valuesMatch(a, b) {
  const left = normalized(a);
  const right = normalized(b);
  return Boolean(left && right && (left === right || left.includes(right) || right.includes(left)));
}

function candidateIdentifiers(candidate) {
  return canonicalIdentifiers([
    ...valuesOf(candidate?.identifiers),
    ...valuesOf(candidate?.coverIdentifiers),
    ...valuesOf(candidate?.coverEvidence?.identifiers)
  ]);
}

function requestedFor(isbn, album={}) {
  return canonicalIsbn(isbn || album.isbn);
}

export function scoreCandidate(candidate, {isbn=null, album={}}={}) {
  const requested = requestedFor(isbn, album);
  const identifiers = candidateIdentifiers(candidate);
  const exactIdentifier = Boolean(requested && identifiers.includes(requested));
  const identifierConflict = Boolean(requested && identifiers.length && !exactIdentifier);
  const identifierMissing = Boolean(requested && !identifiers.length);
  let score = SOURCE_PRIORITY[candidate?.source] || 0;
  if (exactIdentifier) score += 100;
  if (identifierConflict) score -= 200;
  if (identifierMissing) score -= 35;
  if (candidate?.title) score += 8;
  if (candidate?.series) score += 4;
  if (candidate?.authors?.length) score += 2;
  for (const [candidateField, albumFields] of [
    ['title', ['title']],
    ['series', ['series']],
    ['seriesNumber', ['number', 'number_alt']],
    ['publisher', ['publisher']],
    ['collection', ['collection_name', 'collectionName']]
  ]) {
    const current = albumFields.map(field => album?.[field]).find(Boolean);
    if (!current || !candidate?.[candidateField]) continue;
    score += valuesMatch(current, candidate[candidateField]) ? 5 : -12;
  }
  const eligible = requested ? exactIdentifier && !identifierConflict : Boolean(candidate?.title || candidate?.coverUrl);
  const confidence = eligible
    ? Math.min(0.99, 0.62 + (exactIdentifier ? 0.2 : 0) + (candidate?.coverEvidence?.official ? 0.12 : 0))
    : 0;
  return {
    eligible,
    score,
    confidence,
    exactIdentifier,
    identifierConflict,
    identifierMissing,
    identifiers,
    reason: identifierConflict ? 'identifier-conflict' : identifierMissing ? 'identifier-evidence-missing' : eligible ? 'exact-identifier' : 'insufficient-evidence'
  };
}

function fieldValue(candidate, field) {
  if (field === 'number') return candidate.seriesNumber || null;
  if (field === 'collectionName') return candidate.collection || null;
  if (field === 'printDate') return candidate.publishedDate || null;
  if (field === 'writer') return Array.isArray(candidate.authors) && candidate.authors.length ? candidate.authors.join('; ') : null;
  if (field === 'artist') return Array.isArray(candidate.artists) && candidate.artists.length ? candidate.artists.join('; ') : null;
  return candidate[field] || null;
}

function currentAlbumValue(album, field) {
  const aliases = {
    collectionName: ['collectionName', 'collection_name'],
    printDate: ['printDate', 'print_date'],
    coverUrl: ['coverUrl', 'cover_url']
  };
  return (aliases[field] || [field]).map(key => album?.[key]).find(value => value !== null && value !== undefined && String(value).trim() !== '') || null;
}

const RESOLUTION_FIELDS = ['title', 'publisher', 'series', 'number', 'collectionName', 'printDate', 'publishedDate', 'description', 'writer', 'artist', 'pageCount', 'format'];

function sourceOrder(a, b) {
  return (b.match?.score || 0) - (a.match?.score || 0)
    || (SOURCE_PRIORITY[b.source] || 0) - (SOURCE_PRIORITY[a.source] || 0)
    || String(a.sourceId || '').localeCompare(String(b.sourceId || ''));
}

function selectCover(evaluated, requested) {
  const eligible = evaluated
    .filter(candidate => candidate.match?.eligible && candidate.coverUrl)
    .filter(candidate => !isMechanicalOpenLibraryCover(candidate.coverUrl, requested))
    .filter(candidate => {
      const ids = candidate.match?.identifiers || candidateIdentifiers(candidate);
      return !requested || ids.includes(requested);
    })
    .sort(sourceOrder);
  const candidate = eligible[0];
  if (!candidate) {
    return {
      url: null,
      source: null,
      confidence: 0,
      decision: 'fallback-editorial',
      reason: 'no-exact-identifier-cover',
      evidence: []
    };
  }
  return {
    url: candidate.coverUrl,
    source: candidate.source,
    candidateId: candidate.sourceId || null,
    confidence: Math.max(candidate.match.confidence, candidate.coverEvidence?.official ? 0.92 : 0.78),
    decision: 'verified-source',
    reason: candidate.coverEvidence?.official ? 'official-catalog-image-with-exact-identifier' : 'provider-image-with-exact-identifier',
    evidence: [{
      type: 'isbn',
      value: requested || candidate.match.identifiers[0] || null,
      source: candidate.source,
      exact: Boolean(requested && candidate.match.identifiers.includes(requested))
    }, {
      type: 'cover-url',
      source: candidate.source,
      official: Boolean(candidate.coverEvidence?.official)
    }]
  };
}

export function resolveCandidates(isbn, candidates=[], album={}) {
  const requested = requestedFor(isbn, album);
  const evaluated = (Array.isArray(candidates) ? candidates : []).map(candidate => ({
    ...candidate,
    identifiers: candidateIdentifiers(candidate),
    match: scoreCandidate(candidate, {isbn: requested, album})
  }));
  const eligible = evaluated.filter(candidate => candidate.match.eligible).sort(sourceOrder);
  const fields = {};
  for (const field of RESOLUTION_FIELDS) {
    const candidate = eligible
      .filter(item => fieldValue(item, field))
      .sort(sourceOrder)[0];
    if (!candidate) continue;
    fields[field] = {
      value: fieldValue(candidate, field),
      source: candidate.source,
      candidateId: candidate.sourceId || null,
      confidence: candidate.match.confidence
    };
  }
  const cover = selectCover(evaluated, requested);
  return {
    isbn: requested,
    candidates: evaluated,
    eligible: eligible.map(candidate => candidate.sourceId || candidate.source),
    winner: eligible[0] || null,
    fields,
    cover,
    decision: cover.url ? 'resolved' : eligible.length ? 'metadata-only' : 'fallback-editorial'
  };
}

export function mergeCandidates(album, candidates) {
  const result = {...album};
  const resolution = resolveCandidates(album?.isbn, candidates, album);
  const provenance = [];
  for (const field of RESOLUTION_FIELDS) {
    const selected = resolution.fields[field];
    if (!selected || currentAlbumValue(album, field)) continue;
    result[field] = selected.value;
    provenance.push({
      field,
      source: selected.source,
      confidence: selected.confidence,
      value: selected.value
    });
  }
  const currentCover = currentAlbumValue(album, 'coverUrl');
  const replaceable = !currentCover || album?.cover_origin === 'machine' || isMechanicalOpenLibraryCover(currentCover, album?.isbn);
  if (resolution.cover.url && replaceable) {
    result.coverUrl = resolution.cover.url;
    provenance.push({
      field: 'coverUrl',
      source: resolution.cover.source,
      confidence: resolution.cover.confidence,
      value: resolution.cover.url
    });
  }
  return {album: result, provenance, resolution};
}

function requestWithTimeout(fetchImpl, url, init, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return Promise.resolve(fetchImpl(url, {...init, signal: controller.signal})).finally(() => clearTimeout(timer));
}

export async function fetchMetadata(isbn, opts={}) {
  const requested = canonicalIsbn(isbn);
  if (!requested) return [];
  const fetchImpl = opts.fetchImpl || fetch;
  const timeoutMs = Number(opts.timeoutMs) > 0 ? Number(opts.timeoutMs) : 9000;
  const requests = [
    {
      source: 'hachette',
      url: hachetteSearchUrl(),
      init: {
        method: 'POST',
        headers: {'user-agent': USER_AGENT, accept: 'application/json', 'content-type': 'application/json'},
        body: JSON.stringify(hachetteSearchBody(requested))
      },
      parse: response => response.json().then(parseHachetteSearch)
    },
    {
      source: 'google-books',
      url: googleBooksUrl(requested, opts.googleBooksApiKey),
      init: {headers: {'user-agent': USER_AGENT, accept: 'application/json'}},
      parse: response => response.json().then(parseGoogleBooks)
    },
    {
      source: 'open-library',
      url: openLibraryUrl(requested),
      init: {headers: {'user-agent': USER_AGENT, accept: 'application/json'}},
      parse: response => response.json().then(parseOpenLibrary)
    },
    {
      source: 'bnf',
      url: bnfSruUrl(requested),
      init: {headers: {'user-agent': USER_AGENT, accept: 'application/xml,text/xml;q=0.9,*/*;q=0.8'}},
      parse: response => response.text().then(parseBnfDublinCore)
    },
    {
      source: 'bnf-intermarc',
      url: bnfIntermarcUrl(requested),
      init: {headers: {'user-agent': USER_AGENT, accept: 'application/xml,text/xml;q=0.9,*/*;q=0.8'}},
      parse: response => response.text().then(parseBnfIntermarc)
    }
  ];
  const settled = await Promise.all(requests.map(async request => {
    try {
      const response = await requestWithTimeout(fetchImpl, request.url, request.init, timeoutMs);
      if (!response?.ok) return [];
      return await request.parse(response);
    } catch {
      return [];
    }
  }));
  return settled.flat();
}
