# LOCAL_DEVELOPMENT.md — Local Engineering & Testing Guide

**Project:** Ravi Dasari — Premium Dynamic Personal Portfolio  
**Target Domain:** `ravi-portfolio.dsecops88.online`  
**Current Milestone:** Prompt 05 of 18 (Application Foundation & Local Dev Setup)  

---

## 1. Prerequisites & Environment

* **Operating System:** Windows 11 (PowerShell terminal).
* **Node.js:** v20+ LTS (Tested on `v22.17.0`).
* **Package Manager:** `npm` (Tested on `10.9.2`).
* **IDE:** Antigravity IDE / VS Code.

---

## 2. Core Development Commands

All commands are executed from the workspace root (`D:\Projects\Ravi-Portfolio`):

```powershell
# 1. Install Dependencies
npm install

# 2. Start Vite Local Development Server (Port 3000)
npm run dev

# 3. Execute Strict TypeScript Type Checking
npm run typecheck

# 4. Run Automated Test Suite (Vitest)
npm run test

# 5. Compile Optimized Production Build (Outputs to ./dist)
npm run build

# 6. Preview Production Build Locally
npm run preview
```

---

## 3. Architecture & Data Access Boundary (Prompt 05 vs. Future Milestones)

To maintain rigorous transparency, the relationship between Prompt 05 implementation and future cloud integrations is documented below:

| Feature / Subsystem | Prompt 05 State (Current) | Future Milestone Implementation |
| :--- | :--- | :--- |
| **Public UI & Components** | **100% Implemented & Rendered** | Maintained & enriched in Prompts 08–14 |
| **Content Access Abstraction** | `contentService.ts` serving `initialContent.ts` fixture | **Prompt 06:** Seamlessly connects to live `/api/public/content` |
| **Cloudflare R2 Storage** | Schemas & key contracts defined; local types enforced | **Prompt 06:** Real R2 bucket bindings & conditional writes |
| **Admin Authentication** | Secure security gate placeholder (`/admin`) | **Prompt 07:** Web Crypto PBKDF2/HMAC-SHA256 session cookies |
| **File Uploads (Photos/PDFs)** | Client-side uploader foundation & schemas | **Prompt 08:** Direct R2 ArrayBuffer magic byte upload pipeline |
| **Dynamic CMS Modules** | Types & data models ready | **Prompts 09–12:** Full CRUD forms for projects, skills, and AI |

> [!NOTE]
> The fixture data in `src/fixtures/initialContent.ts` is strictly a local development aid for testing UI rendering, layout responsiveness, and Zod schemas. It does **not** represent production R2 persistence.

---

## 4. Design System Invariant (Light Theme Only)

* **Mandatory Constraint:** All components and layouts strictly enforce a **pure light theme**:
  - Primary Background: `#FFFFFF`
  - Pearl Surface: `#F8FAFC`
  - Ambient Aura: `#F3F8FF`
  - Structural Borders: `#E2E8F0` and `#DCEBFF`
  - Primary Accent: `#2563EB` (Royal Blue)
  - Verified Badges: `#0D9488` (Teal)
* Dark mode toggles, dark backgrounds, and dark cards are **strictly prohibited** across all templates.

