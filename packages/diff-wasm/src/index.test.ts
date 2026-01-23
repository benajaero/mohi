import { describe, expect, it } from "vitest";
import { createBackendFromModule, loadWasmBackend } from "./index.js";

describe("diff-wasm", () => {
  it("builds a backend from module exports", () => {
    const backend = createBackendFromModule({
      default: async () => undefined,
      diff_html: () => JSON.stringify([{ op: "replace", id: "mohi-root", html: "<div/>" }])
    });
    const result = backend.diffHtml("<div></div>", "<div></div>", "mohi-root");
    expect(result.ops[0]?.op).toBe("replace");
  });

  it("returns null when wasm package is missing", async () => {
    const backend = await loadWasmBackend({ pkgPath: "/nonexistent" });
    expect(backend).toBeNull();
  });
});
