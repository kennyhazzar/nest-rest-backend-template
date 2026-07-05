/**
 * Domain entity for magic link authentication tokens
 * Used for passwordless email-based authentication
 */
export class MagicLinkToken {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly token: string,
    public readonly expiresAt: Date,
    public readonly isUsed: boolean,
    public readonly fingerprint: string,
    public readonly userAgent: string,
    public readonly createdAt: Date,
  ) {}

  /**
   * Create a new magic link token
   */
  static create(payload: {
    email: string;
    token: string;
    expiresAt: Date;
    fingerprint: string;
    userAgent: string;
  }): Omit<MagicLinkToken, 'id' | 'createdAt'> {
    return {
      email: payload.email,
      token: payload.token,
      expiresAt: payload.expiresAt,
      isUsed: false,
      fingerprint: payload.fingerprint,
      userAgent: payload.userAgent,
    } as Omit<MagicLinkToken, 'id' | 'createdAt'>;
  }

  /**
   * Check if the token is expired
   */
  isExpired(): boolean {
    return new Date() >= this.expiresAt;
  }

  /**
   * Check if the token is valid (not used and not expired)
   */
  isValid(): boolean {
    return !this.isUsed && !this.isExpired();
  }

  /**
   * Check if the fingerprint matches
   */
  matchesFingerprint(fingerprint: string): boolean {
    return this.fingerprint === fingerprint;
  }

  /**
   * Mark the token as used
   */
  markAsUsed(): MagicLinkToken {
    return new MagicLinkToken(
      this.id,
      this.email,
      this.token,
      this.expiresAt,
      true,
      this.fingerprint,
      this.userAgent,
      this.createdAt,
    );
  }
}
