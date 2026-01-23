# RFC 0002: Patch Operations

- Status: Draft
- Owner: Mohi Core
- Created: 2025-02-15

## Summary

Define the DOM patch operation set used by Mohi Server Runtime (MSR) and Mohi Client Link (MCL). The patch format prioritizes minimal payloads, deterministic application, and stable node targeting.

## Goals

- Small, explicit, ordered operations.
- Stable node addressing via compile-time IDs.
- Deterministic application on the client.
- Extensible without breaking older clients.

## Non-goals

- Full virtual DOM diffing semantics.
- Arbitrary DOM scripting from patches.

## Patch envelope

Patches are delivered via the transport protocol as `data.ops` arrays.

```json
{
  "ops": [
    {"op": "setText", "id": "n1", "value": "Count: 1"}
  ]
}
```

## Node addressing

- Nodes are assigned stable IDs at compile time.
- IDs are emitted as `data-mohi-id` attributes in SSR HTML.
- Client maps IDs to live nodes at startup.

## Operation set (v1)

- `setText`: set text content of a node.
- `setAttr`: set or update an attribute.
- `removeAttr`: remove an attribute.
- `insert`: insert a node relative to a target.
- `remove`: remove a node by id.
- `replace`: replace a node with a new subtree.
- `move`: move a node relative to a target.
- `setProps`: update multiple attributes in one op.

### Example ops

```json
{"op": "setAttr", "id": "n2", "name": "class", "value": "active"}
```

```json
{"op": "insert", "id": "n3", "parent": "n1", "index": 2, "html": "<li>New</li>"}
```

## Patch application rules

- Ops are applied in order.
- If an op targets a missing node, the patch fails and triggers a session resync.
- `replace` ops re-bind IDs within the replaced subtree.
- `insert` ops must include HTML with embedded `data-mohi-id` attributes.

## Metrics

- Each patch includes optional metrics: `renderMs`, `diffMs`, `sizeBytes`.
- Clients may log metrics to telemetry.

## Compatibility

- Clients ignore unknown `op` values if `strict` is false.
- Servers can require strict mode via a capability flag in the handshake.

## Security

- HTML in `insert` or `replace` is generated server-side only.
- Client never evaluates scripts from patch HTML.

## Open questions

- JSON Patch compatibility for state-only updates.
- Whether to include a binary patch mode in v2.
