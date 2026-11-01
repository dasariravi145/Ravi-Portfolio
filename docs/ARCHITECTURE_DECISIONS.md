# ARCHITECTURE_DECISIONS.md — Architecture Decisions & Trade-off Evaluations

**Project:** Ravi Dasari — Premium Dynamic Personal Portfolio  
**Target Domain:** `ravi-portfolio.dsecops88.online`  
**Current Phase:** Prompt 04 of 18 (Storage & Runtime Architecture)

---

## 1. Confirmed Architectural Decisions (ADR-01 to ADR-16)

### ADR-01: Deployment Target & Edge Compute Platform
- **Decision:** Cloudflare Workers ecosystem.
- **Rationale:** Ultra-low latency global distribution, zero cold-start overhead, seamless integration with Cloudflare R2, DDoS protection, edge caching, and cost efficiency.
- **Status:** CONFIRMED.

### ADR-02: Target Subdomain & DNS Management
- **Decision:** Custom subdomain `ravi-portfolio.dsecops88.online`.
- **Constraint:** Strictly isolated. Must not impact existing apex domain or other subdomains (e.g., `nexora.dsecops88.online` or DRK company properties).
- **Status:** CONFIRMED.

### ADR-03: Primary Storage Engine for Media & Content
- **Decision:** Cloudflare R2 Standard Object Storage for uploaded assets (images, PDFs, diagrams) and structured content state.
- **Constraint:** Zero egress fees, high availability, S3-compatible API.
- **Status:** CONFIRMED.

### ADR-04: Strict Light-Theme-Only Presentation
- **Decision:** The user interface will exclusively render a luxury light theme with crisp white (`#FFFFFF`), pearl white (`#F8FAFC`), sky/royal blue accents (`#2563EB`, `#38BDF8`), and emerald indicators (`#0D9488`).
- **Constraint:** Absolute prohibition of dark mode, dark toggles, dark hero sections, or dark cards.
- **Status:** CONFIRMED.

### ADR-05: Dynamic Zero-Code Content Management (Decoupled CMS)
- **Decision:** Public website content is decoupled from application code and build pipelines. Content changes executed through the Admin CMS reflect immediately without Git commits, rebuilds, or redeployment.
- **Status:** CONFIRMED.

### ADR-06: Strict Factual Integrity & Content Grounding
- **Decision:** All skills, experience, and project claims are anchored to verified facts:
  - **RoboShop:** DevSecOps pipeline and containerized e-commerce infrastructure only.
  - **Zynpath:** Strictly "Google Play Closed Testing Only".
  - **Mandi Ledger:** Verified Android business utility with live links.
  - **NEXORA:** Static interactive e-commerce demo (`https://nexora.dsecops88.online`) with no live AI backend or real payment checkout.
  - **AI Automation:** Strict four-state classification (`Verified Live`, `Working Prototype`, `In Active Development`, `Planned Capability`).
- **Status:** CONFIRMED.

### ADR-07: Project Workspace Isolation
- **Decision:** Dedicated workspace strictly at `D:\Projects\Ravi-Portfolio`.
- **Constraint:** Zero reads/writes to adjacent project directories in `D:\Projects`.
- **Status:** CONFIRMED.

### ADR-08: Phased 18-Prompt Execution Protocol
- **Decision:** Strict waterfall gate between 18 sequential prompts. No jumping ahead without owner review.
- **Status:** CONFIRMED.

### ADR-09: Application Framework & Edge Runtime Selection
- **Decision:** Adopt **Hono Edge API + Vite React SPA** deployed to Cloudflare Workers with Cloudflare Static Asset handling.
- **Rationale:**
  - Evaluated against Next.js (OpenNext), Remix, and Astro.
  - Next.js via OpenNext requires polyfills for Node APIs and produces large worker bundles (>2.5MB), risking cold starts and Cloudflare free tier memory/size limits.
  - Vite React SPA + Hono compiles to a razor-thin Worker (<150KB) with sub-10ms edge execution, zero polyfills, zero hydration mismatch bugs, and standard TypeScript interfaces.
  - Public pages are statically prerendered or client-hydrated with instant global CDN caching.
- **Status:** CONFIRMED.

### ADR-10: Single-Owner Concurrency & State Coordination Model
- **Decision:** Use **Optimistic Concurrency Control (OCC) with R2 ETags and Integer Versioning**. Do **NOT** introduce Cloudflare Durable Objects.
- **Rationale:**
  - Cloudflare Durable Objects mandate a Workers Paid subscription ($5.00/month).
  - As a single-owner administrative portfolio, write contention is virtually non-existent.
  - OCC via conditional writes (`onlyIf: { etagMatches: ... }`) or version checking completely eliminates race conditions and lost updates without recurring fees.
  - Pre-mutation snapshot backups (`backups/${collection}-${timestamp}-v${version}.json`) ensure 100% data recoverability.
- **Status:** CONFIRMED.

### ADR-11: Admin Authentication Architecture
- **Decision:** Built-in **Standalone Edge Authentication** using Web Crypto PBKDF2 password verification + HMAC-SHA256 signed `HttpOnly; Secure; SameSite=Strict` session cookies, with optional Cloudflare Zero Trust Access overlay.
- **Rationale:** Self-contained within the Worker, operates seamlessly across local dev (`wrangler dev`) and production without external dependencies or subscription lock-in.
- **Status:** CONFIRMED.

### ADR-12: Resume Format Policy (PDF Exclusivity)
- **Decision:** Strictly **PDF (`application/pdf`) Only** for published resume storage, viewing, and public downloading. DOCX format is **strictly disallowed** for published assets.
- **Rationale:** DOCX cannot be rendered inside web viewports without third-party iframe proxies (Google/Microsoft), breaks typography across different Word/LibreOffice versions, and poses security/macro liabilities.
- **Status:** CONFIRMED.

### ADR-13: Draft Content Privacy & Isolation
- **Decision:** Draft projects (`published: false`) are strictly omitted from `/api/public/content` and return HTTP `404 Not Found` on `/api/public/projects/:slug`.
- **Rationale:** Guarantees zero leakage of unreleased projects, internal notes, or unpublished case studies to web crawlers or public users.
- **Status:** CONFIRMED.

### ADR-14: Cloudflare Billing & Cost Governance
- **Decision:** Free tier operations guaranteed under all traffic scenarios ($0.00/month). Acknowledge that Cloudflare requires an active payment card profile to initialize R2 buckets in the dashboard.
- **Status:** CONFIRMED.

### ADR-15: Domain-Partitioned R2 JSON Storage Model
- **Decision:** Partition content by domain collection (`content/profile.json`, `content/projects.json`, `content/skills.json`, etc.) with unified public edge aggregation.
- **Rationale:** Prevents cross-domain write contention (editing skills never collides with editing projects) while maintaining sub-15ms public reads via edge-cached unified JSON.
- **Status:** CONFIRMED.

### ADR-16: Binary Magic Byte Validation & SVG Sanitization Policy
- **Decision:** Enforce server-side ArrayBuffer magic byte verification for all uploads (`%PDF-`, PNG, JPEG, WebP) and strict XML script-stripping for SVGs.
- **Rationale:** Completely blocks renamed executable payloads (e.g. `malware.exe` renamed to `image.png`) from being stored in R2.
- **Status:** CONFIRMED.

---

## 2. Technical Evaluation: R2 JSON State Management vs Concurrency

The architecture uses domain-partitioned structured JSON objects stored in Cloudflare R2 Standard Object Storage:

### Concurrency & Collision Risks Solved
1. **Optimistic Concurrency Control (OCC):** The CMS sends the current ETag in the `If-Match` header on write mutations. If a concurrent edit has occurred, the Worker's conditional write (`onlyIf: { etagMatches }`) fails and returns HTTP `409 Conflict`, prompting the admin to refresh.
2. **Automated Point-in-Time Backups:** Before every write mutation, the Worker copies the live JSON to `backups/${collection}-${timestamp}-v${version}.json`.
3. **Strict Schema Gate:** Inbound payloads must pass Zod schema validation before touching R2 storage.

---

## 3. Media Asset Lifecycle & Garbage Collection

- **Superseded Asset Cleanup:** Uploading a new profile avatar or resume immediately purges the previous object from R2 via `R2.delete()`.
- **Project Deletion Cleanup:** Deleting a project triggers asynchronous removal of its cover image and screenshots from R2.

---

## 4. Public Caching & Invalidation Protocol

- **Edge Caching:** Public endpoints return `Cache-Control: public, max-age=120, s-maxage=86400, stale-while-revalidate=3600`.
- **Instant Invalidation:** Every admin save mutation executes a cache purge via the Cloudflare Worker Cache API (`caches.default.delete()`), ensuring public visitors see updates immediately.

---

## 5. Open Technical Decisions Requiring Owner Review

1. **Initial Resume Data Seeding:** Awaiting the owner's actual verified resume document to populate the initial portfolio records in Prompt 05/06.
2. **Cloudflare Account Billing Profile:** Reminder that Cloudflare requires an active card on file to provision R2 buckets, even though usage remains within the free tier.
