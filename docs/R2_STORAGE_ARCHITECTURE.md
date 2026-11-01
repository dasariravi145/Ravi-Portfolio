# R2_STORAGE_ARCHITECTURE.md — Cloudflare R2 Structured Content & Storage Architecture

**Project:** Ravi Dasari — Premium Dynamic Personal Portfolio  
**Target Domain:** `ravi-portfolio.dsecops88.online`  
**Current Milestone:** Prompt 04 of 18 (Storage & Runtime Architecture)  
**Storage Tier:** Cloudflare R2 Standard Object Storage  

---

## 1. Structured Content Architecture: Model Evaluation

We rigorously evaluated three architectural models for storing dynamic, structured CMS content in Cloudflare R2:

| Evaluation Criteria | Option A: One JSON Per Content Collection | Option B: One JSON Per Individual Record | Option C: Unified Root State JSON (`portfolio-data.json`) |
| :--- | :--- | :--- | :--- |
| **Write Isolation** | High — editing a skill only touches `skills.json`. | Maximum — editing a project only touches that project file. | Low — editing any item touches the root document. |
| **Read Performance (Public)** | Moderate — requires 5–6 parallel R2 GETs on cache miss. | Poor — listing 48 skills requires 48 R2 GET operations. | **Optimal — single R2 GET loads the entire site in <15ms.** |
| **R2 Class B Read Costs** | 5x–6x higher per cold cache fetch. | 50x+ higher per cold cache fetch. | **Lowest possible Class B operations (1 GET per cold fetch).** |
| **Backup Simplicity** | Fragmented — point-in-time snapshot requires multi-key copy. | Highly fragmented — backup requires copying dozens of files. | **Trivial & Atomic — copying 1 file yields a 100% coherent snapshot.** |
| **Single-Owner Fit** | Moderate complexity for 1 human editor. | Unjustified complexity, high latency. | **Ideal — zero multi-user write contention in real-world usage.** |

### Architectural Decision: Hybrid Domain Partitioning with Unified Edge Aggregation
To achieve the optimal balance between **write isolation** and **zero-latency public delivery**, we adopt a **Domain-Partitioned Storage Model with Automated Unified Edge Caching**:
1. **Physical R2 Storage:** Data is partitioned by logical collection:
   - `content/profile.json`
   - `content/projects.json`
   - `content/skills.json`
   - `content/experience.json`
   - `content/certifications.json`
   - `content/ai-services.json`
   - `content/settings.json`
   - `content/resume.json`
2. **Public Edge Synthesis:** The Cloudflare Worker exposes `GET /api/public/content`, which aggregates the partitioned collections in-memory, strips drafts, and serves a single, highly compressed JSON payload cached at the Cloudflare Edge (`max-age=120, s-maxage=86400`).
3. **Write Isolation Benefit:** When the admin edits a project, the Worker mutates **only** `content/projects.json` using R2 conditional ETag matching. Editing skills touches **only** `content/skills.json`. This completely eliminates cross-domain write contention!

---

## 2. Directory Hierarchy & Object Key Conventions

All R2 object keys adhere to deterministic, clean namespace conventions:

```
r2://portfolio-data/
├── content/                                # Live structured content state
│   ├── profile.json
│   ├── projects.json
│   ├── skills.json
│   ├── experience.json
│   ├── certifications.json
│   ├── ai-services.json
│   ├── settings.json
│   └── resume.json
├── backups/                                # Automated point-in-time recovery snapshots
│   ├── content-projects-20261031T020000Z-v14.json
│   ├── content-skills-20261031T020500Z-v8.json
│   └── full-portfolio-snapshot-20261031T020000Z.json
└── media/                                  # Binary assets (Images, PDFs, Diagrams)
    ├── avatars/
    │   └── avatar-${uuid}.webp
    ├── resume/
    │   ├── active/
    │   │   └── Ravi_Dasari_Resume.pdf
    │   └── archive/
    │       └── resume-${timestamp}-${uuid}.pdf
    ├── projects/
    │   └── ${projectSlug}/
    │       ├── cover-${uuid}.webp
    │       ├── diagram-${uuid}.webp
    │       └── screenshot-${uuid}.webp
    ├── certifications/
    │   └── cert-${uuid}.webp
    └── ai-services/
        └── ai-${uuid}.webp
```

---

## 3. Logical Content Entity Schemas & Record Metadata

Every record across all collections contains mandatory metadata:
- `id`: Stable UUIDv4 string.
- `createdAt`: ISO 8601 UTC timestamp.
- `updatedAt`: ISO 8601 UTC timestamp.
- `schemaVersion`: Integer tracking data format version (currently `1`).
- `displayOrder`: Integer determining presentation sequence.
- `published`: Boolean flag (where applicable) controlling public exposure.

### 3.1 Partitioned Content Schemas

#### A. `content/profile.json`
```json
{
  "schemaVersion": 1,
  "version": 4,
  "updatedAt": "2026-10-31T02:00:00Z",
  "data": {
    "fullName": "Ravi Dasari",
    "headline": "Senior DevOps & Cloud Infrastructure Engineer",
    "bioShort": "DevOps and DevSecOps engineer specializing in CI/CD automation, Kubernetes, Java microservices, and AI agents.",
    "bioLong": "Over verified years of experience architecting resilient cloud systems...",
    "location": "Hyderabad, India (Global Remote)",
    "contactEmail": "contact@dsecops88.online",
    "phone": null,
    "availabilityStatus": "Available for Engineering Roles & Consulting",
    "avatar": {
      "key": "media/avatars/avatar-4a8f9b2c.webp",
      "url": "https://ravi-portfolio.dsecops88.online/media/avatars/avatar-4a8f9b2c.webp",
      "uploadedAt": "2026-10-31T02:00:00Z"
    },
    "social": {
      "github": "https://github.com/ravi-dasari",
      "linkedin": "https://linkedin.com/in/ravi-dasari",
      "email": "contact@dsecops88.online"
    }
  }
}
```

#### B. `content/projects.json`
```json
{
  "schemaVersion": 1,
  "version": 12,
  "updatedAt": "2026-10-31T02:00:00Z",
  "data": [
    {
      "id": "c1f7a8e2-63b9-4a92-8022-d0234a5d8f01",
      "slug": "roboshop-devsecops",
      "title": "RoboShop E-Commerce DevSecOps Pipeline & Infrastructure",
      "category": "DevSecOps & Cloud",
      "summary": "Automated multi-tier microservices CI/CD pipeline with integrated SAST/DAST.",
      "problemStatement": "Manual deployments caused configuration drift and security blindspots...",
      "solutionArchitecture": "Designed Jenkins automated declarative pipelines with SonarQube quality gates...",
      "technicalChallenges": "Managing stateful service dependencies in containerized testing tracks...",
      "techStack": ["Docker", "Kubernetes", "Jenkins", "SonarQube", "Trivy", "Terraform", "AWS"],
      "githubUrl": "https://github.com/ravi-dasari/roboshop-devsecops",
      "liveDemoUrl": null,
      "deploymentStatus": "Production Pipeline Automated",
      "featured": true,
      "published": true,
      "displayOrder": 1,
      "coverImage": {
        "key": "media/projects/roboshop-devsecops/cover-8b2c.webp",
        "url": "https://ravi-portfolio.dsecops88.online/media/projects/roboshop-devsecops/cover-8b2c.webp"
      },
      "screenshots": [],
      "architectureDiagram": {
        "key": "media/projects/roboshop-devsecops/diagram-9a3d.webp",
        "url": "https://ravi-portfolio.dsecops88.online/media/projects/roboshop-devsecops/diagram-9a3d.webp"
      },
      "seo": {
        "metaTitle": "RoboShop DevSecOps Pipeline | Ravi Dasari",
        "metaDescription": "Production CI/CD DevSecOps pipeline for microservices architecture.",
        "keywords": ["DevSecOps", "Kubernetes", "CI/CD", "Jenkins"]
      }
    }
  ]
}
```

#### C. `content/resume.json`
```json
{
  "schemaVersion": 1,
  "version": 3,
  "updatedAt": "2026-10-31T02:00:00Z",
  "data": {
    "activeResume": {
      "key": "media/resume/active/Ravi_Dasari_Resume.pdf",
      "url": "https://ravi-portfolio.dsecops88.online/api/public/resume/download",
      "filename": "Ravi_Dasari_Resume.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 250880,
      "uploadedAt": "2026-10-31T02:00:00Z",
      "versionTag": "v2026.1"
    },
    "format": "application/pdf",
    "published": true,
    "auditHistory": [
      {
        "key": "media/resume/archive/resume-20261015-1a2b.pdf",
        "filename": "Ravi_Dasari_Resume_v2025.pdf",
        "uploadedAt": "2026-10-15T10:00:00Z",
        "sizeBytes": 242100
      }
    ]
  }
}
```

---

## 4. R2 Quotas, Limits & Free-Tier Guardrails

The architecture strictly operates within Cloudflare R2 standard limits:
* **Max Object Size:** 5 TB (portfolio uses <10 MB per asset).
* **Metadata Limit:** 2 KB user-defined metadata per object (used for content checksums and MIME types).
* **Operation Rates:** Supports thousands of requests per second globally.
* **Storage Retention:** Rolling automated retention policy keeps the last 50 backup snapshots; older backups are automatically pruned during administrative save operations.

