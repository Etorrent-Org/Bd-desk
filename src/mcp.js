export const MCP_PROTOCOL_VERSION = '2026-07-28';

export const MCP_TOOLS = [
  {name:'collection_summary',description:'Résumé de la collection BD Desk',inputSchema:{type:'object',properties:{},additionalProperties:false}},
  {name:'search_albums',description:'Rechercher des albums dans la collection',inputSchema:{type:'object',properties:{query:{type:'string'},limit:{type:'number',minimum:1,maximum:100}},additionalProperties:false}},
  {name:'series_progress',description:'Progression et albums manquants des séries',inputSchema:{type:'object',properties:{series:{type:'string'}},additionalProperties:false}},
  {name:'set_read_status',description:'Marquer un album comme lu ou non lu',inputSchema:{type:'object',required:['id','read'],properties:{id:{type:'number'},read:{type:'boolean'}},additionalProperties:false}}
];

function ok(id,result){ return {jsonrpc:'2.0',id,result}; }
function err(id,code,message,data){ return {jsonrpc:'2.0',id,error:{code,message,...(data?{data}: {})}}; }

export function handleMcp(message, ctx){
  const id=message?.id ?? null, method=message?.method;
  if(message?.jsonrpc!=='2.0' || typeof method!=='string') return err(id,-32600,'Invalid Request');
  if(method==='server/discover') return ok(id,{protocolVersion:MCP_PROTOCOL_VERSION,serverInfo:{name:'bd-desk',version:'1.0.0'},capabilities:{tools:{}},instructions:'BD Desk expose la collection, la recherche, la progression des séries et des écritures contrôlées.'});
  if(method==='tools/list') return ok(id,{tools:MCP_TOOLS,ttlMs:300000,cacheScope:'private'});
  if(method==='tools/call'){
    const name=message.params?.name,args=message.params?.arguments||{};
    let data;
    if(name==='collection_summary') data=ctx.dashboard();
    else if(name==='search_albums') data=ctx.listAlbums({search:args.query||'',limit:Math.min(Math.max(Number(args.limit)||20,1),100)});
    else if(name==='series_progress') data=ctx.series().filter(s=>!args.series || s.name.toLowerCase().includes(String(args.series).toLowerCase()));
    else if(name==='set_read_status') {
      if(!Number.isFinite(Number(args.id)) || typeof args.read!=='boolean') return err(id,-32602,'Invalid params');
      data=ctx.updateAlbum(Number(args.id),{read:args.read});
      if(!data) return err(id,-32602,'Album introuvable');
    } else return err(id,-32601,'Method not found');
    return ok(id,{content:[{type:'text',text:JSON.stringify(data)}],structuredContent:data});
  }
  return err(id,-32601,'Method not found');
}

export function validateMcpHttp(req,message,{allowedOrigins=[]}={}){
  const version=String(req.headers['mcp-protocol-version']||'');
  if(version!==MCP_PROTOCOL_VERSION) return {ok:false,status:400,error:err(message?.id??null,-32010,`Unsupported protocol version: ${version||'missing'}`,{supported:[MCP_PROTOCOL_VERSION]})};
  const methodHeader=String(req.headers['mcp-method']||'');
  if(methodHeader!==message?.method) return {ok:false,status:400,error:err(message?.id??null,-32020,'HeaderMismatch: Mcp-Method')};
  const needsName=['tools/call','prompts/get','resources/read'].includes(message?.method);
  const nameHeader=String(req.headers['mcp-name']||'');
  const bodyName=String(message?.params?.name||message?.params?.uri||'');
  if(needsName && (!nameHeader || nameHeader!==bodyName)) return {ok:false,status:400,error:err(message?.id??null,-32020,'HeaderMismatch: Mcp-Name')};
  const origin=req.headers.origin;
  if(origin){
    const host=req.headers.host;
    let sameOrigin=false;
    try{ sameOrigin=new URL(origin).host===host; }catch{}
    if(!sameOrigin && !allowedOrigins.includes(origin)) return {ok:false,status:403,error:err(message?.id??null,-32030,'Origin not allowed')};
  }
  return {ok:true};
}
