import { MagicLinkToken } from '../entities/magic-link-token.entity';

/**
 * Abstract repository for magic link token operations
 */
export abstract class MagicLinkTokenRepository {
  /**
   * Create a new magic link token
   */
  abstract create(data: Omit<MagicLinkToken, 'id' | 'createdAt'>): Promise<MagicLinkToken>;

  /**
   * Find a magic link token by token string
   */
  abstract findByToken(token: string): Promise<MagicLinkToken | null>;

  /**
   * Find magic link tokens by email
   */
  abstract findByEmail(email: string): Promise<MagicLinkToken[]>;

  /**
   * Mark token as used
   */
  abstract markAsUsed(id: string): Promise<void>;

  /**
   * Delete expired tokens (cleanup)
   */
  abstract deleteExpired(): Promise<number>;

  /**
   * Delete all tokens for a specific email
   */
  abstract deleteByEmail(email: string): Promise<void>;
}
