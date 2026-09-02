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

function bnfBaseUrl(isbn, recordSchema) {
  const n = canonicalIsbn(isbn);
  const u = new URL('https://catalogue.bnf.fr/api/SRU');
  u.searchParams.set('version', '1.2');
  u.searchParams.set('operation', 'searchRetrieve');
  u.searchParams.set('query', `bib.isbn adj "${n}"`);
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

function cleanSeriesNumber(value) {
  const s=cleanText(value);
  if (!s) return null;
  const explicit=s.match(/(?:t(?:ome)?|vol(?:ume)?|n(?:um(?:éro)?)?)[°ºo.]?\s*0*(\d+(?:[.,]\d+)?)/i);
  if (explicit) return explicit[1].replace(',', '.');
  const bare=s.match(/^0*(\d+(?:[.,]\d+)?)$/);
  return bare ? bare[1].replace(',', '.') : s;
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

function xmlDecode(value) {
  return String(value || '')
    .replace(/<[^>]+>/g,'')
    .replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;/g,"'")
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .trim();
}

function xmlTexts(xml, tag) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const out=[]; let m;
  while ((m=re.exec(String(xml)))) {
    const value=xmlDecode(m[1]);
    if(value) out.push(value);
  }
  return out;
}
function xmlText(xml, tag) { return xmlTexts(xml, tag)[0] || null; }

function marcFields(xml, tag) {
  const re=new RegExp(`<(?:[\\w.-]+:)?datafield\\b[^>]*\\btag=["']${tag}["'][^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?datafield>`, 'gi');
  const out=[]; let m;
  while((m=re.exec(String(xml)))) out.push(m[1]);
  return out;
}

function marcSubfields(field, code) {
  const re=new RegExp(`<(?:[\\w.-]+:)?subfield\\b[^>]*\\bcode=["']${code}["'][^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?subfield>`, 'gi');
  const out=[]; let m;
  while((m=re.exec(String(field)))) {
    const value=cleanText(xmlDecode(m[1]));
    if(value) out.push(value);
  }
  return out;
}

function firstMarcSubfield(xml, tag, code) {
  for(const field of marcFields(xml,tag)) {
    const value=marcSubfields(field,code)[0];
    if(value) return value;
  }
  return null;
}

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

export function parseBnfIntermarc(xml) {
  if (!xml || !String(xml).includes('numberOfRecords')) return [];
  const count=Number(xmlText(xml,'srw:numberOfRecords') || xmlText(xml,'numberOfRecords') || 0);
  if(!count) return [];

  const title=firstMarcSubfield(xml,'245','a');
  let series=null, seriesNumber=null;
  const linkedSeries=marcFields(xml,'460')[0] || null;
  if(linkedSeries){
    series=marcSubfields(linkedSeries,'t')[0] || null;
    seriesNumber=cleanSeriesNumber(marcSubfields(linkedSeries,'v')[0]);
  }
  if(!series){
    const ensemble=marcFields(xml,'290')[0] || null;
    if(ensemble){
      series=marcSubfields(ensemble,'a')[0] || null;
      seriesNumber=seriesNumber || cleanSeriesNumber(marcSubfields(ensemble,'v')[0] || marcSubfields(ensemble,'h')[0]);
    }
  }

  let collection=null;
  const collectionField=marcFields(xml,'295')[0] || null;
  if(collectionField) collection=marcSubfields(collectionField,'a')[0] || null;
  if(!collection){
    const collectionLink=marcFields(xml,'410')[0] || null;
    if(collectionLink) collection=marcSubfields(collectionLink,'t')[0] || null;
  }

  const authors=[];
  for(const code of ['f','g']) for(const value of marcSubfields(marcFields(xml,'245')[0] || '',code)) if(!authors.includes(value)) authors.push(value);
  const sourceId=xmlText(xml,'recordIdentifier') || firstMarcSubfield(xml,'003','a') || null;
  if(!title&&!series&&!collection&&!authors.length) return [];
  return [{source:'bnf-intermarc',sourceId,title,series,seriesNumber,collection,authors}];
}

export function mergeCandidates(album, candidates) {
  const result = { ...album }, provenance = [];
  const rules = [
    ['title', ['bnf','bnf-intermarc','google-books','open-library']],
    ['publisher', ['bnf','google-books','open-library']],
    ['series', ['bnf-intermarc','bnf','google-books','open-library']],
    ['number', ['bnf-intermarc','google-books','open-library','bnf'], 'seriesNumber'],
    ['collectionName', ['bnf-intermarc','bnf'], 'collection'],
    ['publishedDate', ['bnf','google-books','open-library']],
    ['description', ['bnf','google-books']],
    ['coverUrl', ['google-books','open-library']]
  ];
  for (const [field, order, candidateField=field] of rules) {
    if (result[field]) continue;
    for (const source of order) {
      const c = candidates.find(x => x.source === source && x[candidateField]);
      if (c) { result[field] = c[candidateField]; provenance.push({field, source, confidence: source.startsWith('bnf') ? .95 : source === 'google-books' ? .85 : .7}); break; }
    }
  }
  if(!result.writer){
    for(const source of ['bnf','bnf-intermarc','google-books','open-library']){
      const c=candidates.find(x=>x.source===source&&Array.isArray(x.authors)&&x.authors.length);
      if(c){result.writer=c.authors.join('; ');provenance.push({field:'writer',source,confidence:source.startsWith('bnf')?.9:source==='google-books'?.8:.7});break;}
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
    ['bnf', bnfSruUrl(isbn)],
    ['bnf-intermarc', bnfIntermarcUrl(isbn)]
  ];
  const out = [];
  for (const [source, url] of requests) {
    try {
      const res = await fetchImpl(url, { headers: {
        'user-agent':'BD-Desk/1.0 (+https://github.com/Etorrent-Org/Bd-desk)',
        'accept': source.startsWith('bnf') ? 'application/xml,text/xml;q=0.9,*/*;q=0.8' : 'application/json'
      } });
      if (!res.ok) continue;
      if (source === 'bnf') out.push(...parseBnfDublinCore(await res.text()));
      else if (source === 'bnf-intermarc') out.push(...parseBnfIntermarc(await res.text()));
      else if (source === 'google-books') out.push(...parseGoogleBooks(await res.json()));
      else out.push(...parseOpenLibrary(await res.json()));
    } catch { /* source failure is isolated */ }
  }
  return out;
}
