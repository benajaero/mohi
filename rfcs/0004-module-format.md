# RFC 0004: Module Format

- Status: Draft
- Owner: Mohi Core
- Created: 2025-02-15

## Summary

Define the microfrontend module format used by Mohi Composition Layer (MXL) to compose multiple deployable units without duplicating runtime dependencies.

## Goals

- Independent deploys per module.
- Shared runtime and dependencies loaded once.
- Clear policy boundaries and capability declarations.

## Non-goals

- Arbitrary code execution across module boundaries.
- Replacing existing package managers.

## Module bundle structure

```
/module.json
/routes.json
/assets.json
/import-map.json
/policies.json
/dist/*
```

## module.json (draft)

```json
{
  "name": "billing",
  "version": "0.1.0",
  "entry": "dist/server.js",
  "routes": ["/billing", "/billing/*"],
  "runtime": "edge-safe",
  "capabilities": ["auth.read", "session.read"],
  "depends": ["@mohi/runtime", "@mohi/client-link"],
  "assets": "assets.json",
  "importMap": "import-map.json",
  "policies": "policies.json"
}
```

## Composition rules

- Host merges module route tables with a unified router.
- Host resolves a shared import map and dedupes framework runtime packages.
- Module policies are combined with host policies (most restrictive wins).

## Runtime boundaries

- Modules receive a host-provided context for auth/session.
- Modules cannot mutate host global state without a declared capability.

## Open questions

- Module version pinning strategy for multi-team deployments.
- Signed module manifests for tamper detection.
