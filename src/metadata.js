import * as core from './metadata-core.js';
import { fetchOfficialCoverCandidates } from './official-covers.js';

export * from './metadata-core.js';

export const MIN_COVER_EDGE=300;

function lowResolutionCover(cover){
  const width=Number(cover?.width||cover?.coverWidth||cover?.coverSizeHint||0);
  const height=Number(cover?.height||cover?.coverHeight||0);
  if(width>0&&height>0)return Math.min(width,height)<MIN_COVER_EDGE;
  if(width>0)return width<MIN_COVER_EDGE;
  return false;
}

function qualityGate(resolution){
  if(!resolution?.cover?.url||!lowResolutionCover(resolution.cover))return resolution;
  return {
    ...resolution,
    decision:resolution.eligible?.length?'metadata-only':'fallback-editorial',
    cover:{
      ...resolution.cover,
      url:null,
      confidence:0,
      decision:'fallback-editorial',
      reason:'low-resolution-cover',
      evidence:[...(resolution.cover.evidence||[]),{type:'quality',minimumShortEdge:MIN_COVER_EDGE,rejected:true}]
    }
  };
}

export function resolveCandidates(isbn,candidates=[],album={}){
  return qualityGate(core.resolveCandidates(isbn,candidates,album));
}

export function mergeCandidates(album,candidates){
  const merged=core.mergeCandidates(album,candidates);
  const resolution=resolveCandidates(album?.isbn,candidates,album);
  if(merged.resolution?.cover?.url&&!resolution.cover?.url){
    const current=album?.cover_url||album?.coverUrl;
    if(!current){delete merged.album.coverUrl;delete merged.album.cover_url}
    merged.provenance=(merged.provenance||[]).filter(entry=>entry.field!=='coverUrl');
  }
  return {...merged,resolution};
}

export async function fetchMetadata(isbn,opts={}){
  const base=await core.fetchMetadata(isbn,opts);
  if(opts.officialWeb===false)return base;
  if(opts.fetchImpl&&opts.fetchImpl!==globalThis.fetch)return base;
  try{
    const extra=await fetchOfficialCoverCandidates(isbn,{fetchImpl:opts.fetchImpl||globalThis.fetch,timeoutMs:opts.timeoutMs});
    return [...base,...extra];
  }catch{return base}
}
