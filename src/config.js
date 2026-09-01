import path from 'node:path';

export function configFromEnv(env = process.env) {
  const seed = String(env.BD_DESK_SEED_CSV || '').trim();
  return {
    environment: env.NODE_ENV || 'development',
    port: Number(env.PORT || 3096),
    host: env.HOST || '0.0.0.0',
    dbPath: path.resolve(env.BD_DESK_DB || './data/bd-desk.db'),
    licenseSecret: env.BD_DESK_LICENSE_SECRET || 'dev-only-change-me',
    googleBooksApiKey: env.GOOGLE_BOOKS_API_KEY || '',
    webhookSigningSecret: env.WEBHOOK_SIGNING_SECRET || env.BD_DESK_LICENSE_SECRET || 'dev-webhook-secret',
    seedCsvPath: seed ? path.resolve(seed) : null,
    allowedOrigins: String(env.BD_DESK_ALLOWED_ORIGINS || '').split(',').map(x=>x.trim()).filter(Boolean)
  };
}

export function assertProductionConfig(config){
  if(config.environment!=='production') return true;
  if(!config.licenseSecret || config.licenseSecret==='dev-only-change-me' || config.licenseSecret==='change-me-now') throw new Error('BD_DESK_LICENSE_SECRET sécurisé requis en production');
  if(!config.webhookSigningSecret || ['dev-webhook-secret','change-me-now'].includes(config.webhookSigningSecret)) throw new Error('WEBHOOK_SIGNING_SECRET sécurisé requis en production');
  return true;
}
