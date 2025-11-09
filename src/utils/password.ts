import bcrypt from "npm:bcryptjs@^2.4.3";

/**
 * Hashes a password using bcrypt with 10 salt rounds.
 * @param password - Plaintext password to hash
 * @returns Promise resolving to the hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Compares a plaintext password with a bcrypt hash.
 * @param password - Plaintext password to compare
 * @param hash - Bcrypt hash to compare against
 * @returns Promise resolving to true if passwords match, false otherwise
 */
export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Checks if a password string is already a bcrypt hash.
 * Bcrypt hashes start with $2a$, $2b$, or $2y$ followed by the cost factor.
 * @param password - Password string to check
 * @returns true if the string appears to be a bcrypt hash, false otherwise
 */
export function isHashed(password: string): boolean {
  // Bcrypt hashes have the format: $2[abxy]$[cost]$[22 character salt][31 character hash]
  // They always start with $2a$, $2b$, or $2y$
  return /^\$2[abxy]\$\d{2}\$.{53}$/.test(password);
}

