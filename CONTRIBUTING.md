# Contributing to Pardal

Thanks for your interest in improving Pardal! This is an early-stage, exploratory project, so contributions of all sizes are genuinely useful — from typo fixes to porting the demo apps to the current API, to bootstrapping the (currently nonexistent) test suite.

Please also read our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting started

Pardal is a [Bun](https://bun.sh) monorepo. You'll need Bun installed.

```bash
# 1. Fork the repo on GitHub, then clone your fork
git clone https://github.com/<your-username>/pardal.git
cd pardal

# 2. Install all workspaces (this wires up packages/*)
bun install

# 3. Build the library
bun run build:lib
```

The published package lives in `packages/pardal`. The two demo apps (`packages/web-demo`, `packages/server-demo`) currently import an older procedural API and do not build against the current library — porting them to the class-based `Pardal` API is a welcome contribution.

## Repository layout

```
packages/
├── pardal/        # the library — this is what ships to npm
├── web-demo/      # Vite browser demo (stale vs. current API)
└── server-demo/   # Bun HTTP demo on :3001 (stale vs. current API)
```

Inside `packages/pardal/src`:

- `application/` — element composition helpers
- `domain/layout/` — the multi-pass layout engine, sizing, alignment, padding
- `domain/model/` — types, element, image, and PDFKit models
- `domain/rendering/` — the render command model
- `domain/utils/` — emoji, text parsing/wrapping, logging
- `infrastructure/` — the PDFKit renderer
- `polyfills/` — the browser `Buffer` polyfill

A couple of conventions to be aware of: source comments are written in Portuguese while the public API and identifiers are in English, and imports mix the `~/*` path alias (`~/` → `src/`) with relative paths.

## Development workflow

1. **Create a branch** off `main`:
   ```bash
   git checkout -b feat/short-description
   ```
2. **Make your change** in `packages/pardal/src` (or the relevant workspace).
3. **Build to confirm it compiles:**
   ```bash
   bun run build:lib
   ```
4. **Format and lint** with Biome before committing:
   ```bash
   bun run check      # lint + format check
   bun run fix        # auto-fix what can be fixed
   ```
5. **Run the tests:**
   ```bash
   bun run test
   ```
   > Note: there is currently **no test suite** — this command runs `bun test` and finds nothing. If your change is testable, adding a `*.test.ts` alongside it (Bun's built-in `bun:test`) is hugely appreciated and helps us start the suite.
6. **Commit** using Conventional Commits (see below).
7. **Push** and open a Pull Request against `main`, filling out the PR template.

## Coding standards

- **TypeScript, `strict` mode.** The project enables `noUnusedLocals` / `noUnusedParameters`, so remove dead code and unused imports.
- **Biome** governs formatting and linting: 2-space indent, double quotes, ES5 trailing commas, 100-column width. Run `bun run fix` rather than hand-formatting.
- Prefer editing existing modules over adding new abstractions unless the change genuinely warrants it.

## Conventional Commits

We use [Conventional Commits](https://www.conventionalcommits.org/). Format:

```
type(scope): short summary
```

| Type | Use for |
| --- | --- |
| `feat` | A new feature or capability |
| `fix` | A bug fix |
| `docs` | Documentation-only changes |
| `style` | Formatting / whitespace (no logic change) |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | A performance improvement |
| `test` | Adding or fixing tests |
| `build` | Build system, bundling, or dependency changes |
| `ci` | CI configuration and scripts |
| `chore` | Maintenance that doesn't touch `src` or tests |

Example scopes: `engine`, `renderer`, `text`, `emoji`, `image`, `web-demo`, `server-demo`, `deps`.

Example:

```
fix(text): trim trailing space before wrapping multi-line runs
```

## Reporting bugs and requesting features

Use the GitHub issue templates:

- **Bug reports** — include a minimal reproduction, expected vs. actual behavior, your Pardal/Bun version, and the runtime (Node/Bun/browser). Since images/emoji require `sharp` and network access respectively, please note whether those were involved.
- **Feature requests** — describe the problem you're trying to solve, not just the solution.

## Security

Please do **not** open public issues for security vulnerabilities. See [SECURITY.md](SECURITY.md) for how to report them privately.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
