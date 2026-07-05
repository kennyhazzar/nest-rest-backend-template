import { randomInt } from 'node:crypto';

/**
 * Generates a strong password that meets the following requirements:
 * - Minimum 8 characters (default 12)
 * - 1 lowercase letter
 * - 1 uppercase letter
 * - 1 digit
 * - 1 special character
 */
export function generateStrongPassword(length: number = 12): string {
  if (length < 8) {
    throw new Error('common.password.minLength');
  }

  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  // Guarantee at least one character of each type
  const requiredChars = [
    lowercase[randomInt(0, lowercase.length)],
    uppercase[randomInt(0, uppercase.length)],
    numbers[randomInt(0, numbers.length)],
    symbols[randomInt(0, symbols.length)],
  ];

  // All available characters for filling the remaining length
  const allChars = lowercase + uppercase + numbers + symbols;

  // Generate remaining characters randomly
  const remainingLength = length - requiredChars.length;
  const randomChars: string[] = [];

  for (let i = 0; i < remainingLength; i++) {
    const randomIndex = randomInt(0, allChars.length);
    randomChars.push(allChars[randomIndex]);
  }

  // Combine required and random characters
  const passwordChars = [...requiredChars, ...randomChars];

  // Shuffle characters for unpredictability
  // Using Fisher-Yates shuffle with cryptographically secure random numbers
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join('');
}
