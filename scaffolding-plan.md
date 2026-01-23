# Mohi Repo Scaffolding Plan (v0.1)

## Goals

- Keep the core runtime minimal and standards-first.
- Separate compiler/build tooling from runtime execution.
- Support multi-runtime targets with explicit adapters.
- Make governance and observability first-class packages.
- Enable microfrontend composition without runtime duplication.

## Proposed workspace layout

```
/.
  /apps
    /playground
    /benchmarks
  /packages
    /mohi
    /runtime
    /client-link
    /compiler
    /manifest
    /diff
    /protocol
    /router
    /islands
    /adapters
      /react
      /vue
      /svelte
    /governance
    /telemetry
    /module
    /policy
    /devtools
    /cli
  /examples
    /todo-live
    /dashboard-islands
    /microfrontend-host
  /rfcs
  /scripts
  /docs
  /spec.md
  /statement.md
  /README.md
```

## Package responsibilities

- `packages/mohi`
  - Public API surface: LivePage, LiveComponent, Island, Query, runtime declarations.
  - Minimal runtime glue and type exports.

- `packages/runtime`
  - MSR core: session loop, action dispatch, render orchestration, request handling.
  - Deterministic event queue.

- `packages/client-link`
  - MCL runtime: event delegation, link management, patch application, island loader.
  - WebSocket primary, SSE fallback.

- `packages/compiler`
  - TS/TSX compilation and manifest extraction.
  - Stable node ID generation and resumability metadata.

- `packages/manifest`
  - `mohi.manifest.json` schema, validation, and tooling helpers.
  - SBOM-like artifact builders.

- `packages/diff`
  - DOM diff computation and patch generation.
  - Patch application reference implementation for tests.

- `packages/protocol`
  - Wire protocol definitions for patches, events, and session control.
  - Versioning and compatibility utilities.

- `packages/router`
  - File-based routing, route matching, and runtime modes.

- `packages/islands`
  - Island runtime boundaries, loader, and island manifest shape.

- `packages/adapters/*`
  - React/Vue/Svelte island adapters.

- `packages/governance`
  - Budgets, policies, and enforcement engine.

- `packages/telemetry`
  - Spans, trace events, and structured logs.
  - OpenTelemetry export hooks.

- `packages/module`
  - Microfrontend module format, import maps, and host composition utilities.

- `packages/policy`
  - Security and dependency checks, CVE scanners, and rule sets.

- `packages/devtools`
  - Session inspector, diff visualizer, replay tooling.

- `packages/cli`
  - `mohi dev`, `mohi build`, `mohi check`, `mohi bench`, `mohi module`.

## App and example roles

- `apps/playground`
  - Dev sandbox for core runtime and client link.
- `apps/benchmarks`
  - Benchmark harness with reproducible scripts.
- `examples/*`
  - Reference apps aligned to the spec and benchmarks.

## Build and CI pipeline

- Package manager: pnpm or npm workspaces.
- Build tool: tsup or esbuild for library builds; Vite only for examples.
- Tasks:
  - `lint`: type + style.
  - `test`: unit + integration.
  - `build`: packages + manifest schema.
  - `bench`: benchmark suite.
  - `check`: budgets + dependency + determinism.

## Phased implementation order

1. `packages/protocol`, `packages/runtime`, `packages/client-link`
2. `packages/diff`, `packages/compiler`, `packages/manifest`
3. `packages/router`, `packages/islands`, `packages/adapters/react`
4. `packages/telemetry`, `packages/governance`, `packages/policy`
5. `packages/module`, `packages/devtools`, `packages/cli`

## Initial milestones

- Live loop + patch protocol in `runtime` and `client-link`.
- Deterministic manifest with stable node IDs.
- First island adapter (React).
- Governance checks wired into CLI.
