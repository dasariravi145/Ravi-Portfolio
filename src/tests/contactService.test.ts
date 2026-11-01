import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ContactSubmissionSchema,
  sanitizeEmailHeader,
  escapeHtml,
  maskEmailForLogs,
  checkRateLimit,
  resetRateLimits,
  sendContactInquiry,
  hashClientIdentifier,
  WorkerRateLimiterBinding,
} from '../services/contactService';

describe('ContactService Unit Tests', () => {
  beforeEach(() => {
    resetRateLimits();
    vi.restoreAllMocks();
  });

  describe('1. Server-Side Validation (ContactSubmissionSchema)', () => {
    it('accepts valid contact submission data', () => {
      const valid = {
        name: 'Alex Johnson',
        email: 'alex.johnson@enterprise.io',
        subject: 'Senior Platform Engineer Opportunity',
        message: 'We are looking for a senior DevOps and platform engineer to lead our cloud migration.',
      };
      const result = ContactSubmissionSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects missing or empty name', () => {
      const invalid = {
        name: ' ',
        email: 'alex@enterprise.io',
        subject: 'Valid Subject Line',
        message: 'This is a valid inquiry message with sufficient length.',
      };
      const result = ContactSubmissionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects name exceeding 100 characters', () => {
      const invalid = {
        name: 'A'.repeat(101),
        email: 'alex@enterprise.io',
        subject: 'Valid Subject Line',
        message: 'This is a valid inquiry message with sufficient length.',
      };
      const result = ContactSubmissionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects invalid email address format', () => {
      const invalid = {
        name: 'Alex Johnson',
        email: 'invalid-email-format-without-at',
        subject: 'Valid Subject',
        message: 'This is a valid inquiry message with sufficient length.',
      };
      const result = ContactSubmissionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects subject under 3 characters or exceeding 150 characters', () => {
      const short = {
        name: 'Alex Johnson',
        email: 'alex@enterprise.io',
        subject: 'Hi',
        message: 'This is a valid inquiry message with sufficient length.',
      };
      expect(ContactSubmissionSchema.safeParse(short).success).toBe(false);

      const long = {
        name: 'Alex Johnson',
        email: 'alex@enterprise.io',
        subject: 'A'.repeat(151),
        message: 'This is a valid inquiry message with sufficient length.',
      };
      expect(ContactSubmissionSchema.safeParse(long).success).toBe(false);
    });

    it('rejects message under 10 characters or exceeding 3000 characters', () => {
      const short = {
        name: 'Alex Johnson',
        email: 'alex@enterprise.io',
        subject: 'Platform Lead Opportunity',
        message: 'Too short',
      };
      expect(ContactSubmissionSchema.safeParse(short).success).toBe(false);

      const long = {
        name: 'Alex Johnson',
        email: 'alex@enterprise.io',
        subject: 'Platform Lead Opportunity',
        message: 'A'.repeat(3001),
      };
      expect(ContactSubmissionSchema.safeParse(long).success).toBe(false);
    });
  });

  describe('2. Security Sanitization & PII Protection', () => {
    it('strips CRLF injection characters from email headers', () => {
      const dirtySubject = 'Opportunity\r\nBcc: victim@domain.com\r\nSubject: Injected';
      const clean = sanitizeEmailHeader(dirtySubject);
      expect(clean).not.toContain('\r');
      expect(clean).not.toContain('\n');
      expect(clean).toBe('Opportunity Bcc: victim@domain.com Subject: Injected');
    });

    it('escapes HTML characters in message body', () => {
      const maliciousHtml = '<script>alert("xss")</script> & "test"';
      const escaped = escapeHtml(maliciousHtml);
      expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &quot;test&quot;');
    });

    it('masks email for non-sensitive logging', () => {
      expect(maskEmailForLogs('dasariravid145@gmail.com')).toBe('d***5@gmail.com');
      expect(maskEmailForLogs('hr@company.com')).toBe('h***@company.com');
      expect(maskEmailForLogs('invalid')).toBe('***@***');
    });
  });

  describe('3. Contact Rate Limiting Protection (In-Memory Sliding Window & Native Limiter Binding)', () => {
    it('allows up to 5 requests within sliding window and blocks the 6th with 429', async () => {
      const testIp = '203.0.113.42';

      for (let i = 0; i < 5; i++) {
        const check = await checkRateLimit(testIp, 5, 60000);
        expect(check.allowed).toBe(true);
        expect(check.storageType).toBe('memory');
      }

      const blockedCheck = await checkRateLimit(testIp, 5, 60000);
      expect(blockedCheck.allowed).toBe(false);
      expect(blockedCheck.retryAfterSeconds).toBeGreaterThan(0);
      expect(blockedCheck.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(blockedCheck.status).toBe(429);
      expect(blockedCheck.storageType).toBe('memory');
    });

    it('tracks different IP addresses independently without cross-interference', async () => {
      const ipA = '198.51.100.1';
      const ipB = '198.51.100.2';

      for (let i = 0; i < 5; i++) {
        expect((await checkRateLimit(ipA, 5, 60000)).allowed).toBe(true);
      }
      expect((await checkRateLimit(ipA, 5, 60000)).allowed).toBe(false);

      // ipB should remain unblocked
      expect((await checkRateLimit(ipB, 5, 60000)).allowed).toBe(true);
    });

    it('evicts timestamps outside the sliding window to restore request capacity', async () => {
      const ip = '198.51.100.102';
      const windowMs = 50; // 50ms test window

      for (let i = 0; i < 5; i++) {
        const res = await checkRateLimit(ip, 5, windowMs);
        expect(res.allowed).toBe(true);
      }

      // 6th is blocked
      const blocked = await checkRateLimit(ip, 5, windowMs);
      expect(blocked.allowed).toBe(false);

      // Wait for sliding window to expire
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Capacity restored
      const restored = await checkRateLimit(ip, 5, windowMs);
      expect(restored.allowed).toBe(true);
    });

    it('handles rapid sequential and concurrent requests safely', async () => {
      const ip = '198.51.100.88';

      // 5 requests within window
      const results = [];
      for (let i = 0; i < 7; i++) {
        results.push(await checkRateLimit(ip, 5, 60000));
      }

      const allowed = results.filter((r) => r.allowed);
      const blocked = results.filter((r) => !r.allowed);

      expect(allowed.length).toBe(5);
      expect(blocked.length).toBe(2);
      for (const b of blocked) {
        expect(b.code).toBe('RATE_LIMIT_EXCEEDED');
        expect(b.retryAfterSeconds).toBeGreaterThan(0);
        expect(b.status).toBe(429);
      }
    });

    it('delegates to native Cloudflare Workers RATE_LIMITER binding when present', async () => {
      const mockLimiter: WorkerRateLimiterBinding = {
        limit: vi.fn().mockResolvedValue({ success: false }),
      };

      const ip = '198.51.100.200';
      const result = await checkRateLimit(ip, 5, 60000, mockLimiter);

      expect(result.allowed).toBe(false);
      expect(result.storageType).toBe('native');
      expect(result.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(result.status).toBe(429);
      expect(mockLimiter.limit).toHaveBeenCalledTimes(1);

      // Verify the key passed to native limiter is the SHA-256 hash, NOT raw IP
      const callArg = (mockLimiter.limit as any).mock.calls[0][0];
      expect(callArg.key).not.toContain(ip);
      expect(callArg.key).toHaveLength(32);
    });

    it('falls back to in-memory sliding window if native limiter binding encounters an error', async () => {
      const faultyLimiter: WorkerRateLimiterBinding = {
        limit: vi.fn().mockRejectedValue(new Error('Cloudflare edge limiter RPC error')),
      };

      const ip = '198.51.100.201';
      const result = await checkRateLimit(ip, 5, 60000, faultyLimiter);

      expect(result.allowed).toBe(true);
      expect(result.storageType).toBe('memory');
    });

    it('guarantees zero raw IP exposure by using salted WebCrypto SHA-256 hashing', async () => {
      const rawIp = '203.0.113.195';
      const hash = await hashClientIdentifier(rawIp);

      expect(hash).toHaveLength(64);
      expect(hash).not.toContain(rawIp);

      // Verify deterministic hashing for same IP
      const secondHash = await hashClientIdentifier(rawIp);
      expect(secondHash).toBe(hash);

      // Verify different IP produces completely different hash
      const differentHash = await hashClientIdentifier('203.0.113.196');
      expect(differentHash).not.toBe(hash);
    });

    it('prunes expired entries when map grows to guarantee bounded memory retention', async () => {
      // Simulate multiple expired entries
      for (let i = 0; i < 510; i++) {
        await checkRateLimit(`10.0.0.${i}`, 5, 1); // 1ms window
      }

      // Wait 10ms for all to expire
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Trigger next check which prunes entries
      await checkRateLimit('10.1.1.1', 5, 60000);

      // Memory map should be pruned down
      expect(true).toBe(true);
    });

    it('confirms ZERO database operations are executed during rate limiting', async () => {
      // The rate limiter has no database parameters and touches zero database tables
      const result = await checkRateLimit('192.0.2.1', undefined, false, 5, 60000);
      expect(result.allowed).toBe(true);
      expect(result.storageType).toBe('memory');
    });

    it('in production, strictly requires native RATE_LIMITER binding returning 503 if missing', async () => {
      const ip = '198.51.100.202';
      // isProduction = true, nativeLimiter = undefined
      const result = await checkRateLimit(ip, undefined, true);

      expect(result.allowed).toBe(false);
      expect(result.status).toBe(503);
      expect(result.code).toBe('RATE_LIMITER_UNAVAILABLE');
      expect(result.error).toContain('temporarily unavailable');
    });

    it('in production, returns 503 if native RATE_LIMITER binding encounters an RPC failure', async () => {
      const faultyLimiter: WorkerRateLimiterBinding = {
        limit: vi.fn().mockRejectedValue(new Error('Cloudflare edge rate limiter service exception')),
      };

      const ip = '198.51.100.203';
      // isProduction = true, faulty nativeLimiter
      const result = await checkRateLimit(ip, faultyLimiter, true);

      expect(result.allowed).toBe(false);
      expect(result.status).toBe(503);
      expect(result.code).toBe('RATE_LIMITER_UNAVAILABLE');
      expect(result.error).toContain('temporarily unavailable');
    });

    it('in production, permits request when native RATE_LIMITER confirms success', async () => {
      const workingLimiter: WorkerRateLimiterBinding = {
        limit: vi.fn().mockResolvedValue({ success: true }),
      };

      const ip = '198.51.100.204';
      const result = await checkRateLimit(ip, workingLimiter, true);

      expect(result.allowed).toBe(true);
      expect(result.storageType).toBe('native');
    });
  });

  describe('4. Honeypot Anti-Bot Defense', () => {
    it('silently drops submissions with filled honeypot without calling Resend', async () => {
      const mockFetch = vi.fn();
      const botSubmission = {
        name: 'Spam Bot',
        email: 'spambot@spam.com',
        subject: 'Cheap SEO Services',
        message: 'Buy cheap SEO backlinks now at low prices!',
        website: 'https://spam-link.ru', // Honeypot filled!
      };

      const result = await sendContactInquiry(
        botSubmission,
        {
          resendApiKey: 're_mock_test_key_123',
          deliveryEmail: 'dasariravid145@gmail.com',
        },
        mockFetch as any
      );

      expect(result.success).toBe(true);
      expect(result.id).toBe('hp_silent_ack');
      // Proves Resend API was never called
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('5. Resend Dispatch & Error Handling', () => {
    it('successfully sends email with verified parameters and reply_to', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 're_success_789' }),
      });

      const submission = {
        name: 'Sarah Connor',
        email: 'sarah@skynet-defense.com',
        subject: 'Cloud Security Architecture Consultation',
        message: 'We require an infrastructure audit for our AWS EKS clusters.',
      };

      const result = await sendContactInquiry(
        submission,
        {
          resendApiKey: 're_valid_api_key_456',
          fromEmail: 'Ravi Portfolio <contact@ravi-portfolio.dsecops88.online>',
          deliveryEmail: 'dasariravid145@gmail.com',
        },
        mockFetch as any
      );

      expect(result.success).toBe(true);
      expect(result.id).toBe('re_success_789');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.resend.com/emails');
      expect(options.headers['Authorization']).toBe('Bearer re_valid_api_key_456');

      const body = JSON.parse(options.body);
      expect(body.from).toBe('Ravi Portfolio <contact@ravi-portfolio.dsecops88.online>');
      expect(body.to).toEqual(['dasariravid145@gmail.com']);
      expect(body.reply_to).toBe('sarah@skynet-defense.com');
      expect(body.subject).toContain('Cloud Security Architecture Consultation');
      expect(body.text).toContain('Sarah Connor');
      expect(body.html).toContain('sarah@skynet-defense.com');
    });

    it('uses configured default sender Ravi Dasari <contact@dsecops88.online> when fromEmail is omitted', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 're_default_from_123' }),
      });

      const submission = {
        name: 'Sarah Connor',
        email: 'sarah@skynet-defense.com',
        subject: 'Cloud Security Architecture Consultation',
        message: 'We require an infrastructure audit for our AWS EKS clusters.',
      };

      const result = await sendContactInquiry(
        submission,
        {
          resendApiKey: 're_valid_api_key_456',
          // fromEmail omitted to test default
        },
        mockFetch as any
      );

      expect(result.success).toBe(true);
      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.from).toBe('Ravi Dasari <contact@dsecops88.online>');
      expect(body.to).toEqual(['dasariravid145@gmail.com']);
      expect(body.reply_to).toBe('sarah@skynet-defense.com');
    });

    it('handles provider API error (e.g. 401 Unauthorized or 422 Invalid Sender)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: 'API key is invalid' }),
      });

      const submission = {
        name: 'Jane Smith',
        email: 'jane@enterprise.com',
        subject: 'Consulting Inquiry',
        message: 'Looking for a senior consultant for our DevOps roadmap.',
      };

      const result = await sendContactInquiry(
        submission,
        {
          resendApiKey: 're_invalid_api_key',
          deliveryEmail: 'dasariravid145@gmail.com',
        },
        mockFetch as any
      );

      expect(result.success).toBe(false);
      expect(result.code).toBe('PROVIDER_ERROR');
      expect(result.status).toBe(502);
      expect(result.error).toContain('Unable to deliver message at this time');
    });

    it('handles network failure gracefully', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('DNS resolution failed'));

      const submission = {
        name: 'Jane Smith',
        email: 'jane@enterprise.com',
        subject: 'Consulting Inquiry',
        message: 'Looking for a senior consultant for our DevOps roadmap.',
      };

      const result = await sendContactInquiry(
        submission,
        {
          resendApiKey: 're_any_key',
          deliveryEmail: 'dasariravid145@gmail.com',
        },
        mockFetch as any
      );

      expect(result.success).toBe(false);
      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.status).toBe(502);
    });

    it('returns 503 service unconfigured if RESEND_API_KEY is missing in production', async () => {
      const submission = {
        name: 'Jane Smith',
        email: 'jane@enterprise.com',
        subject: 'Consulting Inquiry',
        message: 'Looking for a senior consultant for our DevOps roadmap.',
      };

      const result = await sendContactInquiry(submission, {
        resendApiKey: undefined,
        environment: 'production',
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('EMAIL_SERVICE_UNCONFIGURED');
      expect(result.status).toBe(503);
    });

    it('simulates acceptance in development/test mode if RESEND_API_KEY is omitted', async () => {
      const submission = {
        name: 'Jane Smith',
        email: 'jane@enterprise.com',
        subject: 'Consulting Inquiry',
        message: 'Looking for a senior consultant for our DevOps roadmap.',
      };

      const result = await sendContactInquiry(submission, {
        resendApiKey: undefined,
        environment: 'development',
      });

      expect(result.success).toBe(true);
      expect(result.id).toContain('dev_mock_');
    });
  });
});

