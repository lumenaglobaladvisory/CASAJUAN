const crypto = require('crypto');

const COOKIE_NAME = 'cj_admin';
const MAX_AGE_MS = 1000 * 60 * 60 * 8; // 8 hours

function getSecret() {
  return process.env.ADMIN_PASSWORD || 'casajuan-dev-secret';
}

function signToken() {
  const payload = JSON.stringify({ admin: true, iat: Date.now() });
  const b64 = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;

  const [b64, sig] = token.split('.');
  const expectedSig = crypto.createHmac('sha256', getSecret()).update(b64).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);

  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    if (!payload.admin || Date.now() - payload.iat > MAX_AGE_MS) return null;
    return payload;
  } catch (err) {
    return null;
  }
}

function parseCookies(req) {
  const header = req.headers.cookie;
  const cookies = {};
  if (!header) return cookies;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    cookies[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  });
  return cookies;
}

function isAuthenticated(req) {
  const cookies = parseCookies(req);
  return !!verifyToken(cookies[COOKIE_NAME]);
}

function requireAdmin(req, res, next) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }
  next();
}

function loginCookie() {
  const secure = process.env.NODE_ENV === 'production';
  const attrs = [
    `${COOKIE_NAME}=${signToken()}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(MAX_AGE_MS / 1000)}`
  ];
  if (secure) attrs.push('Secure');
  return attrs.join('; ');
}

function logoutCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

module.exports = { requireAdmin, isAuthenticated, loginCookie, logoutCookie };
