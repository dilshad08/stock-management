import * as crypto from 'crypto';

/**
 * Hashes a plaintext password using crypto.scrypt with a random 16-byte salt.
 * Output format: "<salt_hex>:<derived_key_hex>"
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

/**
 * Verifies a plaintext password against a stored "<salt_hex>:<derived_key_hex>" hash.
 * Uses crypto.timingSafeEqual to prevent timing attacks.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    if (!storedHash || !storedHash.includes(':')) {
      return false;
    }
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) {
      return false;
    }
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    if (keyBuffer.length !== derivedKey.length) {
      return false;
    }
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

