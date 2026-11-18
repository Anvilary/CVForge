# CVForge Architecture v2 independent audit handoff

The implementation is ready for independent review on `main`. The application revision is `2424d27508b8dae27a03561b100aead46653eb6c`. The commit containing this document is the audit checkout. After synchronizing `main`, verify the checkout with `git rev-parse HEAD` and use that SHA in the Actions run list. This handoff records development validation. Deployment requires a separate decision. [GitHub Actions for main](https://github.com/alteixeira20/CVForge/actions/workflows/validation.yml?query=branch%3Amain)

## Architecture and PR integration

- The six architecture commits run from `6c45db1` through `7f15b3e`. The application runs as one root Next.js app with one pnpm importer. The filesystem migration is in `5d4a874`.
- Routes live in `src/app/`. CV state, schemas, persistence, and import notifications live in `src/features/cv/`. Builder, Analyzer, PDF, scoring, import/export, and home each own their feature code. `src/shared/` holds shared UI, styles, hooks, and utilities. PDF extraction and heuristics live in `src/lib/parser/`.
- Unit tests are colocated. Browser and axe tests live in `tests/e2e/`. The standalone server starts from `.next/standalone/server.js`. Release and isolated runtime checks live in `scripts/`.
- PR #3 was integrated by merge `25a033588f96798eb24e00e2fd2d52d6aad454fa`. Its second parent is the original PR head `5db0a61b05cd1655d26ffdb552bc059b296ca86d`. Work experience uses the optional `companyLink` value. Historical `workExperience[].link` extension values remain opaque and survive restore and editing. Project and work title annotations, and existing entry subtitles, use the same HTTP(S) URL validation. [PR #3](https://github.com/alteixeira20/CVForge/pull/3)

## Data and behavior contracts

- CV JSON schema remains `1.0.0`. Browser persistence uses `cvforge:state` and `cvforge:state:recovery`. Preserve migration order, unknown fields in passthrough objects, last saved data on failed writes, and the explicit cross-tab conflict resolution.
- Embedded sessions use `cvforge-state.json` with MIME type `application/json`. Generated PDF text remains selectable. External PDF drafts require review before import.
- CV data and PDF workers stay in the browser. Analyzer limits remain 15 MB and 20 pages. Scoring uses deterministic method v3. Production metadata uses `https://cvforge.anvilary.tools`. Keep `/parser` → `/analyzer` (308) and `/resume-import` → `/builder` (307).

## Dependency remediation

| Original finding | Locked update |
|---|---|
| Next.js image optimizer (GHSA-2464-fhr4-w9xw), Server Actions (GHSA-p3m5-59mp-jv5r), and cache advisories (GHSA-4jqv-mc3x-m676, GHSA-mcj8-r9mp-w47p) | `next` and matching `eslint-config-next` 15.5.26 → 15.5.28 |
| Sharp native SVG decoder (GHSA-wq5f-xc86-pv6w) | `sharp` 0.35.4 → 0.35.5, with matching native libraries |
| Zod resource consumption (GHSA-mrhx-c7xc-m3w5) | `zod` 4.4.3 → 4.6.6 |
| PostCSS transitive source map parser (GHSA-68fv-2mgg-jv7q) | `source-map-js` 1.2.1 → 1.2.2 |

The full audit also identified nine development findings in Vitest's mocker and Vite, Tailwind's selector parser, and the TypeScript ESLint glob dependency. Vitest is 4.1.12, Vite 8.1.6, postcss-selector-parser 6.1.5, and the scoped TypeScript ESLint 8.73.0 update resolves minimatch 11.0.9. The root manifest has the same set of direct dependencies. Both the production and full audits reported zero findings for the final lockfile.

The standalone runtime exposes the image optimizer. The original native SVG advisories depend on runtime conditions that vary across hosts. The app uses App Router without Server Actions or a root catch-all and has no user-supplied source-map path. Zod validates user imports in the browser. These observations bound the review of the original versions and the patched versions remain locked across environments.

## Local validation evidence

- Node.js 22.23.1 and pnpm 10.5.2. The frozen install, TypeScript, ESLint, and both repository policy checks passed.
- `pnpm test:unit` passed 168 tests. `pnpm test:e2e:chromium` passed 102 tests including axe, privacy, restore, and raw PDF annotation checks. Firefox and WebKit passed 14 smoke tests.
- `make release-check` passed with the production origin embedded in local builds. Standalone and isolated Docker probes verified health, static assets, Sharp WebP output, and the compatibility redirects. `pnpm audit` and `pnpm audit-prod` passed.
- Reproduce the complete gate with `CI=1 PLAYWRIGHT_SKIP_BROWSER_GC=1 NEXT_PUBLIC_SITE_URL=https://cvforge.anvilary.tools PLAYWRIGHT_PORT=49202 DOCKER_PORT=49203 make release-check` using unused loopback ports. `pnpm audit` also checks the development graph.

## Independent review scope

- Inspect storage recovery on interrupted or failed writes, cross-tab conflict timing, and repeated navigation during parsing and preview updates.
- Review PDF worker lifetime, resource limits, malformed imports, document compatibility, and contact-link rendering alongside the updated entry links.
- Review exposure of the standalone server and edge configuration, framework and image-optimizer defenses, and the trust boundary around browser-side JSON and PDF processing.
- Conduct the separate manual accessibility, UX, performance, and operational rollout review. Automated results cover the scenarios listed above.
