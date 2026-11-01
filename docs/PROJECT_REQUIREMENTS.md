# PROJECT_REQUIREMENTS.md — Comprehensive Project Specifications

**Project:** Ravi Dasari — Premium Dynamic Personal Portfolio  
**Target Domain:** `ravi-portfolio.dsecops88.online`  
**Current Phase:** Prompt 01 of 18

---

## 1. Executive Summary & Objective

The objective is to architect and deliver an executive-grade, ultra-premium, light-only personal engineering portfolio for **Ravi Dasari**, backed by a completely decoupled, dynamic, owner-managed Admin CMS running on a modern serverless edge architecture (Cloudflare Workers + Cloudflare R2).

The platform serves two synchronized surfaces:
1. **The Public Portfolio:** A lightning-fast, highly aesthetic, responsive showcase highlighting DevOps, DevSecOps, Cloud Infrastructure, CI/CD pipelines, Java Backend development, Android development, E-Commerce platforms, and AI Agents/Automation.
2. **The Owner Admin CMS:** A secure, password/token-protected administrative interface allowing Ravi Dasari to manage, update, upload, reorder, publish, and delete all profile information, resumes, projects, architecture diagrams, skills, experience, and AI services dynamically without writing code, touching Git, or triggering rebuilds.

---

## 2. Professional Positioning & Domains

All content across the site will reflect the following verified core competencies:
- **DevOps Engineering & SRE:** Cloud infrastructure automation, Docker containerization, Kubernetes orchestration, Linux systems, observability, and self-healing systems.
- **DevSecOps & Security Automation:** SAST/DAST integration, dependency scanning, secret management, Zero Trust architecture, and compliance.
- **CI/CD Pipeline Engineering:** Automated build, test, scan, and release workflows (GitHub Actions, Jenkins, GitLab CI).
- **Java Backend Engineering:** Microservices, Spring Boot, RESTful APIs, high-performance transaction processing, and data persistence.
- **Android Application Development:** Native Android engineering, Kotlin/Java, clean architecture, SDK integrations, and release lifecycle management.
- **E-Commerce Engineering:** Scalable e-commerce architectures, catalog management, cart/checkout flows, and payment gateway patterns.
- **AI Agents & Workflow Automation:** Custom AI agents, LLM integrations, chat/voice interfaces, automated calling systems, and business process automation.

---

## 3. Strict UI/UX & Design System Requirements

### Light-Theme-Only Mandate
- **STRICT PROHIBITION:**
  - Absolutely NO dark theme, NO dark mode toggle, and NO dark sections anywhere on the site (including hero banners, footer, modals, and admin panels).
  - No low-contrast text.
  - No generic resume template designs.
- **Color Palette & Visual Language:**
  - **Base Background:** Crisp White (`#FFFFFF`) & Pearl White (`#F8FAFC`).
  - **Secondary Surfaces & Card Backgrounds:** Soft Blue Tint (`#F3F8FF`), Pale Sky (`#E0F2FE`), Translucent White Glass (`rgba(255, 255, 255, 0.85)`).
  - **Card Borders & Separators:** Soft Ice Blue (`#DCEBFF`), Light Slate (`#E2E8F0`).
  - **Primary Accents & Action Items:** Royal Blue (`#2563EB`), Vibrant Blue (`#1D4ED8`).
  - **Secondary Accents & Highlights:** Sky Blue (`#38BDF8`), Cyan Accent (`#0284C7`).
  - **Live Indicators & Verified Badges:** Deep Teal / Emerald (`#0D9488` / `#059669`).
  - **Text Typography Hierarchy:** Dark Slate / Charcoal for primary text (`#0F172A`), Muted Slate for secondary text (`#475569`, `#64748B`).
- **Aesthetic Principles:**
  - Modern glassmorphism with high light-transmission values.
  - Generous whitespace, refined micro-shadows, and smooth micro-animations.
  - Flawless responsiveness across Mobile (320px–480px), Tablet (768px–1024px), Desktop (1200px–1440px), and Ultra-wide (1920px+).

---

## 4. Public Portfolio Structure & Functional Sections

The public portfolio website will feature eleven (11) structured sections:

### 1. Home / Hero Section
- Bold, executive-grade headline and dynamic sub-headline reflecting verified roles.
- High-resolution owner portrait with pearl-white frame and soft gradient aura.
- Immediate call-to-action buttons: "View Featured Projects", "Download Resume", "Explore AI Solutions", "Contact Me".
- Live status pill (e.g., "Open to Engineering Opportunities / Consulting").
- Key metric counters (e.g., automated pipelines, enterprise systems, applications delivered).

### 2. About Me Section
- Executive professional narrative detailing engineering philosophy, technical leadership, and cross-functional problem solving.
- Highlights: Cloud infrastructure, DevSecOps pipelines, Java enterprise systems, mobile applications, and AI agent automation.
- Core values: Reliability, security by design, automated workflows, and business impact.

### 3. Technical Skills Section (Dynamic)
- Categorized skill grid loaded dynamically from the CMS:
  - Cloud & Infrastructure (AWS, Cloudflare, Linux, Terraform, etc.)
  - DevOps & CI/CD (Docker, Kubernetes, Jenkins, GitHub Actions, Helm, etc.)
  - DevSecOps & Security (SonarQube, Trivy, OWASP, Vault, IAM, etc.)
  - Backend & APIs (Java, Spring Boot, REST, Microservices, etc.)
  - Mobile & Frontend (Android, Kotlin/Java, Modern Web, etc.)
  - AI & Automation (AI Agents, Prompt Engineering, n8n/Flows, API orchestration, etc.)
- Visual proficiency indicators and categorization tabs with search/filter capability.

### 4. Professional Experience Section (Dynamic)
- Interactive, clean chronological timeline.
- Role, company, duration, location, and verified achievements.
- Bullet points highlighting quantified engineering outcomes (performance gains, security improvements, deployment frequency).
- Tech-stack tags for each role.

### 5. Enterprise Projects Section (Dynamic)
- Showcase of scalable, enterprise-grade systems architected or maintained.
- Problem statement, solution architecture, security controls, and business outcomes.
- Interactive deep-dive modals or case studies.

### 6. Featured Personal Projects (Specific Rigor)
Four mandatory featured projects with strict adherence to verified facts:
1. **RoboShop:**
   - E-Commerce DevSecOps engineering project.
   - Comprehensive infrastructure-as-code, containerized services, automated CI/CD pipeline, and security scanning.
   - Strictly verified implementation details only.
2. **Zynpath:**
   - Android puzzle game.
   - **MANDATORY STATUS:** Strictly **Google Play Closed Testing Only**. Never state or imply public release.
   - Architecture highlights: Clean architecture, custom puzzle mechanics, local state management, test tracks.
3. **Mandi Ledger:**
   - Published Android business application.
   - Live Google Play store badge and link.
   - Real-world business features: Transaction ledgers, offline-first data, invoice generation, farmer/merchant workflows.
4. **NEXORA:**
   - Premium interactive e-commerce web platform.
   - Live demo link: `https://nexora.dsecops88.online`.
   - **MANDATORY NOTE:** Clearly indicate that the public demo is a high-fidelity frontend showcase; it does **not** currently feature a deployed live AI backend or real payment checkout.

### 7. AI Agents and Automation Section (Dynamic)
- Comprehensive showcase of modern AI engineering capabilities:
  - Autonomous AI Agents
  - Intelligent Chat Assistants
  - Voice AI Agents & Conversational Interfaces
  - Automated Outbound AI Calling Pipelines
  - WhatsApp Business Automation & Webhooks
  - AI Workflow Automation (LangChain, n8n, custom pipelines)
  - CRM / API Integrations
  - Custom Enterprise AI Solutions
- **Status Classification System:** Every card or service must bear one of four explicit status badges:
  - `[VERIFIED LIVE]`
  - `[WORKING PROTOTYPE]`
  - `[IN ACTIVE DEVELOPMENT]`
  - `[PLANNED CAPABILITY]`
- Strictly no fabricated live integrations or phantom clients.

### 8. Engineering Architecture Showcase
- Interactive architecture diagrams illustrating end-to-end workflows:
  - DevSecOps CI/CD pipeline flow (Code -> SAST -> Container -> DAST -> Deployment).
  - Cloudflare Edge & Serverless Architecture (Workers -> R2 -> Cache -> Client).
  - Android offline-first synchronization architecture.
  - AI Agent calling/messaging event-driven flow.
- High-fidelity zoom/pan diagram viewer and narrative walkthroughs.

### 9. Certifications and Achievements Section (Dynamic)
- Verified cloud, security, and developer certifications.
- Issuing authority, issue date, credential ID, and verification link.
- High-resolution badge images.

### 10. Resume Download Section
- Prominent resume download center.
- Always serves the latest owner-published resume directly from Cloudflare R2.
- Direct PDF preview modal within the browser.
- File metadata display: Last updated date, format (PDF), file size.

### 11. Contact and Social Links Section
- Professional inquiry form with anti-spam / Cloudflare Turnstile protection.
- Verified professional links: GitHub, LinkedIn, Email, Twitter/X.
- Direct booking / meeting links (if configured).

---

## 5. Dynamic Admin CMS Specifications

The CMS is an owner-only, secure interface enabling full lifecycle management of the portfolio without coding.

### 1. Profile Management
- View and update personal details: Full Name, Professional Titles, Taglines, Bio/About copy, Location, Availability Status, Contact Email, Social URLs.
- Profile Photo Management:
  - Upload high-resolution photo directly to R2.
  - Instant live crop/preview.
  - Replace existing photo with automatic cache invalidation.
  - Delete photo and revert to placeholder avatar.

### 2. Resume Management
- Upload new PDF resume directly to R2.
- In-dashboard PDF preview.
- Replace active resume (updates public download link instantly).
- Delete resume.
- Audit history of resume versions.

### 3. Projects Management (Unlimited)
- Create new project / Edit existing project / Delete project.
- Project fields: Title, slug, category, short summary, full case study (rich text / markdown), client/type, role, date, featured toggle, publish status (`draft` / `published`), display order index.
- Media upload: Cover image, screenshot gallery, architecture diagrams (stored in R2).
- Links: GitHub repository URL, Live demo URL, Documentation link.
- Technologies: Multi-select / custom tags.

### 4. Skills Management
- Add, edit, remove individual skills.
- Assign skills to categories (DevOps, Cloud, Backend, Android, Security, AI, etc.).
- Create, rename, delete skill categories.
- Reorder skills and categories via drag-and-drop or order indexing.
- Set proficiency level or highlight tag (e.g., "Core", "Advanced").

### 5. Experience & Certifications Management
- **Work Experience:** Add, edit, remove company, title, duration, location, description bullet points, associated skills, order.
- **Certifications:** Add, edit, remove certification title, issuer, issue date, expiry, credential ID, credential URL, badge image upload.

### 6. AI Services Management
- Add, edit, remove AI capability cards.
- Title, category, description, tools/models used, live demo link (if available).
- Mandatory status selector (`Verified Live`, `Working Prototype`, `In Active Development`, `Planned Capability`).

### 7. Settings & SEO Metadata
- Edit site title, meta description, Open Graph / Twitter Card preview images, favicon.
- Manage analytics settings or status alerts.

---

## 6. Technical & Non-Functional Requirements

- **Zero-Code Operational Updates:** Content updates via the Admin CMS must take effect immediately on the public site without touching Git, re-running build pipelines, or redeploying code.
- **Edge Performance:** First Contentful Paint (FCP) < 0.8s, Largest Contentful Paint (LCP) < 1.2s, 100/100 Lighthouse performance profile.
- **Security & DevSecOps:**
  - Secure authentication for Admin CMS (cookie-based session tokens or JWT with HTTPOnly, Secure, SameSite=Strict).
  - Rate limiting on API routes and login endpoints.
  - Content Security Policy (CSP) headers, CORS restrictions, and strict input sanitization.
  - Anti-CSRF tokens on mutation endpoints.
- **Data Integrity & Concurrency:**
  - Safe writes with version tracking / ETags to prevent concurrent write collisions.
  - Automated JSON backup snapshots prior to write mutations.
  - Automated cleanup of orphaned R2 objects when replacing or deleting images/resumes.
- **Accessibility:** WCAG 2.1 AA compliance across all components, contrast ratios, and keyboard navigation.

