// PKCE (Proof Key for Code Exchange) utilities for secure OAuth flow

/**
 * Generates a cryptographically random code verifier for PKCE
 * @returns A base64url-encoded string of 43-128 characters
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32); // 32 bytes = ~43 base64url characters
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

/**
 * Generates a code challenge from a code verifier using SHA256
 * @param codeVerifier The code verifier string
 * @returns A base64url-encoded SHA256 hash of the code verifier
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(digest));
}

/**
 * Encodes a byte array to base64url format (RFC 4648 Section 5)
 * @param array The byte array to encode
 * @returns A base64url-encoded string
 */
function base64URLEncode(array: Uint8Array): string {
  const base64 = btoa(String.fromCharCode.apply(null, [...array]));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}