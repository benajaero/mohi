import { describe, expect, it } from "vitest";
import { diffHtml } from "./index.js";

const prev = `
  <main data-mohi-id="mohi-root">
    <h1 data-mohi-id="title">Hello</h1>
    <button data-mohi-id="btn" class="a">Count: 0</button>
  </main>
`;

const next = `
  <main data-mohi-id="mohi-root">
    <h1 data-mohi-id="title">Hello</h1>
    <button data-mohi-id="btn" class="b">Count: 1</button>
  </main>
`;

describe("diffHtml", () => {
  it("emits setText and attribute changes", () => {
    const result = diffHtml(prev, next);
    const ops = result.ops.map((op) => op.op);
    expect(ops).toContain("setText");
    expect(ops).toContain("setAttr");
  });

  it("falls back to replace when node sets differ", () => {
    const result = diffHtml(prev, "<div data-mohi-id=\"mohi-root\">x</div>");
    expect(result.ops[0]?.op).toBe("replace");
  });
});
