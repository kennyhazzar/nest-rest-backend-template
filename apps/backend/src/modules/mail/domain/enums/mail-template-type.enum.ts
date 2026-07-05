/**
 * Email template types
 * Centralized storage of all email template names in the system
 */
export enum MailTemplateType {
  // ==================== System templates ====================

  /** Welcome email on registration */
  WELCOME = 'welcome',

  /** Password reset email */
  PASSWORD_RESET = 'reset-password',

  /** Contact form submission */
  CONTACT_FORM = 'contact-form',

  // ==================== OAuth & Magic Link templates ====================

  /** Magic link login email */
  MAGIC_LINK_LOGIN = 'magic-link-login',

  /** First OAuth login welcome */
  OAUTH_FIRST_LOGIN = 'oauth-first-login',

  /** OAuth provider linked notification */
  OAUTH_ACCOUNT_LINKED = 'oauth-account-linked',

  // ==================== Notification templates ====================

  /** Generic in-app notification dispatched via email */
  NOTIFICATION = 'notification',
}
