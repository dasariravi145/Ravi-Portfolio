import { z } from 'zod';

/**
 * Server-side validation schema for visitor contact inquiries.
 * Enforces strict length limits, valid email formats, and trimmed inputs.
 */
export const ContactSubmissionSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Please enter a valid email address')
    .max(100, 'Email cannot exceed 100 characters'),
  subject: z
    .string({ required_error: 'Subject is required' })
    .trim()
    .min(3, 'Subject must be at least 3 characters')
    .max(150, 'Subject cannot exceed 150 characters'),
  message: z
    .string({ required_error: 'Message is required' })
    .trim()
    .min(10, 'Message must be at least 10 characters')
    .max(3000, 'Message cannot exceed 3000 characters'),
  // Honeypot field (hidden in UI). Must remain empty for genuine humans.
  website: z.string().optional(),
});

export type ContactSubmission = z.infer<typeof ContactSubmissionSchema>;

export interface ContactServiceConfig {
  resendApiKey?: string;
  fromEmail?: string;
  deliveryEmail?: string;
  environment?: string;
}

export interface ContactResult {
  success: boolean;
  message?: string;
  id?: string;
  error?: string;
  code?: string;
  status?: number;
  details?: Record<string, string>;
}

/**
 * Sanitizes input text to prevent Email Header Injection (CRLF injection).
 * Replaces carriage returns and newlines with a single space.
 */
export function sanitizeEmailHeader(input: string): string {
  return input.replace(/[\r\n\t]+/g, ' ').trim();
}

/**
 * Escapes HTML characters for safe embedding inside HTML email templates.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Safely masks an email address for logging without exposing PII.
 * Example: 'dasariravid145@gmail.com' -> 'd***5@gmail.com'
 */
export function maskEmailForLogs(email: string): string {
  if (!email || !email.includes('@')) return '***@***';
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0] || '*'}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

// ==========================================
// CONTACT RATE LIMITER
// (Cloudflare Native Limiter Binding + In-Memory Sliding Window)
// Zero D1 / Database Storage — 100% In-Memory / Edge Ephemeral
// ==========================================

export interface WorkerRateLimiterBinding {
  limit: (options: { key: string }) => Promise<{ success: boolean }>;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
  storageType: 'native' | 'memory';
  code?: 'RATE_LIMIT_EXCEEDED' | 'RATE_LIMITER_UNAVAILABLE';
  error?: string;
  status?: number;
}

interface InMemoryRateLimitEntry {
  timestamps: number[];
  expiresAt: number;
}

const rateLimitMap = new Map<string, InMemoryRateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 60 seconds (1 minute)
const MAX_REQUESTS_PER_WINDOW = 5; // Max 5 submissions per 60 seconds per client

/**
 * Hashes client IP or identifier with a salt using WebCrypto SHA-256.
 * Guarantees zero raw IP storage in memory, bindings, or logs.
 */
export async function hashClientIdentifier(ip: string): Promise<string> {
  const normalized = (ip || 'unknown').trim().toLowerCase();
  const salt = 'portfolio_ratelimit_salt_v1';
  const data = new TextEncoder().encode(`${salt}:${normalized}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Checks and updates rate limits for a given client IP.
 * 
 * Invariants:
 * 1. Production Requirement: When isProduction=true, strictly requires native RATE_LIMITER binding.
 *    Does NOT fall back to in-memory map. If missing or fails, fails closed with 503.
 * 2. Zero Database Storage: Neither Cloudflare D1 nor R2 is used. Zero database writes.
 * 3. Zero PII Storage: Client IP is hashed via salted WebCrypto SHA-256.
 * 4. Safe Non-Production Fallback: If not in production and native binding is absent,
 *    enforces an in-memory sliding window (5 requests / 60 seconds) with bounded memory.
 */
export async function checkRateLimit(
  ip: string,
  arg2?: WorkerRateLimiterBinding | number,
  arg3?: WorkerRateLimiterBinding | boolean | number,
  arg4?: WorkerRateLimiterBinding | number,
  arg5?: number
): Promise<RateLimitResult> {
  let nativeLimiter: WorkerRateLimiterBinding | undefined;
  let isProduction = false;
  let effectiveMax = MAX_REQUESTS_PER_WINDOW;
  let effectiveWindow = RATE_LIMIT_WINDOW_MS;

  if (typeof arg2 === 'number') {
    effectiveMax = arg2;
    if (typeof arg3 === 'number') {
      effectiveWindow = arg3;
    }
    if (typeof arg4 === 'object' && arg4 !== null && 'limit' in arg4) {
      nativeLimiter = arg4;
    }
  } else {
    if (typeof arg2 === 'object' && arg2 !== null && 'limit' in arg2) {
      nativeLimiter = arg2;
    }
    if (typeof arg3 === 'boolean') {
      isProduction = arg3;
    }
    if (typeof arg4 === 'number') {
      effectiveMax = arg4;
    }
    if (typeof arg5 === 'number') {
      effectiveWindow = arg5;
    }
  }

  const clientHash = await hashClientIdentifier(ip);
  const shortHash = clientHash.slice(0, 32);

  // 1. Production Mode: Strictly require Cloudflare native RATE_LIMITER binding
  if (isProduction) {
    if (!nativeLimiter || typeof nativeLimiter.limit !== 'function') {
      console.error('[ContactService] Native RATE_LIMITER binding is missing in production environment');
      return {
        allowed: false,
        code: 'RATE_LIMITER_UNAVAILABLE',
        status: 503,
        error: 'Contact service rate limiter is temporarily unavailable. Please try again shortly.',
        storageType: 'native',
      };
    }

    try {
      const outcome = await nativeLimiter.limit({ key: shortHash });
      if (!outcome.success) {
        return {
          allowed: false,
          retryAfterSeconds: 60,
          storageType: 'native',
          code: 'RATE_LIMIT_EXCEEDED',
          status: 429,
        };
      }
      return { allowed: true, storageType: 'native' };
    } catch (err: unknown) {
      console.error(
        '[ContactService] Native RATE_LIMITER binding execution failed in production:',
        err instanceof Error ? err.message : String(err)
      );
      return {
        allowed: false,
        code: 'RATE_LIMITER_UNAVAILABLE',
        status: 503,
        error: 'Contact service rate limiter is temporarily unavailable. Please try again shortly.',
        storageType: 'native',
      };
    }
  }

  // 2. Non-Production Mode: If native binding is provided (e.g. tests), use it
  if (nativeLimiter?.limit) {
    try {
      const outcome = await nativeLimiter.limit({ key: shortHash });
      if (!outcome.success) {
        return {
          allowed: false,
          retryAfterSeconds: 60,
          storageType: 'native',
          code: 'RATE_LIMIT_EXCEEDED',
          status: 429,
        };
      }
      return { allowed: true, storageType: 'native' };
    } catch (err: unknown) {
      console.warn(
        '[ContactService] Native rate limiter encountered an issue in non-production, falling back to in-memory sliding window:',
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  // 3. Safe In-Memory Sliding Window (Development / Local Unit Tests)
  const now = Date.now();
  const existing = rateLimitMap.get(shortHash);
  let timestamps: number[] = existing?.timestamps || [];

  // Evict timestamps outside sliding window
  timestamps = timestamps.filter((ts) => now - ts < effectiveWindow);

  if (timestamps.length >= effectiveMax) {
    const oldestTimestamp = timestamps[0];
    const retryAfterMs = effectiveWindow - (now - oldestTimestamp);
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
    return {
      allowed: false,
      retryAfterSeconds,
      storageType: 'memory',
      code: 'RATE_LIMIT_EXCEEDED',
      status: 429,
    };
  }

  // Record this timestamp
  timestamps.push(now);
  rateLimitMap.set(shortHash, {
    timestamps,
    expiresAt: now + effectiveWindow,
  });

  // Periodically prune expired entries to guarantee bounded memory retention
  if (rateLimitMap.size > 500) {
    for (const [key, entry] of rateLimitMap.entries()) {
      if (now > entry.expiresAt || entry.timestamps.every((ts) => now - ts >= effectiveWindow)) {
        rateLimitMap.delete(key);
      }
    }
  }

  return { allowed: true, storageType: 'memory' };
}

/**
 * Resets rate limit records (primarily for test isolation).
 */
export function resetRateLimits(): void {
  rateLimitMap.clear();
}

// ==========================================
// EMAIL DISPATCH VIA RESEND
// ==========================================

export async function sendContactInquiry(
  rawInput: unknown,
  config: ContactServiceConfig,
  customFetch: typeof fetch = fetch
): Promise<ContactResult> {
  // 1. Server-side validation via Zod
  const parseResult = ContactSubmissionSchema.safeParse(rawInput);
  if (!parseResult.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parseResult.error.issues) {
      const field = issue.path[0] as string;
      if (field && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return {
      success: false,
      error: 'Validation failed. Please verify the submitted fields.',
      code: 'VALIDATION_ERROR',
      status: 400,
      details: fieldErrors,
    };
  }

  const { name, email, subject, message, website } = parseResult.data;

  // 2. Honeypot Check: If the hidden 'website' field contains any text, silently accept
  if (website && website.trim().length > 0) {
    // Return success to the bot without executing email dispatch
    return {
      success: true,
      message: 'Your message has been received.',
      id: 'hp_silent_ack',
    };
  }

  // 3. Prevent Email Header Injection
  const cleanName = sanitizeEmailHeader(name);
  const cleanEmail = sanitizeEmailHeader(email);
  const cleanSubject = sanitizeEmailHeader(subject);

  const deliveryEmail = config.deliveryEmail || 'dasariravid145@gmail.com';
  const fromEmail = config.fromEmail || 'Ravi Dasari <contact@dsecops88.online>';
  const isProduction = config.environment === 'production';

  // 4. API Key Verification
  if (!config.resendApiKey || config.resendApiKey.trim().length === 0) {
    if (isProduction) {
      // In production, never silently fail or proceed without the API key
      return {
        success: false,
        error: 'Email delivery service is currently unconfigured. Please email directly at dasariravid145@gmail.com.',
        code: 'EMAIL_SERVICE_UNCONFIGURED',
        status: 503,
      };
    }

    // In local development or test mode without a real key, simulate successful acceptance
    return {
      success: true,
      id: `dev_mock_${Date.now()}`,
      message: 'Your message has been sent successfully (Development Mock Mode).',
    };
  }

  // 5. Construct Plain Text & Semantic HTML Email
  const timestampIso = new Date().toISOString();
  const plainText = [
    `New Inbound Inquiry — Ravi Dasari Portfolio`,
    `=========================================`,
    `Sender Name:    ${cleanName}`,
    `Sender Email:   ${cleanEmail}`,
    `Subject:        ${cleanSubject}`,
    `Received At:    ${timestampIso}`,
    ``,
    `Message:`,
    `-----------------------------------------`,
    message,
    `-----------------------------------------`,
    ``,
    `Direct Reply: Hit reply in your email client to respond to ${cleanEmail}.`,
    `Origin: https://ravi-portfolio.dsecops88.online/#contact`,
  ].join('\n');

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Inbound Inquiry — Ravi Dasari Portfolio</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <tr>
      <td style="padding: 24px; background: #2563eb; color: #ffffff;">
        <h2 style="margin: 0 0 4px 0; font-size: 20px; font-weight: 700;">Inbound Portfolio Inquiry</h2>
        <p style="margin: 0; font-size: 13px; color: #bfdbfe;">Delivered from ravi-portfolio.dsecops88.online</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="8" style="font-size: 14px; margin-bottom: 20px; border-bottom: 1px solid #f1f5f9;">
          <tr>
            <td width="30%" style="font-weight: 600; color: #64748b;">From:</td>
            <td style="font-weight: 700; color: #0f172a;">${escapeHtml(cleanName)}</td>
          </tr>
          <tr>
            <td style="font-weight: 600; color: #64748b;">Email (Reply-To):</td>
            <td><a href="mailto:${escapeHtml(cleanEmail)}" style="color: #2563eb; text-decoration: none; font-weight: 600;">${escapeHtml(cleanEmail)}</a></td>
          </tr>
          <tr>
            <td style="font-weight: 600; color: #64748b;">Subject:</td>
            <td style="color: #0f172a; font-weight: 600;">${escapeHtml(cleanSubject)}</td>
          </tr>
          <tr>
            <td style="font-weight: 600; color: #64748b;">Received:</td>
            <td style="color: #64748b; font-size: 12px;">${escapeHtml(timestampIso)}</td>
          </tr>
        </table>

        <div style="font-weight: 700; font-size: 14px; color: #334155; margin-bottom: 8px;">Message Content:</div>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">
${escapeHtml(message)}
        </div>

        <div style="margin-top: 24px; text-align: center;">
          <a href="mailto:${escapeHtml(cleanEmail)}?subject=Re:%20${encodeURIComponent(cleanSubject)}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 8px;">
            Reply Directly to ${escapeHtml(cleanName)}
          </a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
        This email was securely delivered via Resend from Ravi Dasari's portfolio contact form.
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  // 6. Invoke Resend REST API
  try {
    const resendPayload = {
      from: fromEmail,
      to: [deliveryEmail],
      reply_to: cleanEmail,
      subject: `[Portfolio Inquiry] ${cleanSubject} — from ${cleanName}`,
      text: plainText,
      html: htmlContent,
    };

    const res = await customFetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.resendApiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendPayload),
    });

    if (!res.ok) {
      let errorMsg = 'Failed to send email through provider';
      try {
        const errorData = (await res.json()) as any;
        if (errorData?.message) {
          errorMsg = errorData.message;
        }
      } catch {
        // Fall back to status code
        errorMsg = `Email provider responded with HTTP ${res.status}`;
      }

      // Safe logging: Never log credentials or full body
      console.error(
        `[ContactService] Resend API error (HTTP ${res.status}: ${errorMsg}) for inquiry from ${maskEmailForLogs(cleanEmail)}`
      );

      return {
        success: false,
        error: 'Unable to deliver message at this time. Please reach out directly to dasariravid145@gmail.com.',
        code: 'PROVIDER_ERROR',
        status: 502,
      };
    }

    const data = (await res.json()) as { id?: string };
    return {
      success: true,
      id: data.id || `resend_${Date.now()}`,
      message: 'Your message has been sent successfully. Thank you for getting in touch!',
    };
  } catch (err: any) {
    // Network / fetch exception
    console.error(
      `[ContactService] Network error dispatching to Resend: ${err.message || 'Unknown network error'}`
    );
    return {
      success: false,
      error: 'Network error communicating with the email provider. Please email directly at dasariravid145@gmail.com.',
      code: 'NETWORK_ERROR',
      status: 502,
    };
  }
}
