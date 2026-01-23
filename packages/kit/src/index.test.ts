import { describe, expect, it } from "vitest";
import { createDefaultPlugins } from "./index.js";

describe("kit", () => {
  it("creates default plugins", () => {
    const plugins = createDefaultPlugins();
    expect(plugins.length).toBeGreaterThan(0);
  });
});
