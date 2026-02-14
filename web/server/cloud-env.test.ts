import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildCloudEnvironmentManifest,
  writeCloudEnvironmentManifest,
} from "./cloud-env.js";

describe("buildCloudEnvironmentManifest", () => {
  it("produces a stable manifest shape for persisted cloud environments", () => {
    const manifest = buildCloudEnvironmentManifest({
      sessionId: "sess-123",
      backend: "claude",
      cwd: "/workspace/app",
      config: {
        image: "ghcr.io/the-vibe-company/companion-core:latest",
        ports: [3000, 8080],
        volumes: ["/tmp/cache:/cache"],
        env: { ZETA: "1", ALPHA: "2" },
      },
      info: {
        containerId: "abc123",
        name: "companion-abc",
        image: "ghcr.io/the-vibe-company/companion-core:latest",
        containerCwd: "/workspace",
        hostCwd: "/workspace/app",
        state: "running",
        portMappings: [
          { containerPort: 3000, hostPort: 49152 },
          { containerPort: 8080, hostPort: 49153 },
        ],
      },
      now: new Date("2026-02-13T00:00:00.000Z"),
    });

    expect(manifest).toEqual({
      version: 1,
      environmentId: "sess-123",
      sessionId: "sess-123",
      backend: "claude",
      createdAt: "2026-02-13T00:00:00.000Z",
      cwd: "/workspace/app",
      image: "ghcr.io/the-vibe-company/companion-core:latest",
      container: {
        id: "abc123",
        name: "companion-abc",
        cwd: "/workspace",
        portMappings: [
          { containerPort: 3000, hostPort: 49152 },
          { containerPort: 8080, hostPort: 49153 },
        ],
      },
      requested: {
        ports: [3000, 8080],
        volumes: ["/tmp/cache:/cache"],
        env: ["ALPHA", "ZETA"],
      },
    });
  });
});

describe("writeCloudEnvironmentManifest", () => {
  it("writes the manifest under .companion/cloud/environments", async () => {
    const root = mkdtempSync(join(tmpdir(), "cloud-env-test-"));
    const manifest = buildCloudEnvironmentManifest({
      sessionId: "sess-456",
      backend: "claude",
      cwd: root,
      config: { image: "img:latest", ports: [], volumes: [], env: {} },
      info: {
        containerId: "cid",
        name: "companion-cid",
        image: "img:latest",
        containerCwd: "/workspace",
        hostCwd: root,
        state: "running",
        portMappings: [],
      },
      now: new Date("2026-02-13T00:00:00.000Z"),
    });

    const outPath = await writeCloudEnvironmentManifest(root, manifest);
    expect(outPath).toBe(
      join(root, ".companion", "cloud", "environments", "sess-456.json"),
    );

    const written = JSON.parse(readFileSync(outPath, "utf-8"));
    expect(written.sessionId).toBe("sess-456");
    expect(written.version).toBe(1);
  });
});
