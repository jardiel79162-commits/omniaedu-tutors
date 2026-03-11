/**
 * Protocol Zero — Zero Custody Encryption System
 * 
 * All cryptographic keys remain exclusively on the user's device.
 * When data is deleted, it ceases to exist mathematically.
 */

const DB_NAME = 'jtc_parker_keystore';
const DB_VERSION = 1;
const KEY_STORE = 'crypto_keys';

// Open IndexedDB for key storage
function openKeyStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(KEY_STORE)) {
        db.createObjectStore(KEY_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Generate a new AES-256-GCM key for a message/chat
export async function generateMessageKey(): Promise<{ key: CryptoKey; exportedKey: string }> {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const raw = await crypto.subtle.exportKey('raw', key);
  const exportedKey = btoa(String.fromCharCode(...new Uint8Array(raw)));
  return { key, exportedKey };
}

// Store a key locally in IndexedDB
export async function storeKey(messageId: string, exportedKey: string): Promise<void> {
  const db = await openKeyStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEY_STORE, 'readwrite');
    tx.objectStore(KEY_STORE).put({ id: messageId, key: exportedKey, createdAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Retrieve a key from local storage
export async function getKey(messageId: string): Promise<string | null> {
  const db = await openKeyStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEY_STORE, 'readonly');
    const req = tx.objectStore(KEY_STORE).get(messageId);
    req.onsuccess = () => resolve(req.result?.key ?? null);
    req.onerror = () => reject(req.error);
  });
}

// Import a raw key for decryption
export async function importKey(exportedKey: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(exportedKey), c => c.charCodeAt(0));
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
}

// Encrypt a message using AES-256-GCM
export async function encryptMessage(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  // Pack IV + ciphertext as base64
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

// Decrypt a message using AES-256-GCM
export async function decryptMessage(encrypted: string, exportedKey: string): Promise<string> {
  const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const key = await importKey(exportedKey);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

/**
 * PROTOCOL ZERO: Cryptographic Destruction
 * Destroys the key for a specific message, making it mathematically irrecoverable.
 */
export async function destroyMessageKey(messageId: string): Promise<void> {
  const db = await openKeyStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEY_STORE, 'readwrite');
    tx.objectStore(KEY_STORE).delete(messageId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * PROTOCOL ZERO: Destroy ALL keys — used by Panic Button
 * After this, all encrypted data becomes permanently unrecoverable.
 */
export async function destroyAllKeys(): Promise<void> {
  const db = await openKeyStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEY_STORE, 'readwrite');
    tx.objectStore(KEY_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Nuclear wipe of IndexedDB entirely
 */
export async function nukeKeyStore(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Get count of stored keys (for UI display)
 */
export async function getKeyCount(): Promise<number> {
  const db = await openKeyStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEY_STORE, 'readonly');
    const req = tx.objectStore(KEY_STORE).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
