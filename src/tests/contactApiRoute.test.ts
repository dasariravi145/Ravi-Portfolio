import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryStorageAdapter } from '../storage/r2StorageAdapter';
import { createPortfolioApp } from '../worker/api';
import { resetRateLimits } from '../services/contactService';

describe('Public Contact API Route (/api/public/contact)', () => {
  let adapter: MemoryStorageAdapter;
  let app: ReturnType<typeof createPortfolioApp>;

  beforeEach(() => {
    resetRateLimits();
    adapter = new MemoryStorageAdapter();
    app = createPortfolioApp(adapter);
    vi.restoreAllMocks();
  });

  it('1. returns 200 and success message on valid submission in development', async () => {
    const res = await app.request('/api/public/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'cf-connecting-ip': '1.2.3.4',
      },
      body: JSON.stringify({
        name: 'Michael Scott',
        email: 'michael.scott@dundermifflin.com',
        subject: 'Enterprise Cloud Architecture Engagement',
        message: 'We are expanding our Kubernetes infrastructure across multiple AWS regions.',
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.message).toContain('Your message has been sent successfully');
  });

  it('2. returns 400 with detailed field validation errors on invalid input', async () => {
    const res = await app.request('/api/public/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'cf-connecting-ip': '1.2.3.5',
      },
      body: JSON.stringify({
        name: 'M', // too short
        email: 'not-an-email',
        subject: '',
        message: 'Short',
      }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.details).toBeDefined();
    expect(body.details.name).toBeDefined();
    expect(body.details.email).toBeDefined();
    expect(body.details.subject).toBeDefined();
    expect(body.details.message).toBeDefined();
  });

  it('3. returns 400 on malformed JSON payload', async () => {
    const res = await app.request('/api/public/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'cf-connecting-ip': '1.2.3.6',
      },
      body: '{ invalid-json-payload',
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
    expect(body.code).toBe('BAD_REQUEST');
  });

  it('4. enforces rate limit and returns 429 when threshold exceeded', async () => {
    const ip = '198.51.100.99';
    const validBody = JSON.stringify({
      name: 'Pam Beesly',
      email: 'pam@dundermifflin.com',
      subject: 'DevSecOps Project',
      message: 'Looking for a cloud infrastructure audit for our systems.',
    });

    // 5 requests allowed
    for (let i = 0; i < 5; i++) {
      const res = await app.request('/api/public/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': ip,
        },
        body: validBody,
      });
      expect(res.status).toBe(200);
    }

    // 6th request should be blocked
    const blockedRes = await app.request('/api/public/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'cf-connecting-ip': ip,
      },
      body: validBody,
    });

    expect(blockedRes.status).toBe(429);
    expect(blockedRes.headers.get('Retry-After')).toBeDefined();
    const blockedBody = (await blockedRes.json()) as any;
    expect(blockedBody.success).toBe(false);
    expect(blockedBody.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('5. triggers honeypot silently returning 200 without sending email', async () => {
    const res = await app.request('/api/public/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'cf-connecting-ip': '1.2.3.7',
      },
      body: JSON.stringify({
        name: 'Bot User',
        email: 'bot@automated-spam.com',
        subject: 'SEO Services Offer',
        message: 'This is spam content that should be silently dropped.',
        website: 'https://spam-domain.com', // Honeypot filled
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.id).toBe('hp_silent_ack');
  });

  it('6. integrates with Cloudflare native RATE_LIMITER binding returning 429 when triggered', async () => {
    const mockNativeLimiter = {
      limit: vi.fn().mockResolvedValue({ success: false }),
    };

    const res = await app.request(
      '/api/public/contact',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': '1.2.3.99',
        },
        body: JSON.stringify({
          name: 'Jane Doe',
          email: 'jane@enterprise.com',
          subject: 'Security Assessment',
          message: 'Inquiry message for cloud security architecture.',
        }),
      },
      {
        RATE_LIMITER: mockNativeLimiter as any,
      }
    );

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('60');
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
    expect(body.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(mockNativeLimiter.limit).toHaveBeenCalledTimes(1);
  });

  it('7. verifies ZERO database operations are invoked during contact submission (zero PII/rate limit in D1)', async () => {
    const d1PutSpy = vi.spyOn(adapter, 'put');
    const d1GetSpy = vi.spyOn(adapter, 'get');

    const res = await app.request('/api/public/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'cf-connecting-ip': '1.2.3.100',
      },
      body: JSON.stringify({
        name: 'Privacy Audit',
        email: 'audit@security.org',
        subject: 'Zero Database Persistence Audit',
        message: 'Verifying that contact form submissions never write to D1 database.',
      }),
    });

    expect(res.status).toBe(200);
    // D1 adapter was never touched!
    expect(d1PutSpy).not.toHaveBeenCalled();
    expect(d1GetSpy).not.toHaveBeenCalled();
  });

  it('8. strictly enforces 5 request limit across concurrent burst API requests', async () => {
    const burstIp = '198.51.100.222';
    const validPayload = JSON.stringify({
      name: 'Concurrent Tester',
      email: 'tester@enterprise.com',
      subject: 'Concurrency Stress Test',
      message: 'Testing rate limiter under simultaneous concurrent burst traffic.',
    });

    const requests = Array.from({ length: 10 }, () =>
      app.request('/api/public/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': burstIp,
        },
        body: validPayload,
      })
    );

    const responses = await Promise.all(requests);
    const successResponses = responses.filter((r) => r.status === 200);
    const rateLimitedResponses = responses.filter((r) => r.status === 429);

    expect(successResponses.length).toBe(5);
    expect(rateLimitedResponses.length).toBe(5);

    for (const r of rateLimitedResponses) {
      expect(r.headers.get('Retry-After')).toBeDefined();
      const body = (await r.json()) as any;
      expect(body.code).toBe('RATE_LIMIT_EXCEEDED');
    }
  });

  it('9. in production, returns 503 SERVICE_UNAVAILABLE if RATE_LIMITER binding is missing', async () => {
    const res = await app.request(
      '/api/public/contact',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': '1.2.3.101',
        },
        body: JSON.stringify({
          name: 'Jane Doe',
          email: 'jane@enterprise.com',
          subject: 'Production Security Test',
          message: 'Verifying that missing rate limiter binding returns 503 in production.',
        }),
      },
      {
        ENVIRONMENT: 'production',
        RESEND_API_KEY: 're_mock_key_123',
        ADMIN_SESSION_SECRET: '9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0',
      }
    );

    expect(res.status).toBe(503);
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
    expect(body.code).toBe('SERVICE_UNAVAILABLE');
    expect(body.error).toContain('temporarily unavailable');
  });

  it('10. in production, returns 503 SERVICE_UNAVAILABLE if RATE_LIMITER binding throws an error', async () => {
    const faultyNativeLimiter = {
      limit: vi.fn().mockRejectedValue(new Error('Cloudflare edge rate limiter RPC failure')),
    };

    const res = await app.request(
      '/api/public/contact',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': '1.2.3.102',
        },
        body: JSON.stringify({
          name: 'Jane Doe',
          email: 'jane@enterprise.com',
          subject: 'Production Security Test',
          message: 'Verifying that failing rate limiter binding returns 503 in production.',
        }),
      },
      {
        ENVIRONMENT: 'production',
        RESEND_API_KEY: 're_mock_key_123',
        ADMIN_SESSION_SECRET: '9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0',
        RATE_LIMITER: faultyNativeLimiter as any,
      }
    );

    expect(res.status).toBe(503);
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
    expect(body.code).toBe('SERVICE_UNAVAILABLE');
    expect(body.error).toContain('temporarily unavailable');
  });
});

