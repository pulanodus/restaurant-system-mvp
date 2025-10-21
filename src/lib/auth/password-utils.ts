/**
 * Password Hashing Utilities
 * Secure password hashing and verification using bcrypt
 */

import bcrypt from 'bcryptjs';

// Configuration constants
const SALT_ROUNDS = 12; // Higher rounds = more secure but slower
const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 128;

// Password strength requirements
const PASSWORD_REQUIREMENTS = {
  minLength: MIN_PASSWORD_LENGTH,
  maxLength: MAX_PASSWORD_LENGTH,
  requireUppercase: false, // Set to true for production
  requireLowercase: false, // Set to true for production
  requireNumbers: false,   // Set to true for production
  requireSymbols: false    // Set to true for production
};

/**
 * Hash a plain text password using bcrypt
 * @param plainTextPassword - The plain text password to hash
 * @returns Promise<string> - The hashed password
 */
export async function hashPassword(plainTextPassword: string): Promise<string> {
  // Validate password before hashing
  const validation = validatePassword(plainTextPassword);
  if (!validation.isValid) {
    throw new Error(`Password validation failed: ${validation.errors.join(', ')}`);
  }

  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(plainTextPassword, salt);
    return hashedPassword;
  } catch (error) {
    console.error('Password hashing failed:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify a plain text password against a hashed password
 * @param plainTextPassword - The plain text password to verify
 * @param hashedPassword - The hashed password to compare against
 * @returns Promise<boolean> - True if passwords match, false otherwise
 */
export async function verifyPassword(
  plainTextPassword: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    const isMatch = await bcrypt.compare(plainTextPassword, hashedPassword);
    return isMatch;
  } catch (error) {
    console.error('Password verification failed:', error);
    return false;
  }
}

/**
 * Validate password against requirements
 * @param password - The password to validate
 * @returns Object with validation result and errors
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check length requirements
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
  }

  if (password.length > PASSWORD_REQUIREMENTS.maxLength) {
    errors.push(`Password must be no more than ${PASSWORD_REQUIREMENTS.maxLength} characters long`);
  }

  // Check character requirements (currently disabled for easy setup)
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (PASSWORD_REQUIREMENTS.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (PASSWORD_REQUIREMENTS.requireSymbols && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generate a secure random password
 * @param length - Length of the password to generate (default: 12)
 * @returns string - The generated password
 */
export function generateSecurePassword(length: number = 12): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }

  return password;
}

/**
 * Check if a password hash is valid bcrypt format
 * @param hash - The hash to validate
 * @returns boolean - True if valid bcrypt hash format
 */
export function isValidHash(hash: string): boolean {
  // Bcrypt hashes start with $2a$, $2b$, or $2y$ followed by cost and salt
  const bcryptRegex = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
  return bcryptRegex.test(hash);
}

/**
 * Estimate password strength
 * @param password - The password to analyze
 * @returns Object with strength score and feedback
 */
export function analyzePasswordStrength(password: string): {
  score: number; // 0-4 (0=very weak, 4=very strong)
  feedback: string[];
} {
  let score = 0;
  const feedback: string[] = [];

  // Length scoring
  if (password.length >= 8) score++;
  else feedback.push('Use at least 8 characters');

  if (password.length >= 12) score++;
  else if (password.length >= 8) feedback.push('Consider using 12+ characters for better security');

  // Character variety scoring
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score++;
  } else {
    feedback.push('Mix uppercase and lowercase letters');
  }

  if (/\d/.test(password)) {
    score++;
  } else {
    feedback.push('Include numbers');
  }

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password)) {
    score++;
  } else {
    feedback.push('Add special characters (!@#$%^&*)');
  }

  // Common pattern detection
  if (/(.)\1{2,}/.test(password)) {
    score = Math.max(0, score - 1);
    feedback.push('Avoid repeating characters');
  }

  if (/123|abc|qwe|password|admin/i.test(password)) {
    score = Math.max(0, score - 2);
    feedback.push('Avoid common patterns and words');
  }

  return { score: Math.min(4, score), feedback };
}

/**
 * Safe password comparison to prevent timing attacks
 * @param a - First password
 * @param b - Second password
 * @returns boolean - True if passwords match
 */
export function safePasswordCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

// Export password requirements for UI validation
export { PASSWORD_REQUIREMENTS };

// Development utilities (only available in development)
export const DevUtils = {
  /**
   * Generate a test hash for development/testing
   * WARNING: Only use in development!
   */
  async createTestHash(password: string): Promise<string> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Test utilities not available in production');
    }
    return hashPassword(password);
  },

  /**
   * Test password hashing performance
   */
  async benchmarkHashing(password: string, iterations: number = 10): Promise<{
    averageTime: number;
    totalTime: number;
  }> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Test utilities not available in production');
    }

    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      await hashPassword(password);
    }

    const totalTime = Date.now() - startTime;
    const averageTime = totalTime / iterations;

    return { averageTime, totalTime };
  }
};