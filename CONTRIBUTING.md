# Contributing to Mohi

Thanks for helping build Mohi. We care about determinism, portability, and frugality. Please keep changes focused and measurable.

## Development setup

1. Install Node 20+ and pnpm.
2. Install dependencies:
   - `pnpm install`
3. Build all packages:
   - `pnpm build`
4. Run tests:
   - `pnpm test`

## Project principles

- Avoid duplicate work (no hydration by default).
- Prefer Web standard APIs over runtime-specific APIs.
- Keep the client runtime small and explicit.
- Preserve determinism; avoid hidden sources of non-determinism.
- Budget new dependencies and justify them.

## Pull requests

- Keep PRs small and focused.
- Update specs or RFCs if behavior changes.
- Include tests when practical.

## Code style

- TypeScript strict mode is enforced.
- Prefer simple, readable code over clever abstractions.
