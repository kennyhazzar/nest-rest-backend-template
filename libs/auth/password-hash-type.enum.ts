/**
 * Types of password hashing algorithms
 * Used to detect hash format during verification
 */
export enum PasswordHashType {
  /** Legacy HMAC-SHA256 algorithm (deprecated) */
  HMAC_SHA256 = 'hmac-sha256',
  /** Modern Argon2id algorithm (OWASP recommended) */
  ARGON2ID = 'argon2id',
}
