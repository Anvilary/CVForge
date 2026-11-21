# CVForge User Guide

CVForge by [Anvilary](https://anvilary.tools) is a local-first CV builder and ATS-style CV analyzer. This guide covers the complete application workflows for creating, customizing, exporting, analyzing, and recovering CV documents.

---

## Table of Contents

- [Core Principles](#core-principles)
- [CV Builder](#cv-builder)
  - [Starting or Resuming a CV](#starting-or-resuming-a-cv)
  - [Editing Sections](#editing-sections)
  - [Section Management (Reorder & Visibility)](#section-management-reorder--visibility)
  - [Custom Sections](#custom-sections)
  - [Live PDF Preview](#live-pdf-preview)
  - [Document Settings & Styling](#document-settings--styling)
  - [Exporting PDF and JSON](#exporting-pdf-and-json)
- [CV Analyzer](#cv-analyzer)
  - [Analyzing the Active Builder CV](#analyzing-the-active-builder-cv)
  - [Uploading a PDF File](#uploading-a-pdf-file)
  - [Analyzing CVForge-Generated PDFs (Embedded Session)](#analyzing-cvforge-generated-pdfs-embedded-session)
  - [Analyzing External PDFs](#analyzing-external-pdfs)
  - [Understanding the Scoring Method](#understanding-the-scoring-method)
  - [Extraction Diagnostics & Warnings](#extraction-diagnostics--warnings)
  - [Review-First Import Draft](#review-first-import-draft)
- [Data Storage and Recovery](#data-storage-and-recovery)
  - [Browser Local Storage (Autosave)](#browser-local-storage-autosave)
  - [Cross-Tab Synchronization & Conflict Protection](#cross-tab-synchronization--conflict-protection)
  - [Corrupt or Newer Schema Protection](#corrupt-or-newer-schema-protection)
  - [Backup Hierarchy](#backup-hierarchy)

---

## Core Principles

1. **Local-First Execution**: All text editing, PDF generation, text extraction, parsing, and scoring run inside your web browser. No CV data, contact details, or uploaded PDFs are transmitted to a backend server or external API.
2. **Deterministic & Explainable**: ATS-style checks and scoring dimensions use documented, transparent rules rather than black-box AI approximations.
3. **Review Before Replacement**: External data never silently replaces your current CV. You always review imported fields before confirming changes.

---

## CV Builder

The Builder provides a responsive two-column workbench: structured form editors on the left, and a real-time PDF canvas preview on the right.

### Starting or Resuming a CV

When opening CVForge or clicking **Build your CV**:
- If you have an existing CV in this browser, CVForge immediately restores it.
- Opening the **Start with CVForge** dialog provides three paths:
  - **Continue current CV**: Open your in-progress CV.
  - **Start a new CV**: Clears the editor to begin fresh. If unsaved content exists, a confirmation prompt prevents accidental loss.
  - **Restore or import**: Opens the import modal to restore a JSON backup or a reviewed PDF draft.

### Editing Sections

The Builder organizes CV data into structured cards:
- **Personal Profile**: Full Name, Phone, Email, Location, LinkedIn, GitHub, Personal Website, and Professional Summary.
- **Work Experience**: Job Title, Company, Company Link (optional website or repository URL), Location, Date Range, and bullet-point descriptions of achievements and responsibilities. The company name becomes an interactive hyperlink in both preview and export, while the role remains plain text.
- **Education**: Degree/Certificate, Institution, Location, Date Range, and honors or relevant coursework.
- **Projects**: Project Name, URL link, Date Range, and descriptive bullets.
- **Skills**: Categorized into Featured Skills, Technical Skills, and Soft Skills.
- **Languages**: Language Name and Proficiency level (e.g., Native, Fluent, Professional).

### Section Management (Reorder & Visibility)

Each section card header features control actions:
- **Up / Down Arrows**: Adjust vertical section order in the generated PDF.
- **Visibility Toggle (Eye icon)**: Temporarily hide a section from the PDF export without deleting its contents.
- **Custom Section Titles**: Rename any default section title (e.g., rename "Work Experience" to "Professional Experience").

### Custom Sections

Need sections for *Certifications*, *Publications*, *Volunteer Work*, or *Patents*?
1. Click **Add Custom Section** at the bottom of the section list.
2. Enter a custom title.
3. Add structured entries with title, subtitle, date range, and bullet points.

### Live PDF Preview

The preview panel renders your CV using the exact `@react-pdf/renderer` document pipeline that generates the final exported file:
- **Instant Updates**: Text edits and spacing changes immediately reflect in the preview canvas.
- **Interactive Hyperlinks**: Valid web links (profile links, company URLs, project repositories) are interactive directly within the preview canvas, opening safely in a new tab.
- **Zoom & Fit Controls**: The bottom-right dock provides Zoom In, Zoom Out, and Fit-to-Width controls.
- **Page Transitions**: Multi-page documents display all pages sequentially with clear page boundaries.

### Document Settings & Styling

Located in the **Document Settings** card:
- **Page Format**: Toggle between standard **A4** (210 x 297 mm) and **US Letter** (8.5 x 11 in).
- **Typography**: Select typography pairings (e.g., Lexend) and adjust base font size, name size, and heading scale.
- **Accent Theme**: Customize document accent color and top header bar height.
- **Spacing Freedom**: Fine-tune section spacing, entry spacing, and line height to balance page fit without text clipping.
- **Compact Mode**: Tighten margins and padding when fitting detailed content onto a target page count.

### Exporting PDF and JSON

- **Download PDF**: Generates the machine-readable, ATS-compatible PDF file. It embeds a complete structured session attachment (`cvforge-state.json`) inside the PDF document catalog for seamless future recovery, while preserving all interactive hyperlinks exactly as shown in the preview.
- **Export JSON**: Downloads the full-fidelity raw JSON state file. **This is the primary recommended long-term backup format.**

---

## CV Analyzer

The Analyzer assesses document structure, parseability, quantified impact, and ATS-style compatibility without sending files across the network.

### Analyzing the Active Builder CV

Click **Analyze** directly from the Builder preview dock (or navigate to `/analyzer?source=builder`). The Analyzer evaluates your active browser CV state in memory, skipping file conversion.

### Uploading a PDF File

Drag and drop or select any PDF file (up to **15 MB and 20 pages**). The Analyzer validates file signatures locally before extraction begins.

### Analyzing CVForge-Generated PDFs (Embedded Session)

When you upload a PDF exported by CVForge:
1. The Analyzer detects the embedded `cvforge-state.json` attachment.
2. It displays a **CVForge Session Found** card with a **Restore Session** button.
3. Scoring evaluates the high-fidelity structured data alongside extracted text signals.
4. Clicking **Restore Session** loads the exact original CV directly into the Builder.

### Analyzing External PDFs

When an external (non-CVForge) PDF is uploaded:
1. In-browser `pdfjs-dist` extracts selectable text, spatial coordinates, and line streams.
2. The heuristic engine reconstructs candidate profile fields, work history, education, and skills.
3. A **Review Import Draft** button appears, allowing you to preview the extracted draft before importing it into the Builder.

### Understanding the Scoring Method

CVForge uses **Scoring Method v3**, a deterministic, 100-point evaluation across key dimensions:

| Dimension | Uploaded PDF Weight | Builder CV Weight | What It Checks |
| :--- | :---: | :---: | :--- |
| **Completeness** | 18% | 23% | Contact details, full name, professional summary, education, and skills presence. |
| **Structure** | 16% | 20% | Standard chronological hierarchy, section separation, date consistency, and logical ordering. |
| **Clarity** | 16% | 20% | Concise action verbs, readable sentence lengths, and absence of jargon clutter. |
| **Impact** | 18% | 23% | Contextual metrics (percentages, revenue, latency reduction, user scale) vs bare years or versions. |
| **ATS-Style Compatibility** | 10% | 14% | Standard recognized section headings, single-column reading order, machine-parseable text. |
| **Parseability** | 22% | N/A *(PDF only)* | Selectable text density, absence of letter-spaced words ("E X P E R I E N C E"), character encoding. |

> [!NOTE]
> Scoring is rule-based and educational. Scores provide actionable guidance to improve resume clarity and ATS parseability; they do not guarantee hiring outcomes or commercial ATS acceptance.

### Extraction Diagnostics & Warnings

The Extraction Analysis panel reports diagnostic signals:
- **Selectable Text Check**: Flags scanned or image-only PDFs that contain no extractable text.
- **Heading Recognition**: Validates standard headings in English and Portuguese (with neutral fallback for other languages).
- **Line Fragmentation & Reading Order**: Detects complex multi-column layouts that may scramble text streams in older ATS parsers.

### Review-First Import Draft

When importing an external PDF, clicking **Review Import Draft** displays a side-by-side comparison modal:
- Shows exactly which sections were detected and parsed.
- Highlights unassigned or ambiguous text snippets.
- Allows you to accept or discard individual sections before updating your Builder state.

---

## Data Storage and Recovery

### Browser Local Storage (Autosave)

Your CV is automatically saved to `window.localStorage` under the key `cvforge:state` whenever you pause editing. No remote servers hold a copy.

### Cross-Tab Synchronization & Conflict Protection

If you open CVForge in multiple browser tabs:
- Edits in one tab notify other tabs via the `storage` event.
- If conflicting edits occur simultaneously, CVForge pauses automatic overwrite and alerts you, protecting your in-progress work.

### Corrupt or Newer Schema Protection

If stored data cannot be parsed (e.g., written by a future version of CVForge or modified externally):
- The app refuses to silently overwrite it.
- A **Saved Data Recovery** banner offers a direct **Download saved data** button, ensuring you can preserve raw JSON content before deciding to start fresh.

### Backup Hierarchy

| Priority | Method | When to Use | Recovery Fidelity |
| :---: | :--- | :--- | :--- |
| **1** | **JSON Backup** | After every significant edit session. | **100% full-fidelity restore.** |
| **2** | **Exported PDF** | When distributing your CV or moving devices. | **100% full-fidelity** via embedded attachment. |
| **3** | **External PDF Import** | When starting from an existing external resume. | **Best-effort heuristic draft** (requires user review). |
