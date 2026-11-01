# RELEASE_MANIFEST.md — Stage A Release Candidate Manifest

**Project:** Ravi Dasari — Premium Dynamic Personal Portfolio  
**Target Domain:** `ravi-portfolio.dsecops88.online`  
**Milestone:** Prompt 18 of 18 (Final Engineering Audit & Release Approval)  
**Release Candidate Version:** `v1.0.0-rc.1`  
**Date:** October 31, 2026  
**Status:** **STAGE A COMPLETE — LOCAL READINESS VERIFIED**  

---

## 1. Application & Build Verification
- **Framework:** React 18 + Vite + Hono (Cloudflare Workers Static Assets)
- **TypeScript:** Strict typecheck passing (`tsc --noEmit` -> 0 errors)
- **Lint / Bundler:** Strict development & production bundling passing (`vite build` -> 0 warnings)
- **Automated Tests:** **309 / 309 tests passing across 14 test suites (100% pass rate)**
- **Static Assets:** 18 assets generated in `./dist` (Total upload: 405.35 KiB / gzip: 73.42 KiB)
  - `dist/index.html`: 1.62 kB
  - `dist/assets/index-CnyBeIzL.css`: 53.30 kB (gzip: 9.24 kB)
  - `dist/assets/index-B3qaJXAY.js`: 141.31 kB (gzip: 32.00 kB)
  - `dist/assets/vendor-react-C3o6vuFk.js`: 164.73 kB (gzip: 53.89 kB)

---

## 2. Required Cloudflare Bindings & Environments
- **Worker Script:** `src/worker/index.ts`
- **Compatibility Date:** `2024-10-01`
- **Compatibility Flags:** `["nodejs_compat"]`
- **Static Assets Binding:** `assets = { directory = "./dist", binding = "ASSETS" }`
- **R2 Storage Binding:**
  - `binding = "PORTFOLIO_BUCKET"`
  - `bucket_name = "portfolio-data"`
- **Worker Runtime Variables (`[vars]` in `wrangler.toml`):**
  - `ENVIRONMENT = "production"`
  - `PUBLIC_DOMAIN = "ravi-portfolio.dsecops88.online"`
  - `CF_ACCESS_TEAM_DOMAIN = "https://dsecops88.cloudflareaccess.com"`
  - `CF_ACCESS_OWNER_EMAIL = "dasariravid145@gmail.com"`

---

## 3. Required Production Secrets (Names Only — To Be Set in Stage B)
In accordance with zero-trust security rules, secrets are never stored in source files or git. They must be provisioned on Cloudflare Workers via `wrangler secret put`:
1. `CF_ACCESS_AUD` — The unique Application Audience Tag from Cloudflare Zero Trust.
2. `CF_ACCESS_SECRET` — The cryptographic signing secret or public cert used to verify Cloudflare Access JWTs.
3. `ADMIN_API_SECRET` — Emergency fallback administrative token (min 32 characters).

---

## 4. Cloudflare Access Prerequisites (To Be Configured in Stage B)
- **Access Application Type:** Self-hosted Web Application
- **Application Domain:** `ravi-portfolio.dsecops88.online/admin*` (and `/api/admin*`)
- **Access Policy:**
  - Rule Action: `Allow`
  - Include: Specific email `dasariravid145@gmail.com`
- **Session Duration:** 24 Hours

---

## 5. Domain & DNS Isolation Plan
- **Planned Subdomain:** `ravi-portfolio.dsecops88.online`
- **DNS Record:** CNAME or Cloudflare Worker Custom Domain mapping to `ravi-portfolio`.
- **Isolation Guarantee:**
  - `https://dsecops88.online` (Corporate DRK Website) — **100% Isolated / Untouched**.
  - `https://nexora.dsecops88.online` (NEXORA Showcase Demo) — **100% Isolated / Untouched**.

---

## 6. Pre-Deployment Backup & Rollback Protocol
1. **Pre-Mutation Snapshots:** Storage mutations in R2 automatically create snapshot objects in `backups/*.json`.
2. **Cold Storage Export:** State can be exported at any time via `adapter.exportState()` into a JSON manifest.
3. **Rollback Strategy:**
   - If a live worker deployment fails: Roll back immediately to the previous deployment via Cloudflare Dashboard or `npx wrangler rollback`.
   - If R2 storage state becomes corrupt: Restore previous snapshot from `backups/*.json` using `adapter.importState()`.

---

## 7. Remaining Cloud-Only Checks (Awaiting Stage B Owner Authorization)
- [ ] Create Cloudflare R2 bucket `portfolio-data`.
- [ ] Configure Cloudflare Zero Trust Access Application for `ravi-portfolio.dsecops88.online/admin*`.
- [ ] Provision production secrets (`CF_ACCESS_AUD`, `CF_ACCESS_SECRET`, `ADMIN_API_SECRET`).
- [ ] Execute `npx wrangler deploy`.
- [ ] Map custom domain `ravi-portfolio.dsecops88.online`.
- [ ] Run live post-deployment smoke test.

