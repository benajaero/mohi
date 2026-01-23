# Mohi

Mohi is a frugal, standards-first "live + resumable" web framework: server-driven UI with real-time updates, without hydration, and with first-class governance for performance, portability, security, and scale.

It is not another React meta-framework. It is a new operating model for building web systems: one source of truth, one render loop, one measurable budget, deployable anywhere.

## Core ideas

- Server-driven live UI with minimal DOM diffs over a persistent link.
- Resumability by default; the client stays thin and loads islands on demand.
- Deterministic builds and governance via manifests, budgets, and policy checks.
- Standards-first portability across Node, Deno, Bun, and Edge runtimes.
- Microfrontends without runtime duplication through shared import maps and module manifests.

## Who it is for

- Teams who feel their app is too heavy for the value it delivers.
- Builders of dashboards, workflow systems, and realtime products.
- Organizations that need portability, governance, and long-term maintainability.
- Multi-team orgs that need structure to prevent dependency sprawl.

## Adoption path

- Embed Mohi as a live zone inside existing Next/React/Vue apps.
- Keep existing components via islands (React/Vue/Svelte adapters).
- Migrate route-by-route to Mohi live pages.
- Introduce module composition when teams need independent deploys.

## Docs

- `spec.md` - product and architecture spec
- `statement.md` - competitive positioning statement
- `LICENSE` - CC BY-SA 4.0

License: CC BY-SA 4.0
