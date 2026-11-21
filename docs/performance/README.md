# Preview performance

Measured with `tooling/bench-preview.mjs` (`pnpm bench:preview -- --url <origin> --label <name> --out <file>`), which drives the real Builder in headless Chromium with isolated synthetic CVs. Stage timings come from `pv:*` User Timing measures; visible latency, long tasks, canvases, workers, and memory are observed from outside. Pass `--pin <earlier.json>` to reuse an earlier run's fixtures. `tooling/compare-preview-bench.mjs <before> <after>` prints the full comparison (`preview-comparison.md`).

- `preview-baseline.json`: revision 77a63a8 (fixed 400 ms debounce, main-thread generation) with `pv:*` instrumentation added.
- `preview-after.json`: the pipeline described in [architecture.md](../architecture.md#a-live-canvas-preview).
- Machine: AMD Ryzen 7 250, 16 threads, 28 GiB, Linux 7.0, Chromium 151 headless, 1440x900 at pixel ratio 1, Node 22. Fixtures: 5, 10, 31, and 63 work items giving 1, 2, 5, and 10 A4 pages (5 and 10 verified by the harness; 1 and 2 pages were confirmed by canvas count in the after run, the baseline run predates that field). 8 runs per scenario, so p95 is close to the maximum; treat p95 as indicative.
- The baseline was measured on a busier machine than the after run for the 5 and 10 page sizes. A re-run of typing-normal and zoom on an idle machine agreed within about 10 percent (`quietRecheck` in the baseline file), so the recorded values stand.
- "PDF generation" is main-thread blocking time in the baseline and a worker round trip in the after run, so the two rows are not the same quantity; the long-task rows are the comparable measure of main-thread blocking.

## Headline results (p50 / p95, ms, last input to latest content visible)

| Document | Typing before | Typing after | Rapid typing before | Rapid typing after | Longest main-thread task before / after (p95) |
|---|---|---|---|---|---|
| 1 page | 422 / 433 | 62 / 71 | 471 / 487 | 136 / 183 | 0 / 0 |
| 2 pages | 462 / 474 | 11 / 62 | 525 / 544 | 129 / 180 | 59 / 0 |
| 5 pages | 615 / 666 | 209 / 268 | 666 / 728 | 278 / 415 | 171 / 0 |
| 10 pages | 934 / 1187 | 490 / 779 | 1046 / 1172 | 657 / 841 | 495 / 0 |

Zoom and panel resize: the page layout changes within one or two frames (14 ms and 31 ms, same as before). The sharper bitmap arrives about 200 to 390 ms later instead of 480 to 1020 ms, and no PDF is regenerated (before: one generation per zoom step).

Input responsiveness is not affected: input to state commit p95 stays at 3 to 7 ms and input to next paint p95 at 14 to 34 ms (target 50 ms). No blank, loader, or page-less frames were recorded in any scenario, before or after.

## Measured limitations

- Typical one or two page CVs reach the update target (p95 around 150 ms) for single edits, but not for rapid typing (about 180 ms p95).
- PDF layout in `@react-pdf/renderer` is the remaining bottleneck: about 25 ms per page, so five pages take about 135 ms and ten pages about 325 ms inside the worker. An edit can wait for the job already running, so large documents can take up to about twice that. It no longer blocks the main thread.
- Cold first preview is slower: 570 ms vs 480 ms (1 page) and 1199 ms vs 994 ms (10 pages), because the generation worker must load and warm up before the first PDF.
- Resident browser memory after a typing session is about 100 to 170 MiB higher (second worker). Main-thread JS heap is lower (7 vs 13 MiB) and page canvases are no longer duplicated.
- Not reproducible in headless Playwright: tab backgrounding and genuine low-memory conditions. CPU throttling (40x) is covered by a test.
