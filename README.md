# Pardal

**A declarative, flexbox-style layout engine and PDF renderer for TypeScript.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/pardal.svg)](https://www.npmjs.com/package/pardal)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Runtime: Bun](https://img.shields.io/badge/runtime-Bun-000000.svg?logo=bun&logoColor=white)](https://bun.sh)
[![Biome](https://img.shields.io/badge/formatted%20with-Biome-60A5FA.svg?logo=biome&logoColor=white)](https://biomejs.dev)
[![Lines of code](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/JoaoHenriqueBarbosa/pardal/main/.github/badges/loc.json)](#architecture)

Pardal lets you describe a document as a tree of nested boxes — rectangles, circles, text, and images — using a sizing model that will feel familiar to anyone who has used flexbox. You declare *intent* (grow to fill, fit to content, take 50%, be exactly 120pt) and Pardal computes the absolute geometry through a multi-pass layout algorithm, emits a list of render commands, and paints them into a PDF via [PDFKit](https://pdfkit.org/). The output is a plain `ArrayBuffer` you can stream, save, or download.

The layout core is modeled closely on Nic Barker's [**Clay**](https://github.com/nicbarker/clay) immediate-mode UI layout library — the sizing kinds, the row/column direction, the child-alignment grid, and the top-down/bottom-up pass structure all mirror Clay's approach, applied to paged PDF output instead of a screen.

> **Project status — exploratory spike.** Pardal is an early-stage (`0.1.x`) library. The layout engine and renderer are substantial and coherent, and the package is published on npm, but the edges are unpolished: there is **no automated test suite yet**, the bundled demo apps are stale against the current API (see [Examples](#examples)), and several config knobs are threaded through the types but not yet honored by the renderer. Treat it as a working proof-of-concept for a Clay-style PDF layout engine, not a production dependency. It is documented honestly below so you know exactly what you are getting.

## Highlights

- **Flexbox-like sizing model** — every box sizes itself with one of four strategies: `FIT` (shrink-wrap children), `GROW` (fill available space), `PERCENT` (fraction of the parent), or `FIXED` (exact points), each with optional `min`/`max` clamps.
- **Row / column layout with gaps and padding** — lay children out left-to-right or top-to-bottom, with `childGap` between siblings and per-side `padding`.
- **9-way child alignment** — center, the four edges, and the four corners, plus custom `x`/`y` alignment, resolved independently per axis.
- **Four primitive elements** — `rectangle`, `circle`, `text`, and `image`, with corner radius, opacity, fill color, z-index, and rounded/circular image clipping.
- **Word-accurate text wrapping** — text is measured word by word using PDFKit's `widthOfString`, wrapped to the box width, with explicit `\n` handling and per-line left/center/right alignment.
- **Inline Markdown** — `**bold**`, `*italic*`, and nested `***both***` are parsed by a small state machine and rendered as continued PDFKit segment runs with per-segment font selection.
- **Auto-contrast image highlights** (`boxBlur`) — samples the background image under a text block and picks black or white text automatically using the W3C brightness/color-difference formulas, then paints a Gaussian-blurred rounded highlight behind it.
- **Emoji rendering** — grapheme-segmented emoji drawn from Google's Noto Emoji PNG set (requires network access — see [Requirements](#requirements)).
- **Isomorphic** — runs in Node/Bun (using `sharp` for image processing) and in the browser (using Canvas + a hand-rolled `Buffer` polyfill).
- **Ports-and-adapters design** — the PDFKit factory, the image processor, and the logger are all interfaces you can swap through options.
- **Multi-page documents** — declare multiple `page()`s; render commands are grouped per page.

## Requirements

- **[Bun](https://bun.sh)** — the repo's scripts (`bun run`, `bun build`, `Bun.serve`) assume Bun as the toolchain. Consuming the published package from a Node project works too, provided the peer dependencies below are met.
- **[PDFKit](https://pdfkit.org/) `>= 0.13.0`** — declared as a **peer dependency**, so you install it in your own project. Pardal has no runtime `dependencies` block; PDFKit is the one thing it always needs.
- **[`sharp`](https://sharp.pixelplumbing.com/) — only if you use images, emojis, or `boxBlur` in Node/Bun.** `sharp` is loaded dynamically by the Node image processor and is **not** a dependency of the `pardal` package. If you render images without it installed, you get a clear error. Pure text/shape documents need no `sharp`.
- **Network access — only for emoji and the demos.** Emoji PNGs are fetched live from `raw.githubusercontent.com` on each render, and the demo apps pull a sample image from a remote URL. Text, shapes, and locally-provided images work fully offline.

## Install

```bash
# with bun
bun add pardal pdfkit
# add sharp too if you need image / emoji / boxBlur support in Node
bun add sharp

# or with npm
npm install pardal pdfkit
npm install sharp   # optional, for images in Node
```

## Usage

The public API is the default-exported **`Pardal`** class. The single entry point is the static `Pardal.createDocument(options, buildFn)`, which returns a `Promise<ArrayBuffer>`. Inside the build callback you compose the document with nested builder methods (`page`, `row`, `column`, `text`, `image`, `circle`, `rect`, …).

```ts
import Pardal, { Sizing, Alignment, ImageFitMode } from "pardal";

const pdf: ArrayBuffer = await Pardal.createDocument(
  {
    dimensions: { width: 595, height: 842 }, // A4 in points (the default)
    debugMode: false,
  },
  (p) => {
    p.page((p) => {
      p.column(
        {
          width: Sizing.grow(),
          height: Sizing.grow(),
          padding: 16,
          childGap: 12,
          fillColor: "#FFFFFF",
          childAlignment: Alignment.center(),
        },
        () => {
          p.text("Hello **bold** and *italic* world", {
            fontSize: 18,
            color: "#111111",
          });

          p.row({ width: Sizing.grow(), childGap: 8 }, () => {
            p.circle({
              width: Sizing.fixed(48),
              height: Sizing.fixed(48),
              fillColor: "#1DA1F2",
            });

            // `image` takes a Buffer; `sharp` must be installed in Node for this path
            p.image(imageBuffer, {
              width: Sizing.fixed(100),
              height: Sizing.fixed(100),
              fit: ImageFitMode.COVER,
              rounded: true,
            });
          });
        }
      );
    });
  }
);

// `pdf` is an ArrayBuffer — write it to disk, stream it, or trigger a download.
```

### Options

`PardalOptions` (all optional):

| Option | Default | Description |
| --- | --- | --- |
| `dimensions` | `{ width: 595, height: 842 }` (A4 pt) | Page size in points. |
| `debugMode` | `false` | Paints element bounding boxes to visualize the computed layout. |
| `useImageForEmojis` | `true` | Render emojis as Noto PNG images (needs network + an `emoji` font route). |
| `lineSpacingFactor` | `1.2` | Multiplier applied to line height in wrapped text. |
| `fonts` | built-in defaults | Font routing for regular/bold/italic/boldItalic (and optionally `emoji`). |
| `pdfKitFactory` | `DefaultPDFKitFactory` | Swap in your own PDFKit document factory. |
| `imageFactory` | `DefaultImageFactory` | Swap the image processor (Sharp in Node, Canvas in browser). |
| `logger` | `ConsoleLogger` | Provide a custom `Logger`, or `NullLogger` to silence output. |

### Exported helpers

Alongside the `Pardal` class, the package exports the builders you use to describe sizes and alignment:

- **`Sizing`** — `fixed(n)`, `fit()`, `grow()`, `percent(f)`.
- **`Alignment`** — `center()`, `top()`, `bottom()`, `left()`, `right()`, the four corners, and `custom(x, y)`.
- **`Padding`** — `all(n)`, per-side helpers, and `symmetric(x, y)`.
- **`ImageFitMode`** — `FILL`, `CONTAIN`, `COVER`.
- **`TextAlignment`** — `LEFT`, `CENTER`, `RIGHT`.
- Lower-level utilities: `measureWords`, `wrapTextIntoLines`, the `DefaultPDFKitFactory` / `DefaultImageFactory` factories, the `ConsoleLogger` / `NullLogger` loggers with `LogLevel`, and a browser `Buffer` polyfill.

## Under the hood

A few parts of Pardal are worth a closer look.

### The multi-pass layout engine

The core (`domain/layout/engine.ts`) resolves the box tree into absolute coordinates in a sequence of passes, following Clay's model:

1. **Initialize roots** for each page.
2. **Bottom-up minimum dimensions** — a depth-first pass computes each box's intrinsic minimum size from its children.
3. **Top-down X-axis distribution** — available horizontal space (after padding and `childGap`) is split among children according to their sizing kind. `GROW` children share the leftover; `PERCENT` children take their fraction; `FIXED`/`FIT` keep their computed size. Distributing the residual space along one axis is a one-dimensional problem — the row of child widths is effectively a vector, and `GROW` solves for the slack that makes the sum meet the container width.
4. **Text wrapping** at now-known widths, then a **minimum-dimensions recompute**.
5. **Top-down Y-axis distribution** — the same residual-distribution logic applied independently to the vertical axis.
6. **Positioning + render-command emission**, honoring per-axis alignment.

Because the two axes are solved independently with the same routine, the engine stays small and predictable.

### Auto-contrast text over images (`boxBlur`)

This is the most involved feature. Before drawing a text highlight over a background image, Pardal samples the average RGB of the image region beneath the text (via `sharp`'s `extract` in Node, or Canvas `getImageData` in the browser) and decides whether black or white text will be more legible using the **W3C brightness formula**:

```
brightness = (r·299 + g·587 + b·114) / 1000
```

That is an **inner product** of the pixel's RGB vector with the fixed luminance-weight vector `[0.299, 0.587, 0.114]` — a linear projection of 3-D color space onto a single perceived-brightness axis. The threshold comparison that follows (pick black vs. white) is a non-linear step layered on top of that linear projection. A Gaussian-blurred rounded-rectangle SVG is then rasterized to PNG and drawn behind the text as the highlight.

### Emoji

Emojis are segmented into graphemes with `Intl.Segmenter`, keycap sequences are special-cased, and each glyph is fetched as a Noto Emoji PNG and composited. This path is **network-dependent** and only activates when `useImageForEmojis` is on *and* your `fonts.emoji` route is configured — the built-in default font set does not include an emoji route.

## Development

This is a Bun monorepo with three workspaces under `packages/`: the library (`pardal`), a Vite browser demo (`web-demo`), and a Bun HTTP demo (`server-demo`).

```bash
# install all workspaces
bun install

# build just the library (tsc + bun build -> packages/pardal/dist)
bun run build:lib

# build everything (lib -> web demo -> server demo)
bun run build

# lint / format / check with Biome
bun run lint
bun run format
bun run check
bun run fix
```

**On tests:** `bun run test` is wired up, but **there is currently no test suite** — the command runs `bun test` and finds nothing to execute. The lines-of-code badge above is refreshed by CI. See [CONTRIBUTING.md](CONTRIBUTING.md) if you'd like to help bootstrap a suite.

**Known rough edges** (documented so you don't hit them by surprise):

- The library `dev` / `dev:lib` watch script points at `src/main.ts`, which does not exist (the entry is `src/index.ts`), so library watch-dev is broken.
- `letterSpacing` and single-segment `TextAlignment` are threaded through the types but not applied at paint time (alignment for text is handled at the layout level instead).
- `RenderCommandType` declares `SCISSOR_START` / `SCISSOR_END` values that are not yet emitted or handled.
- The root `vite.config.ts` is vestigial for the library (the lib ships via `bun build`, not Vite).

## Examples

Two demo apps live in the repo — a browser demo (`packages/web-demo`, Vite) and a server demo (`packages/server-demo`, Bun on port `3001`).

> **Heads up:** both demos are currently **stale against the library's public API.** They import a procedural interface (`createPDFDocument`, `beginLayout`, `endLayout`, `image`, `column`, `row`, `text`, …) from an earlier architecture; the current package exports the class-based `Pardal` API shown above instead. The demos will not build as-is. Use the [Usage](#usage) example — written against the current class API — as your reference, and treat the demos as a work-in-progress to be ported.

## Architecture

```
pardal/                         # Bun monorepo (workspaces), private root
├── packages/
│   ├── pardal/                 # THE LIBRARY — published to npm
│   │   └── src/
│   │       ├── index.ts                    # Pardal class + public exports
│   │       ├── application/element-factory.ts
│   │       ├── domain/
│   │       │   ├── layout/                  # engine.ts + sizing / alignment / padding
│   │       │   ├── model/                   # types, element, image, pdfkit
│   │       │   ├── rendering/commands.ts    # render command model
│   │       │   └── utils/                   # emoji, text, logger, size
│   │       ├── infrastructure/pdf-renderer.ts
│   │       └── polyfills/buffer.ts          # browser Buffer polyfill
│   ├── web-demo/               # Vite browser demo (stale vs. current API)
│   └── server-demo/            # Bun HTTP demo on :3001 (stale vs. current API)
├── biome.json                  # lint / format config
├── bun.lock                    # authoritative lockfile (Bun)
└── vite.config.ts              # library-mode config (vestigial for the lib build)
```

The library follows a domain-driven split: `application` (composition helpers) → `domain` (layout, model, rendering, utils) → `infrastructure` (the PDFKit renderer) → `polyfills`. Comments in the source are in Portuguese; the public API and identifiers are in English.

## Contributing

Contributions are welcome — bug reports, API-porting for the demos, and especially a first test suite. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and workflow, [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community expectations, and [SECURITY.md](SECURITY.md) to report a vulnerability.

## License

[MIT](LICENSE).
