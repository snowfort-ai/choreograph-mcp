# Project Specification – Snowfort Choreograph MCP

## 1 Purpose

Create a dual‑engine Model Context Protocol (MCP) server suite, **Snowfort Choreograph MCP**, that enables AI coding agents (e.g., Claude Code) to drive both:

1. **Web (PWA) automation** via Playwright's Chromium/Firefox/WebKit back‑ends.
2. **Desktop (Electron) automation** via Playwright's `_electron` API, exposing IPC, Node/FS, and native Electron features.

Goals:

* Maintain comprehensive selector engine, snapshot model, and trace tooling.
* Provide LLMs distinct tool identities so they never confuse web vs. desktop contexts.
* Remain Apache 2.0 compliant with independent implementation.

## 2 Starting Point

* Implementation approach: Independent development with comprehensive automation capabilities.
* Repository: **`github.com/snowfort-ai/choreograph-mcp`**.

### Key architecture components

| Path            | Purpose                                                           |
| --------------- | ----------------------------------------------------------------- |
| `src/server.ts` | CLI bootstrap & MCP handshake logic                               |
| `src/drivers/`  | Implementation of common actions (`browser_navigate`, `click`, …) |
| `package.json`  | Browser build plumbing & Playwright dependencies                  |
| `NOTICE`        | Legal compliance and attribution notice                           |

## 3 License & Legal Obligations

Apache 2.0 → retain `LICENSE` and `NOTICE`, with:

```
Independent implementation – © 2025 Snowfort LLC
```

No use of "Playwright" in new package or binary names.

## 4 High‑Level Architecture

```
packages
  ├─ core        (@sfcg/core)     ← shared MCP infra & Driver interface
  ├─ web         (@sfcg/web)      ← web CLI wrapper (chromium default)
  └─ electron    (@sfcg/electron) ← electron CLI wrapper
```

### Driver Interface (core)

```ts
export interface Driver {
  launch(opts: LaunchOpts): Promise<Session>
  navigate?(session: Session, url: string): Promise<void>
  click(session: Session, selector: string): Promise<void>
  /* shared verbs */
}
```

`WebDriver` ↔ Playwright `browserType`; `ElectronDriver` ↔ `_electron.launch()`.

## 5 Package Details

### @sfcg/core

* ESM + CJS build via TS 5.
* Exports `runServer(opts)` which binds an MCP transport to a `Driver`.

### @sfcg/web

* CLI `sfcg-web` (bin field).
* Flags: `--port`, `--browser`, `--headed`, `--name`.
* Handshake `name`: `sfcg-web`.

### @sfcg/electron

* CLI `sfcg-electron`.
* Flags: `--port`, `--app`, `--headed`, `--name`.
* Handshake `name`: `sfcg-electron`.
* New root verb: `app_launch` (replaces `browser_navigate`).
* Extra verbs: `ipc_invoke`, `dialog_expect`, `fs_writeFile`, etc.

## 6 Verb Mapping

| Domain        | Verb               | Driver Method | Notes               |
| ------------- | ------------------ | ------------- | ------------------- |
| Web           | `browser_navigate` | `navigate()`  | unchanged           |
| Electron      | `app_launch`       | `launch()`    | returns `windowId`  |
| Shared        | `click`            | `click()`     | identical selectors |
| Electron‑only | `ipc_invoke`       | `invokeIPC()` | Promise<any> result |

## 7 CLI Usage Examples

```bash
# Web (Chromium)
sfcg-web --port 5110 --headed

# Electron
electron‑forge make  # builds ./dist/MyApp
sfcg-electron --app ./dist/MyApp --port 5111
```

## 8 Development Workflow

1. `pnpm install` – workspace bootstrap.
2. Hot‑run: `pnpm --filter @sfcg/electron exec tsx src/cli.ts --app ./dev/App`.
3. Build: `pnpm -r build` → outputs `dist/` in each pkg.
4. Local link: `npm link` per CLI for external project tests.
5. Trace debugging: `--trace-on-failure` flag passes through to Playwright.

## 9 CI & Release

* GitHub Actions matrix: {node 18, node 20} × {linux, macos, windows}.
* Steps:

  1. `pnpm -r test` (unit + sample E2E flows).
  2. `pnpm -r build` + audit licences (`pnpm licenses` → `THIRD_PARTY_NOTICES`).
  3. Publish on tag `vX.Y.Z` with `npm publish --access public`.
* Artefacts: tarballs + GitHub Release notes auto‑generated from `CHANGELOG.md`.

## 10 Deliverables

| ID | Description              | Acceptance Criteria                                                 |
| -- | ------------------------ | ------------------------------------------------------------------- |
| D1 | @sfcg/core package       | Passes unit tests, exposes Driver interface                        |
| D2 | @sfcg/web CLI            | Runs comprehensive web automation flows, handshake name correct    |
| D3 | @sfcg/electron CLI       | Launches Electron apps, IPC verb works                             |
| D4 | Docs site (`docs/`)      | Quick‑start, verb spec, FAQ                                        |
| D5 | CI pipeline              | Green on all OSes, publishes tarballs                              |
| D6 | License compliance       | LICENSE + NOTICE headers preserved, THIRD\_PARTY\_NOTICES generated |

## 11 Timeline (nominal)

| Week | Milestone                                             |
| ---- | ----------------------------------------------------- |
| 1    | Repo setup, package scaffolds, core Driver skeleton  |
| 2    | Web CLI functional, parity tests green                |
| 3    | Electron CLI boots app, basic click/selectors passing |
| 4    | IPC & FS verbs, trace integration, full test suite    |
| 5    | Docs, license audit, beta release (`v0.1.0`)          |
| 6    | Feedback fixes, `v1.0.0` GA publish                   |

## 12 References & Resources

* Playwright Electron docs → playwright.dev/docs/api/class-\_electron-launcher
* MCP SDK → github.com/modelcontextprotocol/typescript-sdk
* Apache 2.0 text → [www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)

---

*Prepared 27 Jun 2025 (America/Detroit timezone).*