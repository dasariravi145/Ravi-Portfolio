# PROJECT_CASE_STUDY_DESIGN.md — Reusable Dynamic Case Study Specification

**Project:** Ravi Dasari — Premium Dynamic Personal Portfolio  
**Target Domain:** `ravi-portfolio.dsecops88.online`  
**Current Milestone:** Prompt 03 of 18 (UI/UX Design System)  
**Route Pattern:** `/projects/:slug`  
**Theme:** Light Theme Only  

---

## 1. Executive Purpose & Modular Philosophy

The dynamic project case study page (`/projects/:slug`) provides an exhaustive, executive-grade engineering walkthrough of any project in Ravi Dasari’s portfolio. 

### Core Architectural Mandate
* **Universal Single Template:** A single, highly modular React component renders all current and future projects.
* **Graceful Degradation:** Every section is optional. If a project lacks a GitHub link, an architecture diagram, or screenshots, that module collapses seamlessly without empty states or layout shifts.
* **Truthful Status Banners:** The deployment and verification status are pinned prominently to prevent any misrepresentation of project scope.

---

## 2. Page Wireframe & Layout Blueprint

```
+----------------------------------------------------------------------------------------------------+
|  [ <- Back to All Projects ]   /   Projects   /   RoboShop DevSecOps Pipeline                      |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  [DevSecOps & Cloud]  [STATUS: Production Pipeline Automated *]  [FEATURED PROJECT]                |
|                                                                                                    |
|  <h1> RoboShop E-Commerce DevSecOps Pipeline & Infrastructure </h1>                                |
|  <p class="lead"> Automated multi-tier microservices delivery pipeline with integrated SAST/DAST,  |
|     policy-as-code security gates, and zero-downtime Kubernetes deployments. </p>                  |
|                                                                                                    |
|  [ View GitHub Repository -> ]   [ Launch Live Demo -> ] (Disabled if null)                        |
|                                                                                                    |
|  +----------------------------------------------------------------------------------------------+  |
|  | [ HIGH-RESOLUTION COVER IMAGE / HERO DIAGRAM ]                                              |  |
|  | (Pearl frame, soft blue elevation shadow, click to open full-screen lightbox)                 |  |
|  +----------------------------------------------------------------------------------------------+  |
|                                                                                                    |
|  +-------------------------------------------------------+  +-----------------------------------+  |
|  | MAIN CONTENT (65% Width)                              |  | STICKY METADATA SIDEBAR (35%)     |  |
|  | ----------------------------------------------------- |  | --------------------------------- |  |
|  |                                                       |  | At A Glance                       |  |
|  | <h3> 1. Executive Overview </h3>                      |  | Category: DevSecOps & Cloud       |  |
|  | Context, organizational challenge, and engineering    |  | Role: Lead DevSecOps Architect    |  |
|  | scope...                                              |  | Timeline: 2024                    |  |
|  |                                                       |  | Status: Verified Pipeline         |  |
|  | <h3> 2. The Problem & Business Challenge </h3>        |  |                                   |  |
|  | Manual deployments, lack of vulnerability scanning,   |  | Verified Tech Stack               |  |
|  | configuration drift across environments...            |  | [Docker] [Kubernetes] [Jenkins]   |  |
|  |                                                       |  | [Terraform] [SonarQube] [Trivy]   |  |
|  | <h3> 3. Architecture & System Topology </h3>          |  | [AWS] [Vault] [Helm] [Linux]      |  |
|  | Detailed architectural narrative...                   |  |                                   |  |
|  | +---------------------------------------------------+ |  | Key Engineering Outcomes          |  |
|  | | [ INTERACTIVE ARCHITECTURE DIAGRAM VIEWER ]       | |  | * 100% Automated Scanning        |  |
|  | | (Pinch, zoom, pan, full-screen expansion)        | |  | * 65% Reduced Release Duration   |  |
|  | +---------------------------------------------------+ |  | * 0 Critical CVEs in Production   |  |
|  |                                                       |  |                                   |  |
|  | <h3> 4. Technical Challenges & Trade-offs </h3>       |  | Share Project                     |  |
|  | Managing stateful vs stateless microservices, dynamic |  | [LinkedIn]  [X/Twitter]  [Copy]   |  |
|  | test environments, pipeline execution speed...        |  +-----------------------------------+  |
|  |                                                                                                 |
|  | <h3> 5. DevSecOps & Quality Assurance Controls </h3>                                            |
|  | SonarQube quality gates, Trivy container scanning, HashiCorp Vault secrets management...        |
|  |                                                                                                 |
|  | <h3> 6. Implementation Gallery & Screenshots </h3>                                              |
|  | +-----------------------+  +-----------------------+  +-----------------------+                 |
|  | | [Screenshot 1: CI/CD] |  | [Screenshot 2: K8s]   |  | [Screenshot 3: Sonar] |                 |
|  | +-----------------------+  +-----------------------+  +-----------------------+                 |
|  +----------------------------------------------------------------------------------------------+  |
|                                                                                                    |
|  ------------------------------------------------------------------------------------------------  |
|  <h3> Explore Other Engineering Projects </h3>                                                     |
|  +--------------------------------+  +--------------------------------+                            |
|  | [Zynpath — Android Logic Game] |  | [Mandi Ledger — Business App]  |                            |
|  +--------------------------------+  +--------------------------------+                            |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. Mandatory Project Invariants

The template handles the four confirmed portfolio projects according to strict factual grounding:

### Project 1: RoboShop DevSecOps Pipeline
* **Category:** `DevSecOps & Cloud`
* **Status Badge:** `[Production Pipeline Active]`
* **Specific Content:** Deep architectural breakdown of Jenkins, Docker container builds, Kubernetes Helm charts, AWS infrastructure, and Trivy/SonarQube pipeline stages.

### Project 2: Zynpath — Android Spatial Logic Game
* **Category:** `Android Engineering`
* **Status Badge:** `[Google Play Closed Testing ONLY]` *(STRICT: Never claim production release)*
* **Specific Content:** Game architecture, Kotlin Coroutines, Jetpack Compose UI mechanics, Google Play testing track configurations.
* **Links:** Live Demo is omitted or labeled `Internal Test Track Only`; GitHub repository link provided if public.

### Project 3: Mandi Ledger — Android Commodity Accounting
* **Category:** `Android Engineering`
* **Status Badge:** `[Published on Google Play Store]`
* **Specific Content:** Room SQLite offline-first database sync, PDF invoice generation, transactional ledger architecture, Android Material 3 design.
* **Links:** Direct verified Google Play Store badge and URL.

### Project 4: NEXORA Luxury E-Commerce Platform
* **Category:** `E-Commerce Engineering`
* **Status Badge:** `[Interactive Showcase Demo (Static Frontend Only)]`
* **Specific Content:** Ultra-fast client-side catalog navigation, Tailwind CSS animations, Cloudflare Edge delivery.
* **Mandatory Factual Note:** Explicit disclaimer stating that the public demo at `https://nexora.dsecops88.online` is a high-fidelity frontend showcase without a deployed AI backend or live payment checkout.
* **Links:** `https://nexora.dsecops88.online`.

---

## 4. Interactive Diagram Viewer Component

To present complex infrastructure diagrams with extreme clarity:
* **Component:** `ArchitectureViewer`
* **Capabilities:**
  - Double-click or pinch-to-zoom (100% to 400%).
  - Click-and-drag panning.
  - Reset zoom button.
  - High-resolution SVG / WebP rendering.
  - Full-screen lightbox mode.
* **Accessibility:** Fully accessible via keyboard controls (`+` to zoom in, `-` to zoom out, Arrow keys to pan, `Esc` to close full-screen).

---

## 5. Dynamic SEO & Social Share Generation

When crawlers (e.g. LinkedIn, Twitter/X, Slack, Googlebot) request `/projects/:slug`:
* The Cloudflare Worker dynamically populates:
  - `<title>${project.title} | Ravi Dasari Portfolio</title>`
  - `<meta name="description" content="${project.summary}" />`
  - `<meta property="og:title" content="${project.title}" />`
  - `<meta property="og:image" content="${project.coverImage.url}" />`
  - `<meta property="og:type" content="article" />`
  - `<script type="application/ld+json">` containing complete Schema.org `TechArticle` / `SoftwareApplication` metadata.

