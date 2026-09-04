import crypto from 'node:crypto';

export const PREMIUM_FEATURES = Object.freeze(['bulk_import','metadata_auto','advanced_stats','api','webhooks','mcp']);
const b64u = input => Buffer.from(input).toString('base64url');
const unb64u = input => Buffer.from(input, 'base64url').toString('utf8');

export function createLicense(payload, secret) {
  if (!secret || typeof secret !== 'string') throw new TypeError('Secret de licence requis');
  const features = Array.isArray(payload?.features)
    ? payload.features.filter(feature => PREMIUM_FEATURES.includes(feature))
    : PREMIUM_FEATURES;
  const body = b64u(JSON.stringify({
    plan: 'premium',
    sub: String(payload?.sub || 'customer').trim() || 'customer',
    issuedAt: payload?.issuedAt || new Date().toISOString(),
    expiresAt: payload?.expiresAt || null,
    features
  }));
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `BDP1.${body}.${sig}`;
}

export function verifyLicense(key, secret, now = new Date()) {
  if (!key || !String(key).startsWith('BDP1.')) return { valid: false, plan: 'free', reason: 'missing' };
  const parts=String(key).split('.');
  if(parts.length!==3)return { valid: false, plan: 'free', reason: 'format' };
  const [, body, sig] = parts;
  if (!body || !sig) return { valid: false, plan: 'free', reason: 'format' };
  if (!secret || typeof secret !== 'string') return { valid: false, plan: 'free', reason: 'secret' };
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { valid: false, plan: 'free', reason: 'signature' };
  try {
    const payload = JSON.parse(unb64u(body));
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) || payload.plan !== 'premium') return { valid: false, plan: 'free', reason: 'plan', payload };
    if (!payload.issuedAt || Number.isNaN(new Date(payload.issuedAt).getTime())) return { valid: false, plan: 'free', reason: 'issued-at', payload };
    if (payload.expiresAt && Number.isNaN(new Date(payload.expiresAt).getTime())) return { valid: false, plan: 'free', reason: 'expires-at', payload };
    if (payload.expiresAt && new Date(payload.expiresAt) < now) return { valid: false, plan: 'free', reason: 'expired', payload };
    payload.features = Array.isArray(payload.features) ? payload.features.filter(feature => PREMIUM_FEATURES.includes(feature)) : [];
    return { valid: true, plan: payload.plan || 'premium', payload };
  } catch { return { valid: false, plan: 'free', reason: 'payload' }; }
}

export function hasFeature(license, feature) {
  return Boolean(license?.valid && license?.plan === 'premium' && (license.payload?.features || []).includes(feature));
}
