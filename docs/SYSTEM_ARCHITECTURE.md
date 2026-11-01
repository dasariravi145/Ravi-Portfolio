# SYSTEM_ARCHITECTURE.md — Master Technical Architecture

**Project:** Ravi Dasari — Premium Dynamic Personal Portfolio  
**Target Domain:** `ravi-portfolio.dsecops88.online`  
**Current Milestone:** Prompt 04 of 18 (Storage & Runtime Architecture)  
**Security Classification:** Highly Confidential / Owner-Admin Protected  

---

## 1. Architecture Overview & High-Level Topology

The system is designed as an ultra-fast, serverless, edge-native web application deployed on **Cloudflare Workers**. It decouples public portfolio delivery from dynamic administrative content management. All content mutations occur via a secure Admin CMS and persist in **Cloudflare R2 Standard Object Storage** using a **Domain-Partitioned Storage Model** with Optimistic Concurrency Control (OCC) and automated snapshot versioning.

```mermaid
graph TD
    subgraph ClientLayer ["Client Presentation Layer (Light-Only Theme)"]
        PublicUser["Public Visitor (Desktop / Mobile)"]
        AdminUser["Ravi Dasari (Admin CMS)"]
    end

    subgraph EdgeLayer ["Cloudflare Edge Network (ravi-portfolio.dsecops88.online)"]
        CF_DNS["Cloudflare DNS & DDoS Shield"]
        CF_Cache["Cloudflare Edge Cache (Aggregated Content API)"]
        Worker["Cloudflare Worker Runtime (Hono Edge API + Static Assets)"]
    end

    subgraph SecurityLayer ["Security & Authentication Boundary"]
        AuthGuard["Admin Auth Middleware (PBKDF2 / HMAC-SHA256 Cookie)"]
        RateLimiter["Rate Limiter & Input Sanitizer (Zod)"]
        OCC_Engine["OCC & ETag Validation Engine (R2 onlyIf Preconditions)"]
    end

    subgraph StorageLayer ["Cloudflare R2 Standard Storage Bucket"]
        R2_Partitioned["r2://portfolio-data/content/*.json (Profile, Projects, Skills...)"]
        R2_Backups["r2://portfolio-data/backups/*-v*.json"]
        R2_Media["r2://portfolio-data/media/ (Images, Resumes, Diagrams)"]
    end

    PublicUser -->|HTTPS GET| CF_DNS
    CF_DNS --> CF_Cache
    CF_Cache -->|Cache Miss| Worker
    Worker -->|Read Published Data| R2_Partitioned
    Worker -->|Read Media| R2_Media

    AdminUser -->|HTTPS POST/PUT/DELETE| CF_DNS
    CF_DNS --> Worker
    Worker --> AuthGuard
    AuthGuard --> RateLimiter
    RateLimiter --> OCC_Engine
    OCC_Engine -->|1. Snapshot Pre-Mutation| R2_Backups
    OCC_Engine -->|2. Conditional Write (onlyIf)| R2_Partitioned
    OCC_Engine -->|3. Purge Edge Cache| CF_Cache
    RateLimiter -->|Upload/Delete Files| R2_Media
```

---

## 2. Framework & Runtime Evaluation

We evaluated four candidate runtime frameworks against performance, bundle size, edge compatibility, routing simplicity, and zero-code CMS demands:

| Framework Candidate | Edge Compatibility | Bundle Size | SSR / Dynamic Routing | Free-Tier Fit | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Option A: Next.js + OpenNext** | Moderate (shimmed Node APIs) | Large (often >2.5MB) | Heavy cold start | Risky on 10MB worker script limit | **Not Recommended:** Unnecessary complexity and polyfill risks on Cloudflare Workers. |
| **Option B: Remix / React Router v7** | Excellent (native Web standard) | Moderate (~800KB) | Full SSR & Action loaders | Good | **Viable Alternative:** Excellent for forms and SSR, but heavier than needed. |
| **Option C: Astro (SSR Cloudflare Adapter)** | High (minimal client JS) | Small (<500KB) | Fast SSR & Islands | Excellent | **Strong Contender:** Superb for content sites, but dual-state client-side CMS requires nested React islands. |
| **Option D: Hono Edge API + Vite React SPA (Approved)** | **Flawless (0 polyfills, pure Web Standards)** | **Extremely Tiny (<150KB worker, static SPA)** | **Instant static delivery + sub-10ms API edge execution** | **100% Free-Tier Safe** | **SELECTED ARCHITECTURE:** Ultimate reliability, zero runtime bloat, standard TypeScript, deterministic deployment. |

### Architectural Decision on Framework:
We adopt **Hono + Vite React SPA / Cloudflare Worker Static Assets**:
1. **Public Engine:** Vite React SPA with static prerendering/hydration, serving HTML/CSS/JS assets directly from Cloudflare Edge with maximum cache headers.
2. **Backend API:** Built on **Hono** running inside the Cloudflare Worker, exposing `/api/*` endpoints for public content delivery, authentication, and admin CMS mutations.
3. **Routing:** Client-side routing via React Router with HTML5 pushState fallback handled by the Worker (`/* -> index.html`).
4. **Dynamic Metadata & SEO:** The Worker intercepts public crawlers (Googlebot, Twitterbot, LinkedInBot, etc.) at `/projects/:slug` and injects dynamic Open Graph tags into the root HTML before streaming to the client.

---

## 3. Storage Architecture: Domain-Partitioned R2 JSON

The owner strictly requested avoiding traditional SQL databases while maintaining rock-solid dynamic CMS capabilities.

```
                              [Incoming CMS Write Request]
                                           |
                                [Verify Auth & CSRF]
                                           |
                      [Fetch Target Collection & Active ETag]
                                           |
                       [Does Incoming If-Match == Active ETag?]
                                    /              \
                                  YES               NO
                                  /                   \
                   [Validate Zod Schema]        [Return HTTP 409 Conflict]
                            |                   (Prompt Admin: "State has changed,
               [Create Snapshot in backups/]     please reload before saving")
                            |
           [R2.put(key, val, { onlyIf: { etagMatches } })]
                            |
                 [Was result non-null?]
                    /              \
                  YES               NO (Concurrent collision)
                  /                   \
           [Purge Edge Cache]     [Return HTTP 409 Conflict]
                  |
        [Return HTTP 200 OK]
```

#### Why Domain-Partitioned R2 JSON is the Optimal Choice:
1. **Domain Write Isolation:** Editing a project mutates `content/projects.json` without touching `content/skills.json` or `content/profile.json`.
2. **Deterministic Locking without Paid Durable Objects:** Native R2 conditional writes (`onlyIf: { etagMatches }`) eliminate lost-update hazards on the Cloudflare Free Tier.
3. **Instant Backups:** Every mutation copies the current state to `backups/${collection}-${timestamp}-v${version}.json` prior to committing changes.
4. **Zero Database Migrations:** No schema migration scripts, no connection pools, no socket timeouts, no database pause/resume cold starts.
5. **Portability:** Entire collections can be downloaded or exported with a single click.

---

## 4. Draft vs. Published Content Isolation

A critical requirement is ensuring unpublished projects, draft case studies, or hidden skills are **never exposed** to public visitors, search engines, or network sniffers.

### Security & Delivery Isolation
- **Separate Endpoints:**
  - `GET /api/public/content` -> In-memory aggregation of all collections stripping items where `published === false` or `status === "draft"`. Edge cached and stripped of administrative metadata.
  - `GET /api/public/projects/:slug` -> If the requested project has `published === false`, returns HTTP `404 Not Found`.
  - `GET /api/admin/projects` -> Requires valid Admin session cookie; returns the complete state tree including drafts, internal notes, backup logs, and version counters.
- **Direct Asset Privacy:**
  - Media uploaded for draft projects uses a non-indexed path with `X-Robots-Tag: noindex`.

---

## 5. Caching and Invalidation Pipeline

To achieve sub-second page loads globally without serving stale data after CMS edits:

1. **Edge Cache Configuration:**
   - `/api/public/content`: `Cache-Control: public, max-age=120, s-maxage=86400, stale-while-revalidate=3600`.
   - `/media/*`: `Cache-Control: public, max-age=31536000, immutable`.
2. **Instant Cache Purge via Cloudflare API:**
   - When the admin executes any write mutation (save profile, add project, update skills), the Worker automatically invokes Cloudflare Cache Purge for the `/api/public/content` URL and affected detail routes via Worker Cache API (`caches.default.delete(request)`).
   - Public visitors immediately see fresh content on their next request.

---

## 6. Dynamic Route Handling & Crawlers

- For client-side dynamic routes (e.g., `https://ravi-portfolio.dsecops88.online/projects/roboshop`):
  - When a standard browser requests the URL, the Worker returns `index.html`, and React Router loads the project from cached state or `/api/public/projects/roboshop`.
  - When an automated crawler (detected via `User-Agent` regex matching `Googlebot|Twitterbot|facebookexternalhit|LinkedInBot|Slackbot`) requests the URL, the Worker reads `content/projects.json`, extracts the project's title, description, cover image, and canonical URL, and renders a server-synthesized HTML response with complete OpenGraph `<meta>` tags and JSON-LD schema markup.

---

## 7. Media Asset Lifecycle & Garbage Collection

- **Upload Pipeline:** Pre-flight validation in the Worker (MIME type magic bytes + size limit) -> R2 Put Object -> Return public CDN asset URL.
- **Replacement & Deletion Protocol:**
  - When a profile photo is replaced: Worker puts new photo `media/avatars/avatar-${uuid}.webp`, updates `content/profile.json`, and immediately deletes the previous avatar object from R2.
  - When a resume is replaced: Worker puts new PDF `media/resume/active/Ravi_Dasari_Resume.pdf`, updates pointer, and archives the previous PDF to `media/resume/archive/`.
  - When a project is deleted: Worker deletes the project entry from JSON and asynchronously sweeps and removes associated cover images and screenshot keys from R2.
