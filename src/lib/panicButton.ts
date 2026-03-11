/**
 * Panic Button (Nuclear Option)
 * 
 * Instantly destroys all local data:
 * 1. All cryptographic keys are destroyed
 * 2. Local database is wiped
 * 3. Data is overwritten
 * 4. Session is invalidated
 * 5. App returns to initial state
 */

import { destroyAllKeys, nukeKeyStore } from './protocolZero';
import { supabase } from '@/integrations/supabase/client';

const PANIC_PASSWORD_KEY = 'jtc_panic_hash';
const PANIC_ENABLED_KEY = 'jtc_panic_enabled';

/**
 * Hash a password using SHA-256
 */
async function hashPassword(password: string): Promise<string> {
  const encoded = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

/**
 * Set up the emergency panic password
 */
export async function setPanicPassword(password: string): Promise<void> {
  const hash = await hashPassword(password);
  localStorage.setItem(PANIC_PASSWORD_KEY, hash);
  localStorage.setItem(PANIC_ENABLED_KEY, 'true');
}

/**
 * Check if panic password is configured
 */
export function isPanicEnabled(): boolean {
  return localStorage.getItem(PANIC_ENABLED_KEY) === 'true';
}

/**
 * Verify if a given password is the panic password
 */
export async function isPanicPassword(password: string): Promise<boolean> {
  const storedHash = localStorage.getItem(PANIC_PASSWORD_KEY);
  if (!storedHash) return false;
  const hash = await hashPassword(password);
  return hash === storedHash;
}

/**
 * Remove panic password configuration
 */
export function removePanicPassword(): void {
  localStorage.removeItem(PANIC_PASSWORD_KEY);
  localStorage.removeItem(PANIC_ENABLED_KEY);
}

/**
 * NUCLEAR OPTION — Execute full data destruction
 * 
 * This is irreversible. All data will be permanently destroyed.
 */
export async function executeNuclearOption(): Promise<void> {
  // Phase 1: Destroy all cryptographic keys
  try {
    await destroyAllKeys();
  } catch (e) {
    // Continue even if this fails
  }

  // Phase 2: Nuke the entire key store
  try {
    await nukeKeyStore();
  } catch (e) {
    // Continue
  }

  // Phase 3: Sign out from backend (invalidate session)
  try {
    await supabase.auth.signOut();
  } catch (e) {
    // Continue
  }

  // Phase 4: Clear ALL local storage
  localStorage.clear();
  sessionStorage.clear();

  // Phase 5: Clear all IndexedDB databases
  try {
    const databases = await indexedDB.databases();
    for (const db of databases) {
      if (db.name) indexedDB.deleteDatabase(db.name);
    }
  } catch (e) {
    // indexedDB.databases() not available in all browsers
  }

  // Phase 6: Clear all caches
  try {
    const cacheNames = await caches.keys();
    for (const name of cacheNames) {
      await caches.delete(name);
    }
  } catch (e) {
    // Continue
  }

  // Phase 7: Clear cookies
  document.cookie.split(';').forEach(c => {
    document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
  });
}
