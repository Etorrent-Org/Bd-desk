import { canonicalIsbn } from './isbn.js';

export function openLibraryCover(isbn, size='L') {
  const n = canonicalIsbn(isbn);
  return n ? `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(n)}-${size}.jpg?default=false` : null;
}

export function googleBooksUrl(isbn, apiKey='') {
  const n = canonicalIsbn(isbn);
  const u = new URL('https://www.googleapis.com/books/v1/volumes');
  u.searchParams.set('q', `isbn:${n}`);
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

export function bnfSruUrl(isbn) {
  const n = canonicalIsbn(isbn);
  const u = new URL('https://catalogue.bnf.fr/api/SRU');
  u.searchParams.set('version', '1.2');
  u.searchParams.set('operation', 'searchRetrieve');
  u.searchParams.set('query', `bib.isbn adj "${n}"`);
  u.searchParams.set('recordSchema', 'dublincore');
  u.searchParams.set('maximumRecords', '5');
  return u.toString();
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim() || null;
}

function normalizePublisher(value) {
  let s = cleanText(value);
  if (!s) return null;
  s = s.replace(/\s*\([^()]*\)\s*$/, '').trim();
  if (/^comix\s+buro$/i.test(s)) return 'Glénat';
  const keepLower = new Set(['de','du','des','la','le','les','et','the','of','and']);
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

function extractSeriesInfo(value, allowBareNumber=false) {
  const s = cleanText(value);
  if (!s || /^https?:/i.test(s)) return {series:null, seriesNumber:null};
  const explicit = s.match(/^(.+?)\s*(?:[-–—,:;]\s*)?(?:t(?:ome)?|vol(?:ume)?|n(?:um(?:éro)?)?)[°ºo.]?\s*0*(\d+(?:[.,]\d+)?)\s*$/i)
    || s.match(/^(.+?)\s*#\s*0*(\d+(?:[.,]\d+)?)\s*$/i);
  if (explicit) return {series:cleanText(explicit[1]), seriesNumber:explicit[2].replace(',', '.')};
  if (allowBareNumber) {
    const bare = s.match(/^(.+?)[\s.;,:-]+0*(\d+(?:[.,]\d+)?)\s*$/);
    if (bare && bare[1].trim().length > 2) return {series:cleanText(bare[1]), seriesNumber:bare[2].replace(',', '.')};
  }
  return {series:s, seriesNumber:null};
}

function extractStructuredTitle(value) {
  const s = cleanText(value);
  if (!s) return {title:null, series:null, seriesNumber:null};
  const m = s.match(/^(.+?)\s*[-–—,:]\s*(?:t(?:ome)?|vol(?:ume)?)[°ºo.]?\s*0*(\d+(?:[.,]\d+)?)\s*[-–—:]\s*(.+)$/i);
  return m ? {title:cleanText(m[3]), series:cleanText(m[1]), seriesNumber:m[2].replace(',', '.')} : {title:s, series:null, seriesNumber:null};
}

export function parseGoogleBooks(data) {
  return (data?.items || []).map(item => {
    const v = item.volumeInfo || {}, structured = extractStructuredTitle(v.title);
    const rawSeries = item.seriesInfo?.shortSeriesBookTitle || null;
    const parsedSeries = extractSeriesInfo(rawSeries, true);
    return {
      source: 'google-books', sourceId: item.id, title: structured.title,
      subtitle: v.subtitle || null, authors: v.authors || [], publisher: normalizePublisher(v.publisher),
      publishedDate: v.publishedDate || null, description: v.description || null,
      categories: v.categories || [], pageCount: v.pageCount || null,
      series: parsedSeries.series || structured.series || null,
      seriesNumber: item.seriesInfo?.bookDisplayNumber || parsedSeries.seriesNumber || structured.seriesNumber || null,
      coverUrl: v.imageLinks?.thumbnail?.replace(/^http:/, 'https:') || null,
      identifiers: v.industryIdentifiers || []
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
      return {
        source: 'open-library',
        sourceId: doc.edition_key?.[0] || doc.key || null,
        title: structured.title,
        publisher: normalizePublisher(Array.isArray(doc.publisher) ? doc.publisher[0] : null),
        publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : null,
        pageCount: null,
        authors: Array.isArray(doc.author_name) ? doc.author_name : [],
        identifiers: Array.isArray(doc.isbn) ? doc.isbn : [],
        series: parsedSeries.series || structured.series || null,
        seriesNumber: parsedSeries.seriesNumber || structured.seriesNumber || null,
        coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null
      };
    });
  }
  const structured = extractStructuredTitle(data.title);
  const rawSeries = Array.isArray(data.series) ? data.series[0] : (data.series || null);
  const parsedSeries = extractSeriesInfo(rawSeries, true);
  return [{
    source: 'open-library', sourceId: data.key || null, title: structured.title,
    publisher: normalizePublisher(Array.isArray(data.publishers) ? data.publishers[0] : null),
    publishedDate: data.publish_date || null,
    pageCount: data.number_of_pages || null,
    authors: (data.authors || []).map(a => a.key || a.name).filter(Boolean),
    identifiers: data.isbn_13 || data.isbn_10 || [],
    series: parsedSeries.series || structured.series || null,
    seriesNumber: parsedSeries.seriesNumber || structured.seriesNumber || null
  }];
}

function xmlTexts(xml, tag) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const out=[]; let m;
  while ((m=re.exec(String(xml)))) {
    const value=m[1].replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').trim();
    if(value) out.push(value);
  }
  return out;
}
function xmlText(xml, tag) { return xmlTexts(xml, tag)[0] || null; }

export function parseBnfDublinCore(xml) {
  if (!xml || !String(xml).includes('numberOfRecords')) return [];
  const count = Number(xmlText(xml, 'srw:numberOfRecords') || xmlText(xml, 'numberOfRecords') || 0);
  if (!count) return [];
  const rawTitle=xmlText(xml,'dc:title');
  const title=cleanText(rawTitle?.split(/\s+\/\s+/)[0]);
  const rawPublisher=xmlText(xml,'dc:publisher');
  const relations=xmlTexts(xml,'dc:relation');
  let relationSeries={series:null,seriesNumber:null};
  for(const relation of relations){
    const parsed=extractSeriesInfo(relation,true);
    if(parsed.seriesNumber){relationSeries=parsed;break;}
  }
  return [{
    source: 'bnf', sourceId: xmlText(xml,'dc:identifier'), title,
    publisher: normalizePublisher(rawPublisher), collection: collectionFromPublisher(rawPublisher),
    publishedDate: xmlText(xml,'dc:date'),
    description: xmlText(xml,'dc:description'), authors: [xmlText(xml,'dc:creator')].filter(Boolean),
    series: relationSeries.series, seriesNumber: relationSeries.seriesNumber
  }];
}

export function mergeCandidates(album, candidates) {
  const result = { ...album }, provenance = [];
  const rules = [
    ['title', ['bnf','google-books','open-library']],
    ['publisher', ['bnf','google-books','open-library']],
    ['publishedDate', ['bnf','google-books','open-library']],
    ['description', ['bnf','google-books']],
    ['coverUrl', ['google-books']]
  ];
  for (const [field, order] of rules) {
    if (result[field]) continue;
    for (const source of order) {
      const c = candidates.find(x => x.source === source && x[field]);
      if (c) { result[field] = c[field]; provenance.push({field, source, confidence: source === 'bnf' ? .95 : source === 'google-books' ? .85 : .7}); break; }
    }
  }
  if (!result.coverUrl && album.isbn) {
    result.coverUrl = openLibraryCover(album.isbn);
    provenance.push({field:'coverUrl', source:'open-library-cover', confidence:.65});
  }
  return { album: result, provenance };
}

export async function fetchMetadata(isbn, opts={}) {
  const fetchImpl = opts.fetchImpl || fetch;
  const requests = [
    ['google-books', googleBooksUrl(isbn, opts.googleBooksApiKey)],
    ['open-library', openLibraryUrl(isbn)],
    ['bnf', bnfSruUrl(isbn)]
  ];
  const out = [];
  for (const [source, url] of requests) {
    try {
      const res = await fetchImpl(url, { headers: {
        'user-agent':'BD-Desk/1.0 (+https://github.com/Etorrent-Org/Bd-desk)',
        'accept': source === 'bnf' ? 'application/xml,text/xml;q=0.9,*/*;q=0.8' : 'application/json'
      } });
      if (!res.ok) continue;
      if (source === 'bnf') out.push(...parseBnfDublinCore(await res.text()));
      else if (source === 'google-books') out.push(...parseGoogleBooks(await res.json()));
      else out.push(...parseOpenLibrary(await res.json()));
    } catch { /* source failure is isolated */ }
  }
  return out;
}
