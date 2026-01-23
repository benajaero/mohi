# RFC 0001: Transport Protocol

- Status: Draft
- Owner: Mohi Core
- Created: 2025-02-15

## Summary

Define the wire protocol between Mohi Client Link (MCL) and Mohi Server Runtime (MSR). The protocol supports real-time DOM patch delivery, event forwarding, backpressure, and versioned capability negotiation.

## Goals

- Low-latency, ordered delivery of patches.
- Deterministic event ordering per session.
- Small payloads with explicit versioning.
- Works over WebSocket with SSE + POST fallback.

## Non-goals

- General-purpose RPC beyond session events and patches.
- Transport-level encryption (handled by TLS).

## Terminology

- Session: a live UI instance with state.
- Patch: a DOM diff payload applied on the client.
- Event: a client-originated action invocation.

## Protocol overview

### Connection

- Primary transport: WebSocket with subprotocol `mohi/1`.
- Fallback: SSE for server-to-client + POST for client-to-server.
- All messages are JSON with a stable envelope.

### Envelope format

```json
{
  "v": 1,
  "type": "hello" | "event" | "patch" | "ack" | "error" | "ping" | "pong",
  "sid": "session-id",
  "seq": 42,
  "ts": 1739577600000,
  "data": {}
}
```

- `v`: protocol version.
- `type`: message type.
- `sid`: session id.
- `seq`: per-session sequence number.
- `ts`: milliseconds since epoch (server or client clock).
- `data`: message payload.

### Hello handshake

Client sends:

```json
{
  "v": 1,
  "type": "hello",
  "sid": "<optional>",
  "seq": 0,
  "ts": 1739577600000,
  "data": {
    "capabilities": ["patch.v1", "event.v1"],
    "compression": ["permessage-deflate"],
    "resume": "token"
  }
}
```

Server replies with accepted capabilities and assigned `sid`.

### Event message

```json
{
  "v": 1,
  "type": "event",
  "sid": "abc",
  "seq": 100,
  "ts": 1739577600100,
  "data": {
    "target": "node-123",
    "action": "increment",
    "payload": {"delta": 1},
    "context": {"route": "/dashboard"}
  }
}
```

### Patch message

```json
{
  "v": 1,
  "type": "patch",
  "sid": "abc",
  "seq": 101,
  "ts": 1739577600120,
  "data": {
    "ops": [
      {"op": "setText", "id": "node-123", "value": "Count: 1"}
    ],
    "metrics": {"renderMs": 12, "diffMs": 4, "sizeBytes": 128}
  }
}
```

### Ack message

- Client acks patches to support backpressure.
- Server may throttle if acks lag beyond a threshold.

```json
{
  "v": 1,
  "type": "ack",
  "sid": "abc",
  "seq": 101,
  "ts": 1739577600130,
  "data": {"received": 101}
}
```

## Backpressure

- MCL applies patches in order.
- MSR enforces a max in-flight patch window per session.
- If the window is exceeded, MSR pauses patch sends until acks catch up.

## Error handling

- `error` messages are non-fatal unless `fatal: true`.
- Fatal errors terminate the session and require a new connection.

## SSE fallback

- Server-to-client uses SSE `event: patch` or `event: error` with the same envelope in the data payload.
- Client-to-server uses POST `/mohi/event` with the envelope as JSON.

## Versioning and compatibility

- Major protocol version changes bump `v` and subprotocol (`mohi/2`).
- Capability list allows additive features without breaking changes.

## Security considerations

- Transport relies on HTTPS/TLS.
- Session tokens are signed and expire.
- CSRF protection for POST fallback.

## Open questions

- Binary encoding (CBOR) vs JSON for patch payloads.
- Whether a separate control channel is needed for observability streaming.
