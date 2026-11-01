# API_DESIGN.md — RESTful Edge API Contract & Endpoint Specifications

**Project:** Ravi Dasari — Premium Dynamic Personal Portfolio  
**Target Domain:** `ravi-portfolio.dsecops88.online`  
**Current Milestone:** Prompt 02 of 18 (System Architecture Planning)  

---

## 1. API Architecture & Standards

All endpoints are hosted on the Cloudflare Worker runtime under `/api/*`. The API strictly adheres to REST principles, JSON payloads, and standard HTTP status codes.

### Global Headers & Conventions
* **Authentication:** Cookie-based session token (`portfolio_admin_session=...`) with `HttpOnly`, `Secure`, `SameSite=Strict`.
* **Concurrency Control:** Mutations on root content require the `If-Match: "<etag>"` request header. Responses return `ETag: "<etag>"`.
* **Standard Error Envelope:**
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT_DETECTED",
    "message": "Content has been modified by another session. Please reload before saving.",
    "details": null
  }
}
```

---

## 2. Public Endpoints (Read-Only & High Cacheability)

### 2.1 Get Published Portfolio Content
* **Route:** `GET /api/public/content`
* **Access:** Public (No Auth)
* **Cache Headers:** `Cache-Control: public, max-age=120, s-maxage=86400, stale-while-revalidate=3600`
* **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "profile": { ... },
    "resume": { "activeResume": { "url": "..." }, "lastUpdated": "..." },
    "skillCategories": [ ... ],
    "skills": [ ... ],
    "projects": [ /* Strictly published projects only, sorted by displayOrder */ ],
    "experience": [ ... ],
    "certifications": [ ... ],
    "education": [ ... ],
    "aiServices": [ ... ],
    "settings": { ... }
  }
}
```

### 2.2 Get Published Single Project
* **Route:** `GET /api/public/projects/:slug`
* **Access:** Public (No Auth)
* **Response (200 OK):** Full project details if `published === true`.
* **Response (404 Not Found):** If project does not exist OR `published === false`. (Guarantees draft privacy).

### 2.3 Download Active Resume
* **Route:** `GET /api/public/resume/download`
* **Access:** Public (No Auth)
* **Behavior:** Streams active resume PDF from R2 with headers:
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename="Ravi_Dasari_Resume.pdf"`

### 2.4 Submit Contact Inquiry
* **Route:** `POST /api/public/contact`
* **Access:** Public (Rate-limited: 5 requests / hour / IP)
* **Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "subject": "DevSecOps Consulting",
  "message": "Inquiry details...",
  "turnstileToken": "0.XXXXX"
}
```
* **Validation:** Verifies Turnstile token with Cloudflare Siteverify API. Returns `200 OK` on success.

---

## 3. Admin Authentication Endpoints

### 3.1 Admin Login
* **Route:** `POST /api/admin/auth/login`
* **Rate Limit:** 5 attempts / 15 minutes / IP.
* **Request:**
```json
{
  "password": "owner-secret-passphrase"
}
```
* **Processing:** Constant-time verification against PBKDF2/Argon2 secret hash stored in Cloudflare Worker environment secret `ADMIN_PASSWORD_HASH`.
* **Response (200 OK):** Sets `portfolio_admin_session` cookie (14-day validity). Returns:
```json
{
  "success": true,
  "user": { "role": "owner", "name": "Ravi Dasari" }
}
```
* **Response (401 Unauthorized):** Generic message: "Invalid credentials".

### 3.2 Admin Logout
* **Route:** `POST /api/admin/auth/logout`
* **Response (200 OK):** Clears cookie (`Max-Age=0`).

### 3.3 Verify Active Session
* **Route:** `GET /api/admin/auth/session`
* **Response (200 OK):** `{ "authenticated": true, "user": { ... } }`
* **Response (401 Unauthorized):** `{ "authenticated": false }`

---

## 4. Admin Content Management Endpoints

All admin endpoints require valid session authentication.

### 4.1 Get Complete Content State (Including Drafts & Version)
* **Route:** `GET /api/admin/content`
* **Response Headers:** `ETag: "w/portfolio-v42-abc123"`, `Cache-Control: no-store`
* **Response (200 OK):** Complete `PortfolioData` object including all draft projects, version counter, and backup metadata.

### 4.2 Atomic Root State Update (Full Save with OCC)
* **Route:** `PUT /api/admin/content`
* **Headers:** `If-Match: "w/portfolio-v42-abc123"`
* **Request Body:** Complete `PortfolioData` payload.
* **Execution Flow:**
  1. Validates `If-Match` against current R2 object ETag / version.
  2. If mismatch: Returns `409 Conflict`.
  3. Validates incoming payload with `PortfolioDataSchema.parse()`.
  4. Automatically copies current live state to `backups/portfolio-data-${timestamp}-v${version}.json`.
  5. Increments `version` by 1 and updates `lastModifiedAt`.
  6. Writes new state to `content/portfolio-data.json`.
  7. Invokes Cloudflare Edge cache purge.
* **Response (200 OK):** Returns updated state with new `ETag`.

### 4.3 Create Single Project
* **Route:** `POST /api/admin/content/projects`
* **Body:** Validated `ProjectSchema` (without ID, generated server-side).
* **Behavior:** Appends project to `projects` array, increments version, creates backup, saves to R2.

### 4.4 Update Single Project
* **Route:** `PUT /api/admin/content/projects/:id`
* **Body:** Updated project fields.
* **Behavior:** Updates matching project in array, creates backup, saves to R2.

### 4.5 Delete Project & Cleanup Media
* **Route:** `DELETE /api/admin/content/projects/:id`
* **Behavior:** Removes project from array. Identifies associated cover image and screenshot keys in R2 and invokes `R2.delete()` for each key. Saves updated state to R2.

### 4.6 Reorder Projects / Skills
* **Route:** `PUT /api/admin/content/projects/reorder`  
* **Route:** `PUT /api/admin/content/skills/reorder`
* **Body:** `{ "orderedIds": ["uuid-1", "uuid-2", "uuid-3"] }`
* **Behavior:** Updates `displayOrder` indices in memory and persists atomically.

---

## 5. Admin Media Management Endpoints

### 5.1 Upload General Media (Cover Images / Screenshots / Diagrams)
* **Route:** `POST /api/admin/media/upload`
* **Content-Type:** `multipart/form-data` (file field: `file`, optional: `category`)
* **Limits:** Max size 5MB for images.
* **Allowed MIME types:** `image/webp`, `image/png`, `image/jpeg`, `image/svg+xml`.
* **Validation:** Reads initial 16 bytes (magic numbers) to ensure file matches declared MIME type.
* **Storage Path:** `media/projects/${randomUUID}-${cleanFilename}.webp`
* **Response (201 Created):** Returns `MediaAsset` object.

### 5.2 Upload & Replace Profile Photo
* **Route:** `POST /api/admin/media/avatar`
* **Behavior:** Uploads new image to `media/avatars/avatar-${timestamp}.webp`. Deletes previous avatar key from R2. Updates `profile.avatar` in `portfolio-data.json`.
* **Response (200 OK):** Returns updated `MediaAsset`.

### 5.3 Upload & Replace PDF Resume
* **Route:** `POST /api/admin/media/resume`
* **Limits:** Max size 10MB.
* **Allowed MIME type:** Strictly `application/pdf` (validated via `%PDF-` magic byte header).
* **Behavior:**
  - Moves active resume to `media/resume/archive/resume-${timestamp}.pdf`.
  - Saves new file as `media/resume/active/Ravi_Dasari_Resume.pdf`.
  - Appends old version to `resume.auditHistory`.
  - Updates `resume.activeResume` pointer and `lastUpdated`.
* **Response (200 OK):** Returns updated resume metadata.

---

## 6. Backup & Restore Endpoints

### 6.1 List Available Backups
* **Route:** `GET /api/admin/backups`
* **Response (200 OK):**
```json
{
  "success": true,
  "backups": [
    {
      "key": "backups/portfolio-data-2026-10-31T02-00-00-v41.json",
      "timestamp": "2026-10-31T02:00:00Z",
      "version": 41,
      "sizeBytes": 28410
    }
  ]
}
```

### 6.2 Roll Back to Snapshot
* **Route:** `POST /api/admin/backups/:snapshotVersion/restore`
* **Behavior:** Copies target backup file over `content/portfolio-data.json` while taking a pre-rollback emergency snapshot. Purges edge cache immediately.
* **Response (200 OK):** Returns restored state.

