![CVForge, an Anvilary Tools product](docs/media/cvforge-readme-banner-1920x640.png)

# CVForge

**Local-first CV builder and ATS-style CV analyzer.** Create a structured CV with browser autosave, live PDF preview, and portable backups. Then analyze machine readability and get transparent feedback without server-side storage or accounts.

An open-source product from [Anvilary Tools](https://anvilary.tools).

**Live Application:** [cvforge.anvilary.tools](https://cvforge.anvilary.tools)

---

## Product Demonstration

Watch the complete **Builder -> PDF Export -> Analyzer** workflow in action (high-DPI browser recording, 107 seconds):

[![CVForge Official Demonstration](docs/media/cvforge-demo.webp)](https://github.com/user-attachments/assets/1656f534-29c8-459d-a943-b427a51c3f99)

> 📹 **[Click here to watch the full HD demonstration video (MP4, 3.8 MB)](https://github.com/user-attachments/assets/1656f534-29c8-459d-a943-b427a51c3f99)**

<details>
<summary><strong>Video Scene Breakdown & Demonstration Transcript</strong></summary>

1. **Scene 1: Initial Viewport & Navigation (0:00 - 0:04)**: Opening the CVForge homepage, showing the full-viewport hero and launching the Builder through the modal.
2. **Scene 2: Structured CV Creation (0:04 - 0:18)**: Creating John Doe's candidate profile from a blank state (contact details, professional summary) with instant live PDF canvas updates.
3. **Scene 3: Populating Work Experience & Sections (0:18 - 0:34)**: Adding NovaTech Solutions experience with impact bullet points, populating education, projects, skills, and languages.
4. **Scene 4: Live PDF Canvas Preview (0:34 - 0:44)**: Interacting with the live PDF preview, demonstrating interactive company link annotations and dock controls (Zoom In, Fit to Panel).
5. **Scene 5: Typography & Document Customization (0:44 - 0:56)**: Customizing typography (Times serif), accent color (Ember/Copper), and section spacing while keeping standard A4 selected.
6. **Scene 6: Dual Export Pipeline (0:56 - 1:04)**: Exporting the printable PDF with its embedded structured session and downloading a standalone JSON backup.
7. **Scene 7: ATS-Style CV Analyzer (1:04 - 1:12)**: Navigating to `/analyzer` with the compact header, displaying the dashboard in its uninitialized state with literal hyphen `-` placeholders.
8. **Scene 8: Authentic Client-Side ATS Analysis (1:12 - 1:26)**: Uploading the generated PDF to compute the 98/100 ATS score and full dimension breakdown, followed by external PDF parsing.
9. **Scene 9: Closing Brand Card (1:26 - 1:30)**: Product overview and local-first architecture summary.

*Note: All candidate names, employers, and contact details shown in the demonstration are fictional.*
</details>

---

## Why CVForge?

- **Zero Cloud Storage**: Your CV data never leaves your computer. Everything runs in your browser via WebAssembly and client-side JavaScript.
- **No Sign-Up or Accounts**: Start immediately without email registration, passwords, or subscriptions.
- **ATS-Optimized Output**: Generates clean, single-stream, machine-readable PDFs with recognized section headings, standard bullet glyphs, and searchable fonts.
- **Interactive Hyperlinks**: Work Experience company links, project URLs, and profile links render as standard PDF annotations and remain clickable directly in the live preview and in downloaded files.
- **Lossless Portability**: Exported PDFs contain an embedded structured session. Uploading your PDF to CVForge on any device restores your exact structured CV data.
- **Transparent Scoring**: Evaluates candidate resumes across 6 key dimensions using clear, deterministic rules rather than opaque AI models.

---

## Quick Start

You can use CVForge directly without installing anything:

1. **Open the Builder**: Visit [cvforge.anvilary.tools/builder](https://cvforge.anvilary.tools/builder).
2. **Fill Your Information**: Enter your experience, skills, and education while viewing the real-time preview.
3. **Download PDF & JSON**: Click **Download** for your printable resume, and **Export** for a standalone JSON backup.
4. **Analyze Your Document**: Navigate to [cvforge.anvilary.tools/analyzer](https://cvforge.anvilary.tools/analyzer) to inspect ATS parseability, heading clarity, and impact metrics.

---

## Key Features

### CV Builder
- **Structured Sections**: Profile, Work Experience, Education, Projects, Skills, Languages, and Custom Sections.
- **Section Controls**: Up/down reordering, visibility toggling, and custom section renaming.
- **Live Canvas Preview**: The PDF is laid out by `@react-pdf/renderer` in a Web Worker and painted page by page with `pdfjs-dist` onto stable canvases. Edits repaint only the pages that changed, and the download reuses the exact displayed PDF bytes.
- **Interactive PDF Annotations**: Authoritative PDF link annotations are exposed through an accessible, percentage-positioned overlay. Company names, project links, and profile channels are clickable in the live preview with visible keyboard focus and open safely with `noopener noreferrer`.
- **Accurate Work Experience Hyperlinks**: Company URLs attach strictly to the company name; job roles remain clean, non-clickable text, and separators are excluded from hyperlinks.
- **Document Styling**: A4 and US Letter page sizes, typography scale, line-height adjustments, section spacing, and accent themes.

### CV Analyzer
- **Direct or Uploaded Analysis**: Analyze the active Builder CV in memory or upload an external PDF (up to 15 MB, 20 pages).
- **Embedded Session Recovery**: Instant 1-click restoration when a CVForge PDF is uploaded.
- **Review-First Draft Import**: External PDFs are parsed using spatial heuristics; users review extracted fields before replacing local state.
- **Deterministic Scoring (Method v3)**: 100-point evaluation across *Completeness*, *Structure*, *Clarity*, *Impact*, *ATS Compatibility*, and *Parseability*.

---

## Data Ownership & Privacy

| Format | Purpose | Details |
| :--- | :--- | :--- |
| **Browser Storage** | Local autosave | Saved to `localStorage` under `cvforge:state`. Pauses automatically if conflicting edits occur in another tab. |
| **JSON Backup** | Full-fidelity backup | Recommended long-term storage format. Fully portable across browsers and devices. |
| **CVForge PDF** | Printable & restorable export | Carries an embedded `cvforge-state.json` attachment in the PDF catalog for lossless session restoration. |
| **External PDF** | Analysis & heuristic import | Extracted entirely in-browser. Requires user confirmation before updating Builder data. |

> [!IMPORTANT]
> Because CVForge is strictly local-first, clearing browser cookies/site data removes your local autosave. **Always export a JSON backup** after significant edits.

---

## Technology Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Standalone build output)
- **UI & State**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/)
- **Data Validation**: [Zod](https://zod.dev/) schemas and versioned migration pipelines
- **PDF Rendering**: [@react-pdf/renderer](https://react-pdf.org/) (Web Worker) and [pdf-lib](https://pdf-lib.js.org/)
- **PDF Preview & Extraction**: [pdfjs-dist](https://mozilla.github.io/pdf.js/) running in client Web Workers
- **Testing**: [Vitest](https://vitest.dev/) (unit tests), [Playwright](https://playwright.dev/) (end-to-end), and [Axe](https://www.deque.com/axe/) (accessibility)

---

## Local Development

### Prerequisites
- Node.js **22.13 or newer** (below Node 23)
- `pnpm` **10.5.2** (managed via Corepack)

### Setup & Run

```bash
# Clone the repository
git clone https://github.com/Anvilary/CVForge.git
cd CVForge

# Enable pnpm via Corepack
corepack enable
corepack prepare pnpm@10.5.2 --activate

# Install dependencies
pnpm install --frozen-lockfile

# Start development server
make dev
```

Open `http://127.0.0.1:3000` in your browser.

### Verification Commands

```bash
pnpm typecheck           # TypeScript validation
pnpm lint                # ESLint code style
pnpm test:unit           # Vitest unit test suite (36 files, 382 tests)
pnpm test:e2e:chromium   # Playwright end-to-end acceptance tests
pnpm check:em-dash       # Enforce Anvilary prose guidelines
pnpm build               # Production standalone bundle
```

### Local Production Preview

To test the optimized standalone server locally:

```bash
NEXT_PUBLIC_SITE_URL=https://cvforge.anvilary.tools make preview-build
make preview-start       # Starts on http://127.0.0.1:3030
make preview-status
make preview-stop
```

---

## Documentation Directory

- 📖 **[User Guide](docs/user-guide.md)**: Detailed step-by-step guide for Builder, Analyzer, and data recovery workflows.
- 📄 **[ATS and PDF Compatibility](docs/ats-and-pdf.md)**: Technical guide on machine-readable PDF generation, text integrity, and parser limits.
- 🏛️ **[System Architecture](docs/architecture.md)**: Modular design, data contracts, state reducer, and privacy boundaries.
- ⚡ **[Preview Performance](docs/performance/README.md)**: Benchmark methodology, measured latency, and resource trade-offs.
- 🚀 **[Deployment Runbook](docs/deployment.md)**: Standalone Docker builds, Nginx reverse proxy, and Cloudflare Tunnel operations.
- 🔒 **[Clean-Room Specification](docs/clean-room.md)**: Repository origin, independence from third-party derivatives, and licensing policies.
- 🧪 **[Release QA Plan](docs/current-qa-plan.md)**: Complete manual QA checklist, cross-browser matrices, and viewport test plans.

---

## Known Boundaries & Honest Limitations

- **No Commercial ATS Equivalence**: Proprietary ATS platforms (Workday, Taleo, Greenhouse) use differing commercial parsers. CVForge adheres to best-practice text standards but cannot guarantee third-party acceptance.
- **Embedded Session Boundary**: Embedded session restoration is an internal CVForge portability feature using a standard PDF attachment. It allows 100% loss-free restoration within CVForge, but external ATS systems extract the plain text stream rather than reading the embedded session.
- **Heuristic Import Approximation**: External PDFs from arbitrary sources can be structured unpredictably. The heuristic parser creates an editable draft for human review; it does not guarantee perfect reconstruction of external graphic-heavy files.
- **PDF-Only Analyzer**: Image-only scans, DOCX, and plain-text files are not supported. CVForge does not use cloud OCR services.
- **Language Diagnostics**: Deep grammatical and heading diagnostics are explicitly tested for English and Portuguese (Portugal), with language-neutral fallbacks for other languages.
- **Browser Origin Isolation**: Browser security models separate `localStorage` across different domains. Use JSON export/import to move your CV between different URLs or profiles.

---

## License

CVForge is open-source software maintained by [Alexandre Teixeira](https://github.com/alteixeira20) and distributed under the **[MIT License](LICENSE)**.
