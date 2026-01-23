# Mohi — Codex Spec (v0.1)

## 0. Executive Summary

Mohi is a Mohist web framework for JavaScript/TypeScript that optimises for utility per unit of compute, time, and complexity.

It achieves this by:

- Running UI as server-driven state machines with real-time DOM diffs over a persistent link.
- Eliminating hydration by default via resumability and on-demand islands.
- Remaining portable across Node, Deno, Bun, and Edge runtimes using Web Standard APIs.
- Treating composition, governance, and scaling as first-class: microfrontends without duplicated dependencies.
- Providing built-in observability, offline resilience, and dependency discipline.
- Making projects deterministic, inspectable, and policy-governable, enabling reliable agentic tooling while keeping humans in control.

## 1. Doctrine and Principles

### 1.1 Doctrine (one sentence)

Render once, reuse many; spend compute only where it yields user-visible value.

### 1.2 Mohist Tenets (non-negotiables)

1. No duplicate work (no full hydration by default; no double-rendering).
2. Standards first (Fetch API, Web Streams, URL, Headers, Request/Response; minimal proprietary primitives).
3. Determinism over magic (explicit manifests, stable build graphs, replayable event logs).
4. Frugal by default (minimal runtime; minimal deps; minimal bytes; measurable budgets).
5. Composable governance (policy constraints, resource budgets, auditability, traceability).
6. Incremental adoption (interoperate with React/Vue/Svelte; deploy anywhere).

## 2. Target Users and Use-Cases

### 2.1 Primary users

- Teams building document-/workflow-heavy apps, dashboards, SaaS, internal tools.
- Organisations needing longevity, portability, compliance, and performance budgets.
- Developers wanting fast iteration without framework lock-in.

### 2.2 Ideal workloads

- CRUD apps, dashboards, collaborative tools, live feeds, multi-user updates, content-heavy sites.
- Mixed static + interactive pages with partial client-side widgets.
- Large org frontends that require modular team boundaries.

### 2.3 Non-goals (initially)

- Game engines / high-FPS canvas apps as core (use islands).
- Replacing native apps for all offline cases (provide offline resilience, not "offline everything").
- Reinventing browsers' platform capabilities.

## 3. Architecture Overview

Mohi consists of five coordinated layers:

1. Mohi Server Runtime (MSR)
   - Hosts routes and "live sessions" (actor-like processes).
   - Executes server actions/events and renders UI (SSR + diff).

2. Mohi Client Link (MCL)
   - Tiny client runtime that attaches to server-rendered HTML.
   - Maintains persistent connection (WS/SSE fallback).
   - Applies DOM patches and forwards events.

3. Mohi Compiler & Build Graph (MCB)
   - Compiles TS/TSX, extracts route/component manifests.
   - Produces resumable metadata + island bundles.
   - Maintains deterministic build graph and caching.

4. Mohi Composition Layer (MXL)
   - Microfrontend orchestration: multiple modules/teams, shared deps once.
   - Import maps + routing delegation + shared policy.

5. Mohi Governance & Telemetry (MGT)
   - Observability: traces, spans, event timelines.
   - Policy engine: budgets, dependency rules, runtime constraints.
   - Replay and inspection.

## 4. Core Programming Model

### 4.1 Primitives

#### LivePage

A route-bound server component with state and actions.

```ts
// routes/dashboard.mohi.tsx
import { LivePage, html } from "mohi";

export default class Dashboard extends LivePage<{ count: number }> {
  state = { count: 0 };

  render() {
    return html`
      <main>
        <button mohi:on="click -> increment">Count: ${this.state.count}</button>
      </main>
    `;
  }

  increment() {
    this.state.count++;
  }
}
```

#### LiveComponent

Nestable component with local state; runs inside a LivePage session.

#### Action

A server-side method callable via client events or programmatic triggers.

#### Query

A subscription primitive for data updates; integrates with pub/sub.

#### Island

Client-executed widget with explicit boundaries and lazy loading.

```tsx
<Island src="./islands/rich-editor.tsx" when="focus" props={{ docId }} />
```

#### Module

A deployable microfrontend unit (team boundary) with routes, assets, policies.

## 5. Rendering, Resumability, and Transport

### 5.1 Default: Server-driven UI with DOM diffs

- Initial request returns fully rendered HTML.
- Client establishes a link and becomes interactive immediately.
- User events are forwarded to server actions.
- Server updates state, re-renders, computes minimal DOM patch, pushes to client.

### 5.2 Resumability (no hydration)

Mohi does not re-run the entire UI on the client. The client runtime only:

- binds event delegation
- opens the link
- applies patches
- loads islands when needed

### 5.3 Patch format

- Default patch format: DOM operations (target + operation list).
- Optionally support JSON Patch for state-only updates where viable.
- Targets identified by stable node IDs generated at compile-time.

### 5.4 Transport

- Primary: WebSocket with a Mohi subprotocol.
- Fallback: Server-Sent Events + POST for events.
- Compression: per-message deflate where supported.
- Backpressure: MCL must apply patches in order; MSR throttles per-session.

## 6. Concurrency, Consistency, and Determinism

### 6.1 Event Queue per Session

- All incoming client events for a session are serialised.
- Guarantees stable ordering and avoids race regressions.
- Supports coalescing (merge bursts of similar events).

### 6.2 Deterministic Rendering Rules

Render must be a pure function of:

- session state
- action inputs
- request context (explicit, typed)

Disallow hidden non-determinism (e.g. Math.random() in render) unless wrapped.

### 6.3 Replay

- Every session can emit an event log: inputs + resulting state hash.
- Dev tooling can replay a session to reproduce bugs.

## 7. Standards-First Runtime Targets

### 7.1 Required APIs

- Request, Response, Headers, URL, fetch
- Web Streams for streaming SSR
- Crypto (where available) via Web Crypto

### 7.2 Supported runtimes (first-class)

- Node (via standard Web API shims where needed)
- Deno
- Bun
- Edge runtimes (Workers-style) with restrictions

### 7.3 Runtime Modes

- edge-safe: forbids Node-only APIs and large per-session memory.
- node-full: allows filesystem, long tasks, and richer integrations.

Routes/modules can declare:

```ts
export const runtime = "edge-safe"; // or "node-full"
```

## 8. Build System, Tooling, and CI Speed

### 8.1 Deterministic Build Graph

Compiler outputs a mohi.manifest.json describing:

- routes
- components
- islands
- assets
- policy budgets
- dependency fingerprints

### 8.2 Incremental compilation

- File change updates a minimal subset of the graph.
- Server dev mode hot-swaps route modules without dropping session state (best effort).

### 8.3 Caching

- Content-addressed artifact cache.
- Shared cache keys across CI/local (opt-in).
- Reproducible builds: same inputs => same outputs.

### 8.4 CLI

- mohi dev — dev server, live reload, trace viewer
- mohi build — production build + manifests
- mohi check — policy + type + dependency + determinism checks
- mohi bench — standard benchmark harness
- mohi module — microfrontend module tools

## 9. Microfrontends Without Waste (MXL)

### 9.1 Goals

- Independent deploys per team/module.
- No duplicated framework runtimes.
- Shared deps loaded once, versioned and governed.

### 9.2 Mechanism

Modules publish:

- a route table
- an asset manifest
- a dependency export map

Host composes:

- unified router
- shared import map
- shared policy

### 9.3 Router delegation

- Host routes requests to module handlers.
- Client navigation can stay within session link; module switches handled server-side.

### 9.4 Shared state boundaries

Host provides:

- auth context
- user/session context
- global event bus

Modules cannot mutate host global state without declared capability.

## 10. Observability and Debuggability (Built-in)

### 10.1 Tracing

Every request/action/render produces spans:

- request.start => route.match => action.run => render => diff.compute => patch.send

### 10.2 Structured logs

- JSON logs with stable event IDs.
- Correlation across server + client.

### 10.3 Devtools

- Session inspector: state tree, event queue, patch sizes, timings.
- Render diff visualiser: highlight changed DOM nodes.
- Replay mode: reproduce from event log.

### 10.4 Export

- OpenTelemetry export via plugin.
- Minimal default local viewer (no vendor lock-in).

## 11. Offline Resilience

### 11.1 Baseline

App remains usable when offline for:

- cached routes/assets
- read-only pages
- queued form submissions (optional)

### 11.2 Service worker integration

Generated by default with conservative caching:

- static assets: cache-first
- HTML: stale-while-revalidate (configurable)

Optional action queue plugin:

- queue actions in IndexedDB
- replay on reconnect

### 11.3 Non-goal boundary

Mohi does not promise full offline collaborative editing out-of-the-box (that is a specialised domain), but supports it via plugin/island.

## 12. Supply Chain Security and Dependency Discipline

### 12.1 Dependency policy

Default rule: limit transitive dependency growth. mohi check flags:

- high-severity CVEs (configurable)
- unsigned packages (future)
- abandoned packages (heuristic)
- duplicate heavy deps across modules

### 12.2 Curated utilities

Mohi ships a small audited stdlib:

- common URL/data utilities
- minimal validation helpers

Goal: reduce npm for trivialities.

### 12.3 SBOM output

Build outputs an SBOM-like manifest for auditing.

## 13. AI Techniques Without Becoming an AI Framework

Mohi supports agentic workflows by being machine-legible and policy-governed, not by forcing AI.

### 13.1 Deterministic project schema

mohi.manifest.json is designed to be consumed by tools:

- route graph
- action list + input types
- policy budgets
- runtime constraints
- module composition map

### 13.2 Policy engine

Hard budgets enforce frugality:

- max JS shipped per route
- max patch size per action
- max render time per action
- max dependency count / size
- edge-safe compliance rules

### 13.3 Agent hooks (optional tooling)

- mohi doctor: propose fixes based on policy violations (not execute blindly).
- mohi scaffold: generate routes/components from templates.
- mohi refactor: codemods guided by manifest diffs.
- These can be driven by an LLM, but Mohi itself stays model-agnostic.

## 14. Compatibility Strategy

### 14.1 Islands for React/Vue/Svelte

Official adapters:

- @mohi/island-react
- @mohi/island-vue
- @mohi/island-svelte

Islands compiled separately; loaded only when triggered.

### 14.2 Embedding Mohi in existing apps

- Web Component wrapper: <mohi-zone src="/live/route">.
- Reverse proxy mount: run Mohi alongside Next/Remix and migrate route-by-route.

### 14.3 Consuming existing libraries

- Client libraries: encouraged to run inside islands.
- Server libs: use any TS libs that work with chosen runtime mode.

## 15. Performance Budgets and Benchmarks

### 15.1 Default budgets (configurable)

- MCL runtime <= 5-8KB gzipped (target)
- First route JS <= 15KB gzipped unless islands used
- Patch payload p95 <= 4KB for common actions
- Render time p95 <= 50ms per action in dev target environments

### 15.2 Benchmark harness (mohi bench)

Compare:

- TTI and input delay (hydration eliminated)
- patch sizes and server round-trip times
- server CPU/memory per concurrent session
- build and HMR timings

Reference apps included:

- Todo + live updates
- Dashboard + charts (islands)
- Microfrontend composition demo

## 16. Configuration and Project Structure

### 16.1 Filesystem

```
/routes
  /app.mohi.tsx
  /dashboard.mohi.tsx
/islands
  /chart.tsx
/modules
  /billing
  /admin
/mohi.config.ts
/mohi.manifest.json (generated)
```

### 16.2 mohi.config.ts

- runtime defaults
- policy budgets
- caching strategy
- module registry
- observability sinks

## 17. Plugin System

### 17.1 Server plugins

- auth
- session store
- database connectors
- telemetry exporters
- offline action queue sync

### 17.2 Build plugins

- additional compilation transforms
- asset pipelines
- module federation rules

### 17.3 Policy plugins

- organisation-specific constraints
- compliance checks
- allow/deny lists

## 18. Security Model

### 18.1 Session integrity

- signed session identifiers
- configurable CSRF strategy for event transport
- strict input validation patterns for actions

### 18.2 Sandbox boundaries

- edge-safe forbids unsafe APIs by compile-time checks.
- Islands can be sandboxed with iframe mode if required (high-security option).

### 18.3 Dependency integrity

- lockfile enforcement
- optional package signature verification (when ecosystem supports)

## 19. MVP Roadmap (12 Weeks)

### Week 1-2: Core live loop

- SSR + client link + event forwarding
- action dispatch + session queue

### Week 3-4: Patch engine + node IDs

- stable node addressing
- minimal patch ops

### Week 5: Routing + streaming SSR

- file routes
- streaming response support

### Week 6: Islands v1

- lazy-load islands
- React adapter (first)

### Week 7: Observability v1

- trace timeline viewer
- structured logs

### Week 8: Multi-runtime baseline

- Node + one edge target (Workers-style)

### Week 9: Microfrontend module format v1

- module manifests
- shared import maps

### Week 10: Policy engine v1

- budgets + mohi check

### Week 11: Offline baseline

- SW generation
- cached route shell

### Week 12: Bench suite + reference apps

- publish benchmarks and reproducible scripts
- docs + getting started

## 20. Open Questions (tracked as RFCs)

- Patch format: custom ops vs JSON Patch vs hybrid
- Best stable node ID strategy without bloating HTML
- Session state storage for edge runtimes (Durable Objects / KV / external)
- Multi-user collaboration primitives (CRDT plugin scope)
- Versioning strategy for module composition in large orgs

# Appendix A — Mohi's Minimal Public Surface

Mohi's goal is to keep the public API small:

- LivePage, LiveComponent
- Island
- Query, broadcast, subscribe
- runtime declarations
- mohi.config policies
- CLI commands

Everything else lives behind plugins and manifests.

# Appendix B — Mohist Budgets Example Policy

```ts
export default defineConfig({
  budgets: {
    routeJS_gzip_max_kb: 15,
    islandJS_gzip_max_kb: 60,
    patch_p95_max_kb: 4,
    render_p95_max_ms: 50,
    deps_max_count: 400,
  },
  runtimeDefaults: "edge-safe",
});
```
