import { SessionPayload } from './webauthnTypes';

function base64UrlEncode(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (base64.length % 4)) % 4;
  const padded = base64.padEnd(base64.length + padLen, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Creates a cryptographically signed session token (HMAC-SHA256)
 */
export async function signSession(
  payload: SessionPayload,
  secret: string
): Promise<string> {
  const enc = new TextEncoder();
  const payloadStr = JSON.stringify(payload);
  const encodedPayload = base64UrlEncode(enc.encode(payloadStr));

  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    enc.encode(encodedPayload)
  );

  const encodedSignature = base64UrlEncode(new Uint8Array(signature));
  return `${encodedPayload}.${encodedSignature}`;
}

/**
 * Verifies an HMAC-SHA256 signed session token
 */
export async function verifySession(
  token: string | undefined | null,
  secret: string
): Promise<SessionPayload | null> {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encodedPayload, encodedSignature] = parts;

  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBytes = base64UrlDecode(encodedSignature);
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes as unknown as BufferSource,
      enc.encode(encodedPayload)
    );

    if (!valid) return null;

    const payloadJson = new TextDecoder().decode(base64UrlDecode(encodedPayload));
    const payload: SessionPayload = JSON.parse(payloadJson);

    // Verify expiration
    if (payload.expiresAt <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Helper to generate session cookie string (handles __Host- prefix for HTTPS vs dev HTTP)
 */
export function buildSessionCookie(
  token: string,
  isSecure: boolean,
  maxAgeSeconds: number = 28800 // 8 hours
): { name: string; value: string; cookieString: string } {
  // Browsers enforce that cookies with __Host- prefix MUST be Secure
  const name = isSecure ? '__Host-portfolio_session' : 'portfolio_admin_session';
  const cookieString = `${name}=${token}; Path=/; ${
    isSecure ? 'Secure; ' : ''
  }HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}`;

  return { name, value: token, cookieString };
}

/**
 * Helper to clear session cookies
 */
export function buildClearSessionCookies(isSecure: boolean): string[] {
  const cookies: string[] = [];
  cookies.push(
    `portfolio_admin_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`
  );
  if (isSecure) {
    cookies.push(
      `__Host-portfolio_session=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0`
    );
  }
  return cookies;
}
