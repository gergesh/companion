import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildCloudProviderPlan } from "./cloud-provider.js";

describe("buildCloudProviderPlan", () => {
  it("builds a Modal command preview from persisted environment manifest", async () => {
    const root = mkdtempSync(join(tmpdir(), "cloud-provider-"));
    const envDir = join(root, ".companion", "cloud", "environments");
    mkdirSync(envDir, { recursive: true });
    const manifestPath = join(envDir, "s1.json");

    writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          version: 1,
          environmentId: "s1",
          sessionId: "s1",
          backend: "codex",
          createdAt: "2026-02-13T00:00:00.000Z",
          cwd: root,
          image: "ghcr.io/the-vibe-company/companion-core:latest",
          container: {
            id: "cid",
            name: "companion-cid",
            cwd: "/workspace",
            portMappings: [{ containerPort: 3000, hostPort: 49152 }],
          },
          requested: {
            ports: [3000],
            volumes: [],
            env: [],
          },
        },
        null,
        2,
      ),
      "utf-8",
    );

    const plan = await buildCloudProviderPlan({
      provider: "modal",
      projectCwd: root,
      sessionId: "s1",
    });

    expect(plan.provider).toBe("modal");
    expect(plan.sessionId).toBe("s1");
    expect(plan.mappedPorts).toEqual([{ containerPort: 3000, hostPort: 49152 }]);
    expect(plan.commandPreview).toContain("modal run companion_cloud.py");
    expect(plan.commandPreview).toContain(`--manifest ${manifestPath}`);
    expect(plan.commandPreview).toContain("--ports 3000:49152");
  });
});
