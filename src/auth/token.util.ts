import * as crypto from 'crypto';

function getAuthSecret(): string {
  return process.env.AUTH_SECRET || 'hardware-store-secure-auth-secret-key-2026';
}

export interface AuthPayload {
  userId: string;
  username: string;
  role: string;
  name: string;
  exp: number;
}

export function createToken(
  payload: Omit<AuthPayload, 'exp'>,
  expiresInMs = 24 * 60 * 60 * 1000,
): string {
  const fullPayload: AuthPayload = {
    ...payload,
    exp: Date.now() + expiresInMs,
  };
  const data = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getAuthSecret())
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    if (!token || !token.includes('.')) {
      return null;
    }
    const [data, signature] = token.split('.');
    if (!data || !signature) {
      return null;
    }
    const expectedSignature = crypto
      .createHmac('sha256', getAuthSecret())
      .update(data)
      .digest('base64url');
    if (signature.length !== expectedSignature.length) {
      return null;
    }
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }
    const jsonStr = Buffer.from(data, 'base64url').toString('utf8');
    const payload: AuthPayload = JSON.parse(jsonStr);
    if (Date.now() > payload.exp) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

