# Machine-Readable PDFs and ATS Compatibility

CVForge is engineered to produce clean, machine-readable PDFs that parse reliably across modern applicant tracking systems (ATS), document extractors, and recruiter search databases.

This document details CVForge's technical approach to PDF generation, text integrity, heuristic extraction, automated test verification, and known limitations.

---

## Technical Approach: Two Distinct PDF Pipelines

CVForge maintains two separate, purpose-built PDF rendering flows:

```text
1. Live Preview Canvas
   Structured CV State ---> @react-pdf/renderer stream ---> pdfjs-dist canvas renderer

2. Exported Download
   Structured CV State ---> @react-pdf/renderer binary ---> pdf-lib session embedding ---> Downloadable PDF
```

1. **Live Preview Pipeline**: Renders in-memory document pages to an HTML5 canvas using `pdfjs-dist`. This avoids DOM discrepancies by verifying that the document model renders identically to real PDF pages during active editing.
2. **Download Pipeline**: Generates the final PDF binary, applies standard PDF document metadata (Author, Title, Creator: `CVForge`), and attaches `cvforge-state.json` via `pdf-lib` into the `/Names -> /EmbeddedFiles` document catalog.

---

## ATS-Oriented Document Architecture

Applicant tracking systems rely on PDF text extractors (such as Poppler `pdftotext`, Ghostscript, Apache Tika, or proprietary OCR/text engines). Incompatible layouts, non-standard fonts, or complex multi-column grids frequently cause extractors to scramble word boundaries, drop section headings, or fuse unrelated columns.

CVForge enforces strict structural rules to maximize parseability:

### 1. Single-Stream Logical Reading Order
- Content is arranged sequentially in top-to-bottom order without multi-column table wraps or overlapping floating layers.
- Left-to-right reading order matches the physical text stream in the PDF content stream.

### 2. Standard Machine-Readable Headings
- Section headings use recognized standard vocabulary (e.g., *Work Experience*, *Education*, *Projects*, *Skills*, *Languages*).
- Headings are written as continuous character strings without artificial letter spacing (tracking). Older systems that tokenize "E X P E R I E N C E" as separate letters fail to detect section boundaries; CVForge outputs clean strings with natural word boundaries.

### 3. Real Bullet Glyphs & Word Wrapping
- Bullet points render using standard Unicode bullet glyphs (`•`, `\u2022`) followed by a standard space character.
- Word wrapping wraps whole words only. CVForge avoids auto-inserted hyphens that cause ATS parsers to index split keywords incorrectly (e.g., "micro-services" instead of "microservices").
- Bullet items and their associated text blocks are protected against split-page stranding.

### 4. Searchable Standard Fonts
- Built-in PDF generation uses standard Type 1 / TrueType fonts (Helvetica, Times New Roman, Courier) with consistent Western European character encodings (`WinAnsiEncoding`).
- All text remains selectable, searchable, and copy-pasteable.

### 5. Quantified Impact Signals
- CVForge's Analyzer evaluates contextual outcome evidence (e.g., percentages, currency, latency reduction, user scale) and distinguishes them from irrelevant numbers like calendar years, software versions, or protocol specifications.

---

## In-Browser PDF Extraction and Parsing

The CVForge Analyzer performs multi-stage text extraction entirely within the client browser:

```text
Uploaded PDF File
       │
       ▼
1. Validation (Signature, MIME, 15 MB / 20 pages limit)
       │
       ▼
2. Extraction (pdfjs-dist text stream + coordinate geometry)
       │
       ├──> [Embedded cvforge-state.json found?] ──> High-Fidelity Session Restore
       │
       └──> [No embedded session] ────────────────> Heuristic Resume Parser
                                                           │
                                                           ▼
                                                    Structured Draft Review
```

### Stage 1: Document Validation
Before reading byte streams, CVForge validates the file magic bytes (`%PDF-`), file size (<= 15 MB), and total page count (<= 20 pages) to protect client memory from denial-of-service or memory bloat.

### Stage 2: Spatial Text Reconstruction
Using `pdfjs-dist`, CVForge extracts text tokens alongside their transform matrices (`x`, `y`, `width`, `height`). It groups tokens into lines based on baseline coordinates, detecting line breaks, paragraph gaps, and indentation patterns.

### Stage 3: Attachment Extraction
CVForge inspects the PDF catalog's `/Names` dictionary for an embedded `cvforge-state.json`. If present and valid, it extracts the original full-fidelity CVForge session.

### Stage 4: Heuristic Section Detection
If no embedded session exists, the heuristic engine processes the reconstructed plain text:
- **Heading Detection**: Regex-matched dictionaries in English and Portuguese identify section headers.
- **Date Range Normalization**: Parses 4-digit years, month-year pairs, and "Present" / "Current" ranges.
- **Contact Extraction**: Validates email RFC formats, international phone patterns, and URL domains.
- **Bullet Point Splitting**: Segregates achievement bullets from role headers.

---

## Compatibility Verification and Regression Gates

CVForge verifies PDF text integrity and ATS extraction through dedicated automated test suites in `tests/`:

1. **pdfTextIntegrity.test.ts**:
   - Asserts that exported PDFs preserve exact typographic punctuation and Western European characters.
   - Verifies that bullet markers never detach from text blocks across page breaks across Helvetica, Times New Roman, and Courier.
2. **cvforgeRoundTrip.test.ts**:
   - Strips the embedded session attachment from a generated PDF and runs the raw document through the heuristic text extractor.
   - Validates that experience roles, dates, bullets, education, and skills are correctly parsed from the raw text stream alone.
3. **pdfIndependentExtractors.test.ts**:
   - Uses external command-line utilities (Poppler `pdftotext` and Ghostscript) during `make release-check` to confirm that third-party non-JavaScript tools extract identical text streams.
4. **phantomSpaces.test.ts**:
   - Verifies that character spacing does not inject phantom space characters or corrupt searchable keywords.

---

## Known Boundaries and Practical Limitations

CVForge is transparent about what it can and cannot do:

- **No Proprietary ATS Equivalence**: There is no universal "ATS standard". Workday, Taleo, Greenhouse, Lever, and iCIMS use distinct parsing libraries with different parsing heuristics. CVForge optimizes for maximum general compatibility with text-based parsers, but cannot guarantee 100% acceptance by every third-party system.
- **Scanned & Image-Only PDFs**: CVForge runs entirely in-browser and does not bundle heavy optical character recognition (OCR) models or call cloud OCR APIs. Scanned image PDFs produce a diagnostic notice advising the user to export a text-based document.
- **Character Set Repertoire**: Built-in standard PDF fonts cover Western European languages (English, Portuguese, Spanish, French, German, etc.). Complex scripts (CJK, Arabic, Cyrillic) require full embedded font support, which is tracked on the product roadmap.
- **Complex External Layouts**: Resumes with multi-column sidebars, infographic progress bars, or nested tables from graphic design tools (e.g., Canva, Photoshop) may have their text streams interleaved or misidentified by heuristic parsing.
