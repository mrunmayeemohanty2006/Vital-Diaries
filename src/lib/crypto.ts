/**
 * Native Web Crypto API layer for AES-256-GCM encryption & decryption.
 * Zero external cryptographic dependencies - relies strictly on browser window.crypto.subtle.
 */

// Helper: Convert ArrayBuffer to Base64 string
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper: Convert Base64 string to Uint8Array / ArrayBuffer
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Generate cryptographically secure random 12-byte IV for AES-GCM
export function generateIV(): Uint8Array {
  return window.crypto.getRandomValues(new Uint8Array(12));
}

// Generate cryptographically secure random 16-byte salt for KDF
export function generateSalt(): Uint8Array {
  return window.crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Encrypts a plaintext string (or stringified JSON) using AES-256-GCM.
 * @param plaintext String to encrypt
 * @param key Derived CryptoKey (AES-GCM)
 * @returns Object containing base64 ciphertext and base64 IV
 */
export async function encryptData(
  plaintext: string,
  key: CryptoKey
): Promise<{ cipherText: string; iv: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const iv = generateIV();

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    data
  );

  return {
    cipherText: arrayBufferToBase64(encryptedBuffer),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

/**
 * Decrypts a base64 AES-GCM ciphertext back to plaintext.
 * @param cipherText Base64 encoded ciphertext
 * @param iv Base64 encoded 12-byte IV
 * @param key Derived CryptoKey (AES-GCM)
 * @returns Decrypted plaintext string
 */
export async function decryptData(
  cipherText: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  const encryptedBuffer = base64ToArrayBuffer(cipherText);
  const ivBuffer = base64ToArrayBuffer(iv);

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(ivBuffer),
      },
      key,
      encryptedBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    throw new Error('Decryption failed: Invalid passphrase or corrupted ciphertext');
  }
}
