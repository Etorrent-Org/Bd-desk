import crypto from 'node:crypto';
export function signWebhook(body, secret){ return crypto.createHmac('sha256',secret).update(body).digest('hex'); }
export async function dispatchWebhook(hook,event,payload,{fetchImpl=fetch,secret=''}={}){
  const body=JSON.stringify({event,payload,sentAt:new Date().toISOString()});
  const res=await fetchImpl(hook.url,{method:'POST',headers:{'content-type':'application/json','x-bd-desk-event':event,'x-bd-desk-signature':`sha256=${signWebhook(body,secret)}`},body});
  return {ok:res.ok,status:res.status};
}
