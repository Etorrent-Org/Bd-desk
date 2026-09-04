import path from 'node:path';

export function configFromEnv(env = process.env) {
  const seed = String(env.BD_DESK_SEED_CSV || '').trim();
  const edition = String(env.BD_DESK_EDITION || 'free').trim().toLowerCase();
  if (!['free', 'licensed'].includes(edition)) throw new Error('BD_DESK_EDITION doit être free ou licensed');
  const licenseSecret = String(env.BD_DESK_LICENSE_SECRET || '').trim() || 'dev-only-change-me';
  const webhookSigningSecret = String(env.WEBHOOK_SIGNING_SECRET || '').trim() || 'dev-webhook-secret';
  return {
    environment: env.NODE_ENV || 'development',
    edition,
    port: Number(env.PORT || 3096),
    // alwaysdata exposes the upstream address through IP/PORT; other hosts
    // commonly use HOST/PORT. Support both without changing local behavior.
    host: env.HOST || env.IP || '0.0.0.0',
    dbPath: path.resolve(env.BD_DESK_DB || './data/bd-desk.db'),
    licenseSecret,
    googleBooksApiKey: env.GOOGLE_BOOKS_API_KEY || '',
    webhookSigningSecret,
    seedCsvPath: seed ? path.resolve(seed) : null,
    allowedOrigins: String(env.BD_DESK_ALLOWED_ORIGINS || '').split(',').map(x=>x.trim()).filter(Boolean)
  };
}

export function assertProductionConfig(config){
  if(config.environment!=='production') return true;
  if(!['free','licensed'].includes(config.edition)) throw new Error('BD_DESK_EDITION doit être free ou licensed');
  if(config.edition==='free') return true;
  const weak=['dev-only-change-me','change-me-now','replace-with-a-long-random-secret','replace-with-another-long-random-secret'];
  if(!config.licenseSecret || config.licenseSecret.length<32 || weak.includes(config.licenseSecret)) throw new Error('BD_DESK_LICENSE_SECRET sécurisé de 32 caractères minimum requis en production');
  if(!config.webhookSigningSecret || config.webhookSigningSecret.length<32 || weak.includes(config.webhookSigningSecret)) throw new Error('WEBHOOK_SIGNING_SECRET sécurisé de 32 caractères minimum requis en production');
  return true;
}
