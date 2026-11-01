# Ravi Dasari — Premium Dynamic Personal Portfolio

**Target Production Domain:** `https://ravi-portfolio.dsecops88.online`  
**Current Milestone:** Prompt 18 of 18 (Stage A: Final Engineering Audit & Release Preparation)  
**Aesthetic Governance:** Luxury Light-Theme Only (Strict Invariant)  

---

## 1. Project Overview

An executive personal engineering portfolio for **Ravi Dasari**, designed to showcase senior expertise across:
* **DevOps Engineering & SRE:** Cloud infrastructure automation, Docker, Kubernetes, Linux, Prometheus/Grafana.
* **DevSecOps & Shift-Left Security:** Automated SAST/DAST pipelines, container vulnerability scanning (Trivy, SonarQube), HashiCorp Vault.
* **CI/CD Pipeline Engineering:** Automated multi-tier delivery pipelines with Jenkins and GitHub Actions.
* **Backend & Mobile Development:** Java, Spring Boot microservices, native Android engineering (Kotlin, Room DB, Jetpack Compose).
* **AI Agents & Autonomous Workflows:** Multi-step autonomous agent workflows, conversational voice interfaces, and business process automation.

Backed by a completely decoupled, zero-code, owner-managed **Dynamic Admin CMS** running serverless on **Cloudflare Workers** and **Cloudflare R2 Standard Object Storage**.

---

## 2. Core Architectural Principles

1. **Pure Light-Theme Only:** Absolutely no dark mode, no dark navy sections, no dark hero banners, and no dark mode toggles.
2. **Zero-Code Operations:** After deployment, all profile copy, resume documents, projects, skills, and AI services are managed through the dynamic Admin CMS without writing code, touching Git, or triggering rebuilds.
3. **Optimistic Concurrency Control (OCC):** Powered by Cloudflare R2 native conditional writes (`onlyIf: { etagMatches }`) and automated pre-mutation snapshot backups to prevent lost updates without recurring fees.
4. **Zero-Trust Security:** Standalone Web Crypto PBKDF2 password hashing, HMAC-SHA256 signed session cookies, CSRF header defense, and binary magic byte verification.
5. **Factual Grounding:** All claims are anchored strictly to verified engineering achievements.
   - **RoboShop:** Fact-based DevSecOps pipeline and containerized infrastructure.
   - **Zynpath:** Strictly **Google Play Closed Testing ONLY**.
   - **Mandi Ledger:** Published Android business utility.
   - **NEXORA:** Interactive e-commerce showcase (public static demo without active AI/checkout).

---

## 3. Technology Stack

* **Frontend:** React 18 SPA, Vite, strict TypeScript, React Router v6.
* **Styling:** Tailwind CSS with custom luxury light-theme tokens, custom pearl elevation shadows, Lucide React icons.
* **Backend Runtime:** Hono running inside Cloudflare Workers with Static Assets binding.
* **Validation:** Zod schemas for all runtime state and API contracts.
* **Testing:** Vitest, React Testing Library, JSDOM.

---

## 4. Local Development Quickstart

```powershell
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Execute TypeScript type checking
npm run typecheck

# 4. Run automated test suite
npm run test

# 5. Compile production build
npm run build
```

---

## 5. Repository Structure

```
D:\Projects\Ravi-Portfolio\
├── docs/                               # Master architectural & governance specifications
│   ├── AGENTS.md                       # Master rules & non-negotiables
│   ├── SYSTEM_ARCHITECTURE.md          # Edge topology & runtime design
│   ├── CONTENT_SCHEMA_PLAN.md          # Zod data model schemas
│   ├── FINAL_API_CONTRACTS.md          # Edge REST API specifications
│   ├── DESIGN_SYSTEM.md                # Light-theme tokens & typography
│   ├── R2_STORAGE_ARCHITECTURE.md      # Domain-partitioned R2 storage
│   ├── ADMIN_AUTHENTICATION_DESIGN.md  # PBKDF2 / HMAC cookie auth
│   └── PROJECT_STATUS.md               # Real-time milestone tracker
├── src/
│   ├── auth/                           # Cloudflare Access JWT validator & cryptographic engine
│   ├── components/
│   │   ├── admin/                      # AdminLayout, AdminGuard, AdminStatCard
│   │   ├── common/                     # Reusable UI primitives (Button, Card, Badge, SkillIcon, etc.)
│   │   ├── layout/                     # Shell components (Navbar, Footer, PublicLayout)
│   │   └── hero/                       # Hero section with dynamic avatar fallback
│   ├── fixtures/                       # Local development content fixtures
│   ├── pages/
│   │   ├── admin/                      # DashboardOverviewPage, ProfilePhotoPage, ResumePage, ProjectsListPage, ProjectFormPage, SkillsPage, ExperiencePage, CertificationsPage, AIServicesPage
│   │   ├── HomePage.tsx                # Public showcase landing page (Hero, About, Skills, Experience, Education, Certifications, Projects, AI Solutions, Resume, Contact)
│   │   ├── ProjectsPage.tsx            # Dedicated complete engineering projects catalog with category filter & live search
│   │   ├── ProjectDetailPage.tsx       # Dynamic engineering case study viewer
│   │   ├── AIServiceDetailPage.tsx     # Dynamic AI solution case study viewer
│   │   └── NotFoundPage.tsx            # 404 handler
│   ├── services/
│   │   ├── adminService.ts             # Session checks, metrics, projects, skills, experience, education, certifications, AI services CRUD & media helpers
│   │   ├── contentService.ts           # Dynamic public data fetcher with fixture fallback
│   │   └── contentMutationService.ts   # Atomic domain mutations with validation & OCC
│   ├── storage/
│   │   ├── r2StorageAdapter.ts         # Cloudflare R2 & Memory storage adapters (JSON + Binary)
│   │   ├── mediaValidator.ts           # Binary signature, magic bytes & MIME security validator
│   │   └── contentStore.ts             # Domain-partitioned JSON store with OCC & backups
│   ├── tests/                          # 309 Automated Vitest tests across 14 test files (Unit, Storage, API, Auth, Media, Projects, Skills, Experience, Education, Certifications, AI Services, Public Website, Architecture & SEO, End-to-End Workflows, Deployment Readiness)
│   ├── types/                          # Zod schemas & TypeScript definitions
│   ├── worker/
│   │   ├── api.ts                      # Hono Edge REST API router, Access auth & security headers
│   │   └── index.ts                    # Cloudflare Worker entrypoint with asset fallback
│   ├── App.tsx                         # Client-side router configuration
│   ├── main.tsx                        # React DOM mounting
│   └── index.css                       # Tailwind directives & frosted glass utilities
├── index.html                          # HTML shell with Google Fonts
├── vite.config.ts                      # Vite build & Vitest configuration
├── tailwind.config.js                  # Light-only theme tokens & custom shadows
├── wrangler.toml                       # Cloudflare Workers deployment blueprint
└── package.json                        # Dependencies and script definitions
```

# Ravi-Portfolio
