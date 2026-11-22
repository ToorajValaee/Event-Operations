import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

// Secret key for JWT signing - fallback to stable secret if not defined in env
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : crypto.randomBytes(48).toString('hex'));

if (!JWT_SECRET) throw new Error('JWT_SECRET required in production');
export interface JwtPayload {
  id: string;
  phone: string;
  role: 'admin' | 'vendor' | 'visitor';
  fullName?: string;
  exp: number; // Expiration epoch in seconds
  iat: number; // Issued at epoch in seconds
}

// Base64Url encode helper
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// Base64Url decode helper
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Sign a JWT token valid for 30 days
 */
export function signJwt(user: {
  id: string;
  phone: string;
  role: 'admin' | 'vendor' | 'visitor';
  fullName?: string;
}): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    id: user.id,
    phone: user.phone,
    role: user.role,
    fullName: user.fullName || '',
    iat: now,
    exp: now + 30 * 24 * 60 * 60, // 30 days validity
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(signatureInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${signatureInput}.${signature}`;
}

/**
 * Verify a JWT token
 */
export function verifyJwt(token: string): JwtPayload | null {
  try {
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const signatureInput = `${encodedHeader}.${encodedPayload}`;

    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(signatureInput)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    // Constant-time comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const payload: JwtPayload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);

    // Check expiration
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

/**
 * Express middleware to authenticate Bearer JWT
 */
export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'توکن احراز هویت ارائه نشده است' });
  }

  const payload = verifyJwt(token);
  if (!payload) {
    return res.status(403).json({ error: 'توکن نامعتبر یا منقضی شده است' });
  }

  req.user = payload;
  next();
}
