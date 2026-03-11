/**
 * Master Code System
 * 
 * 6-digit code that serves as the primary authentication factor
 * alongside biometric verification.
 * 
 * The code is hashed with SHA-256 and stored locally.
 * Combined with biometric, it creates a dual-factor auth
 * that requires physical device possession.
 */

const MASTER_CODE_KEY = 'jtc_master_code_hash';
const ANON_SESSION_KEY = 'jtc_anon_session';

/**
 * Hash a master code using SHA-256
 */
async function hashCode(code: string): Promise<string> {
  const encoded = new TextEncoder().encode(code + '_jtc_salt_v1');
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

/**
 * Store master code (hashed)
 */
export async function setMasterCode(code: string): Promise<void> {
  const hash = await hashCode(code);
  localStorage.setItem(MASTER_CODE_KEY, hash);
}

/**
 * Verify master code
 */
export async function verifyMasterCode(code: string): Promise<boolean> {
  const storedHash = localStorage.getItem(MASTER_CODE_KEY);
  if (!storedHash) return false;
  const hash = await hashCode(code);
  return hash === storedHash;
}

/**
 * Check if master code is configured
 */
export function hasMasterCode(): boolean {
  return !!localStorage.getItem(MASTER_CODE_KEY);
}

/**
 * Store anonymous session reference
 */
export function setAnonSession(userId: string): void {
  localStorage.setItem(ANON_SESSION_KEY, userId);
}

/**
 * Get stored anonymous session reference
 */
export function getAnonSession(): string | null {
  return localStorage.getItem(ANON_SESSION_KEY);
}

/**
 * Check if this device has an anonymous account
 */
export function hasAnonAccount(): boolean {
  return !!localStorage.getItem(ANON_SESSION_KEY) && !!localStorage.getItem(MASTER_CODE_KEY);
}

/**
 * Clear all master code data (used by Nuclear Option)
 */
export function clearMasterCode(): void {
  localStorage.removeItem(MASTER_CODE_KEY);
  localStorage.removeItem(ANON_SESSION_KEY);
}
