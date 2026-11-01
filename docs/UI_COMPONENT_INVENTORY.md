# UI_COMPONENT_INVENTORY.md — Master Component Specifications

**Project:** Ravi Dasari — Premium Dynamic Personal Portfolio  
**Target Domain:** `ravi-portfolio.dsecops88.online`  
**Current Milestone:** Prompt 03 of 18 (UI/UX Design System)  
**Theme Standard:** Strict Light-Theme Only | WCAG 2.2 AA Compliant  

---

## 1. Action & Button Components

### 1.1 `PrimaryButton`
* **Role:** Main call-to-action ("View Featured Projects", "Save Changes", "Send Message").
* **Visual Tokens:**
  - Base: `background: #2563EB; color: #FFFFFF; border: none; border-radius: 10px; font-weight: 600; font-size: 15px; padding: 12px 24px;`
  - Hover: `background: #1D4ED8; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.28); transform: translateY(-1px);`
  - Active: `transform: scale(0.98); box-shadow: none;`
  - Focus: `outline: 2px solid #2563EB; outline-offset: 3px;`
  - Disabled: `background: #94A3B8; color: #F1F5F9; cursor: not-allowed;`
* **Accessibility:** Native `<button>`, `role="button"`, contrast 4.6:1 (passes AA).

### 1.2 `SecondaryButton`
* **Role:** Secondary actions ("Download Resume", "Request Changes", "Preview").
* **Visual Tokens:**
  - Base: `background: #EFF6FF; color: #2563EB; border: 1px solid #DCEBFF; border-radius: 10px; font-weight: 600; padding: 12px 22px;`
  - Hover: `background: #DBEAFE; border-color: #BFDBFE; transform: translateY(-1px);`
  - Focus: `outline: 2px solid #2563EB; outline-offset: 3px;`
* **Accessibility:** Contrast 5.1:1 on `#EFF6FF` (passes AA).

### 1.3 `DangerButton`
* **Role:** Destructive administrative actions ("Delete Project", "Delete Photo").
* **Visual Tokens:**
  - Base: `background: #DC2626; color: #FFFFFF; border-radius: 10px; font-weight: 600; padding: 10px 20px;`
  - Hover: `background: #B91C1C; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);`
* **Accessibility:** Contrast 4.8:1 on `#DC2626`.

---

## 2. Badges, Indicators & Tag Components

### 2.1 `StatusBadge` (Mandatory AI & Project Status)
Renders the strict factual status across public cards and admin screens.

| Status Enum | Background | Text Color | Border Color | Dot Indicator Color |
| :--- | :--- | :--- | :--- | :--- |
| `Verified Live Implementation` | `#F0FDFA` | `#0F766E` | `#99F6E4` | `#0D9488` (Teal) |
| `Working Prototype` | `#FFFBEB` | `#B45309` | `#FDE68A` | `#D97706` (Amber) |
| `In Active Development` | `#EFF6FF` | `#1D4ED8` | `#BFDBFE` | `#2563EB` (Royal Blue) |
| `Planned Capability` | `#EEF2FF` | `#4338CA` | `#C7D2FE` | `#6366F1` (Indigo) |
| `Google Play Closed Testing ONLY` | `#FEF3C7` | `#92400E` | `#FCD34D` | `#D97706` (Warning Amber)|
| `Published on Google Play` | `#ECFDF5` | `#047857` | `#A7F3D0` | `#059669` (Emerald) |

* **Markup:** `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ..."><span class="w-2 h-2 rounded-full ..." aria-hidden="true"></span>...</span>`

### 2.2 `TechTag`
* **Role:** Renders verified technologies on project cards and experience timelines.
* **Tokens:** `background: #F8FAFC; color: #334155; border: 1px solid #E2E8F0; border-radius: 6px; font-family: 'JetBrains Mono'; font-size: 12px; padding: 4px 8px;`

---

## 3. Card & Showcase Components

### 3.1 `ProjectCard`
* **Props:** `project: Project`, `onCaseStudyClick: () => void`
* **Structure:**
  1. Top: Cover image with aspect ratio 16:9, rounded top corners (`radius-lg`), lazy-loaded with blur-up placeholder.
  2. Badge Row: Category pill + StatusBadge + Featured star (if applicable).
  3. Header: Project title (`Heading 3`, Slate-900).
  4. Body: Short summary text (2-line clamp, Slate-700).
  5. Tag Cloud: First 4 tech tags + "+N more".
  6. Action Footer: "View Case Study ->" link button + GitHub icon link (if available) + Live Demo icon link (if available).
* **Hover State:** Card translates -3px with custom pearl elevation shadow (`--shadow-card-hover`) and `#BFDBFE` border accent.

### 3.2 `AIServiceCard`
* **Props:** `service: AIService`
* **Structure:**
  1. Header: Lucide Icon in royal blue tinted circular container (`#EFF6FF`).
  2. Status: Pinned `StatusBadge` matching verified state.
  3. Title: Service title (`Heading 4`).
  4. Description: Executive explanation of capabilities and technical integration.
  5. Tooling Tags: Models / libraries used (e.g. `Gemini API`, `LangChain`, `WebSockets`).
  6. Consent Notice: Special notice displayed if category is Automated Outbound Calling.

---

## 4. Form & Input Components (Admin CMS & Contact)

### 4.1 `TextInput` & `TextArea`
* **Visual Tokens:**
  - Base: `background: #FFFFFF; color: #0F172A; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 16px; font-size: 15px;`
  - Focus: `border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15); outline: none;`
  - Error: `border-color: #DC2626; box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15);`
* **Sub-components:** Label (`Slate-700`, font-medium), Helper Text (`Slate-500`), Error Message (`#DC2626` with alert icon).

### 4.2 `FileUploadZone`
* **Role:** Handles profile photo, PDF resume, and project screenshot uploads.
* **States:**
  - **Idle:** Dotted border (`2px dashed #CBD5E1`), cloud icon, size/format specifications text.
  - **Dragover:** Highlighted border (`2px dashed #2563EB`), soft blue background (`#EFF6FF`).
  - **Uploading:** Progress bar animation with percentage text.
  - **Success / Active:** Thumbnail preview, filename, file size, "Replace" and "Delete" buttons.
  - **Error:** Red dashed border with human-readable error (e.g., "Invalid file format: strictly PDF required").

---

## 5. Modal & Feedback Components

### 5.1 `ToastNotification`
* **Role:** Transient operational alerts (e.g., "Profile saved successfully", "Conflict detected").
* **Position:** Fixed top-right on desktop (`top-6 right-6`), top-center on mobile.
* **Tokens:** Pearl card with `#E2E8F0` border, soft blue drop shadow, left colored accent strip (Green for success, Red for danger, Amber for warning).

### 5.2 `ConfirmationDialog`
* **Role:** Enforces explicit user confirmation before irreversible mutations (deleting projects, reverting state).
* **Accessibility:** Accessible modal dialog (`role="alertdialog"`), focus trapped within modal, `Esc` key cancels, initial focus placed on safe "Cancel" button.

### 5.3 `PDFViewerModal`
* **Role:** In-browser PDF preview for active resume.
* **Structure:** Modal containing native `<object data="..." type="application/pdf">` with direct fallback download link if browser PDF support is disabled.

---

## 6. Layout & Navigation Components

### 6.1 `HeaderNavbar`
* **Role:** Public sticky glassmorphic navigation header.
* **Tokens:** `background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(14px); border-bottom: 1px solid #DCEBFF;`

### 6.2 `AdminSidebar`
* **Role:** Fixed left navigation for the Admin CMS.
* **Tokens:** `background: #FFFFFF; border-right: 1px solid #E2E8F0; width: 260px;`

### 6.3 `SkeletonLoader`
* **Role:** Shimmer loading state during dynamic data fetching.
* **Tokens:** `background: linear-gradient(90deg, #F1F5F9 0%, #E2E8F0 50%, #F1F5F9 100%); background-size: 200% 100%; animation: shimmer 1.5s infinite;`

