import { describe, expect, it } from "vitest";
import {
  createEnvelope,
  decodeMessage,
  encodeMessage,
  PROTOCOL_VERSION,
  type AnyMessage
} from "./index.js";

describe("protocol codecs", () => {
  it("encodes and decodes JSON", () => {
    const message = createEnvelope("hello", "", 0, { capabilities: ["patch.v1"] }) as AnyMessage;
    const encoded = encodeMessage(message, "json");
    const decoded = decodeMessage(encoded as string) as AnyMessage;
    expect(decoded.v).toBe(PROTOCOL_VERSION);
    expect(decoded.type).toBe("hello");
  });

  it("encodes and decodes CBOR", () => {
    const message = createEnvelope("ack", "s1", 2, { received: 2 }) as AnyMessage;
    const encoded = encodeMessage(message, "cbor");
    const decoded = decodeMessage(encoded as Uint8Array) as AnyMessage;
    expect(decoded.type).toBe("ack");
    expect(decoded.sid).toBe("s1");
  });
});
