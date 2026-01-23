# RFC 0003: Manifest Schema

- Status: Draft
- Owner: Mohi Core
- Created: 2025-02-15

## Summary

Define the structure of `mohi.manifest.json`, the machine-legible source of truth for routes, actions, islands, assets, policies, and runtime constraints.

## Goals

- Deterministic build output.
- Tooling-friendly schema with stable IDs.
- Supports governance, budgets, and policy checks.

## Non-goals

- Storing runtime session state.
- Acting as a deployment descriptor for infrastructure.

## Schema (v1 draft)

```json
{
  "version": 1,
  "generatedAt": "2025-02-15T00:00:00Z",
  "routes": [
    {
      "id": "route:dashboard",
      "path": "/dashboard",
      "file": "routes/dashboard.mohi.tsx",
      "runtime": "edge-safe",
      "actions": [
        {"name": "increment", "input": "IncrementInput"}
      ],
      "islands": [
        {"name": "chart", "src": "islands/chart.tsx"}
      ],
      "assets": ["/assets/dashboard.css"],
      "budgets": {
        "routeJS_gzip_max_kb": 15,
        "patch_p95_max_kb": 4
      }
    }
  ],
  "components": [
    {"id": "component:counter", "file": "components/counter.mohi.tsx"}
  ],
  "modules": [
    {
      "name": "billing",
      "routes": ["/billing"],
      "importMap": "modules/billing/import-map.json",
      "policies": ["policies/billing.json"]
    }
  ],
  "assets": [
    {"path": "/assets/global.css", "hash": "sha256-..."}
  ],
  "deps": {
    "direct": ["mohi", "zod"],
    "transitiveCount": 128
  },
  "budgets": {
    "routeJS_gzip_max_kb": 15,
    "islandJS_gzip_max_kb": 60,
    "patch_p95_max_kb": 4,
    "render_p95_max_ms": 50,
    "deps_max_count": 400
  },
  "runtimeDefaults": "edge-safe",
  "sbom": {
    "format": "spdx-lite",
    "path": "mohi.sbom.json"
  }
}
```

## Validation rules

- `version` is required and must be known by tooling.
- Each route must include `path` and `file`.
- `runtime` must be one of `edge-safe` or `node-full`.
- Budget values must be non-negative numbers.

## Determinism

- Output ordering is stable and sorted by path or file.
- Hashes are computed with stable algorithms and canonical JSON.

## Open questions

- Whether to include type metadata for action inputs and outputs.
- Whether to include route-level patch budget overrides.
