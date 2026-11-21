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

### A. Live Canvas Preview and Interactive Annotations

One authoritative PDF drives both the live preview and the download export. There is no second layout engine or HTML approximation.

```text
CV state ──> revision N ──> UpdateScheduler ──> generation worker ──> PDF N + page keys
                                                                         │
            displayed revision N  <── atomic publish <── PDF.js raster of changed pages
            (with accessible link overlay)
```

Code lives in `src/features/builder/preview/` and `src/features/resume-pdf/`:

| Module | Responsibility |
|---|---|
| `previewEngine.ts` | Owns the revision ledger, the displayed document, and the cycle (generate, rasterize, publish). No DOM or worker code. |
| `updateScheduler.ts` | Decides when a cycle may start. One cycle at a time, one queued follow-up, always the newest state. |
| `pdfGenerationWorker.tsx` | Runs `@react-pdf/renderer` off the main thread and returns the PDF bytes plus one exact key per page. |
| `pdfGenerationClient.ts` | Owns the generation worker: lazy start, job timeout, crash detection, termination, replacement. |
| `pdfPageFingerprints.ts` | Builds the per-page key (page boxes, content stream bytes, resolved resources, annotations). |
| `pdfRasterizer.ts` | Owns the PDF.js worker and open documents. Paints pages into a scratch canvas and extracts authoritative PDF link annotations. |
| `pageCanvasStore.ts` | One stable `<canvas>` per page index, repainted in one synchronous step. |
| `usePdfPreview.ts` | Binds the engine to React with `useSyncExternalStore` and releases it on unmount. |
| `PdfCanvasPreview.tsx` | Houses stable page containers, renders the interactive link annotation overlay, and provides zoom/dock controls. |
| `ResumePdfEntry.tsx` | PDF layout entry component supporting decoupled `titleLink` (role/title) and `organizationLink` (company/school). |
| `ResumePdfWorkSection.tsx` | Work experience section passing `organizationLink={item.companyLink}` so the company name is hyperlinked while the role remains normal text. |

**Revisions.** Every distinct CV state (`resume` or `settings` identity) gets a revision number that only increases. A generated PDF carries the revision it was made from. A result is published only if it is newer than the displayed one, so a stale result can never replace newer content. Publishing paints every changed page and updates the page list in one synchronous step, so the browser never paints a mix of two revisions.

**Scheduling.** The first update after a quiet period starts immediately. During continuous editing, cycle starts are spaced by `1.5 x` the smoothed cost of recent cycles (capped at 250 ms), so the preview follows typing as closely as the machine allows without the pipeline taking over the main thread. Requests that arrive while a cycle runs collapse into one follow-up that reads the newest state. At most one generation job is running and at most one is queued behind it.

**Interactive PDF Annotations.** While PDF.js renders link text visually onto the canvas bitmap, raw canvas pixels lack native hyperlink events and keyboard focus. During document opening in `pdfRasterizer.ts`, `readGeometry` calls `await page.getAnnotations()` to extract authoritative PDF link annotations. Coordinates (`rect: [x1, y1, x2, y2]`) are converted into scale-1 viewport points using `viewport.convertToViewportPoint`. `PdfCanvasPreview.tsx` renders a transparent overlay with `pointer-events-none` over each page, containing native `<a>` elements (`pointer-events-auto`) positioned via CSS percentages (`left: (link.left / pageWidth) * 100%`). This ensures exact alignment across Fit mode, zoom levels (50% to 200%), and mobile panel switching without re-measuring DOM geometry.

**Work Experience Link Architecture.** In `ResumePdfEntry.tsx`, semantic link properties are strictly decoupled: `titleLink` links the job role or degree, while `organizationLink` links the employer or school. `ResumePdfWorkSection.tsx` supplies `organizationLink={item.companyLink}` and omits `titleLink`. Consequently:
1. The company name is hyperlinked with `styles.entryOrgLink` (theme color, weight 400, no text decoration).
2. The role remains clean, normal text.
3. The separator ` · ` is an independent text glyph excluded from the hyperlink.
4. URLs are validated with `resolveEntryLink`, strictly permitting safe `http:` and `https:` schemes and rejecting unsafe protocols (`javascript:`, `data:`, `file:`, `ftp:`) or credentials.

**Display scale is separate from content.** Zoom, Fit, panel width, and device pixel ratio only change the painting scale. The engine keeps the displayed PDF open in PDF.js; after the scale settles (150 ms) it repaints that document at the new scale and never regenerates it. Meanwhile the existing bitmaps are scaled by CSS, so Zoom and Fit respond within a frame and no loader appears.

**Page comparison.** The worker returns one key per page: the exact serialization of the page boxes, rotation, content stream bytes, resolved resources (so a font change alters the key), and annotations. It is not a hash. A page whose key equals the one on screen, at the same geometry and scale, is not repainted. When pagination changes, the pages whose keys changed are repainted together. When a hyperlink URL changes, `pdfPageFingerprints.ts` detects changes in `/Annots`, assigning a new page key and triggering an overlay update even if text remains identical.

**Stable pages.** Page `<canvas>` elements are created once per page index and keep their identity across updates, zoom, and resizing. New pixels are rendered into an offscreen scratch canvas, moved into an `ImageBitmap`, and only completed pages are drawn into the visible canvas. The visible canvas is never cleared separately from the draw.

**Failure recovery.** A generation worker that crashes, errors, or does not answer within 12 s is terminated and replaced. The engine resets the PDF.js worker and retries the update once on its own. After a second failure the displayed pages stay on screen, a status and a Retry button appear, and the next edit or Retry starts a fresh attempt. A document that fails deterministically (a layout error) is not retried automatically.

**Lifecycle.** Unmounting the Builder calls `release()`, which aborts the running cycle, terminates the generation worker, destroys the PDF.js worker and every open document, and drops the page canvases. Leaving the Builder leaves no workers behind. While the preview is hidden (zero measured width, as on the inactive mobile panel) the scheduler is paused and resumes with the newest state when the panel is shown.

**Performance.** On the benchmark machine a single edit on a one or two page CV is visible about 60 ms after the last input (before: about 430 to 460 ms), and no scenario blocks the main thread for a long task (before: up to 495 ms at ten pages). Layout cost in `@react-pdf/renderer` grows with page count (about 25 ms per page), so a ten page document takes roughly 0.5 s to update. Details and limitations: [performance/README.md](performance/README.md).

### B. PDF Export with Embedded Session

- The Download button asks the engine for the displayed document (`exportCurrent`). If a newer edit is still being laid out, the download waits for it, so the file is always a revision that was on screen. The wait covers the state at the moment of the click; later keystrokes are not part of that download.
- The preview's own PDF bytes are used, so nothing is laid out a second time.
- `embedCVStateAttachment.ts` parses those bytes with `pdf-lib` and attaches `cvforge-state.json`, built from the displayed revision's state, into `/Catalog -> /Names -> /EmbeddedFiles` (compliant with PDF/A-3 and ISO 32000-1).
- The resulting hybrid document functions as a standard, printable PDF in any viewer, while retaining the complete original structured state for loss-free restoration in CVForge. All hyperlinks present in the preview are preserved identically in the exported document. Visual identity with the preview is covered by `previewExportFidelity.test.ts` (Poppler rasterization, pixel for pixel) and by Playwright browser test suites.

### Reference

The design draws on Reactive Resume's preview (MIT): PDF generation in a Web Worker, PDF.js rendering of each page into an offscreen canvas that is copied over in one step, a short settle delay before repainting at a new scale, and keeping the last valid document on screen after a failed update. CVForge's implementation is independent. It differs by using explicit revisions, a single bounded scheduler instead of fixed debounces, per-page content keys, a retained document for scale changes, and an export that reuses the displayed bytes. No Reactive Resume code is copied.

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

---

## Anvilary Design System and Surface Parity

CVForge's visual identity is synchronized with the authoritative [Anvilary Main Website](https://anvilary.tools) (`Anvilary/Main-Website`), ensuring complete brand and aesthetic coherence across the product suite:

1. **Shared Token System**:
   - Palette: Dark forge palette (`--bg: #0e0e10`, `--bg-2: #141417`, `--bg-3: #1a1a1e`, `--panel: #16161a`).
   - Accents: Ember (`--ember: #d97442`, `--ember-2: #b8582a`) and Molten (`--molten: #ec8a4a`).
   - Text Tokens: Aligned ink hierarchy (`--ink: #ededea`, `--ink-2: #b8b6b0`, `--ink-3: #8a877f`, `--ink-4: #5a5852`).
   - Container and Layout: Standardized `--container: 1200px` with dynamic header height tracking (`--site-header-height: 118px`).
   - Chrome Surfaces: Shared translucent backdrop (`--chrome-surface: color-mix(in oklab, var(--bg) 88%, transparent)` with `backdrop-filter: blur(14px)`).
   - Illuminated Dividers: Symmetrical orange gradient border line (`--chrome-border-line`) and centered radial glow (`--chrome-border-glow`).

2. **Marketing Chrome (Homepage Header and Footer)**:
   - **Header Geometry**: Desktop 118px height, `ResizeObserver` dynamic height synchronization with `--site-header-height`, 80px brand mark, and container-aligned gutters.
   - **Navigation Interaction**: Navigation links feature a subtle bottom molten glow underline (`.nav-label::after`) with active and hover radiance.
   - **Single-Row Footer**: Standardized single-row layout displaying the official Anvilary Tools parent brand mark, product identity, navigation links, GitHub reference, and copyright.

3. **Workbench Adaptations (Builder and Analyzer)**:
   - Compact app header (56px) preserving maximum vertical workspace for document editing and PDF canvas inspection.
   - Adopts Anvilary chrome surface translucency, blur, illuminated bottom border line, and molten navigation underline without adding unnecessary marketing footers or horizontal scrollbars.

4. **Branding Hierarchy and Intentional Differences**:
   - Header: Emphasizes product identity (CVForge), utilizing the two-tone gradient wordmark (orange "CV" and white "Forge").
   - Footer: Emphasizes parent organization (Anvilary Tools) with the official Anvilary logo and wordmark.
   - Navigation: Tailored specifically to product workflows (`Builder`, `Analyzer`, `Star on GitHub`, `Build your CV`) rather than Main Website showcase links.
   - Relative Positioning: Footer is positioned `relative` at document end to preserve the full-viewport hero fold and avoid obscuring interactive workbench surfaces.
