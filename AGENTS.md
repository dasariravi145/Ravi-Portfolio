# AGENTS.md — Master Project Rules & Governance

**Project:** Ravi Dasari — Premium Dynamic Personal Portfolio  
**Target Domain:** `ravi-portfolio.dsecops88.online`  
**Workspace:** `D:\Projects\Ravi-Portfolio`  
**Current Phase:** Prompt 01 of 18 (Documentation & Workspace Initialization)

---

## 1. Operating Personas & Roles

Every contributing AI agent and human engineer must operate across these core specializations:
- **Principal Software Architect:** Maintain clean system boundaries, decoupled components, resilient data lifecycles, and future-proof design.
- **Full-Stack Engineer:** Deliver type-safe, maintainable, performant frontend and backend integrations without code smells or bloat.
- **Cloudflare Architect:** Design secure, cost-optimized, high-performance edge solutions utilizing Cloudflare Workers, R2 Standard Storage, edge caching, and security layers.
- **DevSecOps & Security Engineer:** Enforce zero-trust architecture, robust auth mechanisms, input sanitization, CSRF/XSS protection, rate limiting, and safe secret handling.
- **Senior UI/UX Designer:** Craft an exquisite, executive-grade, modern light-only interface with intentional micro-interactions, flawless typography, and accessible design systems.
- **QA & Verification Lead:** Enforce end-to-end verification, non-regression guarantees, factual accuracy, and cross-device performance.

---

## 2. Non-Negotiable Design Rules

### Light Theme Only (Strict Invariant)
- **STRICTLY PROHIBITED:**
  - Dark mode or dark mode toggles.
  - Black or dark background surfaces anywhere on the public portfolio or admin dashboard.
  - Dark sections (e.g., dark footers, dark hero banners, or dark cards).
  - Low-contrast gray text on low-contrast backgrounds.
  - Generic template aesthetics or cluttered visual noise.
- **MANDATORY DESIGN LANGUAGE:**
  - Crisp pearl-white, clean off-white, and bright neutral surfaces (`#FFFFFF`, `#F8FAFC`, `#F3F8FF`).
  - Subtle borders, glassmorphic accents, and refined shadows (`#E2E8F0`, `#DCEBFF`).
  - Authoritative Royal Blue and Sky Blue primary accents (`#2563EB`, `#38BDF8`).
  - Vibrant Emerald / Teal highlights (`#0D9488`) for live indicators and tags.
  - Elegant typography, smooth micro-interactions, responsive grid systems, and AA/AAA accessible contrast.

---

## 3. Truthfulness & Content Integrity Rules

- **Zero Fabrication:** Never invent, extrapolate, or embellish professional experience, enterprise roles, certifications, education, or employment history.
- **Resume Grounding:** All professional claims must strictly derive from verified resume data provided by the owner.
- **Project Accuracy:**
  - **RoboShop:** E-Commerce DevSecOps engineering project. Must showcase only verified, factual pipeline, infrastructure, and tooling details.
  - **Zynpath:** Android puzzle game. Explicitly state: **Google Play Closed Testing Only**. Never claim or imply a public production release.
  - **Mandi Ledger:** Published Android business application. Explicitly verify live links and actual supported features.
  - **NEXORA:** Interactive e-commerce website with public demo at `https://nexora.dsecops88.online`. Explicitly note that the public static demo does not currently have a deployed AI backend or live payment checkout.
- **AI Automation Categorization:**
  - Content must clearly classify all AI tools, chat agents, voice agents, calling pipelines, and automations into one of four distinct states:
    1. `Verified Live Implementation`
    2. `Working Prototype`
    3. `In Active Development`
    4. `Planned Capability`
  - Never fabricate live API integrations, client testimonials, or functional status.

---

## 4. Dynamic Admin CMS & Decoupled Content

- **Zero-Code Content Management:**
  - Once deployed, all content updates (profile details, hero copy, resume files, projects, skills, experience, certifications, and AI services) must be managed dynamically by the owner via the authenticated Admin CMS.
  - Content updates must **never** require writing code, updating JSON in git, opening pull requests, committing, or triggering CI/CD site rebuilds/redeployments.
- **Storage & State Integrity:**
  - Content must live in structured R2 Standard object storage (with versioning, safe write mechanisms, and backup safety).
  - Do not treat raw JSON in R2 as casually safe for concurrent edits without validation, optimistic concurrency control (ETags/versions), and safe backup snapshots.

---

## 5. Strict Project Isolation & Blast Radius Controls

- **Complete Repository & Workspace Independence:**
  - The portfolio workspace is strictly scoped to `D:\Projects\Ravi-Portfolio`.
  - **NEVER** inspect, read, or modify unrelated project folders in `D:\Projects` (including DRK company website, NEXORA, Zynpath, Mandi Ledger, etc.).
  - **NEVER** modify existing Cloudflare DNS records, existing Workers, or external infrastructure without explicit, prompt-by-prompt instructions.
- **Safety in Execution:**
  - **PROMPT 01 IS RESTRICTED TO DOCUMENTATION ONLY.**
  - Absolutely no dependency installation (`npm install`, `pnpm install`, etc.).
  - No framework initialization (Next.js, Vite, Astro, Remix, etc.).
  - No application code generation.
  - No provisioning of Cloudflare resources, R2 buckets, API tokens, or billing triggers.
  - No git commits or pushes until specifically commanded.

---

## 6. Development Workflow & Protocol

- Each prompt in the 18-prompt roadmap must be executed sequentially.
- No auto-advancing across prompt boundaries.
- Every prompt must produce clear verification evidence and await explicit owner review and approval before proceeding to the next prompt.

