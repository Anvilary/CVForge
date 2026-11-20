# CVForge Architecture and Technical Specification

CVForge is a local-first single-page web application built with Next.js (App Router), React 19, TypeScript, and Tailwind CSS. It operates without a backend database, user accounts, or server-side CV storage.

---

## Architectural Principles

1. **Local-First Boundary**: The web server acts strictly as a static asset host. All application logic, including state management, PDF generation, PDF text extraction, heuristic parsing, and ATS scoring, executes exclusively in the user's browser runtime.
2. **Immutable Feature Slices**: Product functionality is organized into modular feature domains under `src/features/` with explicit public interfaces, keeping state management, rendering, and parsing loosely coupled.
3. **Deterministic State Contract**: CV data is validated at every boundary using strict Zod schemas and versioned migration pipelines.

---

## High-Level System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                             BROWSER RUNTIME                                 │
│                                                                             │
│   ┌──────────────────────────┐             ┌────────────────────────────┐   │
│   │     Builder Feature      │             │      Analyzer Feature      │   │
│   │  (Structured CV Editor)  │             │   (ATS Scoring & Review)   │   │
│   └────────────┬─────────────┘             └─────────────▲──────────────┘   │
│                │                                         │                  │
│                ▼                                         │                  │
│   ┌──────────────────────────┐             ┌─────────────┴──────────────┐   │
│   │     CV State Layer       │────────────▶│    PDF Extraction Engine   │   │
│   │ (Zod, Reducer, Storage)  │             │    (pdfjs-dist, Heuristics)│   │
│   └────────────┬─────────────┘             └─────────────▲──────────────┘   │
│                │                                         │                  │
│                ▼                                         │                  │
│   ┌──────────────────────────┐                           │                  │
│   │   PDF Generation Layer   │                           │                  │
│   │  (@react-pdf, pdf-lib)   │                           │                  │
│   └────────────┬─────────────┘                           │                  │
│                │                                         │                  │
│                ▼                                         │                  │
│        [Exported PDF] ───────────────────────────────────┘                  │
│     (with embedded session)                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                               ▲
                        Static │ HTTP GET (HTML, JS, Assets)
                        Assets │ No data uploads
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          NEXT.JS WEB SERVER                                 │
│             (Standalone Node.js / Docker / Cloudflare Tunnel)               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Module Directory Structure

```text
src/
├── app/                  # Next.js App Router endpoints, routes, layouts, metadata
│   ├── page.tsx          # Homepage landing route
│   ├── builder/page.tsx  # CV Builder workbench
│   ├── analyzer/page.tsx # CV Analyzer workbench (canonical route)
│   ├── parser/page.tsx   # Permanent 308 redirect to /analyzer
│   ├── health/route.ts   # System health probe (returns 200 JSON)
│   └── layout.tsx        # Root HTML shell, fonts, and dark theme metadata
│
├── features/             # Domain-driven product feature modules
│   ├── cv/               # Core CV data contract, reducer, persistence, schemas
│   ├── builder/          # Structured section editors, layout settings, preview
│   ├── parser/           # Analyzer workbench, upload handling, diagnostics UI
│   ├── resume-pdf/       # PDF document templates, download buttons, attachments
│   ├── scoring/          # Scoring Method v3, dimension algorithms, diagnostics
│   ├── import-export/    # JSON export/restore, import modals, conflict notices
│   └── home/             # Homepage hero, header, footer, structured metadata
│
├── lib/
│   └── parser/           # Low-level PDF.js extraction, heuristic rules, date parser
│
└── shared/               # Reusable UI primitives, workbench shell, icons, styles
    ├── components/       # WorkbenchShell, Modal, Brand, Icon, Buttons
    ├── hooks/            # useDialogFocus, useMedia, useDevicePixelRatio
    ├── styles/           # CSS tokens, site styles, animations, responsive layout
    └── utils/            # siteConfig, downloadBlob, announce (a11y)
```

---

## State and Data Contract

### 1. The Zod CV Schema (`src/features/cv/model/schemas.ts`)
The single source of truth for CV data is defined by strict Zod schemas:
- `profileSchema`: Personal contact info, links, and professional summary.
- `workExperienceSchema`: Employment history, roles, dates, and bullet points.
- `educationSchema`: Academic degrees, schools, and achievements.
- `projectSchema`: Independent projects, URLs, and descriptions.
- `skillsSchema`: Featured, technical, and soft skill categories.
- `languagesSchema`: Name and proficiency ratings.
- `customSectionSchema`: User-defined sections.
- `settingsSchema`: Document size (A4 / Letter), typography, theme colors, spacing margins, section order, and visibility toggles.
- `cvStateSchema`: Top-level envelope combining `schemaVersion: "1.0.0"`, `resume`, and `settings`.

### 2. State Management (`src/features/cv/state/CVContext.tsx`)
State is managed via React's `useReducer`:
- State updates are dispatched via typed action creators (`updateProfileField`, `addWorkExperience`, `reorderSections`, etc.).
- Actions produce immutable state transitions without side effects.

### 3. Persistence and Schema Migrations (`src/features/cv/persistence/`)
- **Autosave**: After meaningful edits, state is serialized and written to `window.localStorage` under the key `cvforge:state`.
- **Migration Pipeline (`cvMigrations.ts`)**: When reading stored JSON (from `localStorage` or user file import), `migrateCVState(raw)` executes sequentially before schema validation.
- **Forward Compatibility Shield**: If stored state indicates a newer schema version than the running build supports, CVForge refuses to overwrite it, presenting a recovery prompt to preserve user data.
- **Cross-Tab Synchronization**: Listens to the `window.onstorage` event. If an external tab commits changes, the active tab pauses saving to prevent race conditions.

---

## PDF Generation and Embedded Session Pipeline

CVForge uses two distinct PDF workflows:

### A. Live Canvas Preview
- `BuilderPreviewPanel.tsx` feeds the active `CVState` to `ResumePdfDocument.tsx`.
- `@react-pdf/renderer` generates a streaming document tree.
- `pdfjs-dist` renders each page onto an HTML5 canvas inside `PdfCanvasPreview.tsx`.
- Hardware device pixel ratio (DPR) is dynamically tracked to maintain crisp rendering on Retina/HiDPI screens.

### B. PDF Export with Embedded Session
- When the user clicks **Download PDF**:
  1. `@react-pdf/renderer` renders the document to a raw `Blob`.
  2. `embedCVStateAttachment.ts` parses the PDF binary using `pdf-lib`.
  3. It attaches `cvforge-state.json` into the PDF's `/Catalog -> /Names -> /EmbeddedFiles` dictionary (compliant with PDF/A-3 and ISO 32000-1 specifications).
  4. The resulting hybrid document is downloaded. It functions as a standard, printable PDF in any viewer, while retaining the complete original structured state for 100% loss-free restoration in CVForge.

---

## In-Browser Extraction & Heuristic Parsing Engine

When an external PDF is analyzed in `/analyzer`:
1. `validateAnalysisFile.ts` validates file size (<= 15 MB), page count (<= 20), and `%PDF-` signature.
2. `pdfTextExtraction.ts` initializes an isolated `pdfjs-dist` worker, extracting text chunks and baseline coordinates.
3. `extractCVForgeAttachment.ts` probes the document for `cvforge-state.json`:
   - **Found**: Recovers the exact embedded `CVState`.
   - **Absent**: Dispatches the raw text to `heuristicResumeParser.ts`.
4. `heuristicResumeParser.ts` applies pattern-matching algorithms:
   - Identifies candidate name and contact details from the document header.
   - Segregates sections using multi-lingual heading dictionaries (`sectionDetection.ts`).
   - Parses dates, organizations, and bulleted achievements (`sectionExtraction.ts`).
   - Produces a draft `CVState` and an extraction confidence score.

---

## Scoring Engine: Method Version 3 (`src/features/scoring/`)

The scoring engine evaluates candidate resumes deterministically in-browser:
- **No Remote Calls**: All scoring executes locally in milliseconds.
- **Visible Content Normalization**: Scores reflect visible words and lines, preventing inflated scores from hidden metadata.
- **Six Evaluated Dimensions**:
  1. *Completeness*: Contact channels, summary, experience, education, skills.
  2. *Structure*: Standard chronological layout and section balance.
  3. *Clarity*: Strong action verbs, sentence structure, and concise length.
  4. *Impact*: Quantified metrics (percentages, revenue, performance) differentiated from calendar years or software versions.
  5. *ATS-Style Compatibility*: Recognized section headers and machine-readable text stream.
  6. *Parseability (PDF only)*: Selectable text density, absence of letter-spaced words, and clean character encodings.

---

## Security, Privacy, and Network Boundary

- **Network Airgap for CV Data**: CVForge makes **zero** outbound HTTP requests containing CV content, analytics telemetry, or user identifiers.
- **Content Security Policy (CSP)**: The standalone application serves strict CSP headers:
  ```text
  default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' data: blob:; worker-src 'self' blob:; frame-src 'self' blob:; object-src 'none';
  ```
- **Origin Isolation**: Different domain origins (e.g., `localhost` vs `cvforge.anvilary.tools`) maintain independent `localStorage` partitions, ensuring isolation between environments.
