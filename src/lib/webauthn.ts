/**
 * WebAuthn Biometric Authentication
 * 
 * Uses the device's Secure Enclave (Touch ID / Face ID / Fingerprint)
 * via the Web Authentication API (FIDO2).
 * 
 * Keys never leave the hardware security module.
 * Eliminates SIM swap attacks — no phone number needed.
 */

const RP_NAME = 'JTC Parker';
const RP_ID = window.location.hostname;
const CREDENTIAL_STORE_KEY = 'jtc_webauthn_credential';

/**
 * Check if WebAuthn is supported on this device
 */
export function isWebAuthnSupported(): boolean {
  return !!(navigator.credentials && window.PublicKeyCredential);
}

/**
 * Check if platform authenticator (biometric) is available
 */
export async function isBiometricAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Register a new biometric credential
 * Links the device's Secure Enclave to this account
 */
export async function registerBiometric(userId: string): Promise<{ credentialId: string } | null> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userIdBuffer = new TextEncoder().encode(userId);

    const credential = await navigator.credentials.create({
      publicKey: {
        rp: { name: RP_NAME, id: RP_ID },
        user: {
          id: userIdBuffer,
          name: `anon_${userId.slice(0, 8)}`,
          displayName: 'Usuário Anônimo',
        },
        challenge,
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },   // ES256 (P-256)
          { type: 'public-key', alg: -257 },  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Forces biometric (not USB key)
          userVerification: 'required',        // Forces fingerprint/face
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none', // Privacy: don't send attestation
      },
    }) as PublicKeyCredential | null;

    if (!credential) return null;

    const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));

    // Store credential ID locally for future authentication
    localStorage.setItem(CREDENTIAL_STORE_KEY, credentialId);

    return { credentialId };
  } catch (err) {
    console.error('Biometric registration failed:', err);
    return null;
  }
}

/**
 * Authenticate using biometric
 * Verifies the user through the device's Secure Enclave
 */
export async function authenticateBiometric(): Promise<boolean> {
  try {
    const storedCredentialId = localStorage.getItem(CREDENTIAL_STORE_KEY);
    if (!storedCredentialId) return false;

    const credentialIdBuffer = Uint8Array.from(atob(storedCredentialId), c => c.charCodeAt(0));
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: RP_ID,
        allowCredentials: [{
          type: 'public-key',
          id: credentialIdBuffer,
          transports: ['internal'], // Platform authenticator only
        }],
        userVerification: 'required',
        timeout: 60000,
      },
    });

    return !!assertion;
  } catch (err) {
    console.error('Biometric authentication failed:', err);
    return false;
  }
}

/**
 * Check if there's a stored biometric credential
 */
export function hasStoredCredential(): boolean {
  return !!localStorage.getItem(CREDENTIAL_STORE_KEY);
}

/**
 * Clear stored biometric credential (used by Nuclear Option)
 */
export function clearBiometricCredential(): void {
  localStorage.removeItem(CREDENTIAL_STORE_KEY);
}
