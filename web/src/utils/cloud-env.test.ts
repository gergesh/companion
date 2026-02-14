import { describe, it, expect } from "vitest";
import { normalizeImageRef, parsePortList } from "./cloud-env.js";

describe("parsePortList", () => {
  it("parses comma and whitespace separated ports", () => {
    expect(parsePortList("3000, 5173  8080")).toEqual([3000, 5173, 8080]);
  });

  it("drops invalid and duplicate values", () => {
    expect(parsePortList("3000,abc,70000,3000,-1,22")).toEqual([3000, 22]);
  });
});

describe("normalizeImageRef", () => {
  it("returns fallback when image is blank", () => {
    expect(normalizeImageRef("   ")).toBe("companion-core:latest");
  });

  it("returns trimmed image when provided", () => {
    expect(normalizeImageRef(" ghcr.io/acme/core:1.2.3 ")).toBe("ghcr.io/acme/core:1.2.3");
  });
});
