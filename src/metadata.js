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
  return `https://openlibrary.org/isbn/${encodeURIComponent(canonicalIsbn(isbn))}.json`;
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

export function parseGoogleBooks(data) {
  return (data?.items || []).map(item => {
    const v = item.volumeInfo || {};
    return {
      source: 'google-books', sourceId: item.id, title: v.title || null,
      subtitle: v.subtitle || null, authors: v.authors || [], publisher: v.publisher || null,
      publishedDate: v.publishedDate || null, description: v.description || null,
      categories: v.categories || [], pageCount: v.pageCount || null,
      coverUrl: v.imageLinks?.thumbnail?.replace(/^http:/, 'https:') || null,
      identifiers: v.industryIdentifiers || []
    };
  });
}

export function parseOpenLibrary(data) {
  if (!data || data.error) return [];
  return [{
    source: 'open-library', sourceId: data.key || null, title: data.title || null,
    publisher: Array.isArray(data.publishers) ? data.publishers[0] : null,
    publishedDate: data.publish_date || null,
    pageCount: data.number_of_pages || null,
    authors: (data.authors || []).map(a => a.key || a.name).filter(Boolean),
    identifiers: data.isbn_13 || data.isbn_10 || []
  }];
}

function xmlText(xml, tag) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = String(xml).match(re);
  return m ? m[1].replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').trim() : null;
}
export function parseBnfDublinCore(xml) {
  if (!xml || !String(xml).includes('numberOfRecords')) return [];
  const count = Number(xmlText(xml, 'srw:numberOfRecords') || xmlText(xml, 'numberOfRecords') || 0);
  if (!count) return [];
  return [{
    source: 'bnf', sourceId: xmlText(xml,'dc:identifier'), title: xmlText(xml,'dc:title'),
    publisher: xmlText(xml,'dc:publisher'), publishedDate: xmlText(xml,'dc:date'),
    description: xmlText(xml,'dc:description'), authors: [xmlText(xml,'dc:creator')].filter(Boolean)
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
      const res = await fetchImpl(url, { headers: {'user-agent':'BD-Desk/1.0'} });
      if (!res.ok) continue;
      if (source === 'bnf') out.push(...parseBnfDublinCore(await res.text()));
      else if (source === 'google-books') out.push(...parseGoogleBooks(await res.json()));
      else out.push(...parseOpenLibrary(await res.json()));
    } catch { /* source failure is isolated */ }
  }
  return out;
}
