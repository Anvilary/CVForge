# Current Focus: Official Demonstration, Documentation Overhaul, and Release Readiness

## 1. Current State

CVForge is an active Anvilary Tools product featuring a local-first Next.js architecture, verified ATS PDF compatibility, official Anvilary Tools branding, responsive workbench shells, and a full-viewport homepage hero.

Recently completed achievements:
- **Anvilary Main Website Design Parity**: Synchronized CVForge's public-facing header, footer, design tokens, and workbench headers with the official Anvilary Main Website (`Anvilary/Main-Website`). Implemented matching 118px header geometry, illuminated orange borders and radial glows (`--chrome-border-line`, `--chrome-border-glow`), navigation molten underline glow, single-row footer with official Anvilary Tools brand and links, and full-viewport hero protection with dynamic `--site-header-height`.
- **Interactive PDF Hyperlink Architecture**: Resolved PDF link mappings in Work Experience by cleanly decoupling `companyLink` to `organizationLink` on the company name while keeping the role unlinked. Integrated PDF.js link annotation extraction into `pdfRasterizer.ts` and responsive percentage-positioned click overlays into `PdfCanvasPreview.tsx`, ensuring complete link parity between the Builder live preview dock and exported PDF (`workExperiencePdfLink.test.ts`, `builder-preview-links.spec.ts`).
- **Official README Branding & Documentation Synchronization**: Integrated the approved official Anvilary Tools CVForge README banner (`docs/media/cvforge-readme-banner-1920x640.png`) and synchronized all documentation suites (`README.md`, `architecture.md`, `ats-and-pdf.md`, `user-guide.md`, `agent-handoff.md`, `current-focus.md`) to reflect the authoritative local implementation.
- **Real-Time PDF Preview Pipeline**: PDF layout moved into a Web Worker, an adaptive scheduler replaced the fixed 400 ms debounce, zoom/Fit/resize repaint a retained PDF instead of regenerating it, only changed pages are repainted, and the download reuses the displayed PDF. See [Architecture](architecture.md#a-live-canvas-preview) and [performance results](performance/README.md).
- **Product Demonstration**: High-DPI browser recording (animated preview `docs/media/cvforge-demo.webp`, video hosted at [GitHub Issue #4](https://github.com/Anvilary/CVForge/issues/4)) demonstrating the genuine Builder, live preview, PDF export, and Analyzer workflow using synthetic candidate John Doe with unified Anvilary branding and refined focus indicators (108 seconds).
- **Documentation Suite Overhaul**:
  - Main [README.md](../README.md) reorganized as a front door featuring the official banner, demonstration video, quick start, architecture, and documentation directory.
  - Comprehensive [User Guide](user-guide.md) documenting Builder controls, section management, live preview dock, interactive hyperlinks, Analyzer scoring, and recovery.
  - Dedicated [ATS and PDF Specification](ats-and-pdf.md) explaining single-stream reading order, real bullet glyphs, font encodings, PDF link isolation, and Poppler/Ghostscript regression gates.
  - Dedicated [Architecture Guide](architecture.md) documenting the Zod schema contract, reducer, persistence shield, and standalone Docker deployment.
- **Full-Viewport Homepage Hero**: Pure CSS grid implementation ensuring exact fold alignment beneath the sticky navigation header across desktop viewports (`1440x900`, `1280x800`, `1280x720`, `1024x768`) and fluid mobile responsiveness.
- **ATS Remediation & Text Integrity**: Section headings, real bullet glyphs, whole-word wrapping, and Poppler/Ghostscript independent extraction validation.
- **Branding & Layout**: Official CVForge v1.0 mark, Anvilary parent brand footer, and responsive sticky header.

## 2. Release & Production Deployment Status

- **Published Commit**: `a8bc2fe17b5240cf6948f9f889a45eb0f657722e` on `Anvilary/CVForge:main`.
- **GitHub Actions CI**: Run ID `44916567306` passed all lint, typecheck, unit, artifact, accessibility, and Playwright suites.
- **Production Deployment**: Deployed to `hosting-bay` container `cvforge-rc` (`cvforge:a8bc2fe17b52`) on Docker network `edge`.
- **Production Origin**: `https://cvforge.anvilary.tools` active with verified security headers (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy).
- **Endpoint Verification**: All routes (`/`, `/builder`, `/analyzer`, `/health`, `/robots.txt`, `/sitemap.xml`, `/site.webmanifest`) and redirects (`/parser` -> 308 `/analyzer`, `/resume-import` -> 307 `/builder`) verified healthy and operational.

## 3. Immediate Next Steps

- Conduct continuous operational monitoring of `https://cvforge.anvilary.tools` on `hosting-bay`.
- Preserve legacy container isolation and data safety.
- Review future roadmap features against the local-first, browser-only product principles.

## 4. Product Constraints

- Preserve the local-first, browser-only operating model. No backend database, user accounts, or server-side CV storage.
- Preserve the Zod schema data contract, reducer behavior, and backwards-compatible migration pipeline.
- Keep external mutations (commits, pushes, deployments) separately authorized.
