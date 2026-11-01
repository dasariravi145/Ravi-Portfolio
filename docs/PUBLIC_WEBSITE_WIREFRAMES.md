# PUBLIC_WEBSITE_WIREFRAMES.md — Public Portfolio Wireframes & Component Specs

**Project:** Ravi Dasari — Premium Dynamic Personal Portfolio  
**Target Domain:** `ravi-portfolio.dsecops88.online`  
**Current Milestone:** Prompt 03 of 18 (UI/UX Design System)  
**Theme:** Light Theme Only  

---

## 1. Global Navigation & Header System

### 1.1 Purpose & Specifications
Provides sticky, persistent orientation and fast navigation across the 11 public sections with minimal visual intrusion.

### 1.2 Layout & Wireframe

```
+----------------------------------------------------------------------------------------------------+
|  [Logo: RD / Ravi Dasari]       [Home] [About] [Skills] [Experience] [Projects] [AI] [Contact]     |
|  [Status: Open to Roles *]                                   [Resume (PDF) v]  [Get in Touch ->]  |
+----------------------------------------------------------------------------------------------------+
```

* **Desktop Viewport (>= 1024px):**
  - Left: Logo icon (`RD` monogram in Royal Blue box with rounded corners) + "Ravi Dasari" brand mark.
  - Center: Horizontal pill menu with subtle hover background (`#EFF6FF`) and active bottom indicator (`#2563EB`).
  - Right: "Resume" button (PDF icon + download) + "Get in Touch" primary pill button (`#2563EB`).
* **Mobile / Tablet Viewport (< 1024px):**
  - Left: Logo monogram + name.
  - Right: Quick Resume button + Hamburger menu trigger (accessible button `aria-expanded="false"`).
  - Mobile Sheet: Slides down with frosted glass background (`rgba(255, 255, 255, 0.98)`), smooth stagger animation for menu items, full-width "Download Resume" and "Contact" buttons.

### 1.3 State & Accessibility
* **Scroll Physics:** Translucent glassmorphic blur activates after 20px scroll (`backdrop-filter: blur(14px); background: rgba(255, 255, 255, 0.85); border-bottom: 1px solid #DCEBFF`).
* **Active Section Highlighting:** IntersectionObserver dynamically underlines the active section.
* **Accessibility:** `nav` landmark, `aria-label="Main Navigation"`, keyboard Tab and Shift+Tab navigation with visible focus rings (`2px solid #2563EB`).

---

## 2. Hero Section (Home)

### 2.1 Purpose & Dynamic Behavior
Introduces Ravi Dasari as an executive-level DevOps, DevSecOps, Cloud, and AI Systems Engineer with instant credibility.

### 2.2 Wireframe Layout

```
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  [Status Pill: Available for Engineering Roles & Consulting *]                                     |
|                                                                                                    |
|  <h1> Architecting Resilient Cloud Systems,             +---------------------------------------+  |
|       Automated DevSecOps & AI Solutions </h1>          |   [Dynamic Avatar Image from R2]      |  |
|                                                         |   (Pearl frame + Cyan/Blue Soft Aura) |  |
|  <p> Senior DevOps & Cloud Infrastructure Engineer      |                                       |  |
|     specializing in enterprise CI/CD, Kubernetes,       |   [Fallback: Executive Avatar SVG]    |  |
|     Java microservices, and autonomous AI agents. </p>  |                                       |  |
|                                                         +---------------------------------------+  |
|  [View Featured Projects ->]  [Download Resume (PDF)]                                              |
|                                                                                                    |
|  [GitHub]  [LinkedIn]  [Email]                                                                     |
|                                                                                                    |
|  +----------------------------------------------------------------------------------------------+  |
|  | [100% CI/CD Automated]    [99.99% Cloud Uptime]    [Multi-Cloud DevSecOps]   [Enterprise AI] |  |
|  +----------------------------------------------------------------------------------------------+  |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

### 2.3 Dynamic Data Handling & Empty States
* **Avatar Handling:** Fetched from `profile.avatar.url`. If `null`, renders an ultra-crisp, geometric SVG monogram avatar with subtle blue gradient.
* **Resume Button Handling:** Fetched from `resume.activeResume`. If `null` or empty:
  - Button state changes to secondary contact trigger ("Request Resume") or gracefully hides without layout shifts.
* **Metrics Banner:** Four key metric pills grounded in verified capabilities.

---

## 3. About Me Section

### 3.1 Purpose & Layout
Communicates engineering philosophy, technical leadership, and cross-functional execution across cloud infrastructure, DevSecOps, Android, and AI.

### 3.2 Wireframe Layout

```
+----------------------------------------------------------------------------------------------------+
|  [SECTION PILL: ABOUT ME]                                                                          |
|  <h2> Bridging Scalable Infrastructure, Security, and Modern Applications </h2>                    |
|                                                                                                    |
|  +-------------------------------------------+  +-----------------------------------------------+  |
|  | Executive Summary & Narrative             |  | Core Engineering Pillars                      |  |
|  |                                           |  |                                               |  |
|  | <p> Dynamic biography paragraph 1... </p> |  | [Pillar 1: DevSecOps & Shift-Left Security]   |  |
|  |                                           |  |  Automated SAST/DAST, policy-as-code.         |  |
|  | <p> Dynamic biography paragraph 2... </p> |  | [Pillar 2: Cloud Infrastructure & SRE]        |  |
|  |                                           |  |  Zero-downtime, Kubernetes, multi-region.    |  |
|  | Location: [Hyderabad / Remote / Global]   |  | [Pillar 3: Full-Stack & Android Engineering]  |  |
|  | Experience: [Verified Years from CMS]     |  |  Offline-first apps, Java microservices.      |  |
|  | Open To: [Full-Time & Select Consulting]  |  | [Pillar 4: AI & Autonomous Workflows]         |  |
|  |                                           |  |  Voice agents, RAG, business automation.      |  |
|  +-------------------------------------------+  +-----------------------------------------------+  |
+----------------------------------------------------------------------------------------------------+
```

---

## 4. Technical Skills Showcase (Dynamic Filter Grid)

### 4.1 Purpose & CMS Integration
Allows technical recruiters and engineering managers to explore Ravi’s verified stack by category. Populated 100% dynamically from `skillCategories` and `skills` in R2.

### 4.2 Wireframe Layout

```
+----------------------------------------------------------------------------------------------------+
|  [SECTION PILL: TECHNICAL SKILLS]                                                                  |
|  <h2> Proven Tools, Frameworks & Infrastructure Stacks </h2>                                       |
|                                                                                                    |
|  [All (48)] [DevSecOps & CI/CD] [Cloud & IaC] [Containers] [Backend & Java] [Android] [AI & Auto] |
|                                                                                                    |
|  +-------------------+  +-------------------+  +-------------------+  +-------------------+        |
|  | [Icon] Kubernetes |  | [Icon] Docker     |  | [Icon] Terraform  |  | [Icon] Jenkins    |        |
|  | [Core Competency] |  | [Core Competency] |  | [Advanced]        |  | [Core Competency] |        |
|  +-------------------+  +-------------------+  +-------------------+  +-------------------+        |
|  +-------------------+  +-------------------+  +-------------------+  +-------------------+        |
|  | [Icon] SonarQube  |  | [Icon] Trivy Scan |  | [Icon] Spring Boot|  | [Icon] Kotlin/Andr|        |
|  | [Advanced]        |  | [Advanced]        |  | [Core Competency] |  | [Published Apps]  |        |
|  +-------------------+  +-------------------+  +-------------------+  +-------------------+        |
|                                                                                                    |
|  * Filter by text search: [ Search skills, e.g. "AWS", "Helm", "Kafka"... ]                        |
+----------------------------------------------------------------------------------------------------+
```

### 4.3 Component & Accessibility Specs
* **Tabs:** Built with `role="tablist"` and keyboard arrow navigation.
* **Skill Card:** White card with `#E2E8F0` border, transitions to `#BFDBFE` with light blue lift on hover.
* **Proficiency Label:** Discrete tag (`Core Competency`, `Advanced`, `Proficient`) with no fabricated percentage bars.

---

## 5. Professional Experience Timeline

### 5.1 Purpose & Wireframe Layout
Renders verified chronological work history from `experience` state in R2.

```
+----------------------------------------------------------------------------------------------------+
|  [SECTION PILL: WORK EXPERIENCE]                                                                   |
|  <h2> Career Timeline & Verified Accomplishments </h2>                                             |
|                                                                                                    |
|   O--- [Senior DevOps & Cloud Engineer]  @ Enterprise Tech Co.                 [2024 - Present]    |
|   |    Location: Remote / India                                                                    |
|   |    * Bullet point 1: Quantified pipeline speedup and security automation...                    |
|   |    * Bullet point 2: Kubernetes cluster management and zero-downtime releases...               |
|   |    Tech Stack: [Kubernetes] [Terraform] [AWS] [GitHub Actions] [SonarQube]                     |
|   |                                                                                                |
|   O--- [Cloud & Infrastructure Engineer] @ Prior Enterprise                    [2022 - 2024]       |
|   |    * Bullet point 1: Infrastructure as code refactoring...                                     |
|   |    Tech Stack: [Docker] [Jenkins] [Linux] [Java] [AWS]                                         |
|   |                                                                                                |
|   O--- [Software Engineer (Java / Backend / Android)]                          [2020 - 2022]       |
|        * Bullet point 1: Developed core microservices and published mobile utilities...            |
+----------------------------------------------------------------------------------------------------+
```

---

## 6. Featured Personal Projects Showcase

### 6.1 Purpose & Mandatory Ground Truth
Dynamic project card grid displaying all projects where `published === true`. Must display the 4 initial verified projects with strict adherence to truthfulness.

### 6.2 Wireframe Layout

```
+----------------------------------------------------------------------------------------------------+
|  [SECTION PILL: FEATURED PROJECTS]                                                                 |
|  <h2> Production Systems, Mobile Applications & Engineering Prototypes </h2>                       |
|                                                                                                    |
|  [Filter: All] [DevSecOps & Cloud] [Android Applications] [E-Commerce Platforms]                   |
|                                                                                                    |
|  +----------------------------------------+  +----------------------------------------+            |
|  | [COVER: RoboShop Pipeline Diagram]     |  | [COVER: Zynpath Game UI Mockup]        |            |
|  | [DevSecOps & Cloud] [FEATURED]         |  | [Android Engineering] [FEATURED]       |            |
|  |                                        |  |                                        |            |
|  | <h3> RoboShop DevSecOps Pipeline </h3> |  | <h3> Zynpath — Logic Puzzle Game </h3> |            |
|  | Fully automated multi-tier micro-      |  | Spatial logic puzzle game with custom  |            |
|  | services CI/CD pipeline with SAST/DAST.|  | mechanics and offline state management.|            |
|  |                                        |  |                                        |            |
|  | STATUS: [Production Pipeline Active]   |  | STATUS: [Google Play Closed Testing *] |            |
|  | Tech: [Docker] [K8s] [Jenkins] [Trivy] |  | Tech: [Kotlin] [Jetpack Compose] [Flow]|            |
|  | [View Case Study ->] [GitHub Link]     |  | [View Case Study ->]                   |            |
|  +----------------------------------------+  +----------------------------------------+            |
|                                                                                                    |
|  +----------------------------------------+  +----------------------------------------+            |
|  | [COVER: Mandi Ledger Android UI]       |  | [COVER: NEXORA E-Commerce Showcase]    |            |
|  | [Android Engineering] [FEATURED]       |  | [E-Commerce Engineering] [FEATURED]    |            |
|  |                                        |  |                                        |            |
|  | <h3> Mandi Ledger Business App </h3>   |  | <h3> NEXORA Luxury E-Commerce </h3>    |            |
|  | Wholesale agricultural ledger with     |  | Interactive modern shopping demo.      |            |
|  | offline sync and PDF invoice engine.   |  | * Note: Demo is static frontend; live  |            |
|  |                                        |  | AI backend & real checkout not active. |            |
|  | STATUS: [Published on Google Play]     |  | STATUS: [Interactive Static Demo]      |            |
|  | Tech: [Android] [Room DB] [Kotlin]     |  | Tech: [TypeScript] [Cloudflare] [Tail] |            |
|  | [View Case Study ->] [Google Play Link]|  | [View Case Study ->] [Live Demo URL]   |            |
|  +----------------------------------------+  +----------------------------------------+            |
+----------------------------------------------------------------------------------------------------+
```

---

## 7. AI Agents & Automation Showcase

### 7.1 Purpose & Status Integrity
Showcases Ravi's modern AI engineering capabilities across 8 dedicated categories with mandatory 4-state status tagging.

### 7.2 Wireframe Layout

```
+----------------------------------------------------------------------------------------------------+
|  [SECTION PILL: AI & AUTOMATION]                                                                   |
|  <h2> Intelligent Agents, Conversational AI & Autonomous Pipelines </h2>                           |
|                                                                                                    |
|  +------------------------------------+  +------------------------------------+                    |
|  | [ICON] AI Agents & Orchestration   |  | [ICON] AI Voice Assistants & Calls |                    |
|  | STATUS: [WORKING PROTOTYPE]        |  | STATUS: [IN ACTIVE DEVELOPMENT]    |                    |
|  | Multi-step tool-use agents with    |  | Real-time voice agents with Web-   |                    |
|  | LangChain and custom logic.        |  | Socket streaming & consent controls|                    |
|  | Tech: [LangChain] [Gemini] [Python]|  | Tech: [WebSockets] [VAD] [TTS/STT] |                    |
|  +------------------------------------+  +------------------------------------+                    |
|  +------------------------------------+  +------------------------------------+                    |
|  | [ICON] Automated Outbound Calling  |  | [ICON] WhatsApp Business Automation|                    |
|  | STATUS: [IN ACTIVE DEVELOPMENT]    |  | STATUS: [WORKING PROTOTYPE]        |                    |
|  | Automated dispatch pipeline with   |  | Webhook-driven auto-responder with |                    |
|  | strict privacy & consent filters.  |  | CRM database synchronization.      |                    |
|  | * Notice: Strict TCPA/consent model|  | Tech: [Meta API] [Node.js] [Webhks]|                    |
|  +------------------------------------+  +------------------------------------+                    |
|                                                                                                    |
|  [Explore Custom AI Consulting ->]                                                                 |
+----------------------------------------------------------------------------------------------------+
```

---

## 8. Engineering Architecture Showcase

### 8.1 Purpose & Wireframe Layout
Interactive technical diagram gallery providing high-resolution architectural walkthroughs.

```
+----------------------------------------------------------------------------------------------------+
|  [SECTION PILL: ARCHITECTURE SHOWCASE]                                                             |
|  <h2> Production System Topologies & Cloud Schemas </h2>                                           |
|                                                                                                    |
|  +-----------------------------------+  +-----------------------------------+                      |
|  | [Thumbnail: DevSecOps Flow]       |  | [Thumbnail: Cloudflare Edge Flow] |                      |
|  | DevSecOps CI/CD Pipeline Topo     |  | Serverless R2 & Worker Edge Topo  |                      |
|  | [Click to Expand & Zoom Pan]      |  | [Click to Expand & Zoom Pan]      |                      |
|  +-----------------------------------+  +-----------------------------------+                      |
+----------------------------------------------------------------------------------------------------+
```
* **Modal Viewer:** Clicking any card opens a full-screen, light-themed Lightbox modal equipped with zoom (+/-), pan, reset, and full caption documentation.

---

## 9. Resume Download Center

### 9.1 Purpose & Wireframe Layout
Provides a reliable, instant download center always linked to the active PDF stored in Cloudflare R2.

```
+----------------------------------------------------------------------------------------------------+
|  [SECTION PILL: RESUME CENTER]                                                                     |
|                                                                                                    |
|  +----------------------------------------------------------------------------------------------+  |
|  | [PDF Document Icon]                                                                          |  |
|  | <h3> Ravi Dasari — Senior DevOps & Cloud Infrastructure Resume (PDF) </h3>                   |  |
|  | Verified credentials, enterprise history, and technical architecture references.             |  |
|  | Last Updated: [Dynamic Date]  |  Format: PDF  |  Size: [Dynamic Size, e.g. 245 KB]            |  |
|  |                                                                                              |  |
|  | [Download PDF Resume ->]       [Preview in Browser Modal]                                    |  |
|  +----------------------------------------------------------------------------------------------+  |
+----------------------------------------------------------------------------------------------------+
```

---

## 10. Contact & Professional Inquiry Form

### 10.1 Purpose & Anti-Spam Security
Allows recruiters and prospective clients to contact Ravi securely without exposing personal email addresses to scrapers.

```
+----------------------------------------------------------------------------------------------------+
|  [SECTION PILL: CONTACT & CONNECT]                                                                 |
|  <h2> Let’s Discuss Infrastructure, DevSecOps or Consulting Opportunities </h2>                     |
|                                                                                                    |
|  +------------------------------------------+  +------------------------------------------------+  |
|  | Direct Inquiries                         |  | Send a Message                                 |  |
|  |                                          |  |                                                |  |
|  | Email: contact@dsecops88.online          |  | Your Name:    [ John Doe                     ] |  |
|  | Location: Hyderabad, India (Global Remote|  | Email:        [ john@example.com             ] |  |
|  | Social: [LinkedIn] [GitHub] [Twitter]    |  | Subject:      [ DevSecOps Opportunity        ] |  |
|  | Status: Immediate Availability           |  | Message:      [ Enter message details...     ] |  |
|  |                                          |  | [ Cloudflare Turnstile: I am human [v] ]       |  |
|  |                                          |  | [ Send Message -> ]                            |  |
|  +------------------------------------------+  +------------------------------------------------+  |
+----------------------------------------------------------------------------------------------------+
```

---

## 11. Public Footer

```
+----------------------------------------------------------------------------------------------------+
|  (C) 2026 Ravi Dasari. All rights reserved. Built on Cloudflare Edge & R2.                          |
|  Status: [ All Systems Operational * ]   [ Back to Top ^ ]   Target: ravi-portfolio.dsecops88.online   |
+----------------------------------------------------------------------------------------------------+
```
* Strictly Light Theme: Pearl-white background (`#F8FAFC`), `#E2E8F0` top border, Slate-600 copy.

