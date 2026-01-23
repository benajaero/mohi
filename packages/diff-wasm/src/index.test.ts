import { describe, expect, it } from "vitest";
import { loadWasmDiff } from "./index.js";

describe("diff-wasm", () => {
  it("loads a wasm diff backend", async () => {
    const wasm = await loadWasmDiff();
    const result = wasm.diffHtml(
      "<div data-mohi-id=\"mohi-root\">A</div>",
      "<div data-mohi-id=\"mohi-root\">B</div>",
      "mohi-root"
    );
    expect(wasm.ready).toBe(true);
    expect(result.ops.length).toBeGreaterThan(0);
  });
});
