import { PasswordHashType } from './password-hash-type.enum';

/**
 * Abstract service for password operations
 * Defines contract for password hashing and verification
 */
export abstract class PasswordService {
  /**
   * Hashes a password using Argon2id
   * @param password - Plain text password
   * @returns Password hash
   */
  abstract hashPassword(password: string): Promise<string>;

  /**
   * Verifies password against stored hash
   * Supports both Argon2id and legacy HMAC-SHA256
   * @param storedHash - Hash from database
   * @param password - Password to verify
   * @returns true if password is correct
   */
  abstract verifyPassword(storedHash: string, password: string): Promise<boolean>;

  /**
   * Detects hashing algorithm type by hash format
   * @param hash - Password hash
   * @returns Algorithm type
   */
  abstract detectHashType(hash: string): PasswordHashType;

  /**
   * Checks if password needs rehashing
   * Returns true for legacy hashes or outdated Argon2 parameters
   * @param hash - Password hash
   * @returns true if rehashing is needed
   */
  abstract needsRehash(hash: string): boolean;
}
