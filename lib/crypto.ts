import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getKey(): Buffer {
  const keyStr = process.env.FIELD_ENCRYPTION_KEY;
  if (!keyStr) {
    // In development, use a deterministic key so data persists across restarts.
    // In production, FIELD_ENCRYPTION_KEY must be set.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FIELD_ENCRYPTION_KEY environment variable is required in production');
    }
    return Buffer.alloc(KEY_LENGTH, 'dev-key-do-not-use-in-production');
  }
  // Accept hex-encoded 32-byte key or a passphrase (derived via SHA-256)
  if (keyStr.length === 64 && /^[0-9a-fA-F]+$/.test(keyStr)) {
    return Buffer.from(keyStr, 'hex');
  }
  return crypto.createHash('sha256').update(keyStr).digest();
}

/**
 * Encrypt a plaintext string.
 * Returns a base64-encoded string: IV (16 bytes) + AuthTag (16 bytes) + Ciphertext
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

/**
 * Decrypt a base64-encoded encrypted string produced by encrypt().
 * Returns original plaintext.
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return ciphertext;
  // If the string doesn't look encrypted (e.g., plain text in dev), return as-is
  try {
    const key = getKey();
    const buf = Buffer.from(ciphertext, 'base64');
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
  } catch {
    // Return ciphertext as-is if decryption fails (e.g., unencrypted legacy data)
    return ciphertext;
  }
}

/** Check if a string appears to be encrypted (base64 of at least IV+tag+1 byte) */
export function isEncrypted(value: string): boolean {
  if (!value) return false;
  try {
    const buf = Buffer.from(value, 'base64');
    return buf.length > IV_LENGTH + TAG_LENGTH;
  } catch {
    return false;
  }
}
