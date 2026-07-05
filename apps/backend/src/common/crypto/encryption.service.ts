import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/** Wire-format prefix written before every encrypted value in the DB. The `v1` segment allows future algorithm migration without breaking existing rows. */
const ENCRYPTED_PREFIX = 'enc:v1:';
/** Prefix for one-way SHA-256 lookup hashes stored alongside encrypted fields to allow equality searches. */
const HASH_PREFIX = 'sha256:';
/** AES-256 requires a 256-bit (32-byte) key. */
const KEY_BYTES = 32;
/** GCM standard nonce length. 12 bytes gives the optimal performance/collision-resistance trade-off for AES-GCM. */
const NONCE_BYTES = 12;
/** GCM authentication tag length. 16 bytes (128-bit) is the maximum and recommended size. */
const AUTH_TAG_BYTES = 16;

/**
 * Field-level encryption service using AES-256-GCM.
 *
 * **Wire format** (stored in DB): `enc:v1:{nonce_b64}:{authTag_b64}:{ciphertext_b64}`
 * - nonce — 12 random bytes, unique per encryption call (GCM standard)
 * - authTag — 16-byte GCM authentication tag, detects tampering on decrypt
 * - ciphertext — variable-length AES-256-GCM output
 *
 * **Searchable fields** (e.g. device tokens, API keys) use `hashLookupSecret` instead:
 * `sha256:{hex}` — one-way, allows equality lookups without decryption.
 *
 * The key is loaded once at startup from `security.encryptionKey` (config).
 * Accepted key formats: 32-byte base64, 64-char hex, or 32-byte UTF-8 string.
 *
 * All services must use the same `APP_ENCRYPTION_KEY`.
 */
@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    this.key = this.parseKey(configService.getOrThrow<string>('security.encryptionKey'));
  }

  /**
   * Encrypts `value` with AES-256-GCM and returns the `enc:v1:...` wire string.
   *
   * Idempotent: already-encrypted values (detected by prefix) are returned as-is,
   * preventing double-encryption on repeated saves.
   * Passes through `null`, `undefined`, and `''` unchanged.
   *
   * @param value - Plaintext to encrypt, or null/undefined for nullable columns.
   * @returns Encrypted wire string, `null` for null/undefined input, or `''` for empty input.
   */
  encryptNullable(value: string | null | undefined): string | null {
    if (value === undefined || value === null || value === '') return value ?? null;
    if (this.isEncrypted(value)) return value;

    const nonce = randomBytes(NONCE_BYTES);
    const cipher = createCipheriv('aes-256-gcm', this.key, nonce, { authTagLength: AUTH_TAG_BYTES });
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return `${ENCRYPTED_PREFIX}${nonce.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`;
  }

  /**
   * Decrypts an `enc:v1:...` wire string back to plaintext.
   *
   * GCM authentication tag verification happens inside `decipher.final()` —
   * an `Error` is thrown if the ciphertext or tag was tampered with.
   * Passes through non-encrypted strings unchanged (e.g. legacy plaintext rows).
   * Passes through `null`, `undefined`, and `''` unchanged.
   *
   * @param value - Encrypted wire string from the database, or null/undefined.
   * @returns Plaintext string, `null` for null/undefined input, or `''` for empty input.
   * @throws {Error} `'crypto.encryptedPayloadInvalid'` — malformed wire format.
   * @throws {Error} Node.js crypto error — GCM auth tag mismatch (data integrity failure).
   */
  decryptNullable(value: string | null | undefined): string | null {
    if (value === undefined || value === null || value === '') return value ?? null;
    if (!this.isEncrypted(value)) return value;

    const payload = value.slice(ENCRYPTED_PREFIX.length);
    const parts = payload.split(':');
    if (parts.length !== 3) {
      throw new Error('crypto.encryptedPayloadInvalid');
    }

    const [nonceB64, authTagB64, ciphertextB64] = parts;
    const nonce = Buffer.from(nonceB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const ciphertext = Buffer.from(ciphertextB64, 'base64');

    if (nonce.length !== NONCE_BYTES || authTag.length !== AUTH_TAG_BYTES || ciphertext.length === 0) {
      throw new Error('crypto.encryptedPayloadInvalid');
    }

    const decipher = createDecipheriv('aes-256-gcm', this.key, nonce, { authTagLength: AUTH_TAG_BYTES });
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }

  /**
   * Returns `true` if `value` carries the `enc:v1:` prefix, indicating it was
   * produced by this service and must be decrypted before use.
   */
  isEncrypted(value: string): boolean {
    return value.startsWith(ENCRYPTED_PREFIX);
  }

  /**
   * Returns a deterministic `sha256:{hex}` fingerprint of `value`.
   *
   * Used for searchable sensitive fields (e.g. device tokens, webhook secrets)
   * where equality lookups are needed but the plaintext must not be stored.
   * Store the hash alongside the encrypted value; query by hash, return decrypted value.
   * Idempotent: already-hashed strings are returned as-is.
   *
   * @param value - Raw secret to hash.
   * @returns `sha256:{64-char hex digest}`.
   */
  hashLookupSecret(value: string): string {
    if (value.startsWith(HASH_PREFIX)) return value;
    return `${HASH_PREFIX}${createHash('sha256').update(value, 'utf8').digest('hex')}`;
  }

  /**
   * Returns `true` if `value` carries the `sha256:` prefix, meaning it is a
   * lookup hash and cannot be reversed to plaintext.
   */
  isHashedLookupSecret(value: string): boolean {
    return value.startsWith(HASH_PREFIX);
  }

  /**
   * Parses the raw key string from config into a 32-byte Buffer.
   *
   * Accepted formats (tried in order):
   * 1. Base64-encoded 32 bytes (e.g. output of `openssl rand -base64 32`)
   * 2. 64-character lowercase/uppercase hex string
   * 3. Raw UTF-8 string that is exactly 32 bytes long
   *
   * @throws {Error} `'security.encryptionKeyInvalid'` if none of the formats yield 32 bytes.
   */
  private parseKey(raw: string): Buffer {
    const trimmed = raw.trim();
    const candidates = [
      Buffer.from(trimmed, 'base64'),
      /^[0-9a-f]{64}$/i.test(trimmed) ? Buffer.from(trimmed, 'hex') : Buffer.alloc(0),
      Buffer.from(trimmed, 'utf8'),
    ];

    const key = candidates.find((candidate) => candidate.length === KEY_BYTES);
    if (!key) {
      throw new Error('security.encryptionKeyInvalid');
    }
    return key;
  }
}
