import crypto from 'node:crypto';

const b64u = input => Buffer.from(input).toString('base64url');
const unb64u = input => Buffer.from(input, 'base64url').toString('utf8');

export function createLicense(payload, secret) {
  const body = b64u(JSON.stringify({
    plan: 'premium',
    sub: payload.sub || 'customer',
    issuedAt: payload.issuedAt || new Date().toISOString(),
    expiresAt: payload.expiresAt || null,
    features: payload.features || ['bulk_import','metadata_auto','api','webhooks','mcp','advanced_stats']
  }));
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `BDP1.${body}.${sig}`;
}

export function verifyLicense(key, secret, now = new Date()) {
  if (!key || !String(key).startsWith('BDP1.')) return { valid: false, plan: 'free', reason: 'missing' };
  const [, body, sig] = String(key).split('.');
  if (!body || !sig) return { valid: false, plan: 'free', reason: 'format' };
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { valid: false, plan: 'free', reason: 'signature' };
  try {
    const payload = JSON.parse(unb64u(body));
    if (payload.expiresAt && new Date(payload.expiresAt) < now) return { valid: false, plan: 'free', reason: 'expired', payload };
    return { valid: true, plan: payload.plan || 'premium', payload };
  } catch { return { valid: false, plan: 'free', reason: 'payload' }; }
}

export function hasFeature(license, feature) {
  return Boolean(license?.valid && license?.plan === 'premium' && (license.payload?.features || []).includes(feature));
}
