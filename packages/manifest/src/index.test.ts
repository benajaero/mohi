import { describe, expect, it } from "vitest";
import { sortManifest, validateManifest, type MohiManifest } from "./index.js";

describe("manifest", () => {
  it("validates minimal manifest", () => {
    const manifest: MohiManifest = {
      version: 1,
      generatedAt: "2025-02-15T00:00:00Z",
      routes: [{ id: "route:home", path: "/", file: "routes/home.mohi.tsx" }]
    };

    const result = validateManifest(manifest);
    expect(result.ok).toBe(true);
  });

  it("sorts routes and assets", () => {
    const manifest: MohiManifest = {
      version: 1,
      generatedAt: "2025-02-15T00:00:00Z",
      routes: [
        { id: "route:b", path: "/b", file: "routes/b.mohi.tsx" },
        { id: "route:a", path: "/a", file: "routes/a.mohi.tsx" }
      ],
      assets: [
        { path: "/z.css" },
        { path: "/a.css" }
      ]
    };

    const sorted = sortManifest(manifest);
    expect(sorted.routes[0]?.path).toBe("/a");
    expect(sorted.assets?.[0]?.path).toBe("/a.css");
  });
});
