# Mohi Competitive Positioning Statement

## The category Mohi creates

Mohi is a frugal, standards-first "live + resumable" web framework: server-driven UI with real-time updates, without hydration, and with first-class governance for performance, portability, security, and scale.

It is not another React meta-framework. It is a new operating model for building web systems: one source of truth, one render loop, one measurable budget, deployable anywhere.

## The core problem Mohi targets

Modern JS frameworks optimize DX but leak costs into production and organizations:

- Duplicate work: SSR followed by hydration repeats rendering and forces large JS bundles.
- State duplication: client + server both own logic, leading to race conditions and complexity.
- Portability debt: vendor/platform coupling makes migrations expensive.
- Scale tax: microfrontends and multi-team delivery often duplicate dependencies and fracture governance.
- Operational blind spots: observability is bolted on, not native.
- Supply chain fragility: dependency sprawl increases security and maintenance risk.

Mohi's thesis is that these are not edge cases. They are structural inefficiencies.

## Mohi's wedge

Render once, reuse many.

Mohi's edge is the combination of:

- Server-driven live UI as the default: interactive pages behave like real-time apps without a SPA's client-state complexity.
- Resumability instead of hydration: the browser becomes a thin patch-applier + event forwarder; JS ships only when needed (islands).
- Deterministic governance as a product feature: budgets, manifests, policy checks, traceability, and replay are built in.

Each of these exists in fragments elsewhere. Mohi unifies them into a single coherent platform.

## How Mohi differs from the main players

### Next.js / Remix / Nuxt / SvelteKit

These are routing + rendering meta-frameworks that still assume a hydration-centric world for rich interactivity.

Mohi makes real-time server interactivity the default, with no hydration tax and a smaller client footprint. It also formalizes governance (budgets, policies, manifests, replay) as a first-class capability rather than relying on team discipline.

### Astro / islands frameworks

Astro's "static-first + islands" is strong for content sites.

Mohi is "live-first + islands": content sites and fully interactive apps where state lives on the server and updates stream in real time.

### Qwik / resumability-first

Qwik leads on resumability, but the model is still often app-centric and focused on client execution resuming.

Mohi uses resumability as a complement to server-driven live UI: the client stays thin by design, and islands are loaded only when client execution is truly necessary.

### Angular / enterprise suites

Angular offers structure, but at a cost in payload and framework weight.

Mohi's structure is governance + manifest-driven, designed to keep runtime small and portability high, and to prevent dependency bloat.

### Backend + SPA (Express + React/Vue)

This architecture duplicates state and logic and pushes complexity into app code.

Mohi collapses the split by treating UI as a server state machine with an explicit, efficient client link.

## Where Mohi wins (the proof points)

Mohi's positioning is measurable, not vibes:

- Production frugality: smaller JS shipped by default, faster first input responsiveness, lower client CPU/memory load.
- Delivery speed: fewer moving parts, real-time features without bespoke websocket layers.
- Operational clarity: traces + event timelines built in, session replay for deterministic bug reproduction.
- Portability: standards-first runtime enables Node/Deno/Bun/Edge targets with fewer rewrites.
- Scale sanity: microfrontends without runtime duplication through shared import maps and module manifests.
- Security posture: policy gates for dependencies, SBOM output, and controlled transitive growth.

## The audience Mohi should speak to

Mohi is not trying to win by pleasing everyone. It speaks to:

- teams who feel their app is too heavy for the value it delivers
- teams tired of hydration + client state complexity
- organizations that need portability, governance, and long-term maintainability
- builders of interactive dashboards, workflow systems, realtime products
- teams with many contributors who need policy and structure to prevent entropy

## Adoption strategy (how Mohi avoids "rewrite everything")

Mohi is designed to enter existing ecosystems:

- Embed Mohi as a live zone inside Next/React/Vue apps (a progressive "strangler" pattern).
- Use islands adapters to keep existing components (React/Vue/Svelte islands).
- Migrate route-by-route to Mohi's live pages.
- Later introduce module composition (microfrontend layer) if and when teams need it.

This makes adoption feasible in real organizations.

## The "why now"

The web has converged on enabling conditions Mohi can exploit:

- universal Fetch/Request/Response APIs across runtimes
- edge execution is mainstream
- resumability and partial hydration are proven directions
- organizations care more about supply chain and governance
- AI-assisted development rewards deterministic structure and machine-legible manifests

Mohi's claim: the next big framework wins by reducing waste, not adding features.
