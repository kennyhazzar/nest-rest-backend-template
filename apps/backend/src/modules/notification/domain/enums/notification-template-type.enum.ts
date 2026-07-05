/**
 * Notification template types
 * Centralized storage of all notification template names in the system
 */
export enum NotificationTemplateType {
  // ==================== User notifications ====================

  /** Welcome notification for new users */
  WELCOME = 'welcome',

  /** User password changed notification */
  PASSWORD_CHANGED = 'password-changed',

  /** User profile updated notification */
  PROFILE_UPDATED = 'profile-updated',

  // ==================== System notifications ====================

  /** System maintenance notification */
  SYSTEM_MAINTENANCE = 'system-maintenance',

  /** General system notification */
  SYSTEM = 'system',

  /** Feature announcement */
  FEATURE_ANNOUNCEMENT = 'feature-announcement',

  // ==================== Security notifications ====================

  /** New login from unknown device */
  NEW_LOGIN = 'new-login',

  /** Security alert */
  SECURITY_ALERT = 'security-alert',
}
