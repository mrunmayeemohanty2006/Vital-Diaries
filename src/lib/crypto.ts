/**
 * Native Web Crypto API layer for AES-256-GCM encryption & decryption.
 * Zero external cryptographic dependencies - relies strictly on Web Crypto API (window.crypto / globalThis.crypto).
 */

function getCrypto(): Crypto {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto;
  }
  throw new Error('Web Crypto API is not available in this environment');
}

// Helper: Convert ArrayBuffer to Base64 string
export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper: Convert Base64 string to Uint8Array / ArrayBuffer
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  if (typeof Buffer !== 'undefined') {
    const buf = Buffer.from(base64, 'base64');
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Generate cryptographically secure random 12-byte IV for AES-GCM
export function generateIV(): Uint8Array {
  const crypto = getCrypto();
  return crypto.getRandomValues(new Uint8Array(12));
}

// Generate cryptographically secure random 16-byte salt for KDF
export function generateSalt(): Uint8Array {
  const crypto = getCrypto();
  return crypto.getRandomValues(new Uint8Array(16));
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
  const crypto = getCrypto();
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const iv = generateIV();

  const encryptedBuffer = await crypto.subtle.encrypt(
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
  const crypto = getCrypto();
  const encryptedBuffer = base64ToArrayBuffer(cipherText);
  const ivBuffer = base64ToArrayBuffer(iv);

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
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
