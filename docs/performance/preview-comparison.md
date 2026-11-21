# Preview benchmark: baseline-77a63a8 vs after-pipeline

Before: http://127.0.0.1:3031, 2026-11-20T14:48:20.804Z, 151.0.7922.34
After: http://127.0.0.1:3030, 2026-11-20T15:36:17.218Z, 151.0.7922.34

## 1-page document (5 work items)

| Cold first preview, p50 (ms) | 479.9 | 570.6 | +19% |

#### typing-normal

| Metric | Before | After | Change |
|---|---|---|---|
| Last input to latest content visible, p50 (ms) | 422.4 | 61.6 | -85% |
| Last input to latest content visible, p95 (ms) | 432.5 | 71.1 | -84% |
| Scheduling delay, p50 (ms) | 400.1 | 0 | -100% |
| PDF generation (round trip on main thread), p50 (ms) | 37.9 | 27.8 | -27% |
| PDF.js document load, p50 (ms) | 2 | 0.8 | -60% |
| Page rasterization, p50 (ms) | 23.3 | 21.7 | -7% |
| Longest main-thread task, p95 (ms) | 0 | 0 | same |
| Main-thread long-task time per run, p50 (ms) | 0 | 0 | same |
| Input to state commit, p95 (ms) | 2.6 | 4.3 | +65% |
| Input to next paint, p95 (ms) | 18 | 22.7 | +26% |
| Canvases created per run, p50 | 1 | 0 | -100% |
| Blank frames (total) | 0 | 0 | same |

#### typing-rapid

| Metric | Before | After | Change |
|---|---|---|---|
| Last input to latest content visible, p50 (ms) | 471.1 | 135.5 | -71% |
| Last input to latest content visible, p95 (ms) | 487.2 | 182.5 | -63% |
| Scheduling delay, p50 (ms) | 400.2 | 101.5 | -75% |
| PDF generation (round trip on main thread), p50 (ms) | 37.9 | 43.7 | +15% |
| PDF.js document load, p50 (ms) | 1.3 | 2.9 | +123% |
| Page rasterization, p50 (ms) | 23.6 | 44.3 | +88% |
| Longest main-thread task, p95 (ms) | 0 | 0 | same |
| Main-thread long-task time per run, p50 (ms) | 0 | 0 | same |
| Input to state commit, p95 (ms) | 2.5 | 3.1 | +24% |
| Input to next paint, p95 (ms) | 10 | 28.6 | +186% |
| Canvases created per run, p50 | 1 | 0 | -100% |
| Blank frames (total) | 0 | 0 | same |

#### paste-paragraph

| Metric | Before | After | Change |
|---|---|---|---|
| Last input to latest content visible, p50 (ms) | 512.5 | 80.3 | -84% |
| Last input to latest content visible, p95 (ms) | 552.9 | 128.8 | -77% |
| Scheduling delay, p50 (ms) | 400.1 | 0 | -100% |
| PDF generation (round trip on main thread), p50 (ms) | 37.4 | 38.2 | +2% |
| PDF.js document load, p50 (ms) | 1.2 | 0.8 | -33% |
| Page rasterization, p50 (ms) | 38.9 | 34 | -13% |
| Longest main-thread task, p95 (ms) | 0 | 0 | same |
| Main-thread long-task time per run, p50 (ms) | 0 | 0 | same |
| Input to state commit, p95 (ms) | 5.2 | 5.2 | -0% |
| Input to next paint, p95 (ms) | 14.5 | 14 | -3% |
| Canvases created per run, p50 | 2 | 0 | -100% |
| Blank frames (total) | 0 | 0 | same |

#### delete-content

| Metric | Before | After | Change |
|---|---|---|---|
| Last input to latest content visible, p50 (ms) | 475.3 | 113.8 | -76% |
| Last input to latest content visible, p95 (ms) | 482.5 | 138.3 | -71% |
| Scheduling delay, p50 (ms) | 400.1 | 66.4 | -83% |
| PDF generation (round trip on main thread), p50 (ms) | 30.3 | 48.8 | +61% |
| PDF.js document load, p50 (ms) | 1.4 | 1.2 | -14% |
| Page rasterization, p50 (ms) | 26 | 35 | +35% |
| Longest main-thread task, p95 (ms) | 0 | 0 | same |
| Main-thread long-task time per run, p50 (ms) | 0 | 0 | same |
| Input to state commit, p95 (ms) | 2.5 | 3.4 | +36% |
| Input to next paint, p95 (ms) | 12.4 | 22.3 | +80% |
| Canvases created per run, p50 | 1 | 0 | -100% |
| Blank frames (total) | 0 | 0 | same |

#### change-typography

| Metric | Before | After | Change |
|---|---|---|---|
| Last input to latest content visible, p50 (ms) | 484.4 | 82.6 | -83% |
| Last input to latest content visible, p95 (ms) | 516.1 | 115.9 | -78% |
| Scheduling delay, p50 (ms) | 400.1 | 0 | -100% |
| PDF generation (round trip on main thread), p50 (ms) | 34.6 | 34.1 | -1% |
| PDF.js document load, p50 (ms) | 0.9 | 0.8 | -11% |
| Page rasterization, p50 (ms) | 26.4 | 30.3 | +15% |
| Longest main-thread task, p95 (ms) | 0 | 0 | same |
| Main-thread long-task time per run, p50 (ms) | 0 | 0 | same |
| Input to state commit, p95 (ms) | n/a | n/a | n/a |
| Input to next paint, p95 (ms) | n/a | n/a | n/a |
| Canvases created per run, p50 | 1 | 0 | -100% |
| Blank frames (total) | 0 | 0 | same |

#### change-spacing

| Metric | Before | After | Change |
|---|---|---|---|
| Last input to latest content visible, p50 (ms) | 479.7 | 82.7 | -83% |
| Last input to latest content visible, p95 (ms) | 494.6 | 88.5 | -82% |
| Scheduling delay, p50 (ms) | 400.1 | 0 | -100% |
| PDF generation (round trip on main thread), p50 (ms) | 32.6 | 37.8 | +16% |
| PDF.js document load, p50 (ms) | 0.9 | 0.8 | -11% |
| Page rasterization, p50 (ms) | 21.7 | 28.6 | +32% |
| Longest main-thread task, p95 (ms) | 0 | 0 | same |
| Main-thread long-task time per run, p50 (ms) | 0 | 0 | same |
| Input to state commit, p95 (ms) | 3.5 | 5.7 | +63% |
| Input to next paint, p95 (ms) | 17.9 | 14.9 | -17% |
| Canvases created per run, p50 | 1 | 0 | -100% |
| Blank frames (total) | 0 | 0 | same |

#### toggle-visibility

| Metric | Before | After | Change |
|---|---|---|---|
| Last input to latest content visible, p50 (ms) | 454.9 | 61.7 | -86% |
| Last input to latest content visible, p95 (ms) | 499.7 | 81.4 | -84% |
| Scheduling delay, p50 (ms) | 400.2 | 0.1 | -100% |
| PDF generation (round trip on main thread), p50 (ms) | 18.9 | 16.8 | -11% |
| PDF.js document load, p50 (ms) | 0.8 | 0.8 | -0% |
| Page rasterization, p50 (ms) | 21.5 | 17.5 | -19% |
| Longest main-thread task, p95 (ms) | 0 | 0 | same |
| Main-thread long-task time per run, p50 (ms) | 0 | 0 | same |
| Input to state commit, p95 (ms) | n/a | n/a | n/a |
| Input to next paint, p95 (ms) | n/a | n/a | n/a |
| Canvases created per run, p50 | 1 | 0 | -100% |
| Blank frames (total) | 0 | 0 | same |

#### reorder-sections

| Metric | Before | After | Change |
|---|---|---|---|
| Last input to latest content visible, p50 (ms) | 499.8 | n/a | n/a |
| Last input to latest content visible, p95 (ms) | 499.8 | n/a | n/a |
| Scheduling delay, p50 (ms) | 400.2 | 0.1 | -100% |
| PDF generation (round trip on main thread), p50 (ms) | 29.5 | 37.6 | +27% |
| PDF.js document load, p50 (ms) | 1.2 | 0.8 | -33% |
| Page rasterization, p50 (ms) | 21.9 | 0 | -100% |
| Longest main-thread task, p95 (ms) | 0 | 0 | same |
| Main-thread long-task time per run, p50 (ms) | 0 | 0 | same |
| Input to state commit, p95 (ms) | n/a | n/a | n/a |
| Input to next paint, p95 (ms) | n/a | n/a | n/a |
| Canvases created per run, p50 | 1 | 0 | -100% |
| Blank frames (total) | 0 | 0 | same |

#### zoom

| Metric | Before | After | Change |
|---|---|---|---|
| Layout change visible, p50 (ms) | 14.4 | 13.9 | -3% |
| Sharper bitmap visible, p50 (ms) | 484.4 | 196.4 | -59% |
| PDF generations per run, p50 | 1 | 0 | -100% |
| Longest main-thread task, p95 (ms) | 0 | 0 | same |

#### panel-resize

| Metric | Before | After | Change |
|---|---|---|---|
| Layout change visible, p50 (ms) | 36.9 | 30.6 | -17% |
| Sharper bitmap visible, p50 (ms) | 506.8 | 210.1 | -59% |
| PDF generations per run, p50 | 1 | 0 | -100% |
| Longest main-thread task, p95 (ms) | 0 | 0 | same |

#### Resources after the typing-normal runs

| Metric | Before | After |
|---|---|---|
| rssBeforeMiB | 655.3 | 675.8 |
| rssPeakMiB | 804 | 936.8 |
| rssAfterMiB | 742.4 | 883 |
| heapBeforeMiB | 11.3 | 5.8 |
| heapAfterMiB | 13.1 | 7 |
| dedicatedWorkers | 1 | 2 |
| liveCanvasObjects | 4 | 3 |
| attachedCanvases | 2 | 2 |
| totalCanvasesCreated | 11 | 2 |
| totalOffscreenCreated | 0 | 1 |
| totalWorkersCreated | 1 | 2 |

## 2-page document (10 work items)

| Cold first preview, p50 (ms) | 534.5 | 561.7 | +5% |

#### typing-normal

| Metric | Before | After | Change |
|---|---|---|---|
| Last input to latest content visible, p50 (ms) | 461.9 | 11.4 | -98% |
| Last input to latest content visible, p95 (ms) | 473.9 | 62.1 | -87% |
| Scheduling delay, p50 (ms) | 400.2 | 7.3 | -98% |
| PDF generation (round trip on main thread), p50 (ms) | 58 | 43.7 | -25% |
| PDF.js document load, p50 (ms) | 1.9 | 0.7 | -63% |
| Page rasterization, p50 (ms) | 44.4 | 18.8 | -58% |
| Longest main-thread task, p95 (ms) | 59 | 0 | -100% |
| Main-thread long-task time per run, p50 (ms) | 0 | 0 | same |
| Input to state commit, p95 (ms) | 2.6 | 3.6 | +38% |
| Input to next paint, p95 (ms) | 18.1 | 17.3 | -4% |
| Canvases created per run, p50 | 2 | 0 | -100% |
| Blank frames (total) | 0 | 0 | same |

#### typing-rapid

| Metric | Before | After | Change |
|---|---|---|---|
| Last input to latest content visible, p50 (ms) | 525.3 | 129.4 | -75% |
| Last input to latest content visible, p95 (ms) | 543.7 | 179.9 | -67% |
| Scheduling delay, p50 (ms) | 400.2 | 107.2 | -73% |
| PDF generation (round trip on main thread), p50 (ms) | 60.1 | 73 | +21% |
| PDF.js document load, p50 (ms) | 1.7 | 2.3 | +35% |
| Page rasterization, p50 (ms) | 47.3 | 51.6 | +9% |
| Longest main-thread task, p95 (ms) | 66 | 0 | -100% |
| Main-thread long-task time per run, p50 (ms) | 0 | 0 | same |
| Input to state commit, p95 (ms) | 2.5 | 3.3 | +32% |
| Input to next paint, p95 (ms) | 10 | 25.2 | +152% |
| Canvases created per run, p50 | 2 | 0 | -100% |
| Blank frames (total) | 0 | 0 | same |

#### paste-paragraph

| Metric | Before | After | Change |
|---|---|---|---|
| Last input to latest content visible, p50 (ms) | 541.4 | 111.5 | -79% |
| Last input to latest content visible, p95 (ms) | 611.7 | 137.3 | -78% |
| Scheduling delay, p50 (ms) | 400.2 | 0 | -100% |
| PDF generation (round trip on main thread), p50 (ms) | 61.7 | 59.7 | -3% |
| PDF.js document load, p50 (ms) | 2.5 | 0.9 | -64% |
| Page rasterization, p50 (ms) | 47.4 | 32.9 | -31% |
| Longest main-thread task, p95 (ms) | 90 | 0 | -100% |
| Main-thread long-task time per run, p50 (ms) | 0 | 0 | same |
| Input to state commit, p95 (ms) | 3.7 | 4.2 | +14% |
| Input to next paint, p95 (ms) | 14.4 | 14 | -3% |
| Canvases created per run, p50 | 2 | 0 | -100% |
| Blank frames (total) | 0 | 0 | same |

#### delete-content

| Metric | Before | After | Change |
|---|---|---|---|
| Last input to latest content visible, p50 (ms) | 524.8 | 111 | -79% |
| Last input to latest content visible, p95 (ms) | 590.5 | 128.7 | -78% |
| Scheduling delay, p50 (ms) | 400.2 | 68 | -83% |
| PDF generation (round trip on main thread), p50 (ms) | 60 | 65.1 | +8% |
| PDF.js document load, p50 (ms) | 1.5 | 1.2 | -20% |
| Page rasterization, p50 (ms) | 49.9 | 32.8 | -34% |
| Longest main-thread task, p95 (ms) | 82 | 0 | -100% |
| Main-thread long-task time per run, p50 (ms) | 0 | 0 | same |
| Input to state commit, p95 (ms) | 2.6 | 3.4 | +31% |
| Input to next paint, p95 (ms) | 14.5 | 21.9 | +51% |
| Canvases created per run, p50 | 2 | 0 | -100% |
| Blank frames (total) | 0 | 0 | same |

#### change-typography

| Metric | Before | After | Change |
|---|---|---|---|
| Last input to latest content visible, p50 (ms) | 534.3 | 134.2 | -75% |
| Last input to latest content visible, p95 (ms) | 567.2 | 164 | -71% |
| Scheduling delay, p50 (ms) | 400.2 | 0 | -100% |
| PDF generation (round trip on main thread), p50 (ms) | 58.1 | 56.3 | -3% |
| PDF.js document load, p50 (ms) | 1.3 | 1 | -23% |
| Page rasterization, p50 (ms) | 50.5 | 43.5 | -14% |
| Longest main-thread task, p95 (ms) | 56 | 0 | -100% |
| Main-thread long-task time per run, p50 (ms) | 0 | 0 | same |
| Input to state commit, p95 (ms) | n/a | n/a | n/a |
| Input to next paint, p95 (ms) | n/a | n/a | n/a |
| Canvases created per run, p50 | 2 | 0 | -100% |
| Blank frames (total) | 0 | 0 | same |

#### change-spacing

| Metric | Before | After | Change |
|---|---|---|---|
| Last input to latest content visible, p50 (ms) | 542.4 | 116.7 | -78% |
| Last input to latest content visible, p95 (ms) | 571.1 | 136 | -76% |
| Scheduling delay, p50 (ms) | 400.2 | 0 | -100% |
| PDF generation (round trip on main thread), p50 (ms) | 59.4 | 51.5 | -13% |
| PDF.js document load, p50 (ms) | 1.4 | 0.8 | -43% |
| Page rasterization, p50 (ms) | 52.2 | 49.1 | -6% |
| Longest main-thread task, p95 (ms) | 69 | 0 | -100% |
| Main-thread long-task time per run, p50 (ms) | 0 | 0 | same |
| Input to state commit, p95 (ms) | 6.3 | 5 | -21% |
| Input to next paint, p95 (ms) | 18.1 | 18.9 | +4% |
| Canvases created per run, p50 | 2 | 0 | -100% |
| Blank frames (total) | 0 | 0 | same |

#### toggle-visibility

| Metric | Before | After | Change |
|---|---|---|---|
| Last input to latest content visible, p50 (ms) | 449.4 | 63.9 | -86% |
| Last input to latest content visible, p95 (ms) | 549.2 | 116.8 | -79% |
| Scheduling delay, p50 (ms) | 400.2 | 0 | -100% |
| PDF generation (round trip on main thread), p50 (ms) | 14.2 | 15.5 | +9% |
| PDF.js document load, p50 (ms) | 0.8 | 1 | +25% |
| Page rasterization, p50 (ms) | 21.4 | 26.4 | +23% |
| Longest main-thread task, p95 (ms) | 59 | 0 | -100% |
| Main-thread long-task time per run, p50 (ms) | 0 | 0 | same |
| Input to state commit, p95 (ms) | n/a | n/a | n/a |
| Input to next paint, p95 (ms) | n/a | n/a | n/a |
| Canvases created per run, p50 | 1 | 0 | -100% |
| Blank frames (total) | 0 | 0 | same |

#### reorder-sections

| Metric | Before | After | Change |
|---|---|---|---|
| Last input to latest content visible, p50 (ms) | 549.8 | n/a | n/a |
| Last input to latest content visible, p95 (ms) | 549.8 | n/a | n/a |
| Scheduling delay, p50 (ms) | 400.2 | 0 | -100% |
| PDF generation (round trip on main thread), p50 (ms) | 59.4 | 53 | -11% |
| PDF.js document load, p50 (ms) | 1.2 | 0.9 | -25% |
| Page rasterization, p50 (ms) | 45.1 | 0 | -100% |
| Longest main-thread task, p95 (ms) | 64 | 0 | -100% |
| Main-thread long-task time per run, p50 (ms) | 0 | 0 | same |
| Input to state commit, p95 (ms) | n/a | n/a | n/a |
| Input to next paint, p95 (ms) | n/a | n/a | n/a |
| Canvases created per run, p50 | 2 | 0 | -100% |
| Blank frames (total) | 0 | 0 | same |

#### zoom

| Metric | Before | After | Change |
|---|---|---|---|
| Layout change visible, p50 (ms) | 14.2 | 14.4 | +1% |
| Sharper bitmap visible, p50 (ms) | 533.2 | 213.7 | -60% |
| PDF generations per run, p50 | 1 | 0 | -100% |
| Longest main-thread task, p95 (ms) | 64 | 0 | -100% |

#### panel-resize

| Metric | Before | After | Change |
|---|---|---|---|
| Layout change visible, p50 (ms) | 26.6 | 27.4 | +3% |
| Sharper bitmap visible, p50 (ms) | 544.2 | 227.1 | -58% |
| PDF generations per run, p50 | 1 | 0 | -100% |
| Longest main-thread task, p95 (ms) | 62 | 0 | -100% |

#### Resources after the typing-normal runs

| Metric | Before | After |
|---|---|---|
| rssBeforeMiB | 656.8 | 687.6 |
| rssPeakMiB | 806.6 | 975.5 |
| rssAfterMiB | 707.9 | 919.7 |
| heapBeforeMiB | 11.5 | 5.9 |
| heapAfterMiB | 13.3 | 7.1 |
| dedicatedWorkers | 1 | 2 |
| liveCanvasObjects | 7 | 4 |
| attachedCanvases | 3 | 3 |
| totalCanvasesCreated | 21 | 3 |
| totalOffscreenCreated | 0 | 1 |
| totalWorkersCreated | 1 | 2 |

## 5-page document (31 work items)

| Cold first preview, p50 (ms) | 693.9 | 805.9 | +16% |

#### typing-normal

| Metric | Before | After | Change |
|---|---|---|---|
| Last input to latest content visible, p50 (ms) | 614.8 | 208.7 | -66% |
| Last input to latest content visible, p95 (ms) | 666.4 | 268.4 | -60% |
| Scheduling delay, p50 (ms) | 400.1 | 121.7 | -70% |
| PDF generation (round trip on main thread), p50 (ms) | 136.4 | 136.5 | -0% |
| PDF.js document load, p50 (ms) | 1.3 | 0.8 | -38% |
| Page rasterization, p50 (ms) | 98.9 | 24.1 | -76% |
| Longest main-thread task, p95 (ms) | 171 | 0 | -100% |
| Main-thread long-task time per run, p50 (ms) | 118 | 0 | -100% |
| Input to state commit, p95 (ms) | 3.1 | 4.4 | +42% |
| Input to next paint, p95 (ms) | 19.1 | 19.4 | +2% |
| Canvases created per run, p50 | 5 | 0 | -100% |
| Blank frames (total) | 0 | 0 | same |

#### typing-rapid

| Metric | Before | After | Change |
|---|---|---|---|
| Last input to latest content visible, p50 (ms) | 666 | 278.3 | -58% |
| Last input to latest content visible, p95 (ms) | 727.5 | 415.3 | -43% |
| Scheduling delay, p50 (ms) | 400.2 | 181.3 | -55% |
| PDF generation (round trip on main thread), p50 (ms) | 151.5 | 173 | +14% |
| PDF.js document load, p50 (ms) | 1.2 | 1.3 | +8% |
| Page rasterization, p50 (ms) | 98 | 41.5 | -58% |
| Longest main-thread task, p95 (ms) | 161 | 0 | -100% |
| Main-thread long-task time per run, p50 (ms) | 124 | 0 | -100% |
| Input to state commit, p95 (ms) | 2.6 | 4.2 | +62% |
| Input to next paint, p95 (ms) | 16.7 | 29.6 | +77% |
| Canvases created per run, p50 | 5 | 0 | -100% |
| Blank frames (total) | 0 | 0 | same |

#### paste-paragraph

| Metric | Before | After | Change |
|---|---|---|---|
| Last input to latest content visible, p50 (ms) | 678.7 | 230.1 | -66% |
| Last input to latest content visible, p95 (ms) | 766.2 | 728.2 | -5% |
| Scheduling delay, p50 (ms) | 400.2 | 0.1 | -100% |
| PDF generation (round trip on main thread), p50 (ms) | 149.8 | 171.1 | +14% |
| PDF.js document load, p50 (ms) | 1.1 | 1.2 | +9% |
| Page rasterization, p50 (ms) | 100.2 | 39.8 | -60% |
| Longest main-thread task, p95 (ms) | 179 | 0 | -100% |
| Main-thread long-task time per run, p50 (ms) | 129 | 0 | -100% |
| Input to state commit, p95 (ms) | 5 | 13.7 | +174% |
| Input to next paint, p95 (ms) | 15.4 | 50.2 | +226% |
| Canvases created per run, p50 | 5 | 0 | -100% |
| Blank frames (total) | 0 | 0 | same |

#### delete-content

| Metric | Before | After | Change |
|---|---|---|---|
| Last input to latest content visible, p50 (ms) | 648.2 | 259 | -60% |
| Last input to latest content visible, p95 (ms) | 707.2 | 490 | -31% |
| Scheduling delay, p50 (ms) | 400.2 | 131.1 | -67% |
| PDF generation (round trip on main thread), p50 (ms) | 136.4 | 161 | +18% |
| PDF.js document load, p50 (ms) | 0.6 | 1.7 | +183% |
| Page rasterization, p50 (ms) | 99.4 | 25.8 | -74% |
| Longest main-thread task, p95 (ms) | 153 | 0 | -100% |
| Main-thread long-task time per run, p50 (ms) | 115 | 0 | -100% |
| Input to state commit, p95 (ms) | 2.5 | 4.6 | +84% |
| Input to next paint, p95 (ms) | 10.8 | 24.4 | +126% |
| Canvases created per run, p50 | 5 | 0 | -100% |
| Blank frames (total) | 0 | 0 | same |

#### change-typography

| Metric | Before | After | Change |
|---|---|---|---|
| Last input to latest content visible, p50 (ms) | 684.3 | 318.2 | -53% |
| Last input to latest content visible, p95 (ms) | 749.4 | 355.8 | -53% |
| Scheduling delay, p50 (ms) | 400.2 | 0 | -100% |
| PDF generation (round trip on main thread), p50 (ms) | 144 | 160.8 | +12% |
| PDF.js document load, p50 (ms) | 1.1 | 1.1 | -0% |
| Page rasterization, p50 (ms) | 108.9 | 108.4 | -0% |
| Longest main-thread task, p95 (ms) | 164 | 0 | -100% |
| Main-thread long-task time per run, p50 (ms) | 123 | 0 | -100% |
| Input to state commit, p95 (ms) | n/a | n/a | n/a |
| Input to next paint, p95 (ms) | n/a | n/a | n/a |
| Canvases created per run, p50 | 5 | 0 | -100% |
| Blank frames (total) | 0 | 0 | same |

#### change-spacing

| Metric | Before | After | Change |
|---|---|---|---|
| Last input to latest content visible, p50 (ms) | 684.9 | 250.1 | -63% |
| Last input to latest content visible, p95 (ms) | 740.2 | 513.1 | -31% |
| Scheduling delay, p50 (ms) | 400.2 | 0.1 | -100% |
| PDF generation (round trip on main thread), p50 (ms) | 157.3 | 181.4 | +15% |
| PDF.js document load, p50 (ms) | 1.2 | 1.1 | -8% |
| Page rasterization, p50 (ms) | 106 | 49.6 | -53% |
| Longest main-thread task, p95 (ms) | 156 | 0 | -100% |
| Main-thread long-task time per run, p50 (ms) | 135 | 0 | -100% |
| Input to state commit, p95 (ms) | 4.9 | 5.6 | +14% |
| Input to next paint, p95 (ms) | 17.5 | 16.4 | -6% |
| Canvases created per run, p50 | 5 | 0 | -100% |
| Blank frames (total) | 0 | 0 | same |

#### toggle-visibility

| Metric | Before | After | Change |
|---|---|---|---|
| Last input to latest content visible, p50 (ms) | 454 | 67.6 | -85% |
| Last input to latest content visible, p95 (ms) | 802.9 | 521.6 | -35% |
| Scheduling delay, p50 (ms) | 400.2 | 0 | -100% |
| PDF generation (round trip on main thread), p50 (ms) | 13.7 | 18 | +31% |
| PDF.js document load, p50 (ms) | 0.8 | 0.9 | +12% |
| Page rasterization, p50 (ms) | 18 | 30 | +67% |
| Longest main-thread task, p95 (ms) | 211 | 0 | -100% |
| Main-thread long-task time per run, p50 (ms) | 0 | 0 | same |
| Input to state commit, p95 (ms) | n/a | n/a | n/a |
| Input to next paint, p95 (ms) | n/a | n/a | n/a |
| Canvases created per run, p50 | 1 | 0 | -100% |
| Blank frames (total) | 0 | 0 | same |

#### reorder-sections

| Metric | Before | After | Change |
|---|---|---|---|
| Last input to latest content visible, p50 (ms) | 796.7 | n/a | n/a |
| Last input to latest content visible, p95 (ms) | 796.7 | n/a | n/a |
| Scheduling delay, p50 (ms) | 400.2 | 0 | -100% |
| PDF generation (round trip on main thread), p50 (ms) | 136.5 | 149.8 | +10% |
| PDF.js document load, p50 (ms) | 2.6 | 1.2 | -54% |
| Page rasterization, p50 (ms) | 96.1 | 0 | -100% |
| Longest main-thread task, p95 (ms) | 206 | 0 | -100% |
| Main-thread long-task time per run, p50 (ms) | 119 | 0 | -100% |
| Input to state commit, p95 (ms) | n/a | n/a | n/a |
| Input to next paint, p95 (ms) | n/a | n/a | n/a |
| Canvases created per run, p50 | 5 | 0 | -100% |
| Blank frames (total) | 0 | 0 | same |

#### zoom

| Metric | Before | After | Change |
|---|---|---|---|
| Layout change visible, p50 (ms) | 14.4 | 13.8 | -4% |
| Sharper bitmap visible, p50 (ms) | 697.5 | 283.1 | -59% |
| PDF generations per run, p50 | 1 | 0 | -100% |
| Longest main-thread task, p95 (ms) | 160 | 0 | -100% |

#### panel-resize

| Metric | Before | After | Change |
|---|---|---|---|
| Layout change visible, p50 (ms) | 24.2 | 31.3 | +29% |
| Sharper bitmap visible, p50 (ms) | 716.1 | 305.5 | -57% |
| PDF generations per run, p50 | 1 | 0 | -100% |
| Longest main-thread task, p95 (ms) | 167 | 0 | -100% |

#### Resources after the typing-normal runs

| Metric | Before | After |
|---|---|---|
| rssBeforeMiB | 680.2 | 714.7 |
| rssPeakMiB | 875.2 | 964.3 |
| rssAfterMiB | 735.1 | 904.5 |
| heapBeforeMiB | 11.9 | 6 |
| heapAfterMiB | 13.8 | 7 |
| dedicatedWorkers | 1 | 2 |
| liveCanvasObjects | 16 | 7 |
| attachedCanvases | 6 | 6 |
| totalCanvasesCreated | 51 | 6 |
| totalOffscreenCreated | 0 | 1 |
| totalWorkersCreated | 1 | 2 |

## 10-page document (63 work items)

| Cold first preview, p50 (ms) | 993.7 | 1199.4 | +21% |

#### typing-normal

| Metric | Before | After | Change |
|---|---|---|---|
| Last input to latest content visible, p50 (ms) | 933.7 | 490.2 | -47% |
| Last input to latest content visible, p95 (ms) | 1187.2 | 779 | -34% |
| Scheduling delay, p50 (ms) | 400.2 | 258.3 | -35% |
| PDF generation (round trip on main thread), p50 (ms) | 353.3 | 324.8 | -8% |
| PDF.js document load, p50 (ms) | 1.4 | 1.3 | -7% |
| Page rasterization, p50 (ms) | 217.3 | 22.7 | -90% |
| Longest main-thread task, p95 (ms) | 495 | 0 | -100% |
| Main-thread long-task time per run, p50 (ms) | 316 | 0 | -100% |
| Input to state commit, p95 (ms) | 4.3 | 5.2 | +21% |
| Input to next paint, p95 (ms) | 19.2 | 19.3 | +1% |
| Canvases created per run, p50 | 10 | 0 | -100% |
| Blank frames (total) | 0 | 0 | same |

#### typing-rapid

| Metric | Before | After | Change |
|---|---|---|---|
| Last input to latest content visible, p50 (ms) | 1045.9 | 656.6 | -37% |
| Last input to latest content visible, p95 (ms) | 1171.7 | 840.8 | -28% |
| Scheduling delay, p50 (ms) | 400.1 | 319 | -20% |
| PDF generation (round trip on main thread), p50 (ms) | 397 | 382.3 | -4% |
| PDF.js document load, p50 (ms) | 1.5 | 2 | +33% |
| Page rasterization, p50 (ms) | 217.3 | 31.5 | -86% |
| Longest main-thread task, p95 (ms) | 482 | 0 | -100% |
| Main-thread long-task time per run, p50 (ms) | 386 | 0 | -100% |
| Input to state commit, p95 (ms) | 3.3 | 4.5 | +36% |
| Input to next paint, p95 (ms) | 31.6 | 33.8 | +7% |
| Canvases created per run, p50 | 10 | 0 | -100% |
| Blank frames (total) | 0 | 0 | same |

#### paste-paragraph

| Metric | Before | After | Change |
|---|---|---|---|
| Last input to latest content visible, p50 (ms) | 1011.5 | 414.7 | -59% |
| Last input to latest content visible, p95 (ms) | 1135.5 | 610.7 | -46% |
| Scheduling delay, p50 (ms) | 400.1 | 0 | -100% |
| PDF generation (round trip on main thread), p50 (ms) | 373 | 362.4 | -3% |
| PDF.js document load, p50 (ms) | 1.6 | 1.3 | -19% |
| Page rasterization, p50 (ms) | 199.5 | 29.5 | -85% |
| Longest main-thread task, p95 (ms) | 415 | 0 | -100% |
| Main-thread long-task time per run, p50 (ms) | 340 | 0 | -100% |
| Input to state commit, p95 (ms) | 6.8 | 6.7 | -1% |
| Input to next paint, p95 (ms) | 16.5 | 16.4 | -1% |
| Canvases created per run, p50 | 10 | 0 | -100% |
| Blank frames (total) | 0 | 0 | same |

#### delete-content

| Metric | Before | After | Change |
|---|---|---|---|
| Last input to latest content visible, p50 (ms) | 1031.9 | 460.7 | -55% |
| Last input to latest content visible, p95 (ms) | 1097.5 | 564.9 | -49% |
| Scheduling delay, p50 (ms) | 400.2 | 206.6 | -48% |
| PDF generation (round trip on main thread), p50 (ms) | 397.1 | 360 | -9% |
| PDF.js document load, p50 (ms) | 2.1 | 1.3 | -38% |
| Page rasterization, p50 (ms) | 204.8 | 28 | -86% |
| Longest main-thread task, p95 (ms) | 401 | 0 | -100% |
| Main-thread long-task time per run, p50 (ms) | 353 | 0 | -100% |
| Input to state commit, p95 (ms) | 4.5 | 4.5 | -0% |
| Input to next paint, p95 (ms) | 20.7 | 26 | +26% |
| Canvases created per run, p50 | 10 | 0 | -100% |
| Blank frames (total) | 0 | 0 | same |

#### change-typography

| Metric | Before | After | Change |
|---|---|---|---|
| Last input to latest content visible, p50 (ms) | 1049.9 | 605.9 | -42% |
| Last input to latest content visible, p95 (ms) | 1569.6 | 697.9 | -56% |
| Scheduling delay, p50 (ms) | 400.2 | 0 | -100% |
| PDF generation (round trip on main thread), p50 (ms) | 387.6 | 364.9 | -6% |
| PDF.js document load, p50 (ms) | 2 | 1.2 | -40% |
| Page rasterization, p50 (ms) | 224.5 | 188.2 | -16% |
| Longest main-thread task, p95 (ms) | 646 | 0 | -100% |
| Main-thread long-task time per run, p50 (ms) | 383 | 0 | -100% |
| Input to state commit, p95 (ms) | n/a | n/a | n/a |
| Input to next paint, p95 (ms) | n/a | n/a | n/a |
| Canvases created per run, p50 | 10 | 0 | -100% |
| Blank frames (total) | 0 | 0 | same |

#### change-spacing

| Metric | Before | After | Change |
|---|---|---|---|
| Last input to latest content visible, p50 (ms) | 1042.2 | 436.3 | -58% |
| Last input to latest content visible, p95 (ms) | 1834.8 | 508.5 | -72% |
| Scheduling delay, p50 (ms) | 400.2 | 0 | -100% |
| PDF generation (round trip on main thread), p50 (ms) | 385.7 | 360.6 | -7% |
| PDF.js document load, p50 (ms) | 5.2 | 1.4 | -73% |
| Page rasterization, p50 (ms) | 203.7 | 45.4 | -78% |
| Longest main-thread task, p95 (ms) | 419 | 0 | -100% |
| Main-thread long-task time per run, p50 (ms) | 373 | 0 | -100% |
| Input to state commit, p95 (ms) | 6 | 7.5 | +25% |
| Input to next paint, p95 (ms) | 15.1 | 20.1 | +33% |
| Canvases created per run, p50 | 10 | 0 | -100% |
| Blank frames (total) | 0 | 0 | same |

#### toggle-visibility

| Metric | Before | After | Change |
|---|---|---|---|
| Last input to latest content visible, p50 (ms) | 462.2 | 63.4 | -86% |
| Last input to latest content visible, p95 (ms) | 1276.2 | 676.3 | -47% |
| Scheduling delay, p50 (ms) | 400.2 | 0 | -100% |
| PDF generation (round trip on main thread), p50 (ms) | 18.3 | 16.4 | -10% |
| PDF.js document load, p50 (ms) | 1.2 | 0.9 | -25% |
| Page rasterization, p50 (ms) | 18.9 | 30.8 | +63% |
| Longest main-thread task, p95 (ms) | 518 | 0 | -100% |
| Main-thread long-task time per run, p50 (ms) | 0 | 0 | same |
| Input to state commit, p95 (ms) | n/a | n/a | n/a |
| Input to next paint, p95 (ms) | n/a | n/a | n/a |
| Canvases created per run, p50 | 1 | 0 | -100% |
| Blank frames (total) | 0 | 0 | same |

#### reorder-sections

| Metric | Before | After | Change |
|---|---|---|---|
| Last input to latest content visible, p50 (ms) | 1308.8 | n/a | n/a |
| Last input to latest content visible, p95 (ms) | 1308.8 | n/a | n/a |
| Scheduling delay, p50 (ms) | 400.2 | 0 | -100% |
| PDF generation (round trip on main thread), p50 (ms) | 418.7 | 325.3 | -22% |
| PDF.js document load, p50 (ms) | 1.5 | 1.3 | -13% |
| Page rasterization, p50 (ms) | 209.3 | 0 | -100% |
| Longest main-thread task, p95 (ms) | 472 | 0 | -100% |
| Main-thread long-task time per run, p50 (ms) | 373 | 0 | -100% |
| Input to state commit, p95 (ms) | n/a | n/a | n/a |
| Input to next paint, p95 (ms) | n/a | n/a | n/a |
| Canvases created per run, p50 | 10 | 0 | -100% |
| Blank frames (total) | 0 | 0 | same |

#### zoom

| Metric | Before | After | Change |
|---|---|---|---|
| Layout change visible, p50 (ms) | 13.5 | 14.4 | +7% |
| Sharper bitmap visible, p50 (ms) | 982.4 | 363.1 | -63% |
| PDF generations per run, p50 | 1 | 0 | -100% |
| Longest main-thread task, p95 (ms) | 640 | 0 | -100% |

#### panel-resize

| Metric | Before | After | Change |
|---|---|---|---|
| Layout change visible, p50 (ms) | 24 | 32.9 | +37% |
| Sharper bitmap visible, p50 (ms) | 1024.7 | 393.5 | -62% |
| PDF generations per run, p50 | 1 | 0 | -100% |
| Longest main-thread task, p95 (ms) | 362 | 0 | -100% |

#### Resources after the typing-normal runs

| Metric | Before | After |
|---|---|---|
| rssBeforeMiB | 734.3 | 755.1 |
| rssPeakMiB | 984.5 | 1007.2 |
| rssAfterMiB | 775.4 | 941.5 |
| heapBeforeMiB | 12.5 | 6.2 |
| heapAfterMiB | 14.2 | 7.1 |
| dedicatedWorkers | 1 | 2 |
| liveCanvasObjects | 31 | 12 |
| attachedCanvases | 11 | 11 |
| totalCanvasesCreated | 101 | 11 |
| totalOffscreenCreated | 0 | 1 |
| totalWorkersCreated | 1 | 2 |

