# ADMIN_DASHBOARD_WIREFRAMES.md — Secure Admin CMS Wireframes & Workflows

**Project:** Ravi Dasari — Premium Dynamic Personal Portfolio  
**Target Domain:** `ravi-portfolio.dsecops88.online`  
**Current Milestone:** Prompt 03 of 18 (UI/UX Design System)  
**Theme:** Light Theme Only  

---

## 1. Master Admin Shell Layout

The administrative workspace is structured for intuitive, zero-code content operations. It maintains a clean pearl-white aesthetic with crisp borders and zero dark surfaces.

```
+----------------------------------------------------------------------------------------------------+
|  [Logo: RD CMS]  [Search Content...]                 [Live Site ->]  [Ravi Dasari (Owner)] [Logout]|
+-------------------+--------------------------------------------------------------------------------+
|  NAVIGATION       |  PAGE HEADER: [ Section Title ]                  [ Action: Save Changes v ]    |
|  ---------------- |  ----------------------------------------------------------------------------  |
|  [Dashboard]      |                                                                                |
|  [Profile]        |  MAIN CONTENT VIEWPORT                                                         |
|  [Resume]         |  (Dynamic forms, drag-and-drop uploaders, tables, editors)                     |
|  [Projects]       |                                                                                |
|  [Skills]         |                                                                                |
|  [Experience]     |                                                                                |
|  [AI Services]    |                                                                                |
|  [Certifications] |                                                                                |
|  [Settings & SEO] |                                                                                |
|  [Backups]        |                                                                                |
|  ---------------- |                                                                                |
|  Status: Healthy  |                                                                                |
|  Storage: 182 MB  |                                                                                |
+-------------------+--------------------------------------------------------------------------------+
```

* **Desktop Viewport (>= 1024px):** Fixed 260px left sidebar with active blue pills (`#EFF6FF` background, `#2563EB` text and left accent bar), top header with instant link to public site, and spacious main scroll area.
* **Mobile / Tablet Viewport (< 1024px):** Sidebar collapses into a slide-over drawer triggered by a top-left hamburger menu. Bottom sticky action bar on forms for easy thumb access.

---

## 2. Authentication Screen (`/admin/login`)

```
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|                               +------------------------------------+                               |
|                               |  [ Monogram: RD CMS ]              |                               |
|                               |  <h3> Admin Authentication </h3>   |                               |
|                               |  <p> Ravi Dasari Portfolio CMS </p>|                               |
|                               |                                    |                               |
|                               |  Master Passphrase:                |                               |
|                               |  [ ****************************** ]|                               |
|                               |                                    |                               |
|                               |  [ Sign In to CMS -> ]             |                               |
|                               |                                    |                               |
|                               |  Security: PBKDF2 Web Crypto       |                               |
|                               |  Attempts Remaining: 5 / 5         |                               |
|                               +------------------------------------+                               |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```
* **Design Features:** Centered pearl card (`#FFFFFF`) on soft ambient background (`#F3F8FF`), single password field, instant error banner on invalid credentials, rate-limit attempt counter.

---

## 3. Dashboard Overview Screen (`/admin`)

```
+----------------------------------------------------------------------------------------------------+
|  <h2> Welcome Back, Ravi </h2>                                                                     |
|  <p> Live overview of your portfolio content, published status, and storage metrics. </p>          |
|                                                                                                    |
|  +-------------------+  +-------------------+  +-------------------+  +-------------------+        |
|  | Published Projects|  | Draft Projects    |  | Verified Skills   |  | AI Capabilities   |        |
|  | 4 Active          |  | 1 Draft           |  | 48 Categorized    |  | 8 Defined         |        |
|  | [View All ->]     |  | [Review Drafts ->]|  | [Manage Skills ->]|  | [Edit Services ->]|        |
|  +-------------------+  +-------------------+  +-------------------+  +-------------------+        |
|                                                                                                    |
|  +--------------------------------------------+  +-----------------------------------------------+ |
|  | Active Resume Status                       |  | Recent State Updates & Backups                | |
|  | File: Ravi_Dasari_Resume.pdf               |  | Version: v42 (Active)                         | |
|  | Size: 245 KB  |  Uploaded: 2 days ago      |  | Last Modified: Today, 02:00 AM by Owner       | |
|  | Status: [PUBLISHED & LIVE]                 |  | Total Snapshots: 14 Restorable Points         | |
|  | [Preview PDF]  [Replace Resume]            |  | [Open Backup Browser ->]                      | |
|  +--------------------------------------------+  +-----------------------------------------------+ |
+----------------------------------------------------------------------------------------------------+
```

---

## 4. Profile Management Screen (`/admin/profile`)

```
+----------------------------------------------------------------------------------------------------+
|  <h2> Personal Profile & Contact Information </h2>                                                 |
|                                                                                                    |
|  +----------------------------------------+  +---------------------------------------------------+ |
|  | Profile Avatar Management              |  | Core Information                                  | |
|  |                                        |  |                                                   | |
|  | [ Current Photo Preview: 160x160 ]     |  | Full Name: [ Ravi Dasari                        ] | |
|  | (Pearl frame + circular crop)          |  | Headline:  [ Senior DevSecOps & Cloud Engineer  ] | |
|  |                                        |  | Location:  [ Hyderabad, India                   ] | |
|  | Drag & Drop New Photo (Max 5MB):       |  | Contact:   [ contact@dsecops88.online           ] | |
|  | +------------------------------------+ |  | Status:    [ Available for Engineering Roles v  ] | |
|  | | [Cloud Icon] Drop WebP/PNG/JPEG    | |  |                                                   | |
|  | | or [ Browse File... ]              | |  | Executive Summary:                                | |
|  | +------------------------------------+ |  | [ Multi-line biographical narrative...          ] | |
|  |                                        |  |                                                   | |
|  | [ Replace Photo ]  [ Delete Photo ]    |  | Social Links:                                     | |
|  | (Deleting reverts to default avatar)   |  | GitHub:   [ https://github.com/...              ] | |
|  +----------------------------------------+  | LinkedIn: [ https://linkedin.com/in/...         ] | |
|                                              +---------------------------------------------------+ |
|                                                                                                    |
|  [ Save Profile Changes ]  (Instant edge cache purge on save)                                      |
+----------------------------------------------------------------------------------------------------+
```

---

## 5. Resume Management Screen (`/admin/resume`)

```
+----------------------------------------------------------------------------------------------------+
|  <h2> Resume Management & Version Control </h2>                                                    |
|                                                                                                    |
|  +----------------------------------------------------------------------------------------------+  |
|  | Active Published Resume: [ Ravi_Dasari_Resume.pdf ]  Size: 245 KB  |  Format: Strict PDF      |  |
|  | Public Download URL: https://ravi-portfolio.dsecops88.online/api/public/resume/download           |  |
|  | [ View in Full-Screen PDF Modal ]   [ Download Active File ]                                  |  |
|  +----------------------------------------------------------------------------------------------+  |
|                                                                                                    |
|  Upload Replacement Resume (PDF Only, Max 10MB):                                                   |
|  +----------------------------------------------------------------------------------------------+  |
|  | [PDF Icon] Drag and drop updated PDF resume here, or [ Select PDF Document ]                 |  |
|  | * Auto-archives existing active resume to backups and updates public link immediately.       |  |
|  +----------------------------------------------------------------------------------------------+  |
|                                                                                                    |
|  <h3> Version Audit History </h3>                                                                  |
|  | Version Tag | Filename                  | Uploaded Date     | File Size | Actions            |  |
|  | v2026.1     | Ravi_Dasari_Resume.pdf    | Oct 31, 2026      | 245 KB    | [Active]           |  |
|  | v2025.4     | Ravi_Dasari_Resume_v4.pdf | Sep 15, 2026      | 238 KB    | [Download Archive] |  |
|  | v2025.3     | Ravi_Dasari_Resume_v3.pdf | Jun 02, 2026      | 220 KB    | [Download Archive] |  |
+----------------------------------------------------------------------------------------------------+
```

---

## 6. Projects Management Screen (`/admin/projects`)

### 6.1 Project List View
```
+----------------------------------------------------------------------------------------------------+
|  <h2> Projects Management </h2>                      [ + Create New Project ]                      |
|                                                                                                    |
|  [ Search projects... ]  Filter by Category: [ All Categories v ]  Status: [ All v ]               |
|                                                                                                    |
|  | Drag | Title                   | Category         | Status         | Featured | Actions         |
|  | :::  | RoboShop DevSecOps      | DevSecOps & Cloud| [PUBLISHED]    | [ * YES ]| [Edit] [Delete] |
|  | :::  | Zynpath Puzzle Game     | Android Eng.     | [CLOSED TEST]  | [ * YES ]| [Edit] [Delete] |
|  | :::  | Mandi Ledger Business   | Android Eng.     | [PUBLISHED]    | [ * YES ]| [Edit] [Delete] |
|  | :::  | NEXORA Luxury E-Com     | E-Commerce Eng.  | [STATIC DEMO]  | [ * YES ]| [Edit] [Delete] |
|                                                                                                    |
|  * Reorder projects by dragging the [:::] handle. Order changes persist automatically.             |
+----------------------------------------------------------------------------------------------------+
```

### 6.2 Project Editor View (`/admin/projects/:id`)
```
+----------------------------------------------------------------------------------------------------+
|  [ <- Back to Projects ]  <h2> Edit Project: RoboShop DevSecOps </h2>       [ Publish Status: ON v]|
|                                                                                                    |
|  Project Title:    [ RoboShop E-Commerce DevSecOps Pipeline & Infrastructure                     ] |
|  URL Slug:         [ roboshop-devsecops                 ] (auto-generated, URL safe)               |
|  Category:         [ DevSecOps & Cloud                v ] Featured on Homepage: [ [v] Enabled ]     |
|  Deployment Status:[ Production Pipeline Automated      ] Display Order:        [ 0               ] |
|                                                                                                    |
|  Short Summary:                                                                                    |
|  [ High-level overview displayed on the public card...                                           ] |
|                                                                                                    |
|  Tech Stack Tags:  [ Docker (x) ] [ Kubernetes (x) ] [ Jenkins (x) ] [ + Add Tag                 ] |
|  GitHub URL:       [ https://github.com/ravi-dasari/roboshop-devsecops                           ] |
|  Live Demo URL:    [                                    ] (leave blank if not applicable)          |
|                                                                                                    |
|  Media Uploads:                                                                                    |
|  Cover Image:          [ Current: roboshop-cover.webp ]  [ Replace Cover Image ]                   |
|  Architecture Diagram: [ Current: roboshop-arch.webp  ]  [ Replace Diagram ]                       |
|  Screenshot Gallery:   [ 4 Images Uploaded            ]  [ + Add Screenshots ]                     |
|                                                                                                    |
|  Full Case Study (Markdown Supported):                                                             |
|  [Tabs: Write | Preview]                                                                           |
|  +----------------------------------------------------------------------------------------------+  |
|  | ## Problem Statement                                                                         |  |
|  | The multi-tier architecture required automated security scanning...                           |  |
|  |                                                                                              |  |
|  | ## Solution Architecture                                                                     |  |
|  | Implemented automated Jenkins pipelines with SonarQube quality gates...                     |  |
|  +----------------------------------------------------------------------------------------------+  |
|                                                                                                    |
|  [ Save Project Changes ]  [ Delete Project (Danger) ]                                             |
+----------------------------------------------------------------------------------------------------+
```

---

## 7. Skills Management Screen (`/admin/skills`)

```
+----------------------------------------------------------------------------------------------------+
|  <h2> Skills & Competencies Management </h2>                [ + Add Skill ]  [ + New Category ]    |
|                                                                                                    |
|  CATEGORY: [ DevSecOps & Security ] (Order: 1)  [Edit Category] [Delete Category]                  |
|  ------------------------------------------------------------------------------------------------  |
|  | Drag | Skill Name      | Proficiency Level     | Icon Identifier | Featured | Actions       |  |
|  | :::  | SonarQube       | [ Core Competency v ] | sonarqube       | [v]      | [Edit][Delete]|  |
|  | :::  | Trivy Security  | [ Advanced        v ] | shield-check    | [v]      | [Edit][Delete]|  |
|  | :::  | HashiCorp Vault | [ Advanced        v ] | key-round       | [ ]      | [Edit][Delete]|  |
|                                                                                                    |
|  CATEGORY: [ Cloud Platforms & Infrastructure ] (Order: 2)                                         |
|  ------------------------------------------------------------------------------------------------  |
|  | Drag | Skill Name      | Proficiency Level     | Icon Identifier | Featured | Actions       |  |
|  | :::  | AWS Services    | [ Core Competency v ] | cloud           | [v]      | [Edit][Delete]|  |
|  | :::  | Terraform (IaC) | [ Core Competency v ] | binary          | [v]      | [Edit][Delete]|  |
+----------------------------------------------------------------------------------------------------+
```

---

## 8. AI Services Management Screen (`/admin/ai-services`)

```
+----------------------------------------------------------------------------------------------------+
|  <h2> AI Agents & Automation Capabilities </h2>                  [ + Add New AI Capability ]       |
|                                                                                                    |
|  | Service Title                   | Category               | Mandatory Implementation Status   |  |
|  | Autonomous AI Agents            | AI Agents              | [ VERIFIED LIVE IMPLEMENTATION v] |  |
|  | Automated Outbound Calling      | Automated Outbound AI  | [ IN ACTIVE DEVELOPMENT        v] |  |
|  | Voice Conversational Assistant  | AI Voice Assistants    | [ WORKING PROTOTYPE            v] |  |
|  | WhatsApp Business Automation    | WhatsApp Automation    | [ WORKING PROTOTYPE            v] |  |
|  | Enterprise CRM Workflow Engine  | AI Workflow Automation | [ PLANNED CAPABILITY           v] |  |
|                                                                                                    |
|  * Strict Rule: Status must truthfully reflect engineering state. Never mark unbuilt as live.      |
+----------------------------------------------------------------------------------------------------+
```

---

## 9. Site Settings, Backups & Disaster Recovery (`/admin/settings`)

```
+----------------------------------------------------------------------------------------------------+
|  <h2> Global Site Settings & Disaster Recovery </h2>                                               |
|                                                                                                    |
|  Site Title:          [ Ravi Dasari — Senior DevSecOps & Cloud Engineer Portfolio                ] |
|  Meta Description:    [ Executive engineering portfolio showcasing enterprise cloud infrastructure...]|
|  Contact Email:       [ contact@dsecops88.online                                                 ] |
|  Turnstile Site Key:  [ 0x4AAAAAA...                                                             ] |
|                                                                                                    |
|  <h3> Snapshot Backups & 1-Click Rollback </h3>                                                    |
|  | Timestamp               | Version | File Size | Triggered By         | Action                 | |
|  | Today, 02:00:12 AM      | v42     | 28.4 KB   | Pre-Project Edit     | [ Restore Snapshot ]   | |
|  | Yesterday, 11:45:00 PM  | v41     | 27.9 KB   | Resume Replace       | [ Restore Snapshot ]   | |
|  | Oct 30, 2026, 04:12 PM  | v40     | 27.1 KB   | Skills Reorder       | [ Restore Snapshot ]   | |
|                                                                                                    |
|  [ Purge Cloudflare Edge Cache Manually ]   [ Download Full JSON State Backup ]                    |
+----------------------------------------------------------------------------------------------------+
```

---

## 10. Admin Interaction Feedback Systems

### 10.1 Concurrency Conflict Dialog (HTTP 409)
* When two tabs attempt to mutate state simultaneously:
  - **Modal Banner:** `[!] CONFLICT DETECTED: Another session updated the portfolio content while you were editing.`
  - **Action:** `[ Reload Fresh State ]` (prevents data loss).

### 10.2 Delete Confirmation Modal
* Any deletion of a project, resume, or category triggers an explicit modal requiring confirmation:
  - `"Are you sure you want to delete RoboShop DevSecOps? This will remove all associated media from R2 storage. This action cannot be undone."`
  - Buttons: `[ Cancel ]` (neutral) and `[ Delete Project ]` (danger red `#DC2626`).

