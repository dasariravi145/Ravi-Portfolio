# FINAL_API_CONTRACTS.md — Complete Edge REST API Contract

**Project:** Ravi Dasari — Premium Dynamic Personal Portfolio  
**Target Domain:** `ravi-portfolio.dsecops88.online`  
**Current Milestone:** Prompt 04 of 18 (Storage & Runtime Architecture)  
**Standard:** OpenAPI 3.1 & RESTful Web Standards  

---

## 1. Global API Conventions & Standard Envelopes

### 1.1 Headers
* **Client Request Headers:**
  - `Accept: application/json`
  - `If-Match: "<etag>"` (Mandatory for all state-changing mutations on R2 content)
  - `X-Portfolio-Admin-Action: 1` (Mandatory for all `POST`, `PUT`, `DELETE`, `PATCH` mutations)
* **Server Response Headers:**
  - `Content-Type: application/json; charset=utf-8`
  - `ETag: "w/<collection>-v<version>-<hash>"`
  - `Cache-Control: public, max-age=120, s-maxage=86400, stale-while-revalidate=3600` (Public endpoints)
  - `Cache-Control: no-store, no-cache, must-revalidate` (Admin endpoints)

### 1.2 Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT | RATE_LIMITED | INTERNAL_ERROR",
    "message": "Human-readable explanation of error.",
    "details": null
  }
}
```

---

## 2. Public Read Endpoints

### 2.1 Unified Public Content Aggregator
* **Route:** `GET /api/public/content`
* **Purpose:** Single call to hydrate entire public portfolio homepage at edge speed.
* **Cache:** `Cache-Control: public, max-age=120, s-maxage=86400, stale-while-revalidate=3600`
* **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "profile": { ... },
    "resume": { "url": "...", "lastUpdated": "...", "sizeBytes": 250880 },
    "skillCategories": [ ... ],
    "skills": [ ... ],
    "projects": [ /* Strictly published projects only, sorted by displayOrder */ ],
    "experience": [ ... ],
    "certifications": [ ... ],
    "aiServices": [ ... ],
    "settings": { "siteTitle": "...", "metaDescription": "..." }
  }
}
```

### 2.2 Public Projects
* **List Projects:** `GET /api/public/projects`
  - Returns array of published projects. Drafts are completely omitted.
* **Single Project:** `GET /api/public/projects/:slug`
  - Returns single published project.
  - Returns `404 Not Found` if project is draft or non-existent.

### 2.3 Public Resume Stream / Download
* **Route:** `GET /api/public/resume/download`
* **Behavior:** Streams active PDF directly from `media/resume/active/Ravi_Dasari_Resume.pdf`.
* **Headers:**
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename="Ravi_Dasari_Resume.pdf"`
  - `Cache-Control: public, max-age=300, s-maxage=3600, stale-while-revalidate=60`

### 2.4 Public Contact Submission
* **Route:** `POST /api/public/contact`
* **Rate Limit:** 5 requests / hour / IP.
* **Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "subject": "DevSecOps Opportunity",
  "message": "Inquiry details...",
  "turnstileToken": "0.XXXXX"
}
```
* **Response (200 OK):** `{ "success": true, "message": "Message received." }`

---

## 3. Admin Authentication Endpoints

### 3.1 Admin Login
* **Route:** `POST /api/admin/auth/login`
* **Rate Limit:** 5 failed attempts / 15 minutes / IP.
* **Request:** `{ "password": "..." }`
* **Processing:** Constant-time PBKDF2 hash verification. Sets `portfolio_admin_session` cookie.
* **Response (200 OK):** `{ "success": true, "user": { "role": "owner", "name": "Ravi Dasari" } }`
* **Response (401 Unauthorized):** `{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "Invalid credentials" } }`

### 3.2 Admin Logout
* **Route:** `POST /api/admin/auth/logout`
* **Response (200 OK):** Clears `portfolio_admin_session` cookie.

### 3.3 Verify Session
* **Route:** `GET /api/admin/auth/session`
* **Response (200 OK):** `{ "authenticated": true, "user": { ... } }`

---

## 4. Admin Content Mutation Endpoints

All admin mutation endpoints require valid session cookie, `X-Portfolio-Admin-Action: 1` header, and origin validation.

### 4.1 Profile Operations
* **Get Profile:** `GET /api/admin/profile` -> Returns complete profile with ETag.
* **Update Profile:** `PUT /api/admin/profile`
  - Headers: `If-Match: "<etag>"`
  - Body: Validated `ProfileSchema`
  - Processing: Validates OCC ETag -> creates backup snapshot -> saves `content/profile.json` -> purges cache.
  - Response: `200 OK` with new ETag.

### 4.2 Projects Operations
* **List All Projects (Including Drafts):** `GET /api/admin/projects` -> Returns all projects with ETag.
* **Create Project:** `POST /api/admin/projects`
  - Body: Validated `ProjectSchema` (without ID).
  - Processing: Generates UUIDv4 and timestamps -> appends to `content/projects.json` -> saves snapshot -> updates R2.
  - Response: `201 Created` with created project object.
* **Update Project:** `PUT /api/admin/projects/:id`
  - Headers: `If-Match: "<etag>"`
  - Body: Updated project fields.
  - Response: `200 OK` with updated project object.
* **Delete Project:** `DELETE /api/admin/projects/:id`
  - Processing: Removes project from array -> identifies associated cover image and screenshot keys in R2 -> issues `R2.delete()` for each key -> saves updated `content/projects.json`.
  - Response: `200 OK` `{ "success": true, "deletedId": "..." }`
* **Toggle Publish Status:** `PATCH /api/admin/projects/:id/publish`
  - Body: `{ "published": true | false }`
  - Response: `200 OK`
* **Reorder Projects:** `PUT /api/admin/projects/reorder`
  - Body: `{ "orderedIds": ["uuid-1", "uuid-2", "uuid-3"] }`
  - Response: `200 OK`

### 4.3 Skills & Categories Operations
* **Get Skills:** `GET /api/admin/skills` -> Returns all categories and skills.
* **Add Skill:** `POST /api/admin/skills` -> Validates and appends skill.
* **Update Skill:** `PUT /api/admin/skills/:id` -> Updates skill.
* **Delete Skill:** `DELETE /api/admin/skills/:id` -> Deletes skill.
* **Add Category:** `POST /api/admin/skills/categories` -> Creates category.
* **Reorder Skills:** `PUT /api/admin/skills/reorder` -> Updates display order indices.

### 4.4 Resume Management Operations
* **Get Resume Info:** `GET /api/admin/resume` -> Returns active resume metadata and audit log.
* **Upload Replacement Resume:** `POST /api/admin/media/resume`
  - Form Data: `file: [PDF binary]`
  - Validation: Inspects `%PDF-` magic bytes, size <= 10MB.
  - Processing: Archives current PDF -> puts new PDF to `media/resume/active/Ravi_Dasari_Resume.pdf` -> appends version history -> saves `content/resume.json` -> purges `/api/public/resume/download`.
  - Response: `200 OK` with updated resume state.
* **Toggle Resume Publication:** `PATCH /api/admin/resume/publish`
  - Body: `{ "published": true | false }`

### 4.5 Media Asset Management Endpoints
* **Upload Project Media / Screenshots:** `POST /api/admin/media/upload`
  - Content-Type: `multipart/form-data`
  - Validation: WebP/PNG/JPEG/SVG magic byte inspection, size <= 5MB.
  - Storage: Saved to `media/projects/${slug}/${uuid}.webp`.
  - Response (201 Created): Returns `MediaAsset` object with public CDN URL.
* **Delete Media Object:** `DELETE /api/admin/media/:id`
  - Processing: Deletes object from R2 bucket.

### 4.6 Snapshot Backups & Rollback
* **List Backups:** `GET /api/admin/backups` -> Returns list of restorable snapshots.
* **Restore Snapshot:** `POST /api/admin/backups/:snapshotId/restore`
  - Processing: Creates emergency pre-rollback snapshot -> copies target snapshot over active JSON -> purges edge cache.
  - Response: `200 OK`.

