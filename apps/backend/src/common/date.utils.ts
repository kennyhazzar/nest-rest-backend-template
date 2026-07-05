/**
 * Date formatting utilities for Moscow timezone (MSK)
 */

const MSK_TIMEZONE = 'Europe/Moscow';
const RU_LOCALE = 'ru-RU';

/**
 * Formats date in Moscow timezone with full format
 * Example: "2 December 2025, 15:30"
 */
export function formatDateTimeToMSK(date: Date | null | undefined): string {
  if (!date) return 'Not specified';
  return date.toLocaleString(RU_LOCALE, {
    timeZone: MSK_TIMEZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formats date in Moscow timezone in short format
 * Example: "02.12.2025"
 */
export function formatShortDateToMSK(date: Date | null | undefined): string {
  if (!date) return 'Not specified';
  return date.toLocaleString(RU_LOCALE, {
    timeZone: MSK_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formats only time in Moscow timezone
 * Example: "15:30"
 */
export function formatTimeToMSK(date: Date | null | undefined): string {
  if (!date) return 'Not specified';
  return date.toLocaleString(RU_LOCALE, {
    timeZone: MSK_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
  });
}
