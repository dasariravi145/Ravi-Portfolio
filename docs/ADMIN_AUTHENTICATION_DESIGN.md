# ADMIN_AUTHENTICATION_DESIGN.md — Secure Single-Owner Authentication Specification

**Project:** Ravi Dasari — Premium Dynamic Personal Portfolio  
**Target Domain:** `ravi-portfolio.dsecops88.online`  
**Current Milestone:** Prompt 04 of 18 (Storage & Runtime Architecture)  
**Security Standard:** Zero-Trust Edge Authentication & Cryptographic Session Integrity  

---

## 1. Authentication Architecture Evaluation

We conducted a thorough technical evaluation of candidate authentication strategies for the single-owner Admin CMS:

| Architectural Metric | Option A: Cloudflare Zero Trust (Access) | Option B: Standalone Edge Auth (Web Crypto + Cookies) | Option C: Hybrid Edge Model (Recommended) |
| :--- | :--- | :--- | :--- |
| **Security Posture** | Enterprise OTP / Hardware Key | Strong PBKDF2 (100k rounds) + HMAC token | **Defense-in-Depth (Physical 2FA + Native Worker Auth)** |
| **Recurring Cost** | Free up to 50 users | **$0.00 / month (Native in Worker)** | **$0.00 / month** |
| **Local Testing (`wrangler dev`)** | Complex (Requires mock headers/tunnel) | **Trivial & Native (Runs 100% offline)** | **Seamless Local Dev via Option B** |
| **Worker Independence** | Bound to external Cloudflare org | **Completely self-contained in Worker** | **Portable with optional edge layer** |
| **Logout & Revocation** | Relies on Cloudflare Access session | Instant cryptographic cookie invalidation | Instant session revocation in Worker |
| **Account Recovery** | Email inbox OTP | CLI emergency password hash reset | Multiple redundant recovery paths |

### Architectural Decision: Hybrid Edge Authentication
1. **Primary Core Auth (Mandatory):** The Cloudflare Worker natively implements **Standalone Edge Authentication** using Web Crypto PBKDF2 password verification and HMAC-SHA256 signed session cookies. This guarantees the CMS is secure across all environments (local development, preview branches, and production) without external dependencies.
2. **Optional Edge Shield (Recommended for Production):** The owner can optionally overlay **Cloudflare Access** in the Cloudflare Dashboard to require an email OTP before reaching `/admin*`. When active, the Worker verifies the `Cf-Access-Jwt-Assertion` header in addition to its internal session cookie.

---

## 2. Cryptographic Session & Token Specifications

### 2.1 Password Hashing Standard
* **Algorithm:** PBKDF2 with SHA-256.
* **Iterations:** 100,000 rounds.
* **Salt:** 16-byte cryptographically secure random buffer generated via `crypto.getRandomValues()`.
* **Hash Format:** Stored in Worker encrypted secrets as:
  `$pbkdf2$100000$<salt-hex>$<derived-key-hex>`
* **Verification:** Constant-time buffer comparison (`crypto.subtle.timingSafeEqual`) to prevent timing side-channel attacks.

### 2.2 Session Cookie Construction
* **Cookie Name:** `portfolio_admin_session`
* **Flags:** `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=1209600` (14 days validity)
* **Token Structure:** Two-part token string: `<Base64URL(Payload)>.<Base64URL(HMAC-SHA256-Signature)>`
* **Payload Fields:**
  ```json
  {
    "sub": "ravi-dasari",
    "role": "owner",
    "jti": "d3b07384-d113-4a8f-9a2d-0234a5d8f011",
    "iat": 1730340000,
    "exp": 1731549600,
    "fingerprint": "a4f89c... (SHA-256 of User-Agent + IP /24 subnet)"
  }
  ```
* **Signing Key:** 256-bit secret stored in Worker environment variable `SESSION_SECRET`.

---

## 3. Route Protection & Authorization Matrix

```mermaid
graph TD
    Request["Incoming HTTP Request"] --> CheckRoute{"Route Pattern"}
    
    CheckRoute -->|/api/public/* or /projects/*| PublicAllow["Allow Public (Cache Headers Applied)"]
    CheckRoute -->|/admin* or /api/admin/*| AuthGate["Admin Authentication Middleware"]
    
    AuthGate --> CheckAccessHeader{"Has Cf-Access-Jwt-Assertion?"}
    CheckAccessHeader -->|Yes| VerifyAccessJWT["Validate Cloudflare Access Certs"]
    CheckAccessHeader -->|No / Local| CheckCookie{"Has portfolio_admin_session Cookie?"}
    
    VerifyAccessJWT --> CheckCookie
    CheckCookie -->|No Cookie| Return401["Return HTTP 401 Unauthorized / Redirect /admin/login"]
    CheckCookie -->|Cookie Present| VerifyHMAC["Recalculate HMAC-SHA256 with SESSION_SECRET"]
    
    VerifyHMAC -->|Invalid / Tampered| ExpireCookie["Clear Cookie & Return HTTP 401"]
    VerifyHMAC -->|Expired| ExpireCookie
    VerifyHMAC -->|Valid| CheckCSRF{"Is Mutation (POST/PUT/DELETE)?"}
    
    CheckCSRF -->|No (GET)| AllowAdmin["Authorize Admin Access (200 OK)"]
    CheckCSRF -->|Yes| VerifyCSRFHeader{"Has X-Portfolio-Admin-Action: 1 & Origin Match?"}
    
    VerifyCSRFHeader -->|Mismatch| Return403["Reject: HTTP 403 Forbidden (CSRF Failed)"]
    VerifyCSRFHeader -->|Match| AllowAdmin
```

---

## 4. Multi-Layered CSRF & Origin Defense

To guarantee absolute immunity against Cross-Site Request Forgery:
1. **`SameSite=Strict` Cookie:** Browsers refuse to attach the session cookie on any cross-site navigation, link click, or third-party iframe embed.
2. **Mandatory Custom Header:** All write endpoints require the request header:
   `X-Portfolio-Admin-Action: 1`
   Because cross-origin HTML forms (`<form>`) cannot set custom HTTP headers, any cross-origin script attempt triggers a CORS preflight (`OPTIONS`) request.
3. **Origin & Referer Enforcement:** The Worker validates that `request.headers.get("Origin")` strictly matches `https://ravi-portfolio.dsecops88.online` (or `http://localhost:8787` in dev).

---

## 5. Rate Limiting & Brute-Force Safeguards

* **Login Endpoint (`POST /api/admin/auth/login`):**
  - Tracked via in-memory sliding window or Cloudflare Worker KV / IP rate limiter.
  - **Threshold:** Maximum **5 failed attempts per 15 minutes** per client IP.
  - Exceeding the threshold triggers HTTP `429 Too Many Requests` with `Retry-After: 900`.
* **Public Contact Form (`POST /api/public/contact`):**
  - Maximum **5 submissions per hour** per IP.
  - Requires valid Cloudflare Turnstile token verified server-side against Cloudflare API.

---

## 6. Local Development Authentication Workflow

To ensure developers can test admin features without internet access or Cloudflare dashboard accounts:
1. In local development (`wrangler dev`), environment variables are loaded from `.dev.vars` (git-ignored):
   ```ini
   SESSION_SECRET="local-dev-secret-key-32-characters-minimum"
   ADMIN_PASSWORD_HASH="$pbkdf2$100000$local_salt$local_derived_hash"
   ```
2. The developer logs in at `http://localhost:8787/admin/login` using the local password.
3. The Worker signs the cookie locally with Web Crypto API and allows full CRUD testing against Miniflare local R2 storage.

